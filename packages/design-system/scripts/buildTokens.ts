import { readFile, writeFile } from 'node:fs/promises';
import { buildTokenCss } from './tokens';

const input = new URL('../tokens/tokens.json', import.meta.url);
const output = new URL('../tokens/tokens.css', import.meta.url);
const css = buildTokenCss(JSON.parse(await readFile(input, 'utf8')) as Record<string, unknown>);
if (process.argv.includes('--check')) {
  if ((await readFile(output, 'utf8')) !== css)
    throw new Error('Generated tokens.css is stale. Run yarn tokens:build.');
  console.log('Design token CSS is up to date.');
} else {
  await writeFile(output, css);
  console.log('Generated design token CSS.');
}
