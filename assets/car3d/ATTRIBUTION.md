# Car model and bundled runtime

- Ferrari 458 Italia model: **vicent091036**.
- Original model page credited by the upstream example: https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6
- Model distributed in three.js r128: https://github.com/mrdoob/three.js/blob/r128/examples/models/gltf/ferrari.glb
- Upstream demonstration and attribution: https://github.com/mrdoob/three.js/blob/r128/examples/webgl_materials_car.html
- GLTFLoader and DRACOLoader from three.js r128; MIT license in THREE-LICENSE.txt.
- Draco WASM decoder from the same three.js release; Google Draco Apache 2.0 license in DRACO-LICENSE.txt.

The geometry file is unchanged. The demo changes paint/glass materials and lighting
at runtime and animates a cloned wheel and the model's rotation. Loaders, model,
decoder JavaScript and WASM bytes are all embedded into index.html by the embed tool.
No asset CDN, Telegram API or booking service is contacted.
