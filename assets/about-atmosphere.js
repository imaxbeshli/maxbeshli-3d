/* Local, evolving volumetric mist. No translated fog images. */
function createAboutAtmosphere(dialog){
  const canvas=dialog.querySelector('.about-atmosphere');
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,preserveDrawingBuffer:false});
  if(!gl)return {start(){},stop(){}};
  const vertex=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fragment=`precision highp float;
  uniform vec2 resolution,center,spread;
  uniform float time,mobile;
  float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float field(vec3 p){return .55*noise(p)+.26*noise(p*2.07+4.3)+.13*noise(p*4.13+8.1)+.06*noise(p*8.2+1.3);}
  void main(){
    vec2 uv=vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y);
    vec2 local=(uv-center)/spread;
    float envelope=exp(-local.x*local.x*1.5-local.y*local.y*2.);
    envelope*=1.-mobile*smoothstep(center.y-.01,center.y+.05,uv.y);
    float floorMist=(1.-mobile)*smoothstep(.79,1.12,uv.y)*.30;
    if(envelope+floorMist<.012){gl_FragColor=vec4(0);return;}
    float trans=1.;vec3 color=vec3(0.);
    for(int i=0;i<14;i++){
      float z=float(i)/13.;
      vec3 p=vec3(local.x*6.,local.y*5.,z*3.);
      // Different velocities at every depth, with evolving curls rather than image translation.
      p+=vec3(.14*sin(time*.19+z*3.),time*.035,.17*cos(time*.15));
      float warp=field(p*.73+vec3(0.,0.,time*.10));
      float n=field(p+vec3(warp*1.8,warp*.9,time*.075));
      float density=smoothstep(.33,.76,n)*(envelope+floorMist)*.24;
      float light=.45+.4*smoothstep(.36,.72,n+z*.12);
      vec3 lit=mix(vec3(.23,.25,.26),vec3(.59,.57,.52),light);
      color+=trans*density*lit;trans*=1.-density;
    }
    gl_FragColor=vec4(color,1.-trans);
  }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['resolution','center','spread','time','mobile'].map(k=>[k,gl.getUniformLocation(program,k)]));
  let frame=0,running=false,last=0,elapsed=15,layout=null;
  function resize(){
    const w=dialog.clientWidth,h=dialog.clientHeight;const scale=Math.min(.55,640/w,420/h);
    canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);gl.viewport(0,0,canvas.width,canvas.height);
    const r=dialog.querySelector('.about-visual').getBoundingClientRect();const stacked=w<=760&&h>550;
    layout={x:(r.left+r.width*.5)/w,y:(r.top+r.height*(stacked?.96:1.04))/h,sx:stacked?.72:.38,sy:stacked?Math.min(.12,r.height/h*.42):.20,mobile:stacked?1:0};
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
    gl.uniform2f(uniforms.center,layout.x,layout.y);gl.uniform2f(uniforms.spread,layout.sx,layout.sy);gl.uniform1f(uniforms.mobile,layout.mobile);
  }
  function tick(now){if(!running)return;frame=requestAnimationFrame(tick);if(document.hidden||now-last<40)return;
    elapsed+=Math.min((now-last)/1000,.08)*(matchMedia('(prefers-reduced-motion:reduce)').matches?.45:1);last=now;
    gl.uniform1f(uniforms.time,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  window.addEventListener('resize',()=>{if(running)resize()});
  document.addEventListener('visibilitychange',()=>{last=performance.now()});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();running=false;cancelAnimationFrame(frame)});
  return {start(){if(running)return;running=true;resize();last=performance.now();frame=requestAnimationFrame(tick)},stop(){running=false;cancelAnimationFrame(frame)}};
}
