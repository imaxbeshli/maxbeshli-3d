/* Main-page tile frame, using the same rounded bevel and material.
   Geometry below mirrors index.html glassOutline/roundedGlassGeometry.
   Adapted only for panel size, front anchoring and the main scene’s Three.js version. */
function createAboutFrameEnvironment(T){const images=[];for(let face=0;face<6;face++){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,256,256);g.addColorStop(0,'#293747');g.addColorStop(.48,'#0b1017');g.addColorStop(1,'#36302a');x.fillStyle=g;x.fillRect(0,0,256,256);x.fillStyle=face===4?'#ffe1b1':'#a5bfd6';x.fillRect(face===4?30:180,12,face===4?58:12,210);x.fillStyle='#6e756f';x.fillRect(15,232,225,5);images.push(c)}const tex=new T.CubeTexture(images);tex.encoding=T.sRGBEncoding;tex.needsUpdate=true;return tex}
function createAboutFramedGlass(THREE,{width,height,environment}){
    function glassOutline(w,h,r){
      const s=new THREE.Shape(),x=-w/2,y=-h/2;
      s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.absarc(x+w-r,y+r,r,-Math.PI/2,0);
      s.lineTo(x+w,y+h-r);s.absarc(x+w-r,y+h-r,r,0,Math.PI/2);
      s.lineTo(x+r,y+h);s.absarc(x+r,y+h-r,r,Math.PI/2,Math.PI);
      s.lineTo(x,y+r);s.absarc(x+r,y+r,r,Math.PI,Math.PI*1.5);
      s.closePath();return s;
    }
    function roundedGlassGeometry(w,h,depth,r=.24,bevel=.10){
      const positions=[],normals=[],uvs=[];
      const vertex=(x,y,z,nx,ny,nz)=>{positions.push(x,y,z);normals.push(nx,ny,nz);uvs.push(x/w+.5,y/h+.5)};
      const cap=new THREE.ShapeGeometry(glassOutline(w-2*bevel,h-2*bevel,r-bevel),32).toNonIndexed();
      const cp=cap.attributes.position;
      for(const sign of [1,-1])for(let i=0;i<cp.count;i+=3)for(const j of (sign>0?[0,1,2]:[2,1,0]))vertex(cp.getX(i+j),cp.getY(i+j),sign*depth/2,0,0,sign);
      const capCount=positions.length/3;cap.dispose();
      const rings=[];
      for(const sign of [-1,1])for(let step=0;step<=12;step++){
        const angle=(sign<0?12-step:step)/12*Math.PI/2;
        const inset=bevel*(1-Math.cos(angle)),radius=r-inset;
        const z=sign*(depth/2-bevel+Math.sin(angle)*bevel),ring=[];
        const centers=[[w/2-r,-h/2+r],[w/2-r,h/2-r],[-w/2+r,h/2-r],[-w/2+r,-h/2+r]];
        centers.forEach(([cx,cy],corner)=>{for(let k=0;k<=32;k++){
          const a=-Math.PI/2+corner*Math.PI/2+k/32*Math.PI/2,co=Math.cos(a),si=Math.sin(a);
          ring.push([cx+radius*co,cy+radius*si,z,co*Math.cos(angle),si*Math.cos(angle),sign*Math.sin(angle)]);
        }});rings.push(ring);
      }
      for(let j=0;j<rings.length-1;j++)for(let k=0;k<rings[j].length;k++){
        const next=(k+1)%rings[j].length,a=rings[j][k],b=rings[j][next],c=rings[j+1][k],d=rings[j+1][next];
        for(const v of [a,b,c,b,d,c])vertex(...v);
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
      geo.addGroup(0,capCount,0);geo.addGroup(capCount,positions.length/3-capCount,1);return geo;
    }


  const scale=width/4.85,depth=.36*scale;
  const geometry=roundedGlassGeometry(width,height,depth,.24*scale,.10*scale);
  geometry.translate(0,0,-depth/2);
  // Match the MAIN tile's complete optical setup. In particular, leave thickness
  // at zero (thin glass) and use alpha blending; solid transmission made a grey rim.
  const face=new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.48,roughness:.26,metalness:0,transmission:.80,envMap:environment,envMapIntensity:1,depthWrite:false,reflectivity:.5,clearcoat:.45,clearcoatRoughness:.06});
  const edge=face.clone();edge.roughness=.10;edge.envMapIntensity=2.4;
  edge.transmission=.78;edge.color.set(0xb7c6cc);edge.opacity=.82;
  edge.clearcoat=1;edge.clearcoatRoughness=.08;
  const pane=new THREE.Mesh(geometry,[face,edge]);
  // The bevel itself supplies the visible edge. No inset or rear outline frames.
  return pane;
}
