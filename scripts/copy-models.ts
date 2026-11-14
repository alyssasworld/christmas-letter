// Copies only the segmentation model + wasm files we use into public/models/ so they are self-hosted (SPEC §9). Idempotent.
import fs from 'node:fs';

const src = 'node_modules/@imgly/background-removal-data/dist';
const out = 'public/models';
const KEYS = ['/models/small', '/onnxruntime-web/ort-wasm-simd.wasm', '/onnxruntime-web/ort-wasm-simd-threaded.wasm'];

const all = JSON.parse(fs.readFileSync(`${src}/resources.json`, 'utf8'));
const keep = Object.fromEntries(KEYS.map((k) => [k, all[k]]));
fs.mkdirSync(out, { recursive: true });
let total = 0;
let largest = 0;
for (const { hash } of Object.values<{ chunks: { hash: string }[] }>(keep).flatMap((r) => r.chunks)) {
  const size = fs.statSync(`${src}/${hash}`).size;
  total += size;
  largest = Math.max(largest, size);
  if (!fs.existsSync(`${out}/${hash}`)) fs.copyFileSync(`${src}/${hash}`, `${out}/${hash}`);
}
fs.writeFileSync(`${out}/resources.json`, JSON.stringify(keep));
console.log(`models: ${(total / 1e6).toFixed(1)} MB total, largest chunk ${(largest / 1e6).toFixed(1)} MB`);
