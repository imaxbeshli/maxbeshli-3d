/* Distant waterfall: animated photographic flow, spray and reflected surface.
 * Coordinates are UVs of cave-waterfall.png, not screen coordinates. The effect
 * stays attached to its rocks through camera travel and the water mirror pass.
 * No video decode, extra render target, particles or independent animation loop.
 */
window.MBWaterfall = (() => {
  const shore = .582;
  const center = .309;
  const uniforms = { uFallTime: { value: 0 } };
  const shader = `
    uniform float uFallTime;
    float fallHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float fallNoise(vec2 p){
      vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
      return mix(mix(fallHash(i),fallHash(i+vec2(1.,0.)),f.x),
                 mix(fallHash(i+vec2(0.,1.)),fallHash(i+vec2(1.)),f.x),f.y);
    }
    float fallFbm(vec2 p){return fallNoise(p)*.57+fallNoise(p*2.03+11.7)*.29+fallNoise(p*4.07+23.1)*.14;}
    vec3 animateFall(vec2 uv,vec3 color){
      if(uv.x<.215 || uv.x>.403 || uv.y<.417 || uv.y>.747) return color;
      float t=uFallTime;
      // The lip bends slightly left, while the lower fall is almost vertical.
      float height=smoothstep(.425,.739,uv.y);
      float axis=.309-.005*height*height;
      float width=mix(.009,.017,height);
      float edges=1.-smoothstep(width*.60,width,abs(uv.x-axis));
      float vertical=smoothstep(.417,.442,uv.y)*(1.-smoothstep(.729,.746,uv.y));
      // Respect the original silhouette and foreground rock occlusion.
      float waterPixels=smoothstep(.17,.46,color.b)*(1.-smoothstep(.04,.20,color.r-color.b));
      float mask=edges*vertical*waterPixels;
      // Advect stretched multi-scale detail DOWN the fall. No frame-loop seam.
      float flow=fallFbm(vec2((uv.x-axis)*1500.,uv.y*75.+t*3.4));
      float threads=fallNoise(vec2((uv.x-axis)*3400.,uv.y*120.+t*5.4));
      color*=1.+mask*((flow-.5)*.78+(threads-.5)*.24);
      color+=vec3(.18,.26,.29)*mask*pow(flow,3.)*.32;
      // Fine spray rising and spreading from the impact, feathered on all sides.
      vec2 mist=(uv-vec2(.309,.435))/vec2(.066,.026);
      float envelope=exp(-dot(mist,mist)*1.6)*smoothstep(.417,.426,uv.y);
      float vapor=fallFbm(vec2(uv.x*110.-t*.19,uv.y*200.-t*.28));
      color=mix(color,vec3(.53,.68,.73),envelope*(.035+.15*vapor));
      return color;
    }
  `;
  function material(T, map) {
    const result = new T.MeshBasicMaterial({map, depthWrite:false, fog:false, toneMapped:false});
    result.onBeforeCompile = program => {
      Object.assign(program.uniforms, uniforms);
      program.fragmentShader = shader + program.fragmentShader;
      program.fragmentShader = program.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        diffuseColor.rgb = animateFall(vUv, diffuseColor.rgb);
      `);
    };
    result.customProgramCacheKey = () => 'MB-distant-waterfall-v1';
    return result;
  }
  return {shore, center, uniforms, material, update(time){uniforms.uFallTime.value=time;}};
})();
