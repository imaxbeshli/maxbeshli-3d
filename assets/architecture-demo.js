/* FORMA: an offline architectural website inside the web portfolio tile.
   A real Three.js model assembles over a 30-second day/night/day cycle. */
window.MBArchitectureDemo = {
  duration: 30,
  create(canvas, T, onFrame) {
    const ctx=canvas.getContext('2d'), W=1200, H=750;
    const clamp=v=>Math.max(0,Math.min(1,v));
    const smooth=(a,b,t)=>{const v=clamp((t-a)/(b-a));return v*v*v*(v*(v*6-15)+10)};
    const scene=new T.Scene();
    const skyDay=new T.Color('#e6e4dd'),skyNight=new T.Color('#242b30');
    scene.background=skyDay.clone();scene.fog=new T.Fog(skyDay.clone(),30,95);
    const camera=new T.PerspectiveCamera(38,1200/548,.1,120);
    const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(1);renderer.setSize(1000,457,false);renderer.setClearColor(0x000000,0);
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
    const concrete=mat('concrete','#b9b5a9'),white=mat('white','#d6cfbd'),dark=mat('dark','#39413f');
    const timber=mat('timber','#836244'),woodLight=mat('woodLight','#ac8761');
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
    const ground=new T.Mesh(new T.PlaneGeometry(500,500),mat('ground','#dfdcd3',{roughness:1}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.24;ground.receiveShadow=true;scene.add(ground);
    const boxGeo=new T.BoxGeometry(1,1,1);
    function block(parent,w,h,d,px,py,pz,material,shadow=true){
      const m=new T.Mesh(boxGeo,material);m.scale.set(w,h,d);m.position.set(px,py,pz);
      m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;
    }

    // Subtle material detail; the presentation remains self-contained.
    let seed=77;
    function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
    function surface(material,base,grain,repeat){
      const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
      x.fillStyle=base;x.fillRect(0,0,256,256);
      for(let i=0;i<9500;i++){x.fillStyle=`rgba(${grain},${.04+random()*.12})`;x.fillRect(random()*256,random()*256,1+random()*3,1+random()*2)}
      const map=new T.CanvasTexture(c);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(repeat,repeat);map.encoding=T.sRGBEncoding;
      material.map=map;material.bumpMap=map;material.bumpScale=.008;material.needsUpdate=true;
    }
    surface(concrete,'#d4d0c4','70,65,55',2);
    surface(white,'#eee9db','135,128,110',2);

    surface(timber,'#987552','45,25,10',3);
    // Fine longitudinal grain for the facade and terrace, with subdued highlights.
    const woodCanvas=document.createElement('canvas');woodCanvas.width=woodCanvas.height=256;
    const wx=woodCanvas.getContext('2d');wx.fillStyle='#967755';wx.fillRect(0,0,256,256);
    for(let i=0;i<220;i++){wx.strokeStyle=`rgba(40,25,12,${random()*.23})`;wx.lineWidth=.3+random();wx.beginPath();const x=random()*256;wx.moveTo(x,0);wx.bezierCurveTo(x+random()*8,85,x-random()*8,170,x,256);wx.stroke()}
    const woodMap=new T.CanvasTexture(woodCanvas);woodMap.encoding=T.sRGBEncoding;
    timber.map=woodMap;woodLight.map=woodMap;woodLight.color.set('#c0ab89');
    // Soft contact shadow on the continuous matte studio floor.
    const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=128;
    const cx=contactCanvas.getContext('2d'),cg=cx.createRadialGradient(64,64,15,64,64,64);
    cg.addColorStop(0,'rgba(0,0,0,.3)');cg.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=cg;cx.fillRect(0,0,128,128);
    const contactMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(contactCanvas),transparent:true,depthWrite:false,opacity:0});
    const contact=new T.Mesh(new T.PlaneGeometry(14,11),contactMat);contact.rotation.x=-Math.PI/2;contact.position.y=-.22;scene.add(contact);
    // A short architectural plan introduces the model without delaying construction.
    const planSegments=[[-4.45,-2.95,4.45,-2.95],[4.45,-2.95,4.45,2.95],[4.45,2.95,-4.45,2.95],[-4.45,2.95,-4.45,-2.95],
      [-1.4,-2.95,-1.4,2.95],[1.4,-2.95,1.4,2.95],[-4.45,0,4.45,0],
      [-4.9,-3.5,4.9,-3.5],[-4.9,-3.7,-4.9,-3.3],[4.9,-3.7,4.9,-3.3]];
    const planVertices=[];
    planSegments.forEach(([x,z,u,v])=>planVertices.push(x,-.115,z,u,-.115,v));
    const planGeo=new T.BufferGeometry();planGeo.setAttribute('position',new T.Float32BufferAttribute(planVertices,3));
    const plan=new T.LineSegments(planGeo,new T.LineBasicMaterial({color:'#6e7a75',transparent:true,opacity:0}));scene.add(plan);
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

    block(garden,3.9,.15,1.7,-2.7,-.03,5.55,concrete);
    const waterMat=mat('pool','#5c9297',{metalness:.35,roughness:.17});
    block(garden,3.65,.025,1.45,-2.7,.055,5.55,waterMat,false);
    for(let i=0;i<5;i++)block(garden,.82,.07,.65,3.3,-.03,6.1+i*.86,white,false);
    // A single world-space reveal front rises through the entire structure.
    // Apply it to shadow depth as well, so unbuilt geometry casts no shadow.
    const revealHeight={value:-.5};
    function revealMaterial(material,fade,shadow=false,solid=false){
      material.onBeforeCompile=shader=>{
        shader.uniforms.buildHeight=revealHeight;shader.uniforms.buildFade=fade;
        shader.vertexShader='varying float buildWorldY;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
          vec4 buildPosition=vec4(transformed,1.0);
          #ifdef USE_INSTANCING
            buildPosition=instanceMatrix*buildPosition;
          #endif
          buildWorldY=(modelMatrix*buildPosition).y;`);
        shader.fragmentShader='varying float buildWorldY; uniform float buildHeight; uniform float buildFade;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`
          diffuseColor.a *= (1.0-smoothstep(buildHeight-.65,buildHeight,buildWorldY))*buildFade;
          ${shadow||solid ? 'float coverage=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453); if(diffuseColor.a<coverage) discard; diffuseColor.a=1.0;' : 'if(diffuseColor.a<.001) discard;'}
          #include <alphatest_fragment>`);
      };
      material.customProgramCacheKey=()=> shadow||solid?'continuous-solid-coverage-v3':'continuous-world-reveal-v3';
    }
    stages.forEach(s=>{
      s.fade={value:1};s.materials=[];
      s.group.traverse(mesh=>{if(!mesh.isMesh)return;
        if(mesh.material!==glowMat&&mesh.material!==stripMat)mesh.material=mesh.material.clone();
        mesh.material.transparent=true;
        // Coverage grows smoothly; opaque surfaces retain correct depth and layering.
        const solid=mesh.material.opacity===1;
        mesh.material.depthWrite=solid;
        revealMaterial(mesh.material,s.fade,false,solid);s.materials.push(mesh.material);
        mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});
        revealMaterial(mesh.customDepthMaterial,s.fade,true);
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
      revealHeight.value=-.14+7.5*(.65*clamp((buildTime-.25)/14.75)+.35*smooth(.25,15,buildTime));
      stages.forEach(s=>{
        const isFinish=['glazing','timber-finish','terrace','landscape'].includes(s.name);
        s.fade.value=isFinish?smooth(s.start,s.end,buildTime):1;
        s.group.visible=buildTime>.25 && s.fade.value>0;
      });
      daylight=clamp(1-smooth(4,16,buildTime)+smooth(17,28,buildTime));
      const night=1-daylight;
      scene.background.copy(skyNight).lerp(skyDay,daylight);scene.fog.color.copy(scene.background);
      materials.ground.color.set('#343c42').lerp(new T.Color('#dfdcd3'),daylight);

      contactMat.opacity=smooth(.25,3,buildTime)*(.6+daylight*.4);
      sun.intensity=.12+daylight*1.45;hemi.intensity=.3+daylight*.55;fill.intensity=.18+night*.12;
      sun.color.set('#b6c9ed').lerp(new T.Color('#fff0d5'),daylight);
      sun.position.set(-10+smooth(0,27,buildTime)*15,5+daylight*10,9);

      glowMat.opacity=night*.38*smooth(14,17,buildTime);stripMat.opacity=night*.8*smooth(14,17,buildTime);
      glass.envMapIntensity=.18+daylight*.45;glass.emissive.set('#ffad54');glass.emissiveIntensity=night*.35;
      stages.forEach(s=>s.materials.forEach(material=>{if(material.envMap===env){material.envMapIntensity=glass.envMapIntensity;material.emissive.copy(glass.emissive);material.emissiveIntensity=glass.emissiveIntensity}}));
      renderer.toneMappingExposure=1.0;
      plan.material.opacity=.65*smooth(0,.3,buildTime)*(1-smooth(1.8,4,buildTime));
      // Extend each line continuously instead of adding whole segments in one frame.
      const planPosition=planGeo.attributes.position;
      planSegments.forEach(([x,z,u,v],i)=>{
        const p=smooth(i*.045,i*.045+.4,buildTime);
        planPosition.setXYZ(i*2+1,x+(u-x)*p,-.115,z+(v-z)*p);
      });
      planPosition.needsUpdate=true;
      // Move only the camera INSIDE the website, never the portfolio camera.
      // A short eased arc keeps the glazed front visible throughout construction.
      // Ease towards the growing house, then pull back to show the finished project.
      const approach=smooth(.4,18,buildTime)*(1-smooth(20,28,buildTime));
      const orbit=clamp(buildTime/28),angle=.48+.28*smooth(0,28,buildTime);
      const radius=25-approach*4;
      camera.position.set(Math.sin(angle)*radius,7.8-approach*.5+Math.sin(orbit*Math.PI)*.12,Math.cos(angle)*radius);
      camera.lookAt(-1.4,2.0,-.1);camera.updateMatrixWorld();
    }
    function site(t){
      const effective=t<29?t:0;
      const scroll=smooth(.6,4,effective),night=1-daylight;
      const tone=(a,b)=>'#'+new T.Color(a).lerp(new T.Color(b),daylight).getHexString();
      const ink=tone('#f1eee5','#29342f'),softInk=tone('#b9c3c4','#748075');
      rect(0,0,W,H,'#edece4');
      ctx.save();ctx.beginPath();ctx.rect(0,132,W,548);ctx.clip();
      ctx.drawImage(renderer.domElement,0,132,W,548);
      ctx.restore();
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

        text('HOUSE 01',38,230,12,softInk,600);
        text('Частный дом',34,276,30,ink,500);
        text('280 м² / два этажа',38,310,15,softInk);
        rule(38,333,190,tone('#58635f','#c2c7bc'));text('Бетон. Стекло. Дерево.',38,363,14,softInk);
        ctx.restore();
      }
      rect(0,680,W,70,'#f1f0e9');rule(32,680,1136,'#c9cec1');
      text('FORMA / RESIDENTIAL',34,723,13,'#51604f',500);text('КОНЦЕПЦИЯ · 2026',370,723,11,'#7b8577');
      if(effective>=24){
        ctx.save();ctx.globalAlpha=smooth(24,25,effective);rect(940,693,228,43,'#283b2e',22);text('Смотреть проект',1054,720,15,'#f1f1e8',500,'center');ctx.restore();
      }
      // Soft editorial page wipe masks reconstruction reset, keeping the loop seamless.
      const reset=t>=28&&t<29?smooth(28,29,t):t>=29?1-smooth(29,30,t):0;
      if(reset>0){ctx.save();ctx.globalAlpha=reset;rect(0,132,W,548,'#e6e4dd');ctx.restore()}
    }
    function render(t){
      renderedTime=((t%30)+30)%30;configure(renderedTime);
      renderer.render(scene,camera);site(renderedTime);onFrame();
    }
    const ready=Promise.resolve();
    renderer.compile(scene,camera);
    render(0);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){active=false;last=performance.now()}});
    return {
      render,ready,
      update(running,now=performance.now()){
        running=Boolean(running&&!document.hidden);
        if(running&&active)time=(time+Math.max(0,now-last)/1000)%30;
        last=now;active=running;
        if(running&&now-lastPaint>=1000/60-.5){render(time);lastPaint=now;}
      },
      get state(){return {time,active,duration:30,renderedTime,daylight,revealHeight:revealHeight.value,cameraPosition:camera.position.toArray(),stages:stages.filter(s=>s.group.visible).map(s=>s.name)};}
    };
  }
};
