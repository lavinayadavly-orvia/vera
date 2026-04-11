import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_DATA = {
  generations: {},
  snapshots: {},
};

async function ensureParentDirectory(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function readJson(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return structuredClone(DEFAULT_DATA);
    }
    throw error;
  }
}

function createJsonRuntimeStore(filePath) {
  let data = structuredClone(DEFAULT_DATA);
  let ready = false;
  let writeChain = Promise.resolve();

  async function init() {
    if (ready) return;
    data = await readJson(filePath);
    ready = true;
  }

  async function flush() {
    await ensureParentDirectory(filePath);
    const payload = JSON.stringify(data, null, 2);
    writeChain = writeChain.then(() => writeFile(filePath, payload, 'utf8'));
    await writeChain;
  }

  async function ensureReady() {
    if (!ready) {
      await init();
    }
  }

  function getGeneration(id) {
    return data.generations[id] || null;
  }

  async function createGeneration(record) {
    await ensureReady();
    data.generations[record.id] = record;
    await flush();
    return data.generations[record.id];
  }

  async function updateGeneration(id, updater) {
    await ensureReady();
    const existing = data.generations[id];
    if (!existing) return null;

    data.generations[id] = updater(existing);
    await flush();
    return data.generations[id];
  }

  async function listGenerations(limit = 25) {
    await ensureReady();
    return Object.values(data.generations)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, limit);
  }

  async function listPendingGenerations() {
    await ensureReady();
    return Object.values(data.generations)
      .filter((record) => record.mode === 'server-executed' && (record.status === 'queued' || record.status === 'processing'))
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  async function createSnapshot(snapshot) {
    await ensureReady();
    data.snapshots[snapshot.snapshotId] = snapshot;
    await flush();
    return data.snapshots[snapshot.snapshotId];
  }

  async function listSnapshots(limit = 50) {
    await ensureReady();
    return Object.values(data.snapshots)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, limit);
  }

  async function getSummary() {
    await ensureReady();
    const generations = Object.values(data.generations);
    const completed = generations.filter((record) => record.status === 'completed').length;
    const failed = generations.filter((record) => record.status === 'failed').length;

    return {
      generationCount: generations.length,
      completedCount: completed,
      failedCount: failed,
      snapshotCount: Object.keys(data.snapshots).length,
      storage: 'json',
    };
  }

  return {
    init,
    createGeneration,
    getGeneration,
    updateGeneration,
    listGenerations,
    listPendingGenerations,
    createSnapshot,
    listSnapshots,
    getSummary,
  };
}

function parsePayload(row) {
  if (!row?.payload) return null;
  return JSON.parse(row.payload);
}

function createSqliteRuntimeStore(filePath) {
  let db = null;
  let ready = false;

  function ensureDb() {
    if (!db) {
      throw new Error('Runtime store not initialized.');
    }
    return db;
  }

  function serialize(value) {
    return JSON.stringify(value);
  }

  function getGeneration(id) {
    if (!db) return null;
    const row = db.prepare('SELECT payload FROM generations WHERE id = ?').get(id);
    return parsePayload(row);
  }

  async function migrateLegacyJsonIfNeeded(database) {
    const generationCount = Number(database.prepare('SELECT COUNT(*) as count FROM generations').get().count || 0);
    const snapshotCount = Number(database.prepare('SELECT COUNT(*) as count FROM snapshots').get().count || 0);
    if (generationCount > 0 || snapshotCount > 0) {
      return;
    }

    const legacyJsonPath = filePath.replace(/\.sqlite$/i, '.json');
    if (!existsSync(legacyJsonPath)) {
      return;
    }

    const legacy = await readJson(legacyJsonPath);
    const insertGeneration = database.prepare(`
      INSERT OR REPLACE INTO generations (id, mode, status, createdAt, updatedAt, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertSnapshot = database.prepare(`
      INSERT OR REPLACE INTO snapshots (snapshotId, generationId, status, createdAt, payload)
      VALUES (?, ?, ?, ?, ?)
    `);

    database.exec('BEGIN');
    try {
      Object.values(legacy.generations || {}).forEach((record) => {
        insertGeneration.run(
          record.id,
          record.mode,
          record.status,
          record.createdAt,
          record.updatedAt,
          serialize(record),
        );
      });

      Object.values(legacy.snapshots || {}).forEach((snapshot) => {
        insertSnapshot.run(
          snapshot.snapshotId,
          snapshot.generationId,
          snapshot.status,
          snapshot.createdAt,
          serialize(snapshot),
        );
      });
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  async function init() {
    if (ready) return;
    await ensureParentDirectory(filePath);

    db = new DatabaseSync(filePath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS generations (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        snapshotId TEXT PRIMARY KEY,
        generationId TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_generations_updatedAt ON generations(updatedAt DESC);
      CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
      CREATE INDEX IF NOT EXISTS idx_snapshots_createdAt ON snapshots(createdAt DESC);
    `);

    await migrateLegacyJsonIfNeeded(db);
    ready = true;
  }

  async function ensureReady() {
    if (!ready) {
      await init();
    }
  }

  async function createGeneration(record) {
    await ensureReady();
    ensureDb().prepare(`
      INSERT OR REPLACE INTO generations (id, mode, status, createdAt, updatedAt, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.mode,
      record.status,
      record.createdAt,
      record.updatedAt,
      serialize(record),
    );
    return getGeneration(record.id);
  }

  async function updateGeneration(id, updater) {
    await ensureReady();
    const existing = getGeneration(id);
    if (!existing) return null;

    const updated = updater(existing);
    ensureDb().prepare(`
      INSERT OR REPLACE INTO generations (id, mode, status, createdAt, updatedAt, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      updated.id,
      updated.mode,
      updated.status,
      updated.createdAt,
      updated.updatedAt,
      serialize(updated),
    );
    return updated;
  }

  async function listGenerations(limit = 25) {
    await ensureReady();
    const rows = ensureDb().prepare(`
      SELECT payload
      FROM generations
      ORDER BY updatedAt DESC
      LIMIT ?
    `).all(limit);
    return rows.map(parsePayload).filter(Boolean);
  }

  async function listPendingGenerations() {
    await ensureReady();
    const rows = ensureDb().prepare(`
      SELECT payload
      FROM generations
      WHERE mode = 'server-executed' AND status IN ('queued', 'processing')
      ORDER BY createdAt ASC
    `).all();
    return rows.map(parsePayload).filter(Boolean);
  }

  async function createSnapshot(snapshot) {
    await ensureReady();
    ensureDb().prepare(`
      INSERT OR REPLACE INTO snapshots (snapshotId, generationId, status, createdAt, payload)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      snapshot.snapshotId,
      snapshot.generationId,
      snapshot.status,
      snapshot.createdAt,
      serialize(snapshot),
    );
    return snapshot;
  }

  async function listSnapshots(limit = 50) {
    await ensureReady();
    const rows = ensureDb().prepare(`
      SELECT payload
      FROM snapshots
      ORDER BY createdAt DESC
      LIMIT ?
    `).all(limit);
    return rows.map(parsePayload).filter(Boolean);
  }

  async function getSummary() {
    await ensureReady();
    const database = ensureDb();
    const generationCount = Number(database.prepare('SELECT COUNT(*) as count FROM generations').get().count || 0);
    const completedCount = Number(database.prepare(`SELECT COUNT(*) as count FROM generations WHERE status = 'completed'`).get().count || 0);
    const failedCount = Number(database.prepare(`SELECT COUNT(*) as count FROM generations WHERE status = 'failed'`).get().count || 0);
    const snapshotCount = Number(database.prepare('SELECT COUNT(*) as count FROM snapshots').get().count || 0);

    return {
      generationCount,
      completedCount,
      failedCount,
      snapshotCount,
      storage: 'sqlite',
    };
  }

  return {
    init,
    createGeneration,
    getGeneration,
    updateGeneration,
    listGenerations,
    listPendingGenerations,
    createSnapshot,
    listSnapshots,
    getSummary,
  };
}

export function createRuntimeStore(filePath) {
  if (path.extname(filePath).toLowerCase() === '.json') {
    return createJsonRuntimeStore(filePath);
  }

  return createSqliteRuntimeStore(filePath);
}
