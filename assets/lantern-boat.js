/* A distant, quiet passage. Uses the main scene, its mirror and its RAF. */
window.MBLanternBoat = (() => {
  const delay = 10, duration = 28, rest = 65;
  const smooth = (a,b,x) => {const p=Math.max(0,Math.min(1,(x-a)/(b-a)));return p*p*(3-2*p);};
  function sample(time) {
    if(time<delay) return {visible:false,progress:0,opacity:0};
    const age=(time-delay)%(duration+rest), progress=Math.min(1,age/duration);
    return {visible:age<duration,progress,opacity:smooth(0,2.8,age)*(1-smooth(duration-3,duration,age))};
  }
  function create(T, scene, water, floor) {
    const root=new T.Group();root.name='Distant lantern boat';root.visible=false;scene.add(root);
    const materials=[];
    function material(color,options={}) {
      const m=new T.MeshStandardMaterial({color,roughness:.72,metalness:.08,transparent:true,...options});materials.push(m);return m;
    }
    // Fine longitudinal grain and plank seams, generated once (no asset request).
    const grainCanvas=document.createElement('canvas');grainCanvas.width=512;grainCanvas.height=128;
    const gx=grainCanvas.getContext('2d'),pixels=gx.createImageData(512,128);
    for(let y=0;y<128;y++)for(let x=0;x<512;x++){
      const grain=Math.sin(y*2.8+Math.sin(x*.018)*1.8)+.45*Math.sin(y*7.3+x*.022);
      const seam=Math.pow(Math.max(0,Math.cos(y/128*Math.PI*12)),28);
      const tone=.86+grain*.09-seam*.28,k=(y*512+x)*4;
      pixels.data[k]=112*tone;pixels.data[k+1]=70*tone;pixels.data[k+2]=37*tone;pixels.data[k+3]=255;
    }
    gx.putImageData(pixels,0,0);
    const grain=new T.CanvasTexture(grainCanvas);grain.encoding=T.sRGBEncoding;grain.anisotropy=4;
    const wood=material(0xb49a7d,{map:grain,roughness:.42,metalness:0,side:T.DoubleSide,emissive:0x291607,emissiveIntensity:.16});
    const inside=material(0x947556,{map:grain,roughness:.68,metalness:0,side:T.DoubleSide});
    const edge=material(0x795336,{roughness:.38,metalness:0,emissive:0x321b08,emissiveIntensity:.18});
    const metal=material(0x4d3921,{metalness:.7,roughness:.32});
    function mesh(geo,mat,x=0,y=0,z=0,parent=root) {const m=new T.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;}
    // Continuous rounded hull, lifted at the bow/stern, with a real hollow interior.
    function hullPoint(u,v,inner=false) {
      const s=u*2-1,theta=v*Math.PI,end=Math.pow(Math.abs(s),3.4);
      const width=(.29*Math.pow(Math.max(0,1-s*s),.72)+.002)*(inner?.9:1);
      const sheer=.175+.15*end+.018*s,keel=-.085+.30*end+(inner?.025:0);
      return new T.Vector3(s*.93,sheer-(sheer-keel)*Math.pow(Math.sin(theta),.82)-(inner?.009:0),-width*Math.cos(theta));
    }
    function hullGeometry(inner=false) {
      const positions=[],uv=[],indices=[],longitudinal=96,radial=24;
      for(let i=0;i<=longitudinal;i++)for(let j=0;j<=radial;j++){
        positions.push(...hullPoint(i/longitudinal,j/radial,inner).toArray());uv.push(i/longitudinal,j/radial);
        if(i<longitudinal&&j<radial){const a=i*(radial+1)+j,b=a+radial+1;indices.push(a,a+1,b,b,a+1,b+1);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
    }
    const hull=mesh(hullGeometry(),wood);hull.name='Smooth planked wooden hull';
    mesh(hullGeometry(true),inside).name='Hollow inner hull';
    for(const side of [0,1]){
      const curve=new T.CatmullRomCurve3(Array.from({length:49},(_,i)=>hullPoint(i/48,side)));
      mesh(new T.TubeGeometry(curve,96,.014,10,false),edge);
    }
    // Fine strake edges follow the hull rather than straight box-shaped sides.
    const strips=[];
    for(const v of [.16,.31,.69,.84])for(let i=1;i<95;i++){
      const a=hullPoint(i/96,v-.002),b=hullPoint(i/96,v+.002),c=hullPoint((i+1)/96,v-.002),d=hullPoint((i+1)/96,v+.002);
      for(const p of [a,b,c,c,b,d]){p.z*=1.003;strips.push(...p.toArray());}
    }
    const seams=new T.BufferGeometry();seams.setAttribute('position',new T.Float32BufferAttribute(strips,3));seams.computeVertexNormals();mesh(seams,edge);
    for(const x of [-.40,.28])mesh(new T.BoxGeometry(.14,.027,.44),edge,x,.105,0);
    // Curved brass bracket, rounded chimney and a warm flame inside the lantern.
    const bracket=new T.CatmullRomCurve3([new T.Vector3(.43,.12,0),new T.Vector3(.44,.58,0),new T.Vector3(.41,.72,0),new T.Vector3(.28,.74,0),new T.Vector3(.23,.66,0)]);
    mesh(new T.TubeGeometry(bracket,32,.011,10,false),metal);
    const lamp=new T.Group();lamp.position.set(.23,.62,0);root.add(lamp);
    const glass=new T.MeshBasicMaterial({color:0xffd383,transparent:true,depthWrite:false,fog:false,toneMapped:false});materials.push(glass);
    const flame=new T.MeshBasicMaterial({color:0xfff2bf,transparent:true,depthWrite:false,fog:false,toneMapped:false});materials.push(flame);
    const chimney=[new T.Vector2(.038,-.14),new T.Vector2(.053,-.12),new T.Vector2(.061,-.06),new T.Vector2(.053,.005),new T.Vector2(.034,.025)];
    mesh(new T.LatheGeometry(chimney,24),glass,0,0,0,lamp);
    mesh(new T.SphereGeometry(.026,16,12),flame,0,-.055,0,lamp).scale.set(.65,1.5,.65);
    for(const y of [-.15,.034])mesh(new T.CylinderGeometry(.042,.063,.025,24),metal,0,y,0,lamp);
    for(let i=0;i<4;i++){const angle=i*Math.PI/2;mesh(new T.CylinderGeometry(.004,.004,.18,8),metal,Math.cos(angle)*.056,-.06,Math.sin(angle)*.056,lamp);}
    const c=document.createElement('canvas');c.width=c.height=64;
    const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,'rgba(255,235,170,.95)');g.addColorStop(.18,'rgba(255,190,80,.5)');g.addColorStop(.5,'rgba(255,146,35,.10)');g.addColorStop(1,'rgba(255,130,30,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
    const haloMaterial=new T.SpriteMaterial({map:new T.CanvasTexture(c),color:0xffc36c,blending:T.AdditiveBlending,transparent:true,depthWrite:false,fog:false,toneMapped:false});
    const halo=new T.Sprite(haloMaterial);halo.position.set(0,-.055,0);halo.scale.set(.9,.9,1);lamp.add(halo);
    let elapsed=0,last=null,state=sample(0);
    function update(now,active,backdrop) {
      const dt=last===null?0:Math.min(.05,Math.max(0,(now-last)/1000));last=now;
      if(active)elapsed+=dt;
      state=sample(elapsed);root.visible=state.visible;
      const source=water.material.uniforms.uFallSource.value;
      root.position.set(source.x-3.5+state.progress*14.5,floor+.025+Math.sin(elapsed*1.2)*.008,-20.25+Math.sin(state.progress*Math.PI)*.25);
      root.rotation.set(Math.sin(elapsed*.85)*.009,-.18,Math.sin(elapsed*1.05)*.009);
      lamp.rotation.z=Math.sin(elapsed*.95+.5)*.025;
      // Fade into distant haze at both shores rather than popping in/out.
      materials.forEach(m=>{m.opacity=state.opacity;});
      const flicker=.96+.025*Math.sin(elapsed*1.7)+.015*Math.sin(elapsed*3.3);
      haloMaterial.opacity=state.opacity*.85*flicker;glass.color.setRGB(1,.79*flicker,.43*flicker);
      water.material.uniforms.uBoat.value.set(root.position.x,root.position.z,state.visible?state.opacity:0);
    }
    return {root,update,get state(){return {...state,elapsed};}};
  }
  return {create,sample,delay,duration,rest};
})();
