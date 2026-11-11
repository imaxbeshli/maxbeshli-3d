"""Embed the About section, styles, portrait and controller for standalone HTML."""
from pathlib import Path
import base64,json,re
root=Path(__file__).resolve().parents[1]
p=root/'index.html'
s=p.read_text()
portrait='data:image/png;base64,'+base64.b64encode((root/'assets/max-portrait.png').read_bytes()).decode()
background='data:image/png;base64,'+base64.b64encode((root/'assets/about-background.png').read_bytes()).decode()
# Use the same Three.js build as the main scene (r128), not a second optical renderer.
# Keep an embedded fallback for isolated About previews and local HTML files.
main_three=next(m.group(1) for m in re.finditer(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',s) if len(m.group(1))>200000 and 'REVISION' in m.group(1) and 'Copyright 2010-2021 Three.js Authors' in m.group(1))
dataurl=lambda kind,data:'data:'+kind+';base64,'+base64.b64encode(data).decode()
assets={'three':dataurl('text/javascript',main_three.encode())}
asset_tag='<script id="aboutGlassAssets" type="application/json">'+json.dumps(assets)+'</script>\n'
markup=(root/'assets/about.html').read_text().replace('__PORTRAIT__',portrait)
license_note='<!-- About uses the main scene Three.js r128 build; MIT license is included in its source. -->\n'
block='<!-- ABOUT_START -->\n'+license_note+'<style>\n'+(root/'assets/about.css').read_text().replace('__ABOUT_BACKGROUND__',background)+'\n</style>\n'+markup+'\n'+asset_tag+'<script>\n'+(root/'assets/about-frame.js').read_text()+'\n'+(root/'assets/about-glass.js').read_text()+'\n'+(root/'assets/about-atmosphere.js').read_text()+'\n'+(root/'assets/about.js').read_text()+'\n</script>\n<!-- ABOUT_END -->'
if '<!-- ABOUT_START -->' in s:
 a=s.index('<!-- ABOUT_START -->');b=s.index('<!-- ABOUT_END -->')+len('<!-- ABOUT_END -->');s=s[:a]+block+s[b:]
else:s=s.replace('  <dialog id="infoDialog">',block+'\n  <dialog id="infoDialog">',1)
p.write_text(s)
