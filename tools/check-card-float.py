"""Audit every service card's float, including hover, touch, focus and offscreen states."""
from pathlib import Path
import functools,http.server,threading,sys
from playwright.sync_api import sync_playwright
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
audit='--audit' in sys.argv
selectors=['#filmScene .section-float,#filmChapters button','#webScene .web-site-float','#telegramScene .phone-float,#telegramScene .tg-float,#telegramScene .tg-workspace-host']
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1280,'height':800},device_scale_factor=.5,has_touch=True)
    page.set_default_timeout(120000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('https://fonts.**',lambda r:r.abort())
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
    page.wait_for_function('window.__MB && MBLoading.ready')
    page.evaluate("phase='section';preloader.hidden=true;preloader.classList.add('hidden');ecosystemModal.classList.add('active');ecosystemModal.inert=false;ecosystemModal.style.opacity='1'")
    for width,height in [(1280,800),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        for scene,selector in enumerate(selectors):
            page.evaluate('(n)=>{MBSections.close();MBSections.open(n)}',scene)
            cards=page.locator(selector);assert cards.count()==[6,2,6][scene]
            for i,card in enumerate(cards.all()):
                card.evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})")
                page.wait_for_timeout(200)
                box=card.bounding_box();x=box['x']+box['width']/2;y=min(height-85,max(85,box['y']+box['height']/2))
                page.mouse.move(x,y)
                state=card.evaluate("e=>({name:getComputedStyle(e).animationName,state:getComputedStyle(e).animationPlayState,duration:getComputedStyle(e).animationDuration})")
                print(width,scene,i,state,flush=True)
                if audit:continue
                assert state['name']=='sectionCardFloat' and state['state']=='running',(width,scene,i,state)
                # Compare two actual rendered poses without waiting half an animation cycle.
                span=card.evaluate('''async e=>{
                  const a=e.getAnimations().find(a=>a.animationName==='sectionCardFloat'),time=a.currentTime;
                  a.pause();const positions=[];
                  for(const t of [0,a.effect.getTiming().duration/2]){
                    a.currentTime=t+a.effect.getTiming().duration+a.effect.getTiming().delay;
                    await new Promise(requestAnimationFrame);positions.push(new DOMMatrix(getComputedStyle(e).transform).m42);
                  }
                  a.currentTime=time;a.play();return Math.abs(positions[1]-positions[0]);
                }''')
                assert abs(span-(4 if width<=900 else 6))<.2,(width,scene,i,span)
            assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
            if not audit:
                # Opening contact pauses the section; closing it resumes visible cards.
                page.evaluate('MBSections.openContact()');page.wait_for_timeout(50)
                assert cards.last.evaluate("e=>getComputedStyle(e).animationPlayState")=='paused'
                page.keyboard.press('Escape');page.wait_for_function('!infoDialog.open')
                page.locator('.section-brand').evaluate("e=>e.scrollIntoView({block:'start',behavior:'instant'})")
                page.wait_for_timeout(200)
                expected=cards.last.evaluate("e=>e.closest('.scroll-chapter').classList.contains('is-visible')?'running':'paused'")
                assert cards.last.evaluate("e=>getComputedStyle(e).animationPlayState")==expected
                assert cards.first.evaluate("e=>getComputedStyle(e).animationPlayState")=='running'
        if not audit:
            # A tap/focus on a bot command must not leave the whole workspace frozen.
            page.locator('#telegramBot').evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})")
            page.wait_for_timeout(200)
            button=page.locator('[data-bot-command="price"]');button.focus()
            box=button.bounding_box();point=(box['x']+box['width']/2,box['y']+box['height']/2)
            if width<=900:page.touchscreen.tap(*point)
            else:page.mouse.click(*point)
            page.wait_for_function("botMessages.textContent.includes('Стоимость зависит')")
            assert page.locator('#telegramBot').evaluate("e=>getComputedStyle(e).animationPlayState")=='running'
            page.locator('#telegramCRM').evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})")
            page.wait_for_timeout(250)
            button=page.locator('[data-crm-view="calendar"]')
            button.evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})")
            page.wait_for_timeout(100);box=button.bounding_box()
            point=(box['x']+box['width']/2,box['y']+box['height']/2)
            if width<=900:page.touchscreen.tap(*point)
            else:page.mouse.click(*point)
            page.wait_for_function("MBTelegramStudio.state.crmView==='calendar'")
            assert page.locator('#telegramCRM').evaluate("e=>getComputedStyle(e).animationPlayState")=='running'
            # Reduced-motion preferences still disable decorative movement.
            page.emulate_media(reduced_motion='reduce')
            assert page.locator('#telegramBot').evaluate("e=>getComputedStyle(e).animationName")=='none'
            page.emulate_media(reduced_motion='no-preference')
        print('PASS cards',width,flush=True)
    assert not errors,errors
    browser.close()
server.shutdown()
