"""Check genuine wheel/touch scrolling and the visible-only film lifecycle."""
from pathlib import Path
# Reuse the production film harness, without running its montage/AI assertions.
exec((Path(__file__).with_name('check-film-studio.py')).read_text().split('with tempfile.TemporaryDirectory')[0])
with tempfile.TemporaryDirectory(prefix='mb-scroll-') as folder,sync_playwright() as p:
    Path(folder,'index.html').write_text(harness)
    Path(folder,'showreel.mp4').write_bytes(base64.b64decode(encoded))
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=folder))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900},has_touch=True)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
    page.wait_for_function('window.__MB && MBSections.state.active')
    page.wait_for_timeout(1200)
    page.screenshot(path='/tmp/scroll-film-entry.png')
    assert page.evaluate('MBFilmStudio.state.aiTime')==0
    assert page.locator('#filmScene .scroll-chapter').count()==3
    assert page.locator('#sectionOptions').is_hidden()
    page.mouse.move(160,650);page.mouse.wheel(0,850)
    page.wait_for_function('MBSections.state.tab===1')
    page.wait_for_timeout(350)
    assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop')>300
    assert page.evaluate('MBFilmStudio.state.editingTime')>0
    assert page.evaluate('MBFilmStudio.state.aiTime')==0
    assert page.locator('#sectionVideoSlot .film-held-frame').count()==1
    page.mouse.wheel(0,900);page.wait_for_function('MBSections.state.tab===2');page.wait_for_timeout(200)
    time=page.evaluate('MBFilmStudio.state.editingTime');page.wait_for_timeout(300)
    assert page.evaluate('MBFilmStudio.state.editingTime')==time
    assert page.evaluate('__MB.slateObjects[0].video.paused')
    assert page.evaluate('MBFilmStudio.state.aiTime')>0
    page.evaluate('MBSections.selectTab(0)');page.wait_for_function('!__MB.slateObjects[0].video.paused')
    page.set_viewport_size({'width':390,'height':844})
    page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop=0');page.wait_for_timeout(500)
    page.screenshot(path='/tmp/scroll-film-entry-mobile.png')
    cdp=page.context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':100,'y':690}]})
    for y in [620,550,480,410,340,270]:
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':100,'y':y}]});page.wait_for_timeout(30)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(450)
    assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop')>150
    assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    page.evaluate('MBSections.close();MBSections.open(0)');page.wait_for_timeout(200)
    assert page.locator('#filmScene .scroll-chapter').count()==3,'Reentry must not duplicate chapters'
    assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop')==0
    assert not errors,errors
    print('PASS wheel, touch, offscreen playback pause, held video frames, mobile width and reentry',flush=True)
    browser.close();server.shutdown()
