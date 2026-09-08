// Regenerates app/prompts/*.ts from the editable app/prompts/*.md sources.
// (The original package imported the .md files with Vite's `?raw`; Next.js has no
// equivalent, so the markdown is embedded as string modules at build time.)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const dir = join(process.cwd(), 'app', 'prompts');
for (const file of readdirSync(dir)) {
  if (!file.endsWith('.md')) continue;
  const src = readFileSync(join(dir, file), 'utf8');
  const out = `// AUTO-GENERATED from ${file} by scripts/build-prompts.mjs — edit the .md, not this file.\nconst source: string = ${JSON.stringify(src)};\nexport default source;\n`;
  writeFileSync(join(dir, file.replace(/\.md$/, '.ts')), out);
  console.log('prompt module:', file, '->', file.replace(/\.md$/, '.ts'), src.length, 'chars');
}
