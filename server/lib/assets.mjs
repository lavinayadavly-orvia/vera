import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

function getExtensionForMime(mimeType) {
  if (mimeType.includes('application/vnd.openxmlformats-officedocument.presentationml.presentation')) return 'pptx';
  if (mimeType.includes('application/msword')) return 'doc';
  if (mimeType.includes('application/pdf')) return 'pdf';
  if (mimeType.includes('video/mp4')) return 'mp4';
  if (mimeType.includes('audio/mpeg')) return 'mp3';
  if (mimeType.includes('audio/wav')) return 'wav';
  if (mimeType.includes('image/svg+xml')) return 'svg';
  if (mimeType.includes('image/png')) return 'png';
  if (mimeType.includes('image/jpeg')) return 'jpg';
  if (mimeType.includes('text/html')) return 'html';
  if (mimeType.includes('text/markdown')) return 'md';
  if (mimeType.includes('application/json')) return 'json';
  return 'bin';
}

function getMimeTypeForExtension(extension) {
  switch (extension) {
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'doc':
      return 'application/msword';
    case 'pdf':
      return 'application/pdf';
    case 'mp4':
      return 'video/mp4';
    case 'html':
      return 'text/html; charset=utf-8';
    case 'md':
      return 'text/markdown; charset=utf-8';
    case 'json':
      return 'application/json; charset=utf-8';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'svg':
      return 'image/svg+xml; charset=utf-8';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

export function createAssetManager({ rootDir, publicBaseUrl }) {
  async function ensureRoot() {
    await mkdir(rootDir, { recursive: true });
  }

  async function saveTextAsset({ extension, body }) {
    await ensureRoot();
    const assetId = `${randomUUID()}.${extension}`;
    const filePath = path.join(rootDir, assetId);
    await writeFile(filePath, body, 'utf8');
    return {
      assetId,
      url: `${publicBaseUrl}/${assetId}`,
    };
  }

  async function saveBinaryAsset({ extension, body }) {
    await ensureRoot();
    const assetId = `${randomUUID()}.${extension}`;
    const filePath = path.join(rootDir, assetId);
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
    await writeFile(filePath, buffer);
    return {
      assetId,
      url: `${publicBaseUrl}/${assetId}`,
    };
  }

  async function saveDataUrlAsset(dataUrl) {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Unsupported data URL asset payload.');
    }

    const mimeType = match[1];
    const base64 = match[2];
    const extension = getExtensionForMime(mimeType);
    const assetId = `${randomUUID()}.${extension}`;
    const filePath = path.join(rootDir, assetId);

    await ensureRoot();
    await writeFile(filePath, Buffer.from(base64, 'base64'));

    return {
      assetId,
      url: `${publicBaseUrl}/${assetId}`,
    };
  }

  async function readAsset(assetId) {
    const filePath = path.join(rootDir, assetId);
    const body = await readFile(filePath);
    const extension = path.extname(assetId).replace('.', '').toLowerCase();
    return {
      body,
      contentType: getMimeTypeForExtension(extension),
    };
  }

  return {
    saveTextAsset,
    saveBinaryAsset,
    saveDataUrlAsset,
    readAsset,
  };
}
