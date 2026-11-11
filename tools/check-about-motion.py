"""Browser regression: motion must continue on hover, focus, mobile and reduced motion.
Requires Python Playwright and Chromium at /usr/bin/chromium.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'index.html').read_text();block=re.search(r'<!-- ABOUT_START -->(.*?)<!-- ABOUT_END -->',s,re.S)[1]
html='<html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}</style><button id="launch">Обо мне</button>'+block+'<script>launch.onclick=()=>MBAbout.open();</script></html>'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def click_tab(i):
  r=page.locator(f'#aboutTab{i}').bounding_box();page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2)
 page.route('http://about.test/',lambda r:r.fulfill(body=html,content_type='text/html; charset=utf-8'))
 page.goto('http://about.test/');page.click('#launch');page.wait_for_function('aboutDialog.dataset.glass==="ready"',timeout=180000);page.wait_for_timeout(2800)
 page.wait_for_function('document.querySelector(".about-atmosphere").width>0')
 assert page.locator('.about-glass-back,.about-glass-side,.about-chapter-count').count()==0
 assert page.locator('.about-glass-canvas').evaluate('(e)=>e.width>200 && getComputedStyle(e).clipPath.startsWith("polygon(")')
 assert page.locator('.about-panel').evaluate('(e)=>getComputedStyle(e).isolation')=='auto'
 assert page.locator('.about-panel-float > .about-glass-canvas').count()==1
 assert page.locator('.about-panel-float > .about-panel').count()==1
 sample="""()=>{const p=new DOMMatrix(getComputedStyle(document.querySelector('.about-panel')).transform);return {x:p.b,y:p.c,lift:new DOMMatrix(getComputedStyle(document.querySelector('.about-panel-float')).transform).m42,fog:(()=>{const c=document.querySelector('.about-atmosphere'),g=c.getContext('webgl'),b=new Uint8Array(c.width*c.height*4);g.drawArrays(g.TRIANGLES,0,6);g.readPixels(0,0,c.width,c.height,g.RGBA,g.UNSIGNED_BYTE,b);let sum=0;for(let i=3;i<b.length;i+=148)sum+=b[i];return sum})(),portrait:getComputedStyle(document.querySelector('.about-portrait-motion')).transform}}"""
 for mode in ['normal','hover','focus','reduced','mobile']:
  if mode=='hover':page.mouse.move(1000,400)
  if mode=='focus':page.locator('#aboutClose').focus()
  if mode=='reduced':page.emulate_media(reduced_motion='reduce')
  if mode=='mobile':page.set_viewport_size({'width':390,'height':844})
  before=page.evaluate(sample);page.wait_for_timeout(950);middle=page.evaluate(sample);page.wait_for_timeout(950);after=page.evaluate(sample)
  lifts=[state['lift'] for state in (before,middle,after)]
  assert max(lifts)-min(lifts)>.2,(mode,before,middle,after)
  assert before['fog']>0 and before['fog']!=after['fog'],(mode,before['fog'],after['fog'])
  assert abs(after['x'])<.001 and abs(after['y'])<.001
  print('PASS motion in '+mode,flush=True)
 page.set_viewport_size({'width':1440,'height':1000});page.mouse.move(200,180);page.wait_for_timeout(1100);left=page.evaluate(sample)
 page.mouse.move(1200,180);page.wait_for_timeout(1100);right=page.evaluate(sample)
 assert left['portrait']!=right['portrait']
 assert page.locator('.about-panel').evaluate('(e)=>getComputedStyle(e).backdropFilter')=='none'
 assert page.locator('.about-fog-layer,.about-portrait-fog').count()==0
 # All chapters are explicit tabs on desktop and mobile, with no page scrolling.
 for width,height in [(1440,900),(1000,750),(390,844),(375,667),(320,568),(844,390)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(500)
  for i in range(3):
   click_tab(i);page.wait_for_timeout(600)
   assert page.locator('.about-chapter:visible').count()==1
   assert page.locator(f'#aboutTab{i}').get_attribute('aria-selected')=='true'
   bounds=page.evaluate("""()=>{const panel=document.querySelector('.about-panel').getBoundingClientRect(),text=document.querySelector('.about-chapter:not([hidden]) .about-block:last-child').getBoundingClientRect();return {text:text.bottom,panel:panel.bottom,height:innerHeight,width:document.querySelector('.about-panel').clientWidth,scroll:document.querySelector('.about-panel').scrollWidth}}""")
   assert bounds['text']<=min(bounds['panel'],height)-10,(width,height,i,bounds)
   assert bounds['scroll']<=bounds['width']+24,(width,height,i,bounds)
  if width==1440:click_tab(0);page.wait_for_timeout(600);page.screenshot(path='/tmp/about-chapters-desktop.png')
  if width==390:click_tab(0);page.wait_for_timeout(600);page.screenshot(path='/tmp/about-chapters-mobile.png')
 page.locator('#aboutTab0').focus();page.keyboard.press('ArrowRight');assert page.locator('#aboutTab1').get_attribute('aria-selected')=='true'
 page.keyboard.press('End');assert page.locator('#aboutTab2').get_attribute('aria-selected')=='true'
 page.keyboard.press('Escape');assert page.evaluate('aboutDialog.open');page.wait_for_function('Number(getComputedStyle(aboutDialog).opacity)>0 && Number(getComputedStyle(aboutDialog).opacity)<1');assert page.evaluate('aboutDialog.open');page.wait_for_function('!aboutDialog.open')
 page.click('#launch');page.wait_for_function('aboutDialog.dataset.glass==="ready"');assert page.locator('#aboutTab0').get_attribute('aria-selected')=='true'
 page.wait_for_timeout(500);before=page.evaluate(sample);page.wait_for_timeout(1800);after=page.evaluate(sample);assert before['fog']!=after['fog']
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(500)
 assert page.locator('.about-atmosphere').evaluate('(c)=>{const g=c.getContext("webgl"),p=g.getParameter(g.CURRENT_PROGRAM);return g.getUniform(p,g.getUniformLocation(p,"mobile"))}')==1
 assert not errors,errors
 print('PASS parallax, chapter layout at six sizes, keyboard and reopen')
 b.close()
