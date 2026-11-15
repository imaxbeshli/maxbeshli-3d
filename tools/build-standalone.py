"""Optional offline HTML: inline streamed media without making the deployed page heavy."""
from pathlib import Path
import argparse,base64,re
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);args=parser.parse_args()
root=Path(__file__).resolve().parents[1];html=(root/'index.html').read_text()
def video(match):
 path=root/match[1];encoded=base64.b64encode(path.read_bytes()).decode()
 return '<script id="showreelVideoData" type="application/octet-stream">'+encoded+'</script>'
html,count=re.subn(r'<script id="showreelVideoData" type="application/octet-stream" data-src="([^"]+)"></script>',video,html)
assert count==1,'Expected streamed SHOWREEL source'
for name,mime in [('assets/background-music.mp3','audio/mpeg'),('assets/avtolab77-intro-poster.webp','image/webp'),('assets/avtolab77-intro-scroll-60fps.mp4?v=2','video/mp4')]:
 encoded=base64.b64encode((root/name.split('?')[0]).read_bytes()).decode();assert name in html
 html=html.replace(name,'data:'+mime+';base64,'+encoded)
out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html)
print('Offline HTML:',out,round(out.stat().st_size/1048576,2),'MiB')
