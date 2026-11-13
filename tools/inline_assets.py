"""Keep standalone HTML portable while avoiding photographic PNG payloads."""
import base64
import io
import re
from PIL import Image

def optimize_inline_png(html):
    cache = {}
    def replace(match):
        encoded = match.group(1)
        if encoded not in cache:
            original = base64.b64decode(encoded)
            with Image.open(io.BytesIO(original)) as image:
                # Preserve dimensions and the alpha channel used by the rock cutouts.
                output = io.BytesIO()
                image.save(output, 'WEBP', quality=92, method=6, exact=True)
            result = output.getvalue()
            cache[encoded] = ('data:image/webp;base64,' + base64.b64encode(result).decode()
                              if len(result) < len(original) else match.group(0))
        return cache[encoded]
    return re.sub(r'data:image/png;base64,([A-Za-z0-9+/=]+)', replace, html)

if __name__ == '__main__':
    from pathlib import Path
    page = Path(__file__).resolve().parents[1] / 'index.html'
    before = page.read_text()
    after = optimize_inline_png(before)
    page.write_text(after)
    print(f'Inline images: {len(before)/1048576:.2f} → {len(after)/1048576:.2f} MiB HTML')
