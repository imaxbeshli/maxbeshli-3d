/* FORMA: an offline architectural website inside the web portfolio tile.
   A real Three.js model assembles over a 30-second day/night/day cycle. */
window.MBArchitectureDemo = {
  duration: 30,
  create(canvas, T, onFrame) {
    const ctx=canvas.getContext('2d'), W=1200, H=750;
    const clamp=v=>Math.max(0,Math.min(1,v));
    const smooth=(a,b,t)=>{const v=clamp((t-a)/(b-a));return v*v*(3-2*v)};
    const scene=new T.Scene();
    const skyDay=new T.Color('#c9dce3'),skyNight=new T.Color('#172435');
    scene.background=skyDay.clone();scene.fog=new T.Fog(skyDay,35,100);
    const camera=new T.PerspectiveCamera(38,1200/548,.1,120);
    const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
    renderer.setPixelRatio(1);renderer.setSize(1000,457,false);
    renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.15;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    const hemi=new T.HemisphereLight('#f5f7ef','#767762',1.0);scene.add(hemi);
    const sun=new T.DirectionalLight('#fff0d5',2.4);sun.position.set(-9,13,9);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-16;sun.shadow.camera.right=16;
    sun.shadow.camera.top=15;sun.shadow.camera.bottom=-15;sun.shadow.camera.near=.5;sun.shadow.camera.far=60;
    sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;scene.add(sun);
    const fill=new T.DirectionalLight('#b7d4f0',.25);fill.position.set(7,7,-9);scene.add(fill);
    const materials={};
    function mat(name,color,extra={}){return materials[name]=new T.MeshStandardMaterial({color,roughness:.76,...extra})}
    const concrete=mat('concrete','#d4d0c4'),white=mat('white','#eee9db'),dark=mat('dark','#39413f');
    const timber=mat('timber','#836244'),woodLight=mat('woodLight','#ac8761');
    const soil=mat('soil','#b5b4a2'),grass=mat('grass','#6f7c60'),leaf=mat('leaf','#52654d');
    const bronze=mat('bronze','#373e3b',{metalness:.65,roughness:.32});
    const glass=mat('glass','#8da8ac',{transparent:true,opacity:.46,roughness:.12,metalness:.45,side:T.DoubleSide,depthWrite:false});
    // Small procedural reflection environment: no images or network dependencies.
    const envFaces=[];
    for(let i=0;i<6;i++){
      const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
      const g=x.createLinearGradient(0,0,0,64);g.addColorStop(0,'#e6f0ef');g.addColorStop(.5,'#c0c8ba');g.addColorStop(1,'#5d665a');
      x.fillStyle=g;x.fillRect(0,0,64,64);x.fillStyle='#fff6df';x.fillRect(8+i*3,7,6,32);envFaces.push(c);
    }
    const env=new T.CubeTexture(envFaces);env.encoding=T.sRGBEncoding;env.needsUpdate=true;glass.envMap=env;glass.envMapIntensity=.7;
    const ground=new T.Mesh(new T.PlaneGeometry(160,160),mat('ground','#cecfbf'));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.24;ground.receiveShadow=true;scene.add(ground);
    const boxGeo=new T.BoxGeometry(1,1,1);
    function block(parent,w,h,d,px,py,pz,material,shadow=true){
      const m=new T.Mesh(boxGeo,material);m.scale.set(w,h,d);m.position.set(px,py,pz);
      m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;
    }
    block(scene,14.3,.12,10.8,0,-.16,.4,soil);
    // Seeded textures and layered foliage keep the scene self-contained and repeatable.
    let seed=77;
    function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
    function surface(material,base,grain,repeat){
      const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
      x.fillStyle=base;x.fillRect(0,0,256,256);
      for(let i=0;i<9500;i++){x.fillStyle=`rgba(${grain},${.04+random()*.12})`;x.fillRect(random()*256,random()*256,1+random()*3,1+random()*2)}
      const map=new T.CanvasTexture(c);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(repeat,repeat);map.encoding=T.sRGBEncoding;
      material.map=map;material.bumpMap=map;material.bumpScale=.035;material.needsUpdate=true;
    }
    surface(concrete,'#d4d0c4','70,65,55',2);
    surface(white,'#eee9db','135,128,110',2);
    surface(materials.ground,'#839276','30,55,23',55);
    surface(timber,'#987552','45,25,10',3);
    const foliageGeo=new T.SphereGeometry(1,8,6);
    const leafCanvas=document.createElement('canvas');leafCanvas.width=leafCanvas.height=128;
    const leafCtx=leafCanvas.getContext('2d');
    for(let i=0;i<480;i++){
      leafCtx.fillStyle=['#253e20','#3a542e','#506c37','#6b8245'][Math.floor(random()*4)];
      leafCtx.beginPath();leafCtx.ellipse(random()*128,random()*128,2+random()*5,1+random()*3,random()*Math.PI,0,Math.PI*2);leafCtx.fill();
    }
    const leafMap=new T.CanvasTexture(leafCanvas);leafMap.encoding=T.sRGBEncoding;
    const foliageMaterials=['#344c32','#46613b','#5d7546','#718352'].map(color=>new T.MeshStandardMaterial({color:'#d4dfbe',map:leafMap,alphaTest:.45,side:T.DoubleSide,roughness:1}));
    function tree(parent,px,pz,h=3.2){
      const g=new T.Group();g.position.set(px,-.12,pz);parent.add(g);
      const trunk=new T.Mesh(new T.CylinderGeometry(.035*h,.055*h,h*.68,8),timber);
      trunk.position.y=h*.34;g.add(trunk);trunk.castShadow=true;
      for(let j=0;j<4;j++){
        const branch=new T.Mesh(new T.CylinderGeometry(.014*h,.025*h,h*.36,6),timber);
        const angle=j*2.4;branch.position.set(Math.sin(angle)*h*.09,h*(.46+j*.035),Math.cos(angle)*h*.09);
        branch.rotation.set(Math.cos(angle)*.55,0,Math.sin(angle)*.55);g.add(branch);
      }
      // Many overlapping irregular crowns, instead of a single faceted solid.
      const crowns=new T.InstancedMesh(foliageGeo,foliageMaterials[Math.floor(random()*4)],48);
      const pose=new T.Object3D();
      for(let j=0;j<48;j++){
        const angle=j*2.399,r=Math.sqrt(random())*h*.27;
        pose.position.set(Math.cos(angle)*r,h*(.6+random()*.35),Math.sin(angle)*r);
        pose.scale.set(h*(.12+random()*.09),h*(.14+random()*.1),h*(.12+random()*.09));
        pose.rotation.set(random(),random(),random());pose.updateMatrix();crowns.setMatrixAt(j,pose.matrix);
      }
      crowns.castShadow=true;crowns.receiveShadow=true;g.add(crowns);return g;
    }
    [[-8,-5,4.8],[8,-6,5.4],[10,1,4.2],[-9,6,3.6]].forEach(v=>tree(scene,...v));
    // A wooded horizon and low rolling terrain give the architecture a real setting.
    for(let i=0;i<32;i++){const a=2.2+i*.11;const r=20+random()*13;tree(scene,Math.cos(a)*r,Math.sin(a)*r-15,4+random()*4)}
    for(let i=0;i<7;i++){
      const hill=new T.Mesh(new T.SphereGeometry(1,24,12),grass);
      hill.position.set(-50+i*17,-1.8,-43-random()*10);hill.scale.set(18,3+random()*4,12);hill.receiveShadow=true;scene.add(hill);
    }
    const boundaryGeo=new T.BufferGeometry().setFromPoints([
      new T.Vector3(-4.45,-.08,-2.95),new T.Vector3(4.45,-.08,-2.95),new T.Vector3(4.45,-.08,2.95),
      new T.Vector3(-4.45,-.08,2.95),new T.Vector3(-4.45,-.08,-2.95)]);
    const boundary=new T.Line(boundaryGeo,new T.LineDashedMaterial({color:'#787e70',dashSize:.25,gapSize:.16,transparent:true,opacity:.6}));
    boundary.computeLineDistances();scene.add(boundary);
    const stages=[];
    function stage(name,start,end){const g=new T.Group();g.name=name;scene.add(g);stages.push({name,start,end,group:g});return g}
    const foundation=stage('foundation',.25,2.3);
    block(foundation,8.8,.4,5.8,0,.08,0,concrete);
    for(const z of [-2.55,0,2.55])block(foundation,8.2,.35,.3,0,.44,z,white);
    for(const xx of [-3.95,0,3.95])block(foundation,.3,.35,5.4,xx,.44,0,white);
    const first=stage('first-floor',1.6,6.5);
    block(first,8.5,.18,5.5,0,.57,0,concrete);
    block(first,8.2,2.6,.22,0,1.96,-2.62,white);
    block(first,.22,2.6,5.3,-4.02,1.96,0,white);
    block(first,.22,2.6,2.5,4.02,1.96,-1.3,concrete);
    for(const xx of [-3.92,-1.4,1.4,3.92])block(first,.17,2.6,.17,xx,1.96,2.52,bronze);
    block(first,8.45,.28,5.65,0,3.42,0,white);
    // Furniture makes the glazed ground floor read as a real interior.
    block(first,2.0,.45,.78,-2,1.0,1.1,mat('sofa','#a6a18f'));
    block(first,2.0,.43,.16,-2,1.36,.78,materials.sofa);
    block(first,1.1,.1,.7,-1.9,.94,2.1,timber);
    block(first,.12,.32,.12,-1.9,.73,2.1,bronze);
    block(first,2.1,.85,.8,2.3,1.08,-.9,woodLight);
    const upper=stage('second-floor',6,11);
    block(upper,5.75,.18,5.4,1.25,3.63,0,concrete);
    block(upper,5.65,2.55,.22,1.25,5,-2.6,white);
    block(upper,.22,2.55,5.25,4,5,0,concrete);
    block(upper,.22,2.55,2.15,-1.5,5,-1.6,concrete);
    block(upper,2.0,1.0,.18,-2.8,4.02,-2.65,white);
    const roof=stage('roof',10,14);
    block(roof,6.1,.28,5.8,1.25,6.42,.02,white);
    block(roof,6.13,.08,5.83,1.25,6.57,.02,dark);
    block(roof,2.65,.1,5.4,-2.8,3.63,0,dark);
    const glazing=stage('glazing',13,17);
    function facade(px,y,pz,w,h){
      block(glazing,w,h,.035,px,y,pz,glass,false);
      for(const dx of [-w/2,0,w/2])block(glazing,.045,h,.09,px+dx,y,pz+.03,bronze);
      for(const dy of [-h/2,h/2])block(glazing,w,.045,.09,px,y+dy,pz+.03,bronze);
    }
    facade(0,1.98,2.61,7.8,2.57);facade(1.25,5.0,2.63,5.45,2.54);
    block(glazing,.035,2.5,2.5,4.03,1.98,1.25,glass,false);
    for(const z of [.1,1.35,2.56])block(glazing,.08,2.54,.045,4.06,1.98,z,bronze);
    // Warm panels behind the glass appear only after glazing has been installed.
    const glowMat=new T.MeshBasicMaterial({color:'#ffbc64',transparent:true,opacity:0,depthWrite:false});
    block(glazing,7.6,2.28,.015,0,1.95,2.38,glowMat,false);
    block(glazing,5.25,2.3,.015,1.25,5.0,2.4,glowMat,false);
    const stripMat=new T.MeshBasicMaterial({color:'#ffe0a0',transparent:true,opacity:0});
    block(glazing,7.6,.035,.025,0,3.18,2.59,stripMat,false);
    block(glazing,5.3,.035,.025,1.25,6.2,2.6,stripMat,false);
    const finish=stage('timber-finish',15,19);
    const slats=new T.InstancedMesh(boxGeo,woodLight,28),dummy=new T.Object3D();
    for(let i=0;i<28;i++){dummy.position.set(4.15,5,-2.45+i*.18);dummy.scale.set(.09,2.55,.09);dummy.updateMatrix();slats.setMatrixAt(i,dummy.matrix)}
    slats.castShadow=true;slats.receiveShadow=true;finish.add(slats);
    block(finish,1.35,2.5,.12,-3.25,1.96,2.57,timber);
    const terrace=stage('terrace',17.5,21);
    block(terrace,10.2,.18,2.0,.2,.2,3.82,timber);
    for(let i=0;i<15;i++)block(terrace,10.15,.016,.015,.2,.3,2.94+i*.12,woodLight,false);
    for(let i=0;i<3;i++)block(terrace,2.1,.12,.4,3.1,.12-i*.08,5.0+i*.32,concrete);
    const railMat=mat('rail','#b8c7c6',{transparent:true,opacity:.26,roughness:.2,depthWrite:false});
    block(terrace,2.25,.9,.04,-2.85,4.16,2.7,railMat,false);
    block(terrace,2.25,.035,.06,-2.85,4.62,2.7,bronze);
    const garden=stage('landscape',21,24);
    for(const v of [[-5.4,-1.6,2.3],[5.7,-2.8,2.8],[5.5,2.0,1.8]])tree(garden,...v);
    block(garden,3.9,.15,1.7,-2.7,-.03,5.55,concrete);
    const waterMat=mat('pool','#5c9297',{metalness:.35,roughness:.17});
    block(garden,3.65,.025,1.45,-2.7,.055,5.55,waterMat,false);
    for(let i=0;i<5;i++)block(garden,.82,.07,.65,3.3,-.03,6.1+i*.86,white,false);
    for(const pos of [[-5.5,1.6],[-5.5,3.1],[5.7,4.4]]){
      block(garden,1.1,.35,1.1,pos[0],.05,pos[1],concrete);
      const bush=new T.Mesh(new T.IcosahedronGeometry(.6,1),grass);bush.position.set(pos[0],.54,pos[1]);bush.scale.y=.7;garden.add(bush);bush.castShadow=true;
    }
    // Animate each component separately, preserving its full-size silhouette.
    // Per-component materials allow opacity to reach zero before visibility changes.
    stages.forEach(s=>{
      s.parts=s.group.children.map((object,i,all)=>{
        const fadeMaterials=[];
        object.traverse(mesh=>{if(!mesh.isMesh)return;
          // Emissive window panels are controlled by the day/night lighting below.
          if(mesh.material===glowMat||mesh.material===stripMat)return;
          mesh.material=mesh.material.clone();
          fadeMaterials.push({material:mesh.material,opacity:mesh.material.opacity,transparent:mesh.material.transparent});
        });
        return {object,baseY:object.position.y,delay:i/Math.max(1,all.length-1)*.45,fadeMaterials};
      });
    });
    let time=0,active=false,last=0,lastPaint=-Infinity,renderedTime=0,daylight=1;
    function rect(px,py,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(px,py,w,h,r);ctx.fill()}
    function text(value,px,py,size,color='#242d2b',weight=400,align='left'){
      ctx.font=`${weight} ${size}px Inter, Arial, sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(value,px,py);
    }
    function rule(px,py,w,color){rect(px,py,w,1,color)}
    function configure(t){
      // Return to the original plot only behind an opaque page transition.
      const buildTime=t<29?t:0;
      stages.forEach(s=>{
        s.group.visible=buildTime>s.start;
        s.parts.forEach(part=>{
          const length=s.end-s.start;
          const p=smooth(s.start+part.delay*length,s.start+(part.delay+.55)*length,buildTime);
          part.object.visible=p>0;part.object.position.y=part.baseY-(1-p)*.45;
          part.fadeMaterials.forEach(({material,opacity,transparent})=>{
            const blending=transparent||p<1;
            if(material.transparent!==blending){material.transparent=blending;material.needsUpdate=true}
            material.opacity=opacity*p;material.depthWrite=!blending;
          });
        });
      });
      daylight=clamp(1-smooth(8,15,buildTime)+smooth(19,25,buildTime));
      const night=1-daylight;
      scene.background.copy(skyNight).lerp(skyDay,daylight);scene.fog.color.copy(scene.background);
      materials.ground.color.set('#7c878b').lerp(new T.Color('#ffffff'),daylight);
      sun.intensity=.08+daylight*1.9;hemi.intensity=.16+daylight*.6;fill.intensity=.12+night*.08;
      sun.color.set('#b6c9ed').lerp(new T.Color('#fff0d5'),daylight);
      sun.position.set(-10+smooth(0,27,buildTime)*15,5+daylight*10,9);
      glowMat.opacity=night*.67;stripMat.opacity=night*.94;
      glass.envMapIntensity=.18+daylight*.45;glass.emissive.set('#ffad54');glass.emissiveIntensity=night*.9;
      stages.forEach(s=>s.parts.forEach(part=>part.fadeMaterials.forEach(({material})=>{if(material.envMap===env){material.envMapIntensity=glass.envMapIntensity;material.emissive.copy(glass.emissive);material.emissiveIntensity=glass.emissiveIntensity}})));
      renderer.toneMappingExposure=1.0;
      boundary.material.opacity=.48*(1-smooth(1,5,buildTime));
      // Move only the camera INSIDE the website, never the portfolio camera.
      // A steady 45-degree arc keeps the glazed front visible throughout construction.
      const approach=smooth(.4,9,buildTime),orbit=clamp(buildTime/28),angle=.35+.78*orbit;
      const radius=24.5-approach*3.2;
      camera.position.set(Math.sin(angle)*radius,12.6-approach*1.8+Math.sin(orbit*Math.PI)*.35,Math.cos(angle)*radius);
      camera.lookAt(-1.4,2.0,-.1);camera.updateMatrixWorld();
    }
    function site(t){
      const effective=t<29?t:0;
      const scroll=smooth(.6,4,effective),night=1-daylight;
      const ink=night>.45?'#f0f1e9':'#283430',softInk=night>.45?'#aebbbd':'#6e786e';
      rect(0,0,W,H,'#edece4');
      ctx.drawImage(renderer.domElement,0,132,W,548);
      // Browser strip and persistent website navigation.
      rect(0,0,W,34,'#dcded6');['#b2aaa0','#bdb9a7','#9aa99a'].forEach((v,i)=>rect(18+i*16,12,7,7,v,4));
      rect(360,7,480,20,'#eeeee7',5);text('forma — архитектурное бюро',600,21,11,'#7a8177',400,'center');
      rect(0,34,W,98,'#f1f0e9');text('FORMA',34,98,37,'#23322a',600);text('АРХИТЕКТУРНОЕ БЮРО',196,96,10,'#6a766a',500);
      text('Проекты',720,90,15);text('Подход',824,90,15);text('Контакты',923,90,15);
      rect(1032,60,137,43,'#283b2e',22);text('Обсудить проект',1100,87,12,'#f5f4eb',500,'center');
      rule(32,131,1136,'#c9cec1');
      // The scroll-driven heading makes this read as a website, not a standalone film.
      ctx.save();ctx.beginPath();ctx.rect(0,133,W,547);ctx.clip();
      ctx.globalAlpha=1-smooth(.8,2.8,effective);ctx.translate(0,-scroll*100);
      text('ЧАСТНАЯ АРХИТЕКТУРА / 01',38,194,13,softInk,500);
      text('От замысла —',34,265,51,ink,500);text('к пространству.',34,326,51,ink,500);
      text('Дом начинается с идеи.',38,374,18,softInk);text('Прокрутите, чтобы увидеть путь.',38,404,18,softInk);
      rule(38,438,210,'#a5afa0');text('Листайте вниз  ↓',38,470,15,ink,500);
      ctx.restore();
      const cardReveal=smooth(3.1,5,effective);
      if(cardReveal>0){
        ctx.save();ctx.globalAlpha=cardReveal;ctx.translate(0,(1-cardReveal)*18);
        rect(33,198,244,191,'rgba(245,244,234,0.94)',12);
        text('HOUSE 01',52,230,13,'#6d7969',600);
        text('Дом у леса',52,274,28,'#28362c',500);
        text('280 м² / два этажа',52,308,15,'#647263');
        rule(52,328,204,'#c5cbbf');text('Бетон. Стекло. Дерево.',52,357,14,'#647263');
        ctx.restore();
      }
      const stageLabel=effective<.25?'УЧАСТОК':effective<1.6?'ФУНДАМЕНТ':effective<6?'ПЕРВЫЙ ЭТАЖ':effective<13?'ОБЪЁМ И КРОВЛЯ':effective<21?'СТЕКЛО И ОТДЕЛКА':'ГОТОВОЕ ПРОСТРАНСТВО';
      rect(25,613,276,57,night>.45?'rgba(20,33,36,.82)':'rgba(245,244,234,.9)',8);
      text(stageLabel,38,638,13,ink,600);
      text(daylight>.7?'ДНЕВНОЙ СВЕТ':daylight<.2?'НОЧЬ / ТЁПЛЫЙ СВЕТ':effective<18?'ЗАКАТ':'РАССВЕТ',38,658,10,softInk,500);
      // Slim scroll indicator and construction progress.
      rect(1165,168,3,438,night>.45?'#46535d':'#c2c9bc',2);rect(1165,168+scroll*300,3,80,night>.45?'#dae5dc':'#42513d',2);
      rect(0,680,W,70,'#f1f0e9');rule(32,680,1136,'#c9cec1');
      text('FORMA / RESIDENTIAL',34,723,13,'#51604f',500);text('КОНЦЕПЦИЯ · 2026',370,723,11,'#7b8577');
      if(effective>=24){
        ctx.save();ctx.globalAlpha=smooth(24,25,effective);rect(940,693,228,43,'#283b2e',22);text('Смотреть проект  ↗',1054,720,15,'#f1f1e8',500,'center');ctx.restore();
      }else{text('АРХИТЕКТУРА В ДВИЖЕНИИ',1167,723,11,'#7b8577',500,'right')}
      // Soft editorial page wipe masks reconstruction reset, keeping the loop seamless.
      const reset=t>=28&&t<29?smooth(28,29,t):t>=29?1-smooth(29,30,t):0;
      if(reset>0){ctx.save();ctx.globalAlpha=reset;rect(0,132,W,548,'#e3e7e1');ctx.restore()}
    }
    function render(t){
      renderedTime=((t%30)+30)%30;configure(renderedTime);
      renderer.render(scene,camera);site(renderedTime);onFrame();
    }
    render(0);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){active=false;last=performance.now()}});
    return {
      render,
      update(running,now=performance.now()){
        running=Boolean(running&&!document.hidden);
        if(running&&active)time=(time+Math.max(0,now-last)/1000)%30;
        last=now;active=running;
        if(running&&now-lastPaint>=1000/24){render(time);lastPaint=now;}
      },
      get state(){return {time,active,duration:30,renderedTime,daylight,cameraPosition:camera.position.toArray(),stages:stages.filter(s=>s.group.visible).map(s=>s.name)};}
    };
  }
};
