"""Embed the lower gallery assets and config for standalone index.html use."""
from pathlib import Path
import base64,json
root=Path(__file__).resolve().parents[1]
def data(name):
 p=root/name
 return 'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()
works=json.loads((root/'assets/selected-works.json').read_text())
for work in works:
 work['poster']=data(work['poster'])
css=(root/'assets/gallery.css').read_text().replace('__GALLERY_CAVE__',data('assets/gallery-cave.png'))
block='<!-- GALLERY_START -->\n<style>'+css+'</style>\n'+(root/'assets/gallery.html').read_text()+'\n<script>window.MBSelectedWorks='+json.dumps(works,ensure_ascii=False).replace('</','<\\/')+';\n'+(root/'assets/gallery.js').read_text()+'\n'+(root/'assets/gallery-scene.js').read_text()+'\n</script>\n<!-- GALLERY_END -->'
p=root/'index.html';s=p.read_text()
if '<!-- GALLERY_START -->' in s:
 a=s.index('<!-- GALLERY_START -->');b=s.index('<!-- GALLERY_END -->')+len('<!-- GALLERY_END -->');s=s[:a]+block+s[b:]
else:s=s.replace('<!-- ABOUT_START -->',block+'\n<!-- ABOUT_START -->',1)
if len(s.encode())>100*1024*1024:raise SystemExit('Embedded index exceeds GitHub 100 MiB limit; optimize new media first.')
p.write_text(s)
print(f'Embedded gallery; index.html {p.stat().st_size/1024**2:.2f} MiB')
