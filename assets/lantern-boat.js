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
    const wood=material(0x241b13,{emissive:0x2b1607,emissiveIntensity:.22});
    const edge=material(0x695039,{emissive:0x3d2109,emissiveIntensity:.26});
    const metal=material(0x28231c,{metalness:.6,roughness:.38});
    function mesh(geo,mat,x=0,y=0,z=0,parent=root) {const m=new T.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;}
    // Open, double-sided clinker hull with pointed ends; no flat billboard.
    const sections=[[-.86,.015,.24],[-.64,.16,.17],[-.3,.24,.145],[.2,.245,.145],[.6,.15,.19],[.88,.012,.29]];
    const vertices=[],indices=[];
    sections.forEach(([x,w,y])=>vertices.push(x,y,-w,x,-.035,-w*.42,x,-.035,w*.42,x,y,w));
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<3;j++){
      const a=i*4+j,b=a+4;indices.push(a,b,a+1,b,b+1,a+1);
    }
    const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(vertices,3));hull.setIndex(indices);hull.computeVertexNormals();wood.side=T.DoubleSide;mesh(hull,wood);
    for(const side of [-1,1]){
      const curve=new T.CatmullRomCurve3(sections.map(([x,w,y])=>new T.Vector3(x,y,side*w)));
      mesh(new T.TubeGeometry(curve,24,.017,5,false),edge);
    }
    for(const x of [-.38,.32])mesh(new T.BoxGeometry(.12,.03,.35),edge,x,.125,0);
    mesh(new T.BoxGeometry(1.16,.035,.19),wood,0,.005,0);
    // A small brass lantern on a hanging bracket at the bow.
    mesh(new T.CylinderGeometry(.012,.014,.58,6),metal,.40,.40,0);
    mesh(new T.BoxGeometry(.21,.018,.018),metal,.31,.69,0);
    const lamp=new T.Group();lamp.position.set(.22,.60,0);root.add(lamp);
    const glass=new T.MeshBasicMaterial({color:0xffd383,transparent:true,depthWrite:false,fog:false,toneMapped:false});materials.push(glass);
    const flame=new T.MeshBasicMaterial({color:0xfff2bf,transparent:true,depthWrite:false,fog:false,toneMapped:false});materials.push(flame);
    mesh(new T.BoxGeometry(.10,.145,.10),glass,0,-.055,0,lamp);
    mesh(new T.SphereGeometry(.028,8,6),flame,0,-.055,0,lamp);
    for(const y of [-.14,.025])mesh(new T.BoxGeometry(.14,.025,.14),metal,0,y,0,lamp);
    for(const x of [-.053,.053])for(const z of [-.053,.053])mesh(new T.CylinderGeometry(.006,.006,.16,4),metal,x,-.055,z,lamp);
    const c=document.createElement('canvas');c.width=c.height=64;
    const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,'rgba(255,235,170,.95)');g.addColorStop(.18,'rgba(255,190,80,.5)');g.addColorStop(.5,'rgba(255,146,35,.10)');g.addColorStop(1,'rgba(255,130,30,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
    const haloMaterial=new T.SpriteMaterial({map:new T.CanvasTexture(c),color:0xffc36c,blending:T.AdditiveBlending,transparent:true,depthWrite:false,fog:false,toneMapped:false});
    const halo=new T.Sprite(haloMaterial);halo.position.set(0,-.055,0);halo.scale.set(.9,.9,1);lamp.add(halo);
    let elapsed=0,last=null,state=sample(0);
    function update(now,active,backdrop) {
      const dt=last===null?0:Math.min(.25,Math.max(0,(now-last)/1000));last=now;
      if(active)elapsed+=dt;
      state=sample(elapsed);root.visible=state.visible;
      const source=water.material.uniforms.uFallSource.value;
      root.position.set(source.x-3.5+state.progress*14.5,floor+.025+Math.sin(elapsed*1.7)*.012,-20.25+Math.sin(state.progress*Math.PI)*.25);
      root.rotation.set(Math.sin(elapsed*1.1)*.014,-.06,Math.sin(elapsed*1.4)*.013);
      lamp.rotation.z=Math.sin(elapsed*1.3+.5)*.045;
      // Fade into distant haze at both shores rather than popping in/out.
      materials.forEach(m=>{m.opacity=state.opacity;});
      const flicker=.94+.04*Math.sin(elapsed*3.1)+.02*Math.sin(elapsed*7.3);
      haloMaterial.opacity=state.opacity*.85*flicker;glass.color.setRGB(1,.79*flicker,.43*flicker);
      water.material.uniforms.uBoat.value.set(root.position.x,root.position.z,state.visible?state.opacity:0);
    }
    return {root,update,get state(){return {...state,elapsed};}};
  }
  return {create,sample,delay,duration,rest};
})();
