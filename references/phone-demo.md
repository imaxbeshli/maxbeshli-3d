# AVTOLAB77 phone demo

30-second offline demonstration; no bot/API requests or customer messages.

- 0–15 s: fictional client conversation about protective film for a BMW X5,
  followed by a simulated CRM notification. No invented prices or appointment promises.
- 15–19 s: Mini App home.
- 19–25 s: BMW E31, Bentley Continental GT and Lexus LX500 gallery.
- 25–27.5 s: contacts from the supplied screenshots.
- 27.5–30 s: address with an illustrative map (not live navigation).

Visual layout follows screenshots provided by the user. Gallery photographs
and logo are from the public AVTOLAB77 website; embedded in index.html:

- logo: https://avtolab77.ru/upload/iblock/a6e/0fjgemx4ly3sqttrc3bpzyzun0s8y5ud/logo.webp
- bmw: https://avtolab77.ru/upload/resize_cache/iblock/35c/h4lxa7tdi19rfu03f316jzqhp440w6qd/600_600_2/DSCF3516.MOV.19_09_06_33.Still003.jpg
- bentley: https://avtolab77.ru/upload/resize_cache/iblock/f6b/9qias38cd2u5rcx57h79a7g68ubwc1d9/600_600_2/ban.png
- lexus: https://avtolab77.ru/upload/resize_cache/iblock/562/tsp35cyw2srdy8m4mgogukxfehejshbc/600_600_2/DSCF1958.JPG

Edit assets/phone-demo.js, then run `python3 tools/embed-phone-demo.py`.
The clock advances only while the phone tile is active and the document visible.
The 3D phone, glass, camera and other tiles retain their existing geometry/materials.
