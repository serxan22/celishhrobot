/** npm run cues — writes audio/cues.json from the film's clock. */
import fs from 'node:fs';
import path from 'node:path';
import { cues, sections } from './cues';

const out = path.resolve(import.meta.dirname, '../../audio/cues.json');
fs.writeFileSync(out, JSON.stringify({ sections: sections(), cues: cues() }, null, 2));
console.log(`${cues().length} cues → ${path.relative(process.cwd(), out)}`);
