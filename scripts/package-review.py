from html.parser import HTMLParser
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from urllib.parse import urlsplit
from html import unescape
import re
import json
import subprocess
import os
import sys

base = Path.cwd()
dist = base / 'dist'
catalog = json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {pages,isOnHold,heading} from './src/lib/pages.mjs'; console.log(JSON.stringify(pages.filter(p=>!isOnHold(p.path)).map(p=>[p.path,p.settings['Page title'],p.settings['Search description'],heading(p)])))"],encoding='utf8'))
class Check(HTMLParser):
    def __init__(self):
        super().__init__()
        self.targets = []
        self.ids = set()
        self.title = ''
        self.h1 = ''
        self.h1s = 0
        self.tag = ''
        self.description = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('h1','title'):
            self.tag=tag
        if tag=='h1':
            self.h1s+=1
        if a.get('id'):
            self.ids.add(a['id'])
        if a.get('name')=='description':
            self.description=a['content']
        for key in ['href','src','srcset']:
            if key in a:
                self.targets.append(a[key])
    def handle_endtag(self,tag):
        if tag==self.tag: self.tag=''
    def handle_data(self,text):
        if self.tag=='h1': self.h1+=text
        if self.tag=='title': self.title+=text
def internal(target):
    path = urlsplit(target).path
    return dist / path.lstrip('/') / 'index.html' if path.endswith('/') else dist / path.lstrip('/')
checked=0
for path,title,description,headline in catalog:
    doc=Check()
    html=internal(path).read_text(encoding='utf8')
    doc.feed(html)
    assert doc.title==title and doc.description==description,path
    assert doc.h1s==1 and doc.h1.strip()==headline,(path, doc.h1)
    assert 'Promises this page makes' not in html and 'Notes for the builder' not in html,path
    for target in doc.targets:
        if target.startswith('/'):
            assert internal(target).is_file(),(path,target)
            checked+=1
        if target.startswith('#'):
            assert target[1:] in doc.ids,(path,target)
assert len(list(dist.rglob('*.html')))==len(catalog)
assert len(list((dist/'story').glob('frame-*.webp')))==192

archive = base/'LTTDTW-Phase-1-Starter.zip'
with ZipFile(archive,'w',compression=ZIP_DEFLATED) as z:
    for item in ['README.md','package.json','package-lock.json','astro.config.mjs','.gitignore','client','scripts','public','src']:
        f = base/item
        for source in ([f] if f.is_file() else sorted(f.rglob('*'))):
            if source.is_file():
                z.write(source,source.relative_to(base).as_posix())
    for source in sorted(dist.rglob('*')):
        if not source.is_file(): continue
        name = 'preview/'+source.relative_to(dist).as_posix()
        if source.suffix=='.html':
            page=source.read_text(encoding='utf8')
            # Browsers restrict external ES modules on file://. Astro emitted a
            # self-contained module, so put it inline for the offline copy.
            def inline_module(match):
                code=internal(match.group(1)).read_text(encoding='utf8')
                if re.search(r'\bimport\s+(?:[\w{*]|["\'])', code):
                    raise ValueError('An offline module needs its dependencies bundled.')
                return '<script type="module">'+code.replace('</script','<\\/script')+'</script>'
            page=re.sub(r'<script type="module" src="(/[^"]+)"></script>',inline_module,page)
            def href(match):
                key,url=match.groups()
                dest=internal(unescape(url))
                rel=os.path.relpath(dest,source.parent).replace('\\','/')
                return key+'="'+rel+'"'
            page=re.sub(r'\b(href|src|srcset)="(/[^"]*)"',href,page)
            z.writestr(name,page)
        elif source.name=='site.webmanifest':
            manifest=json.loads(source.read_text(encoding='utf8'))
            for icon in manifest['icons']: icon['src']=icon['src'].lstrip('/')
            z.writestr(name,json.dumps(manifest))
        else:
            z.write(source,name)
with ZipFile(archive) as z:
    assert z.testzip() is None
    if '--refresh' in sys.argv:
        for info in z.infolist():
            if info.filename.startswith('preview/'):
                target=(base/info.filename).resolve()
                target.relative_to((base/'preview').resolve())
                target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes(z.read(info))
    names=set(z.namelist())
    from posixpath import normpath,join,dirname
    for name in names:
        if not name.startswith('preview/') or not name.endswith('.html'): continue
        p=Check();p.feed(z.read(name).decode())
        for target in p.targets:
            u=urlsplit(target)
            if not u.scheme and u.path:
                assert normpath(join(dirname(name),u.path)) in names,(name,target)
print(f'Checked {len(catalog)} pages, H1s, exact titles and descriptions, {checked} internal resource references, and all offline preview links.')
print(f'{archive.name}: {archive.stat().st_size:,} bytes')
