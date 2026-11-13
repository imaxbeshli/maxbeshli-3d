"""Embed the section UI and optimized artwork for standalone index.html use."""
from pathlib import Path
import base64, json
root = Path(__file__).resolve().parents[1]
page = root / 'index.html'
html = page.read_text()
assets = {p.stem.removeprefix('section-'): 'data:image/webp;base64,' + base64.b64encode(p.read_bytes()).decode() for p in (root/'assets').glob('section-*.webp')}
css = (root/'assets/sections.css').read_text()+'\n'+(root/'assets/telegram-workspace.css').read_text()+'\n'+(root/'assets/contact.css').read_text()
for key in ['cinema', 'studio', 'digital', 'contact']:
    css = css.replace('ASSET_'+key.upper(), assets[key])
markup=(root/'assets/sections.html').read_text().replace('<!-- TELEGRAM_WORKSPACE -->',(root/'assets/telegram-workspace.html').read_text())
block = '<!-- SECTIONS_START -->\n<style>\n'+css+'\n</style>\n'+markup
scripts='\n'.join((root/'assets'/name).read_text() for name in ['telegram-glass.js','telegram-workspace.js','sections.js'])
block += '\n<script>\nwindow.MB_SECTION_IMAGES='+json.dumps({k:v for k,v in assets.items() if k not in ['cinema','studio','digital','contact']})+';\n'+scripts+'\n</script>\n<!-- SECTIONS_END -->'
start,end='<!-- SECTIONS_START -->','<!-- SECTIONS_END -->'
if start in html:
    a,b=html.index(start),html.index(end)+len(end)
else:
    a,b=html.index('  <div id="ecosystem-modal"'),html.index('<!-- ABOUT_START -->')
    html=html.replace('  <dialog id="infoDialog"><button id="infoClose" aria-label="Закрыть">×</button><h2 id="infoTitle"></h2><p id="infoText"></p></dialog>','')
page.write_text(html[:a]+block+'\n\n'+html[b:])
