# Doni Story Short — «Миллионер без наличных»

Вертикальный Shorts (1080×1920, ~41 с), 3D-сцены из проекта uzb-svet-7kun с русскими надписями.
Голос: ElevenLabs «Lev Lavrin» (eleven_v3).

- `short.js` — сцены (модуль `M=short`, движок из `uzb-svet-7kun/engine`)
- `sets.js` — декорации с русскими вывесками (ПРОДУКТЫ, БАНКОМАТ, ТОЛЬКО НАЛИЧНЫЕ)
- `align.py` — разметка текста по голосу → `timeline.json`
- `audio.py` — музыка, SFX, сведение → `mix.wav`

Рендер: `W=1080 H=1920 M=short node render.mjs frames 0-1240 frames 8981`
