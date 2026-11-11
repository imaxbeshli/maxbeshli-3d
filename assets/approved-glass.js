/* Shared by the approved studio prototype and the integrated About scene. */
export function createApprovedGlass(THREE,{width=6,height=4.2,frontAnchored=false}={}){
  const radius=width*.22/6,depth=width*.30/6,x=-width/2,y=-height/2,s=new THREE.Shape();
  s.moveTo(x+radius,y);s.lineTo(x+width-radius,y);s.quadraticCurveTo(x+width,y,x+width,y+radius);s.lineTo(x+width,y+height-radius);s.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);s.lineTo(x+radius,y+height);s.quadraticCurveTo(x,y+height,x,y+height-radius);s.lineTo(x,y+radius);s.quadraticCurveTo(x,y,x+radius,y);
  const geometry=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:width*.008/6,bevelThickness:width*.008/6,bevelSegments:1,curveSegments:32,steps:1});geometry.translate(0,0,frontAnchored?-depth:-depth/2);
  const glass=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.035,transmission:1,thickness:depth,ior:1.52,attenuationColor:new THREE.Color('#d5e2dc'),attenuationDistance:3.5,envMapIntensity:.7,side:THREE.DoubleSide});
  const sides=glass.clone();sides.envMapIntensity=.45;sides.attenuationColor.set('#a5c4b6');sides.attenuationDistance=1.2;
  return new THREE.Mesh(geometry,[glass,sides]);
}
export function createApprovedGlassEnvironment(THREE,renderer,hdr){
  hdr.mapping=THREE.EquirectangularReflectionMapping;
  const studio=new THREE.Scene();studio.background=hdr;
  const rig=new THREE.Group();rig.quaternion.setFromEuler(new THREE.Euler(.15,Math.PI/4,0)).invert();studio.add(rig);
  const overhead=new THREE.Mesh(new THREE.PlaneGeometry(4,.65),new THREE.MeshBasicMaterial({color:new THREE.Color(1,1,.97).multiplyScalar(3),side:THREE.DoubleSide}));
  overhead.position.set(-3.7,.9,8);rig.add(overhead);overhead.lookAt(0,0,0);
  const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,0,.1,100);
  overhead.geometry.dispose();overhead.material.dispose();pmrem.dispose();return environment;
}
