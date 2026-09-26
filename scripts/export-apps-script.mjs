import { readFile, writeFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/utils/googleSheetsScript.ts', import.meta.url), 'utf8');
const startMarker = 'export const GOOGLE_APPS_SCRIPT_CODE = `';
const start = source.indexOf(startMarker);
const end = source.lastIndexOf('\n`;');

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Unable to locate GOOGLE_APPS_SCRIPT_CODE template.');
}

const templateBody = source.slice(start + startMarker.length, end);
const code = Function(`return \`${templateBody.replaceAll('`', '\\`')}\`;`)();
await writeFile(new URL('../apps-script/Code.gs', import.meta.url), code, 'utf8');
