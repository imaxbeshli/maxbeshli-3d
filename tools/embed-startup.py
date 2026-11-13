"""Refresh the startup controller without touching the main scene or media."""
from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
page=root/'index.html'
html=page.read_text()
block='<!-- STARTUP_START -->\n<script>\n'+(root/'assets/startup.js').read_text()+'\n</script>\n<!-- STARTUP_END -->'
if '<!-- STARTUP_START -->' in html:
    html,count=re.subn(r'<!-- STARTUP_START -->.*?<!-- STARTUP_END -->',lambda _:block,html,flags=re.S)
else:
    html,count=re.subn(r'<script>\s*window\.MBLoading=\{scene:false,ready:false\};.*?</script>',lambda _:block,html,count=1,flags=re.S)
assert count==1,'Expected one startup controller'
page.write_text(html)
