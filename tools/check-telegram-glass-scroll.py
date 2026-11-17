"""Glass stays transparent and reuses cached frames during native scrolling."""
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

# Count only this harness's shared glass renderer (the phone uses 2D canvas).
instrument='''<script>window.glassWork={renders:0,resizes:0};const OriginalRenderer=THREE.WebGLRenderer;
THREE.WebGLRenderer=function(...args){const r=new OriginalRenderer(...args),draw=r.render.bind(r),size=r.setSize.bind(r);
r.render=(...a)=>{glassWork.renders++;return draw(...a)};r.setSize=(...a)=>{glassWork.resizes++;return size(...a)};return r};</script>'''
harness=harness.replace('<script>const pc=',instrument+'<script>const pc=')
with tempfile.TemporaryDirectory(prefix='mb-glass-scroll-') as folder, sync_playwright() as p:
    Path(folder,'index.html').write_text(harness)
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=folder))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    for mobile in [False,True]:
        width,height=(390,844) if mobile else (1280,800)
        page=browser.new_page(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
        page.set_default_timeout(45000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
        page.wait_for_function('MBSections.state.active && telegramScene.dataset.glass==="ready"')
        def navigate(tab):
            page.evaluate('(n)=>MBSections.selectTab(n)',tab)
            page.wait_for_function('!document.getElementById("ecosystem-modal").hasAttribute("aria-busy")')
            page.wait_for_timeout(350)
        for tab,selector in [(0,'.automation-flow .tg-glass-host'),(1,'#telegramBot'),(2,'#telegramCRM')]:
            navigate(tab)
            if tab==0:
                assert page.evaluate("""()=>{
                    const r=telegramApp.getBoundingClientRect();
                    const b=document.querySelector(innerWidth<=540?'.phone-bottom-port':'[data-port="1"]').getBoundingClientRect();
                    if(document.getElementById('flowTrunk'))return false;
                    return [...document.querySelectorAll('.connection')].every((g,i)=>{
                        const p=g.children[0],a=p.getPointAtLength(0),z=p.getPointAtLength(p.getTotalLength());
                        const e=document.querySelectorAll('.flow-port')[i].getBoundingClientRect();
                        return Math.hypot(a.x-(b.x+b.width/2-r.x),a.y-(b.y+b.height/2-r.y))<2&&Math.hypot(z.x-(e.x+e.width/2-r.x),z.y-(e.y+e.height/2-r.y))<2;
                    });
                }""")
                if not mobile:
                    assert page.evaluate("""()=>{
                        MBTelegramStudio.update(1175,0);
                        return [...document.querySelectorAll('.connection')].every(g=>{
                            const p=g.children[1],dot=g.children[2],pos=p.getPointAtLength(p.getTotalLength()*.25);
                            return Number(dot.style.opacity)>0&&Math.hypot(Number(dot.getAttribute('cx'))-pos.x,Number(dot.getAttribute('cy'))-pos.y)<1;
                        });
                    }""")
            for host in page.locator(selector).all():
                assert 'glass-ready' in host.get_attribute('class')
                assert host.locator('.tg-glass-canvas').evaluate('''c=>{
                    const alpha=c.getContext('2d').getImageData(c.width>>1,c.height>>1,1,1).data[3];
                    return alpha>0 && alpha<180;
                }'''), 'Glass must expose the live backdrop, not store an opaque background snapshot'
                assert host.locator('.tg-glass-panel').evaluate('e=>getComputedStyle(e,"::before").backdropFilter')=='blur(5px)'
                # The initial fallback and rendered glass must have identical matte fill.
                assert host.evaluate("""h=>{
                    const p=h.querySelector('.tg-glass-panel');
                    const read=()=>{const s=getComputedStyle(p,'::before');return [s.content,s.backgroundImage,s.backdropFilter,s.opacity,s.transitionDuration]};
                    const ready=read();h.classList.remove('glass-ready');const initial=read();h.classList.add('glass-ready');
                    return JSON.stringify(initial)===JSON.stringify(ready)&&initial[0]!=='none'&&initial[4]==='0s';
                }""")
                assert host.evaluate("""h=>{const s=getComputedStyle(h.closest('.scroll-media'));return s.opacity==='1'&&s.transitionDuration==='0s'}""")
            assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
            page.screenshot(path=f'/tmp/telegram-glass-{width}-{tab}.png')
        navigate(0)
        # Prime every size once, then real scroll must reuse the same transparent
        # canvases; neither CSS float nor moving the background needs WebGL work.
        page.evaluate('glassWork={renders:0,resizes:0}')
        page.wait_for_timeout(700)
        assert page.evaluate('glassWork')=={'renders':0,'resizes':0}
        before=page.locator('.tg-glass-canvas').first.evaluate('c=>c.toDataURL()')
        if mobile:
            cdp=page.context.new_cdp_session(page)
            for _ in range(3):
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':45,'y':650}]})
                for y in [570,480,390,300,210]:
                    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':45,'y':y}]});page.wait_for_timeout(50)
                cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(150)
        else:
            page.mouse.move(120,600)
            for _ in range(8):page.mouse.wheel(0,100);page.wait_for_timeout(100)
        assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollTop')>100
        assert before==page.locator('.tg-glass-canvas').first.evaluate('c=>c.toDataURL()')
        assert page.evaluate('glassWork')=={'renders':0,'resizes':0},page.evaluate('glassWork')
        print('PASS',width,'native scroll, transparent cached glass, zero repeated renders/resizes',flush=True)
        # Resize really changes geometry and must invalidate the cached canvases.
        page.set_viewport_size({'width':width-30,'height':height})
        navigate(0)
        page.wait_for_function('glassWork.renders>0')
        assert page.locator('#ecosystem-modal').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
        page.locator('#sectionContact').click();page.wait_for_timeout(500)
        page.evaluate('glassWork={renders:0,resizes:0}');page.wait_for_timeout(500)
        assert page.evaluate('glassWork.renders')==0
        page.keyboard.press('Escape');page.wait_for_function('!infoDialog.open')
        page.emulate_media(reduced_motion='reduce');navigate(0)
        assert page.locator('.tg-float').first.evaluate('e=>getComputedStyle(e).animationName')=='none'
        assert not errors,errors
        print('PASS',width,'resize, contact pause, reduced motion, no page errors',flush=True)
        page.close()
    browser.close();server.shutdown()
