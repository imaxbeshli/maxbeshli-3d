"""Embed the About section, styles, portrait and controller for standalone HTML."""
from pathlib import Path
import base64,json,re
root=Path(__file__).resolve().parents[1]
p=root/'index.html'
s=p.read_text()
portrait='data:image/png;base64,'+base64.b64encode((root/'assets/max-portrait.png').read_bytes()).decode()
background='data:image/png;base64,'+base64.b64encode((root/'assets/about-background.png').read_bytes()).decode()
vendor=root/'prototypes/glass/vendor'
dataurl=lambda kind,data:'data:'+kind+';base64,'+base64.b64encode(data).decode()
assets={'three':dataurl('text/javascript', (vendor/'three.module.min.js').read_bytes()),'hdr':dataurl('application/octet-stream',(root/'prototypes/glass/studio-small-08.hdr').read_bytes())}
loader=(vendor/'RGBELoader.js').read_text()
loader=re.sub(r"import\s*\{([^}]+)\}\s*from[^;]+;",r'const {\1}=THREE;',loader, count=1)
loader=loader.replace('export { RGBELoader };','return RGBELoader;')
loader='function createAboutRGBELoader(THREE){\n'+loader+'\n}\n'
material=(root/'assets/approved-glass.js').read_text().replace('export function','function')
asset_tag='<script id="aboutGlassAssets" type="application/json">'+json.dumps(assets)+'</script>\n'
markup=(root/'assets/about.html').read_text().replace('__PORTRAIT__',portrait)
license_note='<!-- Three.js 0.164.1 and RGBELoader: '+(vendor/'THREE-LICENSE.txt').read_text()+' -->\n'
block='<!-- ABOUT_START -->\n'+license_note+'<style>\n'+(root/'assets/about.css').read_text().replace('__ABOUT_BACKGROUND__',background)+'\n</style>\n'+markup+'\n'+asset_tag+'<script>\n'+loader+material+'\n'+(root/'assets/about-glass.js').read_text()+'\n'+(root/'assets/about-atmosphere.js').read_text()+'\n'+(root/'assets/about.js').read_text()+'\n</script>\n<!-- ABOUT_END -->'
if '<!-- ABOUT_START -->' in s:
 a=s.index('<!-- ABOUT_START -->');b=s.index('<!-- ABOUT_END -->')+len('<!-- ABOUT_END -->');s=s[:a]+block+s[b:]
else:s=s.replace('  <dialog id="infoDialog">',block+'\n  <dialog id="infoDialog">',1)
p.write_text(s)
