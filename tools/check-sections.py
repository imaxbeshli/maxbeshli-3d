"""Browser integration checks for interior scenes and the Telegram draft form."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import threading, http.server, functools, urllib.parse

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
        page.evaluate('__MB.startDive()')
        page.wait_for_function("__MB.state.phase==='section'")
        page.wait_for_timeout(1000)
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
    page.locator('[data-film-time="16"]').click()
    assert page.evaluate('__MB.slateObjects[0].video.currentTime')>=16
    page.locator('#sectionOptions button').nth(1).click()
    assert 'структура' in page.locator('#sectionDetail').inner_text()
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
    page.locator('#sectionOptions button').nth(1).click()
    click_floating('[data-bot-command="price"]')
    page.wait_for_timeout(850)
    assert page.locator('.tg-message').count()==3
    page.locator('#sectionOptions button').nth(2).click()
    click_floating('[data-lead="seed-wa"]')
    click_floating('#crmTake')
    assert page.evaluate('MBTelegramStudio.state.leads.find(l=>l.id==="seed-wa").status')=='working'
    page.locator('#sectionOptions button').nth(0).click();mobile('telegram')
    print('PASS mini-app playback, bot answers and CRM demonstration',flush=True)

    page.locator('#sectionContact').click()
    assert page.locator('input[name="direction"]:checked').input_value()=='Telegram'
    page.wait_for_timeout(700)
    page.screenshot(path='/tmp/sections-contact-mobile.png')
    assert page.locator('#infoDialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    page.set_viewport_size({'width':1440,'height':960});page.wait_for_timeout(400)
    page.screenshot(path='/tmp/sections-contact-desktop.png')
    page.locator('[name="name"]').fill('Тестовый клиент')
    page.locator('[name="task"]').fill('Нужен сайт & Telegram. Тест — не отправлять.')
    page.evaluate('window.open=(url)=>{window.__draftURL=url;return null}')
    page.locator('#projectForm button[type="submit"]').click()
    url=page.evaluate('window.__draftURL')
    parsed=urllib.parse.urlparse(url)
    assert parsed.netloc=='t.me' and parsed.path=='/IMAXBESHLI'
    message=urllib.parse.parse_qs(parsed.query)['text'][0]
    assert 'Тестовый клиент' in message and 'Нужен сайт & Telegram' in message and 'Направление: Telegram' in message
    assert page.locator('#contactResult').is_visible()
    page.keyboard.press('Escape');page.wait_for_function('!infoDialog.open')
    assert page.evaluate('__MB.state.phase')=='section'
    assert page.evaluate('document.activeElement.id')=='sectionContact'
    leave()
    print('PASS Telegram draft URL and nested dialog Escape/focus restoration',flush=True)
    page.evaluate('MBSections.openContact()');page.wait_for_timeout(650)
    assert page.locator('input[name="direction"]:checked').input_value()=='Пока не решил'
    page.locator('#infoClose').click();page.wait_for_function('!infoDialog.open')
    assert not errors,errors
    print('PASS no JavaScript errors; all environments available offline',flush=True)
    browser.close()
server.shutdown()
