/* Turn the existing interfaces into a continuous story without cloning state. */
(()=>{
  const root=document.getElementById('ecosystem-modal'),$=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const sceneIds=['filmScene','webScene','telegramScene'];
  const prepared=new Set();let blocks=[],index=-1,onActive=null,current=-1,observer=null,lastMeasure=0,navigation=0;
  const copy={0:[['Съёмка','Кадр, свет и движение. Снимаю людей, продукты и пространство. Ниже — фрагменты моих работ.'],['Монтаж','От исходного материала к цельной истории: видеоряд, звук и цвет.'],['AI-видео','Создаю образы и оживляю сцены с помощью современных технологий.']],1:[['Первое впечатление','Сайт знакомит с вами ещё до разговора. Выстраиваю композицию, типографику и визуал так, чтобы они передавали характер проекта.'],['Движение со смыслом','Объём помогает показать то, что трудно объяснить статичным кадром. Здесь можно управлять строительством дома и сменой света.'],['На любом экране','Мобильная версия — отдельная продуманная композиция. С тем же характером и удобным управлением пальцем.'],['От идеи до запуска','Веду проект целиком: связываю содержание, дизайн и разработку в один понятный процесс.']],2:[['Мини-приложение','Услуги, выбор времени и запись — прямо внутри Telegram.'],['Бот','Выберите услугу и удобное время. Бот проведёт через запись, а результат появится в CRM ниже.'],['CRM','Обращения из разных каналов, записи и расписание — в одном рабочем пространстве.']]};
  function chapter(scene,n,visual){
    const block=document.createElement('section');block.className='scroll-chapter';block.id=`story-${scene}-${n}`;block.dataset.chapter=n;
    const intro=document.createElement('div');intro.className='scroll-copy';const h=document.createElement('h2'),p=document.createElement('p');h.id=block.id+'-title';h.textContent=copy[scene][n][0];p.textContent=copy[scene][n][1];if(n===0){
      const label=document.createElement('div');label.className='section-eyebrow';label.textContent=h.textContent;
      h.textContent=$('modalTitle').textContent;h.className='section-hero-title';p.textContent=$('modalDesc').textContent;
      intro.append(label);
    }
    intro.append(h,p);block.setAttribute('aria-labelledby',h.id);
    const media=document.createElement('div');media.className='scroll-media';media.append(visual);block.append(intro,media);return block;
  }
  function prepare(scene){
    if(prepared.has(scene))return;prepared.add(scene);
    const container=$(sceneIds[scene]);container.classList.add('scroll-story');
    if(scene===0){
      const first=container.querySelector('.section-float'),chapters=$('filmChapters'),views=['filmEditing','filmAI'].map($),content=document.createElement('div');content.append(first,chapters);
      const visuals=[content,...views.map(view=>{
        const float=document.createElement('div');float.className='section-float';const glass=document.createElement('div');glass.className='section-glass film-frame';const viewport=document.createElement('div');viewport.className='film-viewport';viewport.append(view);glass.append(viewport);float.append(glass);return float;
      })];
      visuals.forEach((v,n)=>container.append(chapter(scene,n,v)));
      ['filmShooting','filmEditing','filmAI'].forEach(id=>$(id).hidden=false);chapters.hidden=false;
      // Keep the shooting screen composed while its shared video is in the editor.
      $('sectionVideoSlot').style.backgroundImage=`url("${window.MB_SECTION_IMAGES['film-0']}")`;
    }else if(scene===1){
      // The web studio supplies its own full-width editorial chapters.
    }else{
      ['telegramApp','telegramBot','telegramCRM'].forEach((id,n)=>{const el=$(id);el.hidden=false;container.append(chapter(scene,n,el))});
    }
  }
  function open(scene,callback){
    close();index=scene;onActive=callback;root.classList.toggle('is-scroll-story',scene>=0&&scene<=2);
    if(!root.classList.contains('is-scroll-story'))return;
    prepare(scene);blocks=[...$(sceneIds[scene]).querySelectorAll('.scroll-chapter')];
    blocks.forEach(b=>b.classList.remove('is-revealed','is-visible'));
    observer=new IntersectionObserver(entries=>entries.forEach(e=>{e.target.classList.toggle('is-visible',e.isIntersecting);if(e.isIntersecting)e.target.classList.add('is-revealed')}),{root,rootMargin:'0px',threshold:0});blocks.forEach(b=>observer.observe(b));
    root.scrollTop=0;current=0;onActive(0);lastMeasure=0;
  }
  function close(){root.removeAttribute('aria-busy');navigation++;observer?.disconnect();observer=null;blocks=[];index=-1;current=-1;onActive=null}
  function update(now){
    if(!blocks.length)return true;
    if(now-lastMeasure<90)return mediaVisible();lastMeasure=now;
    const center=root.clientHeight*.5;
    let best=0,distance=Infinity;
    blocks.forEach((b,n)=>{const r=b.getBoundingClientRect(),d=Math.max(r.top-center,center-r.bottom,0);if(d<distance){distance=d;best=n}});
    if(best!==current){current=best;onActive(best)}return mediaVisible();
  }
  function mediaVisible(){const r=blocks[current]?.querySelector('.scroll-media').getBoundingClientRect();return !!r&&r.bottom>90&&r.top<root.clientHeight}
  async function navigate(n){
    const block=blocks[n];if(!block)return false;const token=++navigation;
    block.classList.add('is-revealed');root.setAttribute('aria-busy','true');
    const top=Math.max(0,Math.min(root.scrollHeight-root.clientHeight,root.scrollTop+block.getBoundingClientRect().top-root.getBoundingClientRect().top-100));
    root.scrollTo({top,behavior:reduced.matches?'instant':'smooth'});
    return new Promise(resolve=>{
      const start=performance.now();let stable=0;
      function check(now){
        if(token!==navigation){resolve(false);return}
        stable=Math.abs(root.scrollTop-top)<2?stable+1:0;
        if(stable>=2||now-start>1800){root.removeAttribute('aria-busy');const arrived=Math.abs(root.scrollTop-top)<4;if(arrived){current=n;onActive(n)}resolve(arrived);return}
        requestAnimationFrame(check);
      }requestAnimationFrame(check);
    });
  }
  window.MBSectionScroll={open,close,update,navigate,get active(){return index>=0&&index<=2}};
})();
