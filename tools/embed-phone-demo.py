"""Refresh the offline phone demo script embedded in index.html."""
from pathlib import Path
import base64
root = Path(__file__).resolve().parents[1]
page = root / "index.html"
html = page.read_text()
start, end = "<!-- PHONE_DEMO_START -->", "<!-- PHONE_DEMO_END -->"
a, b = html.index(start), html.index(end) + len(end)
image = base64.b64encode((root / "assets/phone-detailing-sheet.png").read_bytes()).decode()
hero = base64.b64encode((root / "assets/phone-car-studio.png").read_bytes()).decode()
script = 'window.MB_PHONE_DETAILING_SHEET="data:image/png;base64,' + image + '";\n'
script += 'window.MB_PHONE_CAR_STUDIO="data:image/png;base64,' + hero + '";\n'
logo = next((root / ('assets/avtolab77-logo.'+ext) for ext in ['png','jpg','jpeg','webp'] if (root / ('assets/avtolab77-logo.'+ext)).exists()), None)
if logo:
    mime = 'image/jpeg' if logo.suffix in ['.jpg','.jpeg'] else 'image/'+logo.suffix[1:]
    script += 'window.MB_PHONE_BRAND="data:'+mime+';base64,' + base64.b64encode(logo.read_bytes()).decode() + '";\n'
script += (root/'assets/phone-demo.js').read_text()
page.write_text(html[:a] + start + "\n<script>\n" + script + "\n</script>\n" + end + html[b:])
