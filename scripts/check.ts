import './adaptation.ts';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import './validate.ts'; // Compile schemas including cross-schema references and format support.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors: string[] = [];
function scan(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['.git','node_modules','workdir','tmp'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (entry.isFile() && entry.name.endsWith('.md')) {
      for (const match of readFileSync(path, 'utf8').matchAll(/\]\(([^\s)]+)\)/g)) {
        if (/^[a-z]+:/i.test(match[1])) continue;
        const [link,anchor] = decodeURIComponent(match[1]).split('#');
        const target = link ? resolve(dirname(path),link) : path;
        if (!existsSync(target)) errors.push(`${relative(root,path)}: ${match[1]}`);
        else if (anchor) {
          const headings = [...readFileSync(target,'utf8').matchAll(/^#+\s+(.+)$/gm)].map(m => m[1].toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu,'').replaceAll(' ','-'));
          if (!headings.includes(anchor)) errors.push(`${relative(root,path)}: anchor ${match[1]}`);
        }
      }
    }
  }
}
scan(root);
if (errors.length) { console.error(errors.join('\n')); process.exitCode=1; }
else console.log('Local links and JSON Schemas checked. Provider workflows have not been live-tested.');
