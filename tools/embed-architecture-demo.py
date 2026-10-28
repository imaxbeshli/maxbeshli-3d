"""Refresh the offline architecture demo script embedded in index.html."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
page = root / "index.html"
html = page.read_text()
start, end = "<!-- ARCHITECTURE_DEMO_START -->", "<!-- ARCHITECTURE_DEMO_END -->"
a, b = html.index(start), html.index(end) + len(end)
script = (root / "assets/architecture-demo.js").read_text()
page.write_text(html[:a] + start + "\n<script>\n" + script + "\n</script>\n" + end + html[b:])
