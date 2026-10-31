"""Browser regression check: python3 tools/check-gallery.py (requires Playwright and Chromium)."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'index.html').read_text();block=re.search(r'<!-- GALLERY_START -->(.*?)<!-- GALLERY_END -->',s,re.S)[1]
html='<html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#081015;color:white;font-family:Arial,sans-serif}canvas{position:fixed;inset:0}</style><canvas id="webgl-canvas" tabindex="0"></canvas><div class="ui-layer"></div><script>window.__MB={state:{studioEntered:true,phase:"orbit"},cancelOrbitDrag(){},returnToOrbit(){}};</script>'+block+'</html>'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000},has_touch=True,is_mobile=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('http://gallery.test/',lambda r:r.fulfill(body=html,content_type='text/html; charset=utf-8'));page.goto('http://gallery.test/')
 page.locator('#descendHint').click();page.wait_for_function('MBDescent.arrived');page.wait_for_timeout(1000)
 assert page.locator('.work-card').count()==3
 assert page.locator('.work-card img').evaluate_all('(els)=>els.every(e=>e.complete&&e.naturalWidth>0)')
 # Opaque cover hides the scene swap in both scroll directions.
 for d in [.48,.55,.56,.60,.56,.55,.48]:
  page.evaluate('(d)=>MBDescent.setTarget(d)',d)
  page.wait_for_function('(d)=>MBDescent.depth===d',arg=d)
  assert page.evaluate("getComputedStyle(descentVeil).opacity==='1' && getComputedStyle(document.querySelector('.descent-tint')).opacity==='1'")
  assert page.evaluate("['0','1'].includes(getComputedStyle(selectedWorks).opacity)")
 page.evaluate('MBDescent.setTarget(1)');page.wait_for_function('MBDescent.depth===1')
 assert page.locator('.gallery-world').evaluate("e=>getComputedStyle(e).backgroundImage.startsWith('url(')")
 assert page.locator('.gallery-water').evaluate("e=>getComputedStyle(e).backgroundImage.startsWith('url(')")
 # A partially completed scroll must not freeze the floating panels.
 page.evaluate('MBDescent.setTarget(.92)');page.wait_for_function('MBDescent.depth===.92')
 y1=page.locator('.work-card').first.evaluate('e=>e.getBoundingClientRect().y')
 page.wait_for_timeout(1500)
 y2=page.locator('.work-card').first.evaluate('e=>e.getBoundingClientRect().y')
 assert abs(y2-y1)>1,(y1,y2)
 assert page.locator('#selectedWorks button').count()==3
 assert page.locator('#selectedWorks').inner_text().splitlines()==['Избранные работы','Имиджевый фильм','Вертикальная история','История в деталях']
 page.evaluate('MBDescent.setTarget(1)');page.wait_for_function('MBDescent.depth===1')
 # Test the whole levitation envelope, including captions, on several screens.
 for width,height in [(1440,1000),(1000,750),(390,844)]:
  page.set_viewport_size({'width':width,'height':height})
  for moment in [0,2500,5000,7500]:
   page.locator('.work-card').evaluate_all('(els,t)=>els.forEach(e=>e.getAnimations().forEach(a=>{a.pause();a.currentTime=t}))',moment)
   boxes=page.locator('.work-card').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom}})')
   for i,a in enumerate(boxes):
    for b2 in boxes[i+1:]:assert a['r']<=b2['l'] or b2['r']<=a['l'] or a['b']<=b2['t'] or b2['b']<=a['t'],boxes
 page.locator('.work-card').evaluate_all('(els)=>els.forEach(e=>e.getAnimations().forEach(a=>a.play()))')
 page.set_viewport_size({'width':1440,'height':1000})
 box=page.locator('.work-frame').first.bounding_box();page.mouse.move(box['x']+20,box['y']+20)
 assert page.locator('.work-frame').first.evaluate("e=>getComputedStyle(e).transform==='none'")
 page.screenshot(path='/tmp/gallery-desktop.png')
 for i in range(3):
  box=page.locator('.work-card').nth(i).bounding_box();page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
  assert page.evaluate('workViewer.open');assert page.locator('#workViewerNote').inner_text()==''
  page.keyboard.press('Escape');assert not page.evaluate('workViewer.open')
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(600)
 assert page.evaluate('galleryContent.scrollWidth<=galleryContent.clientWidth')
 page.evaluate('selectedWorks.scrollLeft=160')
 assert page.evaluate('selectedWorks.scrollLeft===0 && worksTitle.getBoundingClientRect().left>=0')
 page.screenshot(path='/tmp/gallery-mobile.png')
 page.keyboard.press('Escape');page.wait_for_function('MBDescent.depth===0')
 assert page.locator('#selectedWorks').get_attribute('aria-hidden')=='true'
 page.mouse.move(200,400);page.mouse.wheel(0,700);page.wait_for_timeout(500);mid=page.evaluate('MBDescent.depth');assert 0<mid<1
 page.mouse.wheel(0,-3000);page.wait_for_function('MBDescent.depth===0')
 # Real touch events must survive the scene becoming inert during return.
 page.locator('#descendHint').click();page.wait_for_function('MBDescent.arrived')
 page.evaluate('galleryContent.scrollTop=0')
 cdp=page.context.new_cdp_session(page)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':280,'y':100}]})
 for i in range(1,13):
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':280,'y':100+660*i/12}]});page.wait_for_timeout(25)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 page.wait_for_function('MBDescent.depth===0')
 assert not errors,errors
 print('PASS gallery art, cards/viewer, mobile layout, scroll descent/reversal and return')
 b.close()
