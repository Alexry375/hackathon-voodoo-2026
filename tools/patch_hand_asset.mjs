import { readFileSync, writeFileSync } from 'node:fs';
const handB64 = readFileSync('RESSOURCES/hand_assets/HAND_3D.png').toString('base64');
const dataUri = `data:image/png;base64,${handB64}`;
const path = 'assets-inline.js';
let src = readFileSync(path, 'utf8');
const re = /("HAND_POINTER":\s*")data:image\/png;base64,[^"]+(")/;
if (!re.test(src)) { console.error('HAND_POINTER entry not found'); process.exit(1); }
src = src.replace(re, `$1${dataUri}$2`);
writeFileSync(path, src);
console.log(`patched HAND_POINTER → ${(handB64.length / 1024).toFixed(1)} KB`);
