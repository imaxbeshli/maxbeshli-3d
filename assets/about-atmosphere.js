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
  float field(vec3 p){return .57*noise(p)+.28*noise(p*2.03+4.3)+.15*noise(p*4.11+8.1);}
  float cloud(vec3 p){
    float flowTime=42.+(time-42.)*1.7;
    vec3 flow=vec3(noise(p*.7+vec3(flowTime*.035,0.,4.)),noise(p*.7+vec3(8.,flowTime*.027,0.)),noise(p*.7+vec3(0.,3.,flowTime*.023)))-.5;
    return field(p+flow*1.8+vec3(0.,-flowTime*.018,flowTime*.024));
  }
  void main(){
    vec2 uv=vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y);
    float driftTime=time-42.;
    // A few pixels of buoyancy, with the original silhouette at t=0.
    vec2 drift=vec2(.003*sin(driftTime*.23),-.006*sin(driftTime*.40));
    vec2 local=(uv-center-drift)/spread;
    float envelope=exp(-local.x*local.x*1.6-local.y*local.y*2.4);
    envelope*=1.-mobile*smoothstep(center.y-.015,center.y+.055,uv.y);
    float floorMist=(1.-mobile)*smoothstep(.84,1.14,uv.y)*.12;
    if(envelope+floorMist<.008){gl_FragColor=vec4(0);return;}
    float trans=1.;vec3 color=vec3(0.);
    for(int i=0;i<16;i++){
      float z=float(i)/15.;
      vec3 p=vec3(local.x*3.4,local.y*2.9,z*2.4);
      // Different depths rise at different phases, so the volume gently curls
      // instead of looking like a flat fog image sliding across the screen.
      p+=vec3(.08*(sin(driftTime*.30+z*2.)-sin(z*2.)),
              .13*(cos(driftTime*.45+z)-cos(z)),.08*sin(driftTime*.20));
      // Density is continuous: no clipped cloud islands or uniformly translated texture.
      float n=cloud(p);
      float detail=noise(p*7.2+vec3(0.,(42.+(time-42.)*1.7)*.035,0.));
      float vapor=.06+pow(smoothstep(.15,.85,n),2.5)*.94;
      float density=vapor*(envelope+floorMist)*(.7+.3*sin(z*3.14159));
      float extinction=1.-exp(-density*.44);
      // Approximate attenuation towards the overhead light, varying through the volume.
      float occlusion=field(p+vec3(-.2,-.8,.25));
      float light=exp(-occlusion*.8)*(.83+detail*.17);
      vec3 lit=mix(vec3(.22,.24,.25),vec3(.68,.65,.58),light);
      color+=trans*extinction*lit;trans*=1.-extinction;
    }
    gl_FragColor=vec4(color,1.-trans);
  }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['resolution','center','spread','time','mobile'].map(k=>[k,gl.getUniformLocation(program,k)]));
  let frame=0,running=false,last=0,elapsed=42,layout=null;
  function resize(){
    const w=dialog.clientWidth,h=dialog.clientHeight;const scale=Math.min(.55,640/w,420/h);
    canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);gl.viewport(0,0,canvas.width,canvas.height);
    const r=dialog.querySelector('.about-visual').getBoundingClientRect();const stacked=w<=760&&h>550;
    layout={x:(r.left+r.width*.5)/w,y:(r.top+r.height*(stacked?.96:1.01))/h,sx:stacked?.72:.38,sy:stacked?Math.min(.12,r.height/h*.42):.22,mobile:stacked?1:0};
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
    gl.uniform2f(uniforms.center,layout.x,layout.y);gl.uniform2f(uniforms.spread,layout.sx,layout.sy);gl.uniform1f(uniforms.mobile,layout.mobile);
  }
  function tick(now){if(!running)return;frame=requestAnimationFrame(tick);if(document.hidden||now-last<1000/30)return;
    elapsed+=Math.min((now-last)/1000,.08)*(matchMedia('(prefers-reduced-motion:reduce)').matches?.45:1);last=now;
    gl.uniform1f(uniforms.time,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  window.addEventListener('resize',()=>{if(running)resize()});
  document.addEventListener('visibilitychange',()=>{last=performance.now()});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();running=false;cancelAnimationFrame(frame)});
  return {start(){if(running)return;running=true;resize();last=performance.now();frame=requestAnimationFrame(tick)},stop(){running=false;cancelAnimationFrame(frame)}};
}
