# YouTube Shorts ishxonasi

## Skillar (`.claude/skills/`)
| Skill | Nima uchun |
|---|---|
| `cartoon-audio-short` | 2D multfilm Shorts: 10 ta g'oya → ssenariy → ovozdan tayyor MP4 (3D dunyo kiti `kit/` hali yuklanmagan) |
| `ghost-editor` | Kameraga gapirgan videodan tayyor reel: eng yaxshi dubllar, pauzalarni kesish, subtitr, SFX |
| `vizavi-motion` | Motion-grafika, kinetik tipografika, mahsulot animatsiyalari |

Ovoz: ElevenLabs (Davronbek - Journalist, eleven_v4).

## Loyihalar (`projects/`)
- `minora-1/` — "Minorada 7 kun", 1-qism (42 s). `render.py` (kadrlar), `audio.py` (SFX), qurish:
  ```bash
  python3 audio.py && python3 render.py
  ffmpeg -i video.mp4 -i voice.mp3 -i sfx.wav -filter_complex "[2]volume=0.3[s];[1][s]amix=2:normalize=0[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest final.mp4
  ```

Yangi sessiyada skillarni yoqish: `cp -r .claude/skills/* ~/.claude/skills/` va `python3 ~/.claude/skills/ghost-editor/scripts/library_restore.py`.
