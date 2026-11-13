"""Exercise production film markup, media and tabs without the expensive main cave."""
from pathlib import Path
import base64, re, tempfile, threading, http.server, functools
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
block=html[html.index('<!-- SECTIONS_START -->'):html.index('<!-- SECTIONS_END -->')]
encoded=re.search(r'<script[^>]*id="showreelVideoData"[^>]*>(.*?)</script>',html,re.S).group(1).strip()
harness='''<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0c1420;color:white;font-family:Arial}#ecosystem-modal{position:fixed;inset:0;display:flex;flex-direction:column;justify-content:space-between}#ecosystem-modal:not(.active){visibility:hidden;opacity:0}</style><dialog id="aboutDialog"></dialog>'''+block
harness+='''<script>(async()=>{const v=document.createElement('video');v.src=URL.createObjectURL(await(await fetch('showreel.mp4')).blob());v.muted=true;v.playsInline=true;v.loop=true;window.__MB={slateObjects:[{video:v,setPlaybackActive(){v.pause()}}]};MBSections.open(0);const e=document.getElementById('ecosystem-modal');e.classList.add('active');e.inert=false;e.style.opacity='1';})();</script>'''

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def handle(self):
        try: super().handle()
        except (BrokenPipeError,ConnectionResetError): pass

with tempfile.TemporaryDirectory(prefix='mb-film-') as folder,sync_playwright() as p:
    Path(folder,'index.html').write_text(harness)
    Path(folder,'showreel.mp4').write_bytes(base64.b64decode(encoded))
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=folder))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
    page.wait_for_function('window.__MB && !__MB.slateObjects[0].video.paused && __MB.slateObjects[0].video.readyState>=2')
    def tab(n):
        assert page.evaluate('(n)=>MBSections.selectTab(n)',n)
        page.wait_for_function(f'MBSections.state.tab==={n} && !document.getElementById("ecosystem-modal").hasAttribute("aria-busy")')
    def stationary_click(selector):
        # Real pointer click in the center avoids Playwright waiting for a floating card to stop.
        r=page.locator(selector).bounding_box();page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2)
    def advance(n,t):
        page.evaluate('''([n,t])=>{const s=MBFilmStudio.state,key=n===1?'editingTime':'aiTime',duration=n===1?22:18;MBFilmStudio.update(performance.now()+40,(t-s[key]+duration)%duration)}''',[n,t])
        page.wait_for_timeout(100)
    assert page.locator('#editChapters,#aiChapters,.edit-preview-title,.edit-title-clip').count()==0
    assert page.locator('#filmScene .section-note,#filmChapters span,.ai-topline>span').count()==0
    assert 'Sequence 01' not in page.locator('#filmEditing').text_content()
    assert page.locator('.edit-timeline .edit-audio').count()==1
    original=page.evaluate('__MB.slateObjects[0].video.currentTime')
    page.wait_for_timeout(300)
    assert page.evaluate('__MB.slateObjects[0].video.currentTime')>original
    page.evaluate('__MB.slateObjects[0].video.currentTime=12')
    page.wait_for_function('!__MB.slateObjects[0].video.seeking && __MB.slateObjects[0].video.currentTime>=12')
    tab(1)
    assert page.locator('#editVideoSlot video').is_visible()
    assert page.locator('#editVideoSlot video').evaluate('v=>v.muted && !v.controls')
    assert page.locator('.edit-source').count()==4
    assert page.locator('.edit-workspaces span').all_text_contents()==['Монтаж','Звук','Цвет']
    assert page.evaluate('__MB.slateObjects[0].video.paused && __MB.slateObjects[0].video.currentTime===0')
    assert float(page.locator('#editVideoSlot').evaluate('e=>getComputedStyle(e).opacity'))==0
    advance(1,1.2)
    assert float(page.locator('.edit-drag').evaluate('e=>getComputedStyle(e).opacity'))>.9
    source=page.locator('#editSource0').bounding_box();ghost=page.locator('.edit-drag').bounding_box();target=page.locator('#editTarget0').bounding_box()
    assert source['y']<ghost['y']<target['y'],'Clip must visibly travel from source bin toward the timeline'
    page.screenshot(path='/tmp/film-studio-transfer.png')
    assert page.evaluate('__MB.slateObjects[0].video.paused'),'Preview must wait for the clip to land'
    advance(1,2.6)
    page.wait_for_function('window.__MB && !__MB.slateObjects[0].video.paused')
    assert page.evaluate('__MB.slateObjects[0].video.currentTime')<.5,'Preview must start at zero, not the shooting position'
    assert float(page.locator('#editTarget0').evaluate('e=>getComputedStyle(e).opacity'))>.99
    assert float(page.locator('#editTarget1').evaluate('e=>getComputedStyle(e).opacity'))==0
    before=page.evaluate('MBFilmStudio.state.editingTime');page.wait_for_timeout(350)
    assert page.evaluate('MBFilmStudio.state.editingTime')>before
    stationary_click('#editPlayback');page.wait_for_timeout(80)
    frozen=page.evaluate('MBFilmStudio.state.editingTime');page.wait_for_timeout(300)
    assert page.evaluate('MBFilmStudio.state.editingTime')==frozen
    assert page.evaluate('__MB.slateObjects[0].video.paused')
    stationary_click('#editPlayback');advance(1,8.8)
    assert page.locator('.edit-workspaces .is-current').inner_text()=='Звук'
    advance(1,12)
    assert page.locator('.edit-workspaces .is-current').inner_text()=='Цвет'
    advance(1,14.5)
    assert float(page.locator('.edit-grade-clip').evaluate('e=>getComputedStyle(e).opacity'))>.99
    assert float(page.locator('#editTarget3').evaluate('e=>getComputedStyle(e).opacity'))>.99
    tab(2)
    assert page.evaluate('__MB.slateObjects[0].video.paused')
    edit_time=page.evaluate('MBFilmStudio.state.editingTime')
    advance(2,1.5)
    early=page.locator('#aiPromptText').inner_text();assert early and len(early)<40
    assert float(page.locator('.ai-image').evaluate('e=>getComputedStyle(e).opacity'))==0
    page.screenshot(path='/tmp/film-studio-ai-typing.png')
    advance(2,4.9)
    full=page.locator('#aiPromptText').inner_text();assert len(full)>len(early) and full.endswith('свет.')
    assert float(page.locator('.ai-image').evaluate('e=>getComputedStyle(e).opacity'))==0,'Image must wait until the prompt is complete'
    page.screenshot(path='/tmp/film-studio-ai-prompt.png')
    advance(2,7.7)
    assert float(page.locator('.ai-image').evaluate('e=>getComputedStyle(e).opacity'))>.99
    assert float(page.locator('#filmAI').evaluate('e=>getComputedStyle(e).getPropertyValue("--ai-scale")'))==1,'Hold the generated image before animating it'
    assert page.locator('#aiAtmosphere').evaluate('e=>!e.getContext("2d").getImageData(0,0,e.width,e.height).data.some((v,i)=>i%4===3&&v>0)'), 'Fog must be absent in the still image stage'
    page.screenshot(path='/tmp/film-studio-ai-result.png')
    advance(2,10);page.wait_for_timeout(100)
    scale_before=float(page.locator('#filmAI').evaluate('e=>getComputedStyle(e).getPropertyValue("--ai-scale")'))
    advance(2,15);page.wait_for_timeout(100)
    scale_after=float(page.locator('#filmAI').evaluate('e=>getComputedStyle(e).getPropertyValue("--ai-scale")'))
    assert scale_after-scale_before>.06,'AI camera must keep pushing in throughout the final scene'
    advance(2,17.6)
    assert float(page.locator('#filmAI').evaluate('e=>getComputedStyle(e).getPropertyValue("--ai-scale")'))>=scale_after,'No visible reverse zoom before the loop'
    advance(2,15)
    assert float(page.locator('.ai-image').evaluate('e=>getComputedStyle(e).opacity'))>.99
    first=page.locator('#aiAtmosphere').evaluate('e=>e.toDataURL()');page.wait_for_timeout(350)
    assert first!=page.locator('#aiAtmosphere').evaluate('e=>e.toDataURL()'),'Atmosphere must visibly animate'
    assert page.evaluate('MBFilmStudio.state.editingTime')==edit_time
    page.locator('#sectionContact').click();page.wait_for_timeout(200)
    frozen=page.evaluate('MBFilmStudio.state.aiTime');page.wait_for_timeout(300)
    assert page.evaluate('MBFilmStudio.state.aiTime')==frozen
    page.keyboard.press('Escape');page.wait_for_function('!infoDialog.open')
    page.wait_for_timeout(200);assert page.evaluate('MBFilmStudio.state.aiTime')>frozen
    assert page.evaluate('__MB.slateObjects[0].video.paused'),'Contact must not start hidden showreel on AI tab'
    tab(0)
    assert page.evaluate('__MB.slateObjects[0].video.currentTime')>=12,page.evaluate('({video:__MB.slateObjects[0].video.currentTime,studio:MBFilmStudio.state})')
    print('PASS shared video, montage playback, AI smoke, tab and contact pausing',flush=True)

    for width,height in [(1440,900),(1366,768),(1280,720),(1024,600),(1920,1080),(390,844)]:
        page.set_viewport_size({'width':width,'height':height});page.mouse.move(0,0)
        positions=[]
        for n in range(3):
            tab(n);page.wait_for_timeout(250)
            positions.append(page.locator('#filmScene .film-frame').nth(n).evaluate('e=>[e.offsetWidth,e.offsetHeight]'))
            dims=page.locator('#ecosystem-modal').evaluate('e=>[e.clientWidth,e.scrollWidth,e.clientHeight,e.scrollHeight]')
            assert dims[1]<=dims[0]+1,(width,height,n,dims)
            assert dims[3]>dims[2], 'Stories must scroll vertically'
            assert page.locator('#filmScene .scroll-chapter').count()==3
            assert page.locator('#sectionOptions').is_hidden()
            if n==1:
                label=page.locator('#editTarget3>span').bounding_box();wave=page.locator('#editTarget3 svg').bounding_box()
                assert wave['y']>=label['y']+label['height'],(width,'Audio wave overlaps filename',label,wave)
                icon=page.locator('#editSource3>i').bounding_box();name=page.locator('#editSource3>span').bounding_box()
                assert icon['x']+icon['width']<=name['x'],(width,'Source wave overlaps filename')
            if width==1440 or width==390:
                if n>0:advance(n,14);page.wait_for_timeout(100)
                page.screenshot(path=f'/tmp/film-studio-{width}-{n}.png')
        assert positions[0]==positions[1]==positions[2],(width,positions)
    print('PASS scroll chapters, equal frame sizes and no horizontal overflow on desktop and mobile',flush=True)
    advance(2,4.9)
    prompt_box=page.locator('.ai-prompt-bar').bounding_box();viewport=page.locator('#filmAI').bounding_box()
    assert prompt_box['x']>=viewport['x'] and prompt_box['x']+prompt_box['width']<=viewport['x']+viewport['width']
    assert prompt_box['y']>=viewport['y'] and prompt_box['y']+prompt_box['height']<=viewport['y']+viewport['height']
    page.screenshot(path='/tmp/film-studio-ai-prompt-mobile.png')
    page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(100)
    frozen=page.evaluate('MBFilmStudio.state.aiTime');page.wait_for_timeout(300)
    assert page.evaluate('MBFilmStudio.state.aiTime')==frozen
    assert page.evaluate('MBFilmStudio.state.paused[2]')
    tab(0);assert page.locator('#sectionVideoSlot video').is_visible()
    assert page.evaluate('Math.abs(__MB.slateObjects[0].video.currentTime-MBFilmStudio.state.shootingTime)<1'),page.evaluate('({video:__MB.slateObjects[0].video.currentTime,studio:MBFilmStudio.state})')
    page.emulate_media(reduced_motion='no-preference');tab(1);advance(1,21.9)
    page.wait_for_function('MBFilmStudio.state.editingTime<1')
    assert page.evaluate('__MB.slateObjects[0].video.paused && __MB.slateObjects[0].video.currentTime===0'),'Every loop must wait and restart from zero'
    tab(0)
    page.evaluate('MBSections.close()');assert page.locator('#filmScene video').count()==0
    assert not errors,errors
    print('PASS reduced motion, return to showreel, teardown, no JavaScript errors',flush=True)
    browser.close();server.shutdown()
