# AVTOLAB77 animated Mini App concept

30-second offline canvas presentation; no real bookings, bot messages or API calls.

- 0–9 s: rolling wheel, scale/position match into the vehicle, body reveal and headlamp glow.
- 9–22 s: animated service selector with protective film sweep, polishing reflection and ceramic water droplets.
- 22–27 s: illustrative ceramic booking, date/time selection and sample form values.
- 27–30 s: confirmation and seamless return to the opening scene.

No portfolio or individual project screens. The car is a 2D cutout, not a 3D model.
Both assets were generated for this project and embedded into index.html:
- `assets/phone-car.png`: side-profile black SUV with transparent background. The wheel is sampled from this same image at runtime.
- `assets/phone-detailing-sheet.png`: 2×2 photo sheet (hero / film / polish / ceramic), used for booking and confirmation.

Edit `assets/phone-demo.js`, then run `python3 tools/embed-phone-demo.py`.
Playback advances only while the tile is active and the document is visible.
The outer phone geometry, glass, portfolio camera and other tiles are unchanged.
