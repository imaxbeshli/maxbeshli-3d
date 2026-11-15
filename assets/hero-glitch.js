/* Stable text layout, independent letter timing and a soft return to the original. */
window.MBHeroGlitch = (() => {
  const duration = 3.6, alphabet = '0123456789ABCDEF#%';
  const smooth = (a,b,x) => {const p=Math.max(0,Math.min(1,(x-a)/(b-a)));return p*p*(3-2*p);};
  function create(elements, container) {
    const originals=elements.map(el=>({el,html:el.innerHTML,label:el.getAttribute('aria-label'),text:el.textContent}));
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let started=null,letters=[];
    function finish(){
      if(started===null)return;
      started=null;letters=[];
      originals.forEach(r=>{r.el.innerHTML=r.html;if(r.label===null)r.el.removeAttribute('aria-label');else r.el.setAttribute('aria-label',r.label)});
      container.classList.remove('glitching');container.style.removeProperty('filter');
    }
    function start(now){
      finish();started=now;container.classList.add('glitching');
      if(reduced.matches)return;
      originals.forEach(r=>{
        const spread=Math.min(1,parseFloat(getComputedStyle(r.el).fontSize)/40);
        r.el.setAttribute('aria-label',r.text);r.el.replaceChildren();
        r.text.split(/(\s+)/).forEach(word=>{
          if(/^\s+$/.test(word)){r.el.append(document.createTextNode(word));return}
          const group=document.createElement('span');group.className='glitch-word';group.setAttribute('aria-hidden','true');
          for(const ch of word){
            const el=document.createElement('span'),base=document.createElement('span'),noise=document.createElement('span');
            el.className='glitch-letter';base.textContent=ch;noise.className='glitch-noise';el.append(base,noise);group.append(el);
            letters.push({el,base,noise,end:.52+Math.random()*.42,x:(Math.random()*2-1)*8*spread,y:(Math.random()*2-1)*5*spread,rotation:(Math.random()*2-1)*5,phase:Math.random()*Math.PI*2,rate:15+Math.random()*17,tick:-1});
          }
          r.el.append(group);
        });
      });
      update(now);
    }
    function update(now){
      if(started===null)return;
      const age=Math.max(0,(now-started)/1000),p=age/duration;
      if(p>=1){finish();return}
      const strength=smooth(0,.04,p)*(1-smooth(.42,1,p));
      container.style.filter=`drop-shadow(${3*strength}px 0 rgba(255,35,60,${.65*strength})) drop-shadow(${-3*strength}px 0 rgba(0,215,255,${.65*strength}))`;
      letters.forEach(l=>{
        const scatter=smooth(0,.045,p)*(1-smooth(l.end-.25,l.end,p));
        // Each glyph fades onto its original, in random order, without changing width.
        const noise=smooth(0,.025,p)*(1-smooth(l.end-.17,l.end,p));
        const tick=Math.floor(l.rate*.8*Math.log1p(age/.8)+l.phase);
        if(noise>0&&tick!==l.tick){l.tick=tick;l.noise.textContent=alphabet[Math.floor(Math.random()*alphabet.length)]}
        l.noise.style.opacity=noise.toFixed(3);l.base.style.opacity=(1-noise).toFixed(3);
        l.el.style.transform=`translate(${(l.x*scatter*Math.sin(age*8+l.phase)).toFixed(3)}px,${(l.y*scatter*Math.cos(age*7+l.phase)).toFixed(3)}px) rotate(${(l.rotation*scatter*Math.sin(age*6+l.phase)).toFixed(3)}deg)`;
      });
    }
    return {start,update,finish,get active(){return started!==null}};
  }
  return {create,duration};
})();
