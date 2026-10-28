# AVTOLAB77 phone demo

30-second offline demonstration; no bot/API requests or customer messages.

- 0–5 s: hero with a slow photographic push-in and service CTA.
- 5–10 s: film, polishing, ceramic service cards and selection.
- 10–15 s: scrolling real project gallery.
- 15–20 s: Bentley project, full photograph and detail crop of the same photograph.
- 20–26 s: illustrative service/date/time/name/phone selection.
- 26–30 s: animated confirmation and return to the home screen.

The UI is a new demonstration concept, not a capture of the existing live app.
Appointments and form values are fictional; no availability or booking API is used.
`assets/phone-detailing-sheet.png` was generated for this project: 2×2 photographs,
hero BMW / protective film / polishing / ceramic coating. Cropping happens at
runtime on canvas; the source sheet is embedded in index.html.
Real gallery photographs and the earlier logo asset come from the public website:

- logo: https://avtolab77.ru/upload/iblock/a6e/0fjgemx4ly3sqttrc3bpzyzun0s8y5ud/logo.webp
- bmw: https://avtolab77.ru/upload/resize_cache/iblock/35c/h4lxa7tdi19rfu03f316jzqhp440w6qd/600_600_2/DSCF3516.MOV.19_09_06_33.Still003.jpg
- bentley: https://avtolab77.ru/upload/resize_cache/iblock/f6b/9qias38cd2u5rcx57h79a7g68ubwc1d9/600_600_2/ban.png
- lexus: https://avtolab77.ru/upload/resize_cache/iblock/562/tsp35cyw2srdy8m4mgogukxfehejshbc/600_600_2/DSCF1958.JPG

Edit assets/phone-demo.js, then run `python3 tools/embed-phone-demo.py`.
The clock advances only while the phone tile is active and the document visible.
The 3D phone, glass, camera and other tiles retain their existing geometry/materials.
