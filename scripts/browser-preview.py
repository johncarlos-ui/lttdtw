"""Pack the built Astro routes into a single offline review document."""
import base64
import json
import mimetypes
from pathlib import Path

root = Path('dist')
pages = {}
assets = {}
for file in sorted(root.rglob('*')):
    if not file.is_file():
        continue
    path = '/' + file.relative_to(root).as_posix()
    if file.suffix == '.html':
        pages[path.removesuffix('index.html')] = file.read_text(encoding='utf8')
    elif file.suffix in ('.webp', '.svg', '.png', '.js', '.css', '.ico', '.webmanifest'):
        mime = mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
        assets[path] = [mime, base64.b64encode(file.read_bytes()).decode('ascii')]

bundle = json.dumps({'pages':pages,'assets':assets},ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
template = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Let the Tool Do the Work — Website preview</title><style>html,body,iframe{margin:0;border:0;width:100%;height:100%;background:#000}iframe{display:block}</style></head><body><iframe title="Let the Tool Do the Work website"></iframe><script type="application/json" id="bundle">PACKED_DATA</script><script>
const {pages,assets}=JSON.parse(document.getElementById('bundle').textContent);
const viewer=document.querySelector('iframe');
const urls=new Map();
function bytes(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0))}
function assetUrl(path){
  if(!urls.has(path)&&assets[path]){
    const [mime,encoded]=assets[path];
    urls.set(path,URL.createObjectURL(new Blob([bytes(encoded)],{type:mime})));
  }
  return urls.get(path)||path;
}
function source(path){return new TextDecoder().decode(bytes(assets[path][1]))}
function show(){
  const route=Object.hasOwn(pages,location.hash.slice(1))?location.hash.slice(1):'/';
  const doc=new DOMParser().parseFromString(pages[route],'text/html');
  document.title=doc.title;
  for(const css of doc.querySelectorAll('link[rel="stylesheet"]')){
    const style=doc.createElement('style');style.textContent=source(css.getAttribute('href'));css.replaceWith(style);
  }
  for(const script of doc.querySelectorAll('script[src]')){
    script.textContent=source(script.getAttribute('src'));script.removeAttribute('src');
  }
  for(const node of doc.querySelectorAll('img[src],source[srcset],link[rel="icon"],link[rel="apple-touch-icon"]')){
    const attr=node.tagName==='IMG'?'src':node.tagName==='SOURCE'?'srcset':'href';
    node.setAttribute(attr,assetUrl(node.getAttribute(attr)));
  }
  doc.querySelector('link[rel="manifest"]')?.remove();
  const nav=doc.createElement('script');
  nav.textContent="window.resolveStoryFrame = path => parent.assetUrl(path.startsWith('./') ? path.slice(1) : path); document.addEventListener('click', e=>{if(e.defaultPrevented)return;const a=e.target.closest('a[href]');if(!a)return;const h=a.getAttribute('href');if(h.startsWith('/')){e.preventDefault();parent.postMessage({reviewRoute:h},'*')}else if(h.startsWith('#')){const d=document.getElementById(h.slice(1));if(d){e.preventDefault();d.scrollIntoView();if(d.tabIndex===-1)d.focus({preventScroll:true})}}});";
  doc.body.append(nav);
  viewer.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;
}
window.addEventListener('message',e=>{if(e.source===viewer.contentWindow&&e.data&&Object.hasOwn(pages,e.data.reviewRoute)){if(location.hash==='#'+e.data.reviewRoute)show();else location.hash=e.data.reviewRoute}});
window.addEventListener('hashchange',show);show();
</script></body></html>"""
out=Path('LTTDTW-Preview.html')
out.write_text(template.replace('PACKED_DATA',bundle),encoding='utf8')
print(out.name, len(pages), 'pages', out.stat().st_size, 'bytes')
