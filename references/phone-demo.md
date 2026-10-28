# AVTOLAB77 Mini App — accelerated 3D presentation

30 seconds: 0–6 wheel / body / continuous front turn / headlights; 6–13 services;
13–17 care packages; 17–20 about; 20–24 booking; 24–27 confirmation; 27–30 contacts.

The 3D Ferrari model replaces the side-profile SUV cutout. A real wheel clone docks
into its original position, then the car rotates 90 degrees, then headlights light up.
See `assets/car3d/ATTRIBUTION.md` for model/runtime authorship and source links.

Generated service photographs in `assets/phone-detailing-sheet.png` remain embedded.
Care icons are drawn on canvas. Contacts follow the user-provided AVTOLAB77 screenshots;
the route diagram is illustrative, not live navigation. Appointments are fictional.

No external assets or APIs are needed. Edit `assets/phone-demo.js` and
`assets/phone-car3d.js`, then run `python3 tools/embed-phone-demo.py`.
