"""Regression for iOS media preloading/gesture restrictions at the 90% gate."""
from pathlib import Path
import argparse,functools,http.server,threading
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--expect-blocked',action='store_true');args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=.5,is_mobile=True,has_touch=True)
 page.set_default_timeout(120000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("""(()=>{
  window.__videoPlayCalls=[];const add=HTMLMediaElement.prototype.addEventListener,play=HTMLMediaElement.prototype.play;
  // Model Safari deferring its initial decoded frame until user interaction.
  HTMLMediaElement.prototype.addEventListener=function(type,listener,options){if(this.tagName==='VIDEO'&&type==='loadeddata')return;return add.call(this,type,listener,options)};
  HTMLMediaElement.prototype.play=function(){if(this.tagName==='VIDEO'){
   const activated=navigator.userActivation.isActive;window.__videoPlayCalls.push(activated);window.__testVideo=this;
   if(!activated)return Promise.reject(new DOMException('Requires user gesture','NotAllowedError'));
  }return play.call(this)};
 })()""")
 page.route('https://fonts.**',lambda r:r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded',timeout=180000)
 page.wait_for_function('window.__MB && MBLoading.phone && MBLoading.stone && MBLoading.backdrop && MBLoading.island && MBLoading.foreground')
 if args.expect_blocked:
  page.wait_for_function('loaderPerc.textContent==="90%"');page.wait_for_timeout(1800)
  assert page.evaluate('MBLoading.art===false && !MBLoading.ready && loaderBtn.disabled')
  print('REPRODUCED: all scene assets ready; deferred video loadeddata holds loader at 90%',flush=True)
 else:
  page.wait_for_function('MBLoading.ready');assert page.evaluate('!loaderBtn.disabled && loaderPerc.textContent==="100%"')
  assert page.evaluate('MBLoading.art===false'),'Test must still defer the first video event'
  page.locator('#loaderBtn').tap()
  page.wait_for_function("__MB.state.studioEntered && __MB.state.phase==='orbit'")
  page.wait_for_function('window.__testVideo && !__testVideo.paused && __testVideo.currentTime>.1')
  assert page.evaluate('__videoPlayCalls[0]===true'),'Video must start inside the entry gesture'
  page.screenshot(path='/tmp/mobile-startup-fixed.png')
  assert not errors,errors
  print('PASS mobile entry reaches 100% before video loadeddata; entry tap starts muted inline video',flush=True)
 browser.close()
server.shutdown()
