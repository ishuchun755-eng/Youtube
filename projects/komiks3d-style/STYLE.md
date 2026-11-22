# Komiks-3D uslubi (reference: diqqatqil "konditsioner qishda" Shorts)

Maqsad: 3D sahna + komiks render (ingichka ink, halftone soya, haqiqiy soyalar), bitta uzluksiz kamera.

## Texnika (scene.js da ishlaydi)
- 3 pass: lit (Lambert + shadow, HalfFloat RT), flat (albedo), normal+depth.
- Composite: sh = lum(lit)/lum(flat) -> band (1 / .93 / .8) + 45° halftone nuqtalar (sh<.98),
  ink = depth(rel) + normal Sobel, paper grain, gamma 1/2.2 oxirida.
- CanvasTexture -> colorSpace = SRGB. PCFSoft shadow 4096.
- Snow Points hamma passda, normal passda yashirin. noEdge: ground, rug, glass.
- Render: `W=1080 H=1920 node render.mjs frames 0-299 frames 8891` (~2 s/kadr/worker).

## Sinov-1 dan saboq (reference bilan farq) — keyingi videoda albatta:
1. Ranglar yorqin: qor oppoq, soyasi havorang; osmon havorang; devor krem; kulrang tuman YO'Q. Kontrast baland.
2. Kompozitsiya: asosiy obyekt (uy) kadr markazida TO'LIQ ko'rinsin; to'liq gable tom + qalin dumaloq qor qatlami.
3. Daraxtlar: ko'p shoxli, mayda novdalar (depth 5-6, 3-4 bola).
4. Qirralar yumaloq (RoundedBoxGeometry / bevel), qutilar emas.
5. Ink to'qroq va aniqroq; cast shadow kuchli va keskin (devorga tushgan soya ko'rinsin).
6. Infografika: ingichka trubka + strelka uchi, tartibli oqim; belgilar (chaqmoq, tomchi) 3D ichida.
7. Tutun bulutdek (bir nechta sharlar to'dasi, shaffof), qatorli sharlar emas.
8. Detallar: qorda oyoq izlari, plintus, g'isht, chiziqli trubalar, termometr, qushlar, mushuk.
9. Kamera: kesishsiz uchib kirish, oxirida to'xtab qolmasin (sekin drift davom etsin).
10. Qahramon yuzlari kam / yo'q — diqqat jarayonda.
