"""Embed the background and waterfall code so downloaded index.html stays portable."""
import base64
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'index.html'
html = path.read_text()
image = base64.b64encode((root / 'assets/cave-waterfall.png').read_bytes()).decode()
html, count = re.subn(r'window\.MB_CAVE_URL="data:image/[^;]+;base64,[^"]+"',
                     f'window.MB_CAVE_URL="data:image/png;base64,{image}"', html)
assert count == 1, 'Expected one embedded cave background'
block = '<!-- WATERFALL_START -->\n<script>\n' + (root / 'assets/waterfall.js').read_text() + '\n' + (root / 'assets/lantern-boat.js').read_text() + '\n</script>\n<!-- WATERFALL_END -->'
if '<!-- WATERFALL_START -->' in html:
    html = re.sub(r'<!-- WATERFALL_START -->.*?<!-- WATERFALL_END -->', lambda _: block, html, flags=re.S)
else:
    anchor = '  <script>/* Main-screen cave'
    assert anchor in html
    html = html.replace(anchor, block + '\n' + anchor, 1)
path.write_text(html)
print('Embedded waterfall background and material')
