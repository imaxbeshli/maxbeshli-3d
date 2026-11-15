"""Letter motion must settle continuously, preserve layout and survive retriggering."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
css=re.search(r'<style>(.*?)</style>',html,re.S).group(1)
copy=html[html.index('<h1 class="hero-title"'):html.index('</p>',html.index('<h1 class="hero-title"'))+4]
script=(root/'assets/hero-glitch.js').read_text()
assert script in html
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height in [(1440,900),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height})
  page.set_content('<style>'+css+'</style><div class="hero-left"><div id="heroLeftInner">'+copy+'</div></div><script>'+script+'</script>')
  page.evaluate('window.effect=MBHeroGlitch.create([heroTitle,heroSubtitle,heroDesc],heroLeftInner)')
  result=page.evaluate('''()=>{
   const els=[heroTitle,heroSubtitle,heroDesc],original=els.map(e=>e.innerHTML),bounds=els.map(e=>e.getBoundingClientRect().height);
   effect.start(0);effect.update(3600*.6);
   const letters=[...document.querySelectorAll('.glitch-letter')],noise=letters.map(e=>+e.lastChild.style.opacity);
   if(!noise.some(x=>x>0&&x<1))throw Error('No gradual glyph crossfade');
   if(!noise.some((x,i)=>i&&x>noise[i-1]+.1))throw Error('Letters settle in reading order');
   const transforms=letters.map(e=>e.style.transform);
   if(new Set(transforms).size<20)throw Error('Letters share the same motion');
   effect.update(3600*.9);
   letters.forEach((e,i)=>{if(+e.lastChild.style.opacity>noise[i]+.001)throw Error('Settled letter scrambled again')});
   effect.update(3599);
   if(letters.some(e=>Math.abs(new DOMMatrix(e.style.transform).m41)>.001||+e.lastChild.style.opacity!==0))throw Error('Exit snaps');
   const end=els.map(e=>e.getBoundingClientRect().height);
   effect.update(3600);
   if(effect.active||els.some((e,i)=>e.innerHTML!==original[i]))throw Error('Original markup not restored');
   if(end.some((h,i)=>Math.abs(h-bounds[i])>1))throw Error('Text layout jumps at exit: '+JSON.stringify([bounds,end]));
   effect.start(4000);effect.update(4500);effect.start(4600);effect.update(8200);
   if(effect.active||document.querySelector('.glitch-letter')||els.some((e,i)=>e.innerHTML!==original[i]))throw Error('Retrigger cleanup failed');
   return {width:innerWidth,letters:letters.length};
  }''')
  print('PASS random scatter, crossfade, stable layout and retrigger:',result,flush=True)
  page.evaluate('effect.start(0);effect.update(1400)')
  page.screenshot(path=f'/tmp/hero-glitch-{width}.png')
  page.evaluate('effect.update(3300)')
  page.screenshot(path=f'/tmp/hero-glitch-settle-{width}.png')
  page.emulate_media(reduced_motion='reduce')
  page.evaluate('effect.start(9000);effect.update(10000)')
  assert page.locator('.glitch-letter').count()==0
  page.evaluate('effect.update(12600)');assert page.evaluate('!effect.active')
  page.close()
 browser.close()
