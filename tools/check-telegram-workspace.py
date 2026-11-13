"""Exercise the actual embedded Telegram UI, shared glass and local CRM.

The isolated harness reuses the production Three.js, phone, HTML, CSS and JS.
No external message or studio booking is sent. Run check-sections.py separately
to cover the main camera -> section integration.
"""
from pathlib import Path
import base64, json, re, tempfile, threading, http.server, functools
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
three=next(m.group(1) for m in re.finditer(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',html) if len(m.group(1))>200000 and 'REVISION' in m.group(1) and 'Copyright 2010-2021 Three.js Authors' in m.group(1))
block=html[html.index('<!-- SECTIONS_START -->'):html.index('<!-- SECTIONS_END -->')]
harness='''<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0c1420;color:white;font-family:Arial}#ecosystem-modal{position:fixed;inset:0;display:flex;flex-direction:column;justify-content:space-between}#ecosystem-modal:not(.active){visibility:hidden;opacity:0}</style>'''
harness+='<script>'+three+'</script><script>'+(root/'assets/about-frame.js').read_text()+'</script><dialog id="aboutDialog"></dialog>'+block
data=lambda name:json.dumps('data:image/png;base64,'+base64.b64encode((root/'assets'/name).read_bytes()).decode())
harness+='<script>window.MB_PHONE_DETAILING_SHEET='+data('phone-detailing-sheet.png')+';window.MB_PHONE_CAR_STUDIO='+data('phone-car-studio.png')+';'+(root/'assets/phone-demo.js').read_text()+'</script>'
harness+='''<script>const pc=document.createElement('canvas');pc.width=600;pc.height=1200;const pd=MBPhoneDemo.create(pc,{},()=>{});window.__MB={slateObjects:[{setPlaybackActive(){}},{setPlaybackActive(){},architectureDemo:{update(){}}},{setPlaybackActive(a){pd.update(a)},phoneDemo:pd,screenMat:{map:{image:pc}}}]};pd.ready.then(()=>{MBSections.open(2);const e=document.getElementById('ecosystem-modal');e.classList.add('active');e.inert=false;e.style.opacity='1'});</script>'''

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass

with tempfile.TemporaryDirectory(prefix='mb-telegram-') as folder, sync_playwright() as p:
    Path(folder,'index.html').write_text(harness)
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=folder))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':960},device_scale_factor=1)
    page.set_default_timeout(45000);errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
    page.wait_for_function('MBSections.state.active && telegramScene.dataset.glass==="ready"')
    page.wait_for_timeout(1000)

    def state(): return page.evaluate('MBTelegramStudio.state')
    def click(loc):
        loc.focus();page.wait_for_timeout(100);loc.click()
    def choice(text):
        page.wait_for_function('!MBTelegramStudio.state.typing')
        click(page.locator('#botActions').get_by_role('button',name=text,exact=True))
    def select_tab(n):
        click(page.locator('#sectionOptions button').nth(n));page.wait_for_timeout(200)
    def crm_view(name): click(page.locator(f'[data-crm-view="{name}"]'))
    def book(name,service,time):
        select_tab(1);click(page.locator('#botReset'))
        choice('Подобрать услугу');choice(service);choice('Перейти к записи');choice('BMW X5')
        page.wait_for_function('MBTelegramStudio.state.botStep==="name" && !MBTelegramStudio.state.typing')
        page.locator('#botInput').fill(name);click(page.locator('#botComposer button'))
        choice('Завтра')
        assert '12:00' not in page.locator('#botActions').inner_text(),'Occupied seed booking must not be offered'
        choice(time);choice('Подтвердить запись');choice('Посмотреть запись в CRM')
        return next(l for l in state()['leads'] if l['name']==name)
    def endpoint_error():
        return page.evaluate('''()=>{const r=telegramApp.getBoundingClientRect();return Math.max(...[...telegramConnections.querySelectorAll('.connection')].map((g,i)=>{const p=g.children[1],end=p.getPointAtLength(p.getTotalLength()),b=document.querySelectorAll('.flow-port')[i].getBoundingClientRect();return Math.hypot(end.x-(b.x+b.width/2-r.x),end.y-(b.y+b.height/2-r.y))}))}''')

    assert page.locator('.automation-flow .glass-ready').count()==3
    assert endpoint_error()<2
    page.mouse.move(1380,700);page.wait_for_timeout(700);assert endpoint_error()<2
    assert not re.search(r'демо|демонстрац',page.locator('#telegramScene').inner_text(),re.I)
    page.screenshot(path='/tmp/telegram-workspace-app.png')
    print('PASS physical glass and connectors stay anchored through parallax',flush=True)

    select_tab(1);click(page.locator('[data-bot-command="price"]'));page.wait_for_function('!MBTelegramStudio.state.typing')
    assert 'Стоимость зависит' in page.locator('#botMessages').inner_text()
    click(page.locator('[data-bot-command="address"]'));page.wait_for_function('!MBTelegramStudio.state.typing')
    assert 'Ермакова роща' in page.locator('#botMessages').inner_text()
    first=book('Клиент <b>Тест</b>','Защита кузова','14:00')
    assert first['source']=='Telegram' and first['status']=='confirmed' and first['onCalendar'] and first['reminder']
    assert page.locator('#crmLeadDetail b').count()==0,'Names must render as text, not HTML'
    assert first['name'] in page.locator('#crmLeadDetail').inner_text()
    page.screenshot(path='/tmp/telegram-workspace-crm.png')
    assert '12:00' not in page.locator('#crmBookingTime').inner_text()
    page.locator('#crmBookingTime').select_option('16:00');click(page.locator('#crmBookingForm button[type=submit]'))
    moved=next(l for l in state()['leads'] if l['id']==first['id']);assert moved['time']=='16:00'
    crm_view('calendar');assert first['name'] in page.locator('#crmSchedule').inner_text()
    assert first['name'] not in page.locator('.crm-slot').filter(has=page.locator('time',has_text='14:00')).inner_text()
    page.screenshot(path='/tmp/telegram-workspace-calendar.png')
    print('PASS branching bot, escaped names, shared booking, conflict prevention and rescheduling',flush=True)

    crm_view('rules')
    for rule in ['assign','calendar','reminder']:
        control=page.locator(f'[data-crm-rule="{rule}"]')
        control.focus();page.keyboard.press('Space');assert not control.is_checked()
    second=book('Мария Тест','Уход за салоном','18:00')
    assert not second['onCalendar'] and not second['reminder'] and second['assignee']=='Не назначен'
    click(page.locator('#crmAddCalendar'));click(page.locator('#crmReminder'))
    assert '18:00' in page.locator('#crmReminderText').inner_text()
    crm_view('calendar');assert 'Мария Тест' in page.locator('#crmSchedule').inner_text()
    crm_view('leads');click(page.locator('#crmCancel'))
    assert next(l for l in state()['leads'] if l['id']==second['id'])['status']=='cancelled'
    page.locator('#crmSource').select_option('WhatsApp');assert 'Мария' in page.locator('#crmLeadList').inner_text()
    page.locator('#crmSearch').fill('Mercedes');click(page.locator('#crmTake'))
    assert next(l for l in state()['leads'] if l['id']=='seed-wa')['status']=='working'
    page.locator('#crmSearch').fill('Никого');assert 'Обращений по этому запросу нет' in page.locator('#crmLeadList').inner_text()
    page.locator('#crmSearch').fill('');page.locator('#crmSource').select_option('all')
    print('PASS effective automation toggles, manual calendar, cancellation, source filters and search',flush=True)

    count=len(state()['leads']);click(page.locator('#crmStream'));assert state()['auto']
    page.wait_for_function('(count)=>MBTelegramStudio.state.leads.length>count',arg=count,timeout=20000)
    assert len(state()['leads'])==count+1
    click(page.locator('#crmLeadList button').first);assert not state()['auto']
    count=len(state()['leads']);page.evaluate('MBTelegramStudio.update(performance.now()+9000,9)');assert len(state()['leads'])==count
    for n in [0,1,2]:
        page.set_viewport_size({'width':390,'height':844});select_tab(n);page.wait_for_timeout(800)
        dims=page.locator('#ecosystem-modal').evaluate('(e)=>[e.clientWidth,e.scrollWidth]');assert dims[1]<=dims[0]+1,dims
        if n==0:assert endpoint_error()<2
        page.screenshot(path=f'/tmp/telegram-workspace-mobile-{n}.png')
    page.emulate_media(reduced_motion='reduce');select_tab(0);page.wait_for_timeout(300)
    assert page.locator('.tg-float').first.evaluate('(e)=>getComputedStyle(e).animationName')=='none'
    page.reload();page.wait_for_function('MBSections.state.active')
    assert next(l for l in state()['leads'] if l['id']==first['id'])['time']=='16:00'
    assert not errors,errors
    print('PASS incoming flow pauses on interaction, mobile layout, reduced motion, session persistence; no page errors',flush=True)
    browser.close();server.shutdown()
