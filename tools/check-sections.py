"""Browser integration checks for interior scenes and the direct contact overlay."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import threading, http.server, functools

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':700,'height':600},device_scale_factor=.75)
    page.set_default_timeout(90000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('https://fonts.**',lambda r:r.abort())
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
    page.wait_for_function('window.__MB && MBLoading.ready')
    page.locator('#loaderBtn').click()
    page.wait_for_function("__MB.state.phase==='orbit'")
    page.context.set_offline(True)
    print('PASS main enters, remaining checks run offline',flush=True)

    def enter(i):
        page.set_viewport_size({'width':700,'height':600})
        page.evaluate(f'__MB.focusTile({i})')
        page.wait_for_function("__MB.state.phase==='focused'")
        page.evaluate("""()=>{
            window.__entryFrames=[];
            const sample=()=>{
                const {camera,slateObjects,state}=__MB,obj=slateObjects[state.selectedIndex].holder;
                obj.updateWorldMatrix(true,false);
                const centre=obj.getWorldPosition(camera.position.clone());
                const normal=obj.getWorldDirection(camera.position.clone());
                const opacity=Number(getComputedStyle(document.getElementById('ecosystem-modal')).opacity);
                __entryFrames.push({phase:state.phase,distance:camera.position.clone().sub(centre).dot(normal),veil:Number(getComputedStyle(document.getElementById('travelVeil')).opacity),opacity});
                if(state.phase==='diving'||(state.phase==='section'&&opacity<1))requestAnimationFrame(sample);
            };
            __MB.startDive();sample();
        }""")
        page.wait_for_function("__MB.state.phase==='section'")
        page.wait_for_timeout(1000)
        page.wait_for_function('__entryFrames.at(-1).phase==="section" && __entryFrames.at(-1).opacity===1')
        frames=page.evaluate('__entryFrames')
        revealed=[f['opacity'] for f in frames if f['phase']=='section']
        assert revealed[0]<.1 and any(.1<v<.9 for v in revealed),'Section must reveal gradually from black'
        assert all(a<=b for a,b in zip(revealed,revealed[1:])),'Reveal must not flash backwards'
        assert page.locator('.section-intro').evaluate('(e)=>getComputedStyle(e).animationName')=='none','No text fly-in'

        assert min(f['distance'] for f in frames)>1.5,'Camera must stay in front of the glass'
        assert any(f['phase']=='diving' and f['veil']==1 for f in frames),'Full black must precede section reveal'
        assert page.locator('#travelVeil').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(0, 0, 0)'
        assert page.locator('#travelVeil').evaluate('(e)=>Number(getComputedStyle(e).opacity)')==1,'Keep black under the section fade'
        print(f'PASS tile {i}: camera stays in front, black frame before section',flush=True)
        assert page.locator('#ecosystem-modal').get_attribute('data-scene')==str(i)

    def leave():
        page.set_viewport_size({'width':700,'height':600})
        page.locator('#modalCloseBtn').click()
        page.wait_for_function("__MB.state.phase==='focused'")
        assert page.locator('#ecosystem-modal').evaluate('(e)=>e.inert')
        assert not page.evaluate('MBSections.state.active')
        page.evaluate('__MB.returnToOrbit()')

    def screenshot(name):
        page.set_viewport_size({'width':1440,'height':960})
        page.wait_for_timeout(1200)
        page.screenshot(path=f'/tmp/sections-{name}-desktop.png')

    def mobile(name):
        page.set_viewport_size({'width':390,'height':844})
        page.wait_for_timeout(600)
        assert page.locator('#ecosystem-modal').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
        page.screenshot(path=f'/tmp/sections-{name}-mobile.png')
        assert page.locator('#modalCloseBtn').is_visible()

    def click_floating(selector):
        # Hover the moving panel as a visitor would: its float pauses on hover.
        el=page.locator(selector)
        el.wait_for(state="visible")
        page.wait_for_function('!document.getElementById("ecosystem-modal").hasAttribute("aria-busy")')
        el.evaluate('(e)=>e.scrollIntoView({block:"nearest",behavior:"instant"})')
        box=el.bounding_box()
        page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
        page.wait_for_timeout(800)
        el.click()

    enter(0)
    page.wait_for_function('!__MB.slateObjects[0].video.paused')
    before=page.evaluate('__MB.slateObjects[0].video.currentTime')
    page.wait_for_timeout(600)
    assert page.evaluate('__MB.slateObjects[0].video.currentTime')>before
    assert page.locator('#sectionVideoSlot video').evaluate('(v)=>v.muted&&v.playsInline&&v.controls')
    page.locator('#sectionContact').click();page.wait_for_timeout(400)
    assert page.evaluate('__MB.slateObjects[0].video.paused')
    contact_time=page.evaluate('__MB.slateObjects[0].video.currentTime');page.wait_for_timeout(300)
    assert page.evaluate('__MB.slateObjects[0].video.currentTime')==contact_time
    page.locator('#infoClose').evaluate('(e)=>e.click()');page.wait_for_function('!infoDialog.open && !__MB.slateObjects[0].video.paused')

    page.locator('[data-film-time="16"]').evaluate('(e)=>e.click()')
    assert page.evaluate('__MB.slateObjects[0].video.currentTime')>=16
    page.evaluate('MBSections.selectTab(1)')
    page.wait_for_function('MBSections.state.tab===1 && !document.getElementById("ecosystem-modal").hasAttribute("aria-busy")')
    assert 'видеоряд' in page.locator('#story-0-1 .scroll-copy').inner_text()
    assert page.locator('#editVideoSlot video').is_visible()
    screenshot('film');mobile('film');leave()
    assert page.locator('#sectionVideoSlot video').count()==0
    print('PASS video shares existing source, plays, seeks and returns',flush=True)

    enter(1);screenshot('web')
    click_floating('[data-web-mode="1"]')
    page.wait_for_timeout(500)
    t=page.evaluate('__MB.slateObjects[1].architectureDemo.state.time')
    page.wait_for_timeout(500)
    assert page.evaluate('__MB.slateObjects[1].architectureDemo.state.time')>t
    assert page.locator('#architectureSlot canvas').is_visible()
    click_floating('[data-web-mode="2"]')
    assert page.locator('#webFrame').evaluate('(e)=>e.classList.contains("is-mobile")')
    click_floating('[data-web-mode="0"]');mobile('web');leave()
    print('PASS website overview, live architecture and mobile composition',flush=True)

    enter(2);screenshot('telegram')
    assert page.evaluate('__MB.slateObjects[2].phoneDemo.state.active')
    page.evaluate('MBSections.selectTab(1)')
    click_floating('[data-bot-command="price"]')
    page.wait_for_timeout(850)
    assert page.locator('.tg-message').count()==3
    page.evaluate('MBSections.selectTab(2)')
    click_floating('[data-lead="seed-wa"]')
    click_floating('#crmTake')
    assert page.evaluate('MBTelegramStudio.state.leads.find(l=>l.id==="seed-wa").status')=='working'
    page.evaluate('MBSections.selectTab(0)');mobile('telegram')
    print('PASS mini-app playback, bot answers and CRM demonstration',flush=True)

    before_contact=page.evaluate('({section:MBSections.state,crm:MBTelegramStudio.state.leads})')
    page.locator('#sectionContact').click();page.wait_for_timeout(1000)
    assert page.locator('#infoDialog form, #infoDialog input, #infoDialog textarea').count()==0
    assert page.locator('#contactPhone').get_attribute('href')=='tel:+79116997363'
    assert page.locator('#contactTelegram').get_attribute('href')=='https://t.me/IMAXBESHLI'
    assert page.locator('#infoDialog').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)'
    assert 'blur(8px)' in page.locator('#infoDialog').evaluate('(e)=>getComputedStyle(e,"::backdrop").backdropFilter')
    assert page.locator('.tg-float').first.evaluate('(e)=>getComputedStyle(e).animationPlayState')=='paused'
    t=page.evaluate('__MB.slateObjects[2].phoneDemo.state.time');page.wait_for_timeout(350)
    assert page.evaluate('__MB.slateObjects[2].phoneDemo.state.time')==t
    page.screenshot(path='/tmp/sections-contact-mobile.png')
    assert page.locator('#infoDialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1 && e.scrollHeight<=e.clientHeight+1')
    page.set_viewport_size({'width':1440,'height':960});page.wait_for_timeout(400)
    page.screenshot(path='/tmp/sections-contact-desktop.png')
    page.evaluate("""()=>{window.__contactLinks=[];document.querySelectorAll('.contact-link').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();__contactLinks.push(a.href)}))}""")
    page.locator('#contactPhone').evaluate('(e)=>e.click()');page.locator('#contactTelegram').evaluate('(e)=>e.click()')
    assert page.evaluate('__contactLinks')==['tel:+79116997363','https://t.me/IMAXBESHLI']
    page.keyboard.press('Escape');page.wait_for_function('!infoDialog.open')
    assert page.evaluate('__MB.state.phase')=='section'
    assert page.evaluate('document.activeElement.id')=='sectionContact'
    assert page.evaluate('MBSections.state.tab')==before_contact['section']['tab']
    assert page.evaluate('MBTelegramStudio.state.leads')==before_contact['crm']
    page.wait_for_function('__MB.slateObjects[2].phoneDemo.state.active')
    leave();page.wait_for_function('__MB.state.zoomFactor<.01')
    print('PASS direct contacts, blurred current scene, paused animation and restored section state',flush=True)
    page.set_viewport_size({'width':1440,'height':960})
    page.locator('.cta-btn').first.click();page.wait_for_timeout(1000)
    camera=page.evaluate('__MB.camera.position.toArray()');page.wait_for_timeout(300)
    assert page.evaluate('__MB.camera.position.toArray()')==camera
    page.screenshot(path='/tmp/sections-contact-home.png')
    page.locator('.contact-wrap').click(position={'x':5,'y':5});page.wait_for_function('!infoDialog.open')
    assert page.evaluate('__MB.state.phase')=='orbit'
    page.emulate_media(reduced_motion='reduce');page.evaluate('MBSections.openContact()')
    assert page.locator('.contact-panel').evaluate('(e)=>getComputedStyle(e).animationName')=='none'
    page.locator('#infoClose').evaluate('(e)=>e.click()');page.wait_for_function('!infoDialog.open')
    assert not errors,errors
    print('PASS no JavaScript errors; all environments available offline',flush=True)
    browser.close()
server.shutdown()
