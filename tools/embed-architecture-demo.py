"""Refresh the offline architecture demo script embedded in index.html."""
from pathlib import Path
import base64
root = Path(__file__).resolve().parents[1]
page = root / "index.html"
html = page.read_text()
start, end = "<!-- ARCHITECTURE_DEMO_START -->", "<!-- ARCHITECTURE_DEMO_END -->"
a, b = html.index(start), html.index(end) + len(end)
image = base64.b64encode((root / "assets/architecture-landscape.png").read_bytes()).decode()
script = 'window.MB_ARCHITECTURE_LANDSCAPE="data:image/png;base64,' + image + '";\n' + (root / "assets/architecture-demo.js").read_text()
page.write_text(html[:a] + start + "\n<script>\n" + script + "\n</script>\n" + end + html[b:])
