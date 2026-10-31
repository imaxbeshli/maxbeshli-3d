"""Browser regression check: python3 tools/check-gallery.py (requires Playwright and Chromium)."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];s=(root/'index.html').read_text();block=re.search(r'<!-- GALLERY_START -->(.*?)<!-- GALLERY_END -->',s,re.S)[1]
html='<html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#081015;color:white;font-family:Arial,sans-serif}canvas{position:fixed;inset:0}</style><canvas id="webgl-canvas" tabindex="0"></canvas><div class="ui-layer"></div><script>window.__MB={state:{studioEntered:true,phase:"orbit"},cancelOrbitDrag(){},returnToOrbit(){}};</script>'+block+'</html>'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('http://gallery.test/',lambda r:r.fulfill(body=html,content_type='text/html; charset=utf-8'));page.goto('http://gallery.test/')
 page.locator('#descendHint').click();page.wait_for_function('MBDescent.arrived');page.wait_for_timeout(1000)
 assert page.locator('.work-card').count()==3
 assert page.locator('.work-card img').evaluate_all('(els)=>els.every(e=>e.complete&&e.naturalWidth>0)')
 page.screenshot(path='/tmp/gallery-desktop.png')
 for i in range(3):
  box=page.locator('.work-card').nth(i).bounding_box();page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
  assert page.evaluate('workViewer.open');assert 'Демонстрационное' in page.locator('#workViewerNote').inner_text()
  page.keyboard.press('Escape');assert not page.evaluate('workViewer.open')
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(600)
 assert page.evaluate('galleryContent.scrollWidth<=galleryContent.clientWidth')
 page.evaluate('selectedWorks.scrollLeft=160')
 assert page.evaluate('selectedWorks.scrollLeft===0 && worksTitle.getBoundingClientRect().left>=0')
 page.screenshot(path='/tmp/gallery-mobile.png')
 page.locator('#galleryUp').click();page.wait_for_function('MBDescent.depth===0')
 assert page.locator('#selectedWorks').get_attribute('aria-hidden')=='true'
 page.mouse.wheel(0,700);page.wait_for_timeout(500);mid=page.evaluate('MBDescent.depth');assert 0<mid<1
 page.mouse.wheel(0,-3000);page.wait_for_function('MBDescent.depth===0')
 assert not errors,errors
 print('PASS gallery art, cards/viewer, mobile layout, scroll descent/reversal and return')
 b.close()
