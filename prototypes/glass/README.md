# Interactive glass material prototype

Open `prototypes/glass/` through an HTTP server. The approved geometry and material live in `assets/approved-glass.js`. About shares its studio lighting; its frame now follows the main-page tiles via `assets/about-frame.js`.

- Drag with a mouse or one finger to rotate the closed 3D mesh.
- Arrow keys rotate the focused canvas; `0` restores the initial view.
- “Сменить свет” cycles three studio environment orientations.
- “Сравнить с макетом” opens the approved image.

The pane is a rounded-rectangle extrusion, 6 × 4.2 units, 0.30 units thick,
with a 0.22 corner radius. A 0.008-unit manufacturing chamfer catches edge
highlights; it does not round the thickness into a pillow. Front and back
surfaces are planar. Three.js MeshPhysicalMaterial uses transmission, IOR 1.52,
roughness 0.035, attenuation and a filtered HDR environment. The side surfaces
use stronger absorption. Background geometry is visible through the
transmission buffer and changes its apparent position with rotation.

This is a real-time rasterized material study, not an offline path-traced image.
The soft floor contact shadow is an ambient-shadow approximation; the renderer
does not simulate refractive caustics or multiple internal bounces.

All dependencies/assets are local. No runtime CDN, API or build step is needed.
Three.js and RGBELoader: 0.164.1, MIT (see vendor/THREE-LICENSE.txt).
HDR: Poly Haven “Studio Small 08”, CC0,
https://polyhaven.com/a/studio_small_08
Source: https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr

Run browser checks with `python tools/check-glass-prototype.py` from the repo root.
