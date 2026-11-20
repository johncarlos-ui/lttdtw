import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

function readPageCopy() {
  const packed = process.env.LTTDTW_SITE_COPY_GZIP_BASE64?.trim();
  if (packed) {
    try {
      return gunzipSync(Buffer.from(packed, 'base64')).toString('utf8');
    } catch {
      throw new Error('LTTDTW_SITE_COPY_GZIP_BASE64 must contain gzipped page copy encoded as Base64.');
    }
  }

  const source = resolve('client/Website_Page_Copy_v1_3.md');
  if (!existsSync(source)) {
    throw new Error('Provide client/Website_Page_Copy_v1_3.md or set LTTDTW_SITE_COPY_GZIP_BASE64 for the build.');
  }
  return readFileSync(source, 'utf8');
}

const copy = readPageCopy().replace(/\r\n/g, '\n');
export const cells = line => line.trim().slice(1, -1).split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, '|'));
const blocks = copy.split(/^# /m).slice(1);
const index = blocks[0].split('## The pages')[1].split('\n').filter(line => /^\| [^|]+ \| \//.test(line)).map(cells);
const indexed = new Map(index.map(([name, path, status]) => [path, { name, status }]));

function parsePage(block) {
  const parts = block.split(/^### /m);
  const settingBlock = parts.find(part => part.startsWith('Page settings\n'));
  if (!settingBlock) return [];
  const settings = Object.fromEntries(settingBlock.split('\n').filter(line => /^\| [a-z]/i.test(line)).map(cells));
  const path = settings.Address;
  const sections = parts.filter(part => /^\d+\./.test(part)).map(part => {
    const [firstLine, ...body] = part.trim().split('\n');
    const heading = firstLine.match(/^(\d+)\. (.*)/);
    return { number: Number(heading[1]), name: heading[2], body: body.join('\n').trim() };
  });
  const match = indexed.get(path);
  if (!match) throw new Error('Page missing in source index: ' + path);
  return [{ ...match, path, settings, sections }];
}
export const pages = blocks.flatMap(parsePage);
if (indexed.size !== pages.length || new Set(pages.map(p => p.path)).size !== pages.length) {
  throw new Error('The page inventory and page settings disagree.');
}
export const byPath = new Map(pages.map(page => [page.path, page]));
export function getLine(body, label) {
  const prefix = '**' + label + ':** ';
  return body.split('\n').find(line => line.startsWith(prefix))?.slice(prefix.length) || '';
}
export function heading(page) { return getLine(page.sections[0].body, 'Headline'); }
export function questions(section) {
  return Array.from(section.body.matchAll(/^\*\*(.+?\?)\*\* (.+)$/gm), match => ({ q: match[1], a: match[2] }));
}
export function splitTable(body) {
  const rows = body.split('\n').filter(line => line.startsWith('|')).map(cells);
  return { headers: rows[0] || [], rows: rows.slice(2) };
}
export function isOnHold(path) {
  return path.startsWith('/integrations/') || [
    '/tools/profit-calculator/',
    '/solutions/marketing/',
    '/profit-dashboard/',
  ].includes(path);
}
export function pageUrl(name) {
  const alias = { 'After-hours call answering': 'After-hours answering', 'Human resources': 'Human Resources', 'Landscape and lawn care': 'Landscaping and lawn care' };
  const key = (alias[name] || name).toLowerCase();
  return pages.find(p => p.name.toLowerCase() === key && !isOnHold(p.path))?.path;
}
