"""The bot window must keep its size through an entire booking conversation."""
from pathlib import Path
import base64, json, re, tempfile, threading, http.server, functools
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
import argparse, subprocess
parser=argparse.ArgumentParser();parser.add_argument('--width',type=int);parser.add_argument('--baseline',metavar='REVISION');args=parser.parse_args()
html=subprocess.check_output(['git','show',f'{args.baseline}:index.html'],cwd=root,text=True) if args.baseline else (root/'index.html').read_text()
three=next(m.group(1) for m in re.finditer(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',html) if len(m.group(1))>200000 and 'REVISION' in m.group(1) and 'Copyright 2010-2021 Three.js Authors' in m.group(1))
block=html[html.index('<!-- SECTIONS_START -->'):html.index('<!-- SECTIONS_END -->')]
harness='''<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0c1420;color:white;font-family:Arial}#ecosystem-modal{position:fixed;inset:0;display:flex;flex-direction:column;justify-content:space-between}#ecosystem-modal:not(.active){visibility:hidden;opacity:0}</style>'''
harness+='<script>'+three+'</script><script>'+(root/'assets/about-frame.js').read_text()+'</script><dialog id="aboutDialog"></dialog>'+block
data=lambda name:json.dumps('data:image/png;base64,'+base64.b64encode((root/'assets'/name).read_bytes()).decode())
harness+='<script>window.MB_PHONE_DETAILING_SHEET='+data('phone-detailing-sheet.png')+';window.MB_PHONE_CAR_STUDIO='+data('phone-car-studio.png')+';'+(root/'assets/phone-demo.js').read_text()+'</script>'
harness+='''<script>const pc=document.createElement('canvas');pc.width=600;pc.height=1200;const pd=MBPhoneDemo.create(pc,{},()=>{});window.__MB={slateObjects:[{setPlaybackActive(){}},{setPlaybackActive(){},architectureDemo:{update(){}}},{setPlaybackActive(a){pd.update(a)},phoneDemo:pd,screenMat:{map:{image:pc}}}]};pd.ready.then(()=>{MBSections.open(2);const e=document.getElementById('ecosystem-modal');e.classList.add('active');e.inert=false;e.style.opacity='1'});</script>'''

class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
with tempfile.TemporaryDirectory(prefix='mb-bot-layout-') as folder,sync_playwright() as p:
 Path(folder,'index.html').write_text(harness)
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=folder));threading.Thread(target=server.serve_forever,daemon=True).start()
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
 for width in ([args.width] if args.width else [1280,768,390,320]):
  page=browser.new_page(viewport={'width':width,'height':844},device_scale_factor=1,is_mobile=width<540,has_touch=width<540)
  page.set_default_timeout(45000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/index.html');page.wait_for_function('MBSections.state.active && telegramScene.dataset.glass==="ready"')
  page.evaluate('MBSections.selectTab(1)');page.wait_for_timeout(1500)
  page.evaluate("""()=>{window.botSizes=[];window.watchBot=true;function sample(){
   botSizes.push([telegramBot.offsetWidth,telegramBot.offsetHeight,document.querySelector('#telegramBot .tg-chat').offsetHeight]);
   if(watchBot)requestAnimationFrame(sample)
  }sample()}""")
  def click(locator):
   locator.focus();page.wait_for_timeout(80);r=locator.bounding_box();assert r
   page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2)
  def choice(name):
   page.wait_for_function('!MBTelegramStudio.state.typing')
   click(page.locator('#botActions').get_by_role('button',name=name,exact=True))
  choice('Подобрать услугу');choice('Защита кузова');choice('Перейти к записи');choice('Audi A6');choice('Анна');choice('Завтра');choice('14:00');choice('Подтвердить запись')
  page.wait_for_function('!MBTelegramStudio.state.typing && MBTelegramStudio.state.botStep==="done"')
  page.wait_for_timeout(500)
  data=page.evaluate("""()=>{watchBot=false;const panel=document.querySelector('#telegramBot .tg-chat');return {
   sizes:botSizes,scroll:botMessages.scrollHeight,viewport:botMessages.clientHeight,
   horizontal:panel.scrollWidth>panel.clientWidth+1,bookings:MBTelegramStudio.state.visitorCount
  }}""")
  ranges=[max(s[i] for s in data['sizes'])-min(s[i] for s in data['sizes']) for i in range(3)]
  assert max(ranges)<=1,(width,'window changed dimensions',ranges)
  assert data['scroll']>data['viewport'] and data['bookings']==1 and not data['horizontal'],data
  # All reply and composer controls remain within the fixed panel, not clipped.
  assert page.locator('#telegramBot .tg-chat').evaluate("""e=>{
   const p=e.getBoundingClientRect();return [...e.querySelectorAll('#botActions button,#botComposer input,#botComposer button')].every(c=>{
    const r=c.getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom&&r.left>=p.left-1&&r.right<=p.right+1
   })}""")
  page.screenshot(path=f'/tmp/bot-stable-{width}.png')
  assert not errors,errors
  print('PASS',width,'stable window through typing, choices and confirmation; internal chat scrolling and controls accessible',flush=True)
  page.close()
 browser.close();server.shutdown()
