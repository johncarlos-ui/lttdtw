import { cells, pageUrl } from './pages.mjs';

export const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const inline = value => escape(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const link = (href, label, cls = '') => '<a class="' + cls + '" href="' + escape(href) + '">' + inline(label) + '</a>';

function labeled(label, value) {
  const content = inline(value);
  if (['Links','Calculator on the page','Three facts in a row'].includes(label)) return '';
  if (['Link beside the button','Link','Links under the button'].includes(label)) {
    if (value.startsWith('See what happens on the day.')) return link('/on-site-audit/', 'See what happens on the day.');
    if (value.startsWith('See who approves what.')) return link('/how-we-work/', 'See who approves what.');
    if (value.startsWith('See all five')) return link('/solutions/', value);
    if (value === 'The other trades.') return link('/industries/', value);
    if (value.startsWith('Unbilled work.')) return '<p>' + [link('/solutions/finance/unbilled-work/','Unbilled work.'), link('/solutions/finance/cash-flow-forecast/','Cash-flow forecast.'),link('/solutions/finance/','Back to Finance.')].join(' ') + '</p>';
    return '';
  }
  if (label === 'Button') return link('/book/', value, 'button');
  if (label === 'Headline' || label === 'Heading') return '<h2>' + content + '</h2>';
  if (label.includes('heading')) return '<h3>' + content + '</h3>';
  if (label === 'Line set large') return '<p class="statement">' + value.split(/\s+/).map(word=>'<span>' + escape(word) + '</span>').join(' ') + '</p>';
  if (label === 'Small line above the headline') return '<p class="eyebrow">' + content + '</p>';
  if (label === 'Text') return '<p>' + content + '</p>';
  if (/^Line under|^Small print/.test(label)) return '<p class="fine">' + content + '</p>';
  return '<p>' + (value ? '<strong>' + escape(label) + ':</strong> ' + content : '<strong>' + escape(label) + '</strong>') + '</p>';
}
export function renderBody(body) {
  return body.split(/\n\s*\n/).filter(Boolean).map(block=>{
    const lines = block.split('\n');
    if (lines[0].startsWith('|')) {
      const [head,,...rows] = lines.filter(line=>line.startsWith('|')).map(cells);
      return '<div class="table-scroll"><table><thead><tr>' + head.map(h=>'<th scope="col">' + inline(h) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(row=>'<tr>'+row.map((cell,i)=>{
        const href = i === 0 && pageUrl(cell);
        return '<td>' + (href ? link(href,cell) : inline(cell)) + '</td>';
      }).join('')+'</tr>').join('') + '</tbody></table></div>';
    }
    const list = lines[0].startsWith('- ') ? 'ul' : /^\d+\.\s/.test(lines[0]) ? 'ol' : '';
    if (list) return '<'+list+'>'+lines.map(line=>'<li>'+inline(line.replace(/^(?:-|\d+\.)\s+/,''))+'</li>').join('')+'</'+list+'>';
    const faq=block.match(/^\*\*(.+?\?)\*\* (.+)$/s);
    if(faq) return '<details><summary>'+inline(faq[1])+'</summary><p>'+inline(faq[2])+'</p></details>';
    const label=block.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
    if(label) return labeled(label[1],label[2]);
    return '<p>'+inline(block)+'</p>';
  }).join('\n');
}
