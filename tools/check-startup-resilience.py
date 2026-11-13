"""A stalled image must not silently keep the real page at 90 percent forever."""
from pathlib import Path
import argparse, functools, http.server, threading
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--expect-blocked',action='store_true')
parser.add_argument('--critical',action='store_true')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=.5,is_mobile=True,has_touch=True)
    page.set_default_timeout(120000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("""(()=>{
      const original=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src'),held=[];
      let block=sessionStorage.getItem('startup-test-released')!=='1';
      Object.defineProperty(HTMLImageElement.prototype,'src',{...original,set(value){
        const target=location.search.includes('critical')?window.MB_CAVE_URL:window.MB_PHONE_CAR_STUDIO;
        if(block&&target&&value===target){held.push([this,value]);return}
        original.set.call(this,value);
      }});
      window.__releaseImages=()=>{block=false;sessionStorage.setItem('startup-test-released','1');held.forEach(([im,value])=>original.set.call(im,value))};
    })()""")
    page.route('https://fonts.**',lambda r:r.abort())
    url=f'http://127.0.0.1:{server.server_port}/index.html'+('?critical' if args.critical else '')
    page.goto(url,wait_until='domcontentloaded',timeout=180000)
    page.wait_for_function('window.__MB && MBLoading.stone && MBLoading.island && MBLoading.foreground')
    if args.expect_blocked:
        page.wait_for_function('loaderPerc.textContent==="90%"');page.wait_for_timeout(1700)
        assert page.evaluate('MBLoading.phone===false && !MBLoading.ready && loaderBtn.disabled')
        print('REPRODUCED: a deferred phone artwork blocks the complete scene at 90%',flush=True)
    elif args.critical:
        page.wait_for_function('MBLoading.failed')
        assert page.evaluate('!MBLoading.ready && !loaderBtn.disabled && loaderBtn.textContent.includes("Перезагрузить")')
        assert page.evaluate('MBLoading.pending.includes("backdrop")')
        page.evaluate('__releaseImages()');page.locator('#loaderBtn').tap()
        page.wait_for_function('window.MBLoading?.ready')
        assert not errors,errors
        print('PASS stalled background offers a real retry; reload recovers and reaches readiness',flush=True)
    else:
        page.wait_for_function('MBLoading.ready')
        assert page.evaluate('MBLoading.phone===false && !loaderBtn.disabled && loaderPerc.textContent==="100%"')
        page.locator('#loaderBtn').tap()
        page.wait_for_function('__MB.state.studioEntered && __MB.state.phase==="orbit"')
        page.evaluate('__releaseImages()');page.wait_for_function('MBLoading.phone')
        assert not errors,errors
        print('PASS entry works while phone image is deferred; late artwork completes normally',flush=True)
    browser.close()
server.shutdown()
