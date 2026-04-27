import '../server/lib/load-env.mjs';
import { checkSearchProviderConnection } from '../server/providers/search.mjs';

const query = process.argv.slice(2).join(' ') || 'hypertension screening adults guideline';
const result = await checkSearchProviderConnection(query);

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
