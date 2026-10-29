"""Embed the About section, styles, portrait and controller for standalone HTML."""
from pathlib import Path
import base64
root=Path(__file__).resolve().parents[1]
p=root/'index.html'
s=p.read_text()
portrait='data:image/png;base64,'+base64.b64encode((root/'assets/max-portrait.png').read_bytes()).decode()
markup=(root/'assets/about.html').read_text().replace('__PORTRAIT__',portrait)
block='<!-- ABOUT_START -->\n<style>\n'+(root/'assets/about.css').read_text()+'\n</style>\n'+markup+'\n<script>\n'+(root/'assets/about.js').read_text()+'\n</script>\n<!-- ABOUT_END -->'
if '<!-- ABOUT_START -->' in s:
 a=s.index('<!-- ABOUT_START -->');b=s.index('<!-- ABOUT_END -->')+len('<!-- ABOUT_END -->');s=s[:a]+block+s[b:]
else:s=s.replace('  <dialog id="infoDialog">',block+'\n  <dialog id="infoDialog">',1)
p.write_text(s)
