"""Browser regression: motion must continue on hover, focus, mobile and reduced motion.
Requires Python Playwright and Chromium at /usr/bin/chromium.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'index.html').read_text();block=re.search(r'<!-- ABOUT_START -->(.*?)<!-- ABOUT_END -->',s,re.S)[1]
html='<html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}</style><button id="launch">Обо мне</button>'+block+'<script>launch.onclick=()=>MBAbout.open();</script></html>'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('http://about.test/',lambda r:r.fulfill(body=html,content_type='text/html; charset=utf-8'))
 page.goto('http://about.test/');page.click('#launch');page.wait_for_timeout(2800)
 sample="""()=>{const p=new DOMMatrix(getComputedStyle(document.querySelector('.about-panel')).transform);return {x:p.b,y:p.c,lift:p.f,fog:getComputedStyle(document.querySelector('.about-fog-layer')).transform,portrait:getComputedStyle(document.querySelector('.about-portrait-motion')).transform}}"""
 for mode in ['normal','hover','focus','reduced','mobile']:
  if mode=='hover':page.mouse.move(1000,400)
  if mode=='focus':page.locator('#aboutContact').focus()
  if mode=='reduced':page.emulate_media(reduced_motion='reduce')
  if mode=='mobile':page.set_viewport_size({'width':390,'height':844})
  before=page.evaluate(sample);page.wait_for_timeout(1900);after=page.evaluate(sample)
  assert abs(after['lift']-before['lift'])>.2,(mode,before,after)
  assert before['fog']!=after['fog'],mode
  assert abs(after['x'])<.0001 and abs(after['y'])<.0001
  print('PASS motion in '+mode,flush=True)
 page.set_viewport_size({'width':1440,'height':1000});page.mouse.move(200,180);page.wait_for_timeout(1100);left=page.evaluate(sample)
 page.mouse.move(1200,180);page.wait_for_timeout(1100);right=page.evaluate(sample)
 assert left['portrait']!=right['portrait']
 assert not errors,errors
 print('PASS parallax also with reduced motion')
 b.close()
