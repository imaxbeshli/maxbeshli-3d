"""Refresh the offline phone demo script embedded in index.html."""
from pathlib import Path
import base64
import json
root = Path(__file__).resolve().parents[1]
page = root / "index.html"
html = page.read_text()
start, end = "<!-- PHONE_DEMO_START -->", "<!-- PHONE_DEMO_END -->"
a, b = html.index(start), html.index(end) + len(end)
image = base64.b64encode((root / "assets/phone-detailing-sheet.png").read_bytes()).decode()
car3d = root / 'assets/car3d'
model = {'model': base64.b64encode((car3d/'car.glb').read_bytes()).decode(),
         'wasm': base64.b64encode((car3d/'draco_decoder.wasm').read_bytes()).decode(),
         'decoder': (car3d/'draco_wasm_wrapper.js').read_text()}
loaders = (car3d/'DRACOLoader.js').read_text() + '\n' + (car3d/'GLTFLoader.js').read_text()
script = 'window.MB_CAR3D=' + json.dumps(model) + ';\n'
script += 'window.MBInstallCarLoaders=function(){if(THREE.GLTFLoader)return;\n' + loaders + '\n};\n'
script += 'window.MB_PHONE_DETAILING_SHEET="data:image/png;base64,' + image + '";\n'
script += (root/'assets/phone-car3d.js').read_text() + '\n' + (root/'assets/phone-demo.js').read_text()
page.write_text(html[:a] + start + "\n<script>\n" + script + "\n</script>\n" + end + html[b:])
