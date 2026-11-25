import json, sys, subprocess
sys.path.insert(0, '/root/shorts/trucks'); import timing
NZ = float(sys.argv[1]) if len(sys.argv) > 1 else -30
_p = timing.pauses; timing.pauses = lambda a, noise=-35, d=.18: _p(a, noise=NZ, d=d)
S = ["У тебя на карте миллион.", "А купить ты не можешь даже хлеб.", "Второй день без света.", "Магазин открыт — при свечах.", "Очередь — на улицу.",
 "Ты прикладываешь карту…", "«Терминал не работает. Только наличные».", "Сзади мужик с пачкой мятых купюр забирает последние батарейки, воду и свечи.",
 "За один день полки пустеют.", "Вот что должно лежать дома всегда:", "фонарь, батарейки, повербанк, наличка, вода, радио.", "Стоит дешевле месячного интернета.",
 "Иначе в следующий раз миллион на карте будет и у тебя.", "А хлеба — не будет."]
timing.sentences = lambda text: S
r, D = timing.align('vo/p1.mp3', '', 0)
TL = {'S': [{'i': i, 'p': i, 'text': s, 't0': x['start'], 't1': x['end']} for i, (s, x) in enumerate(zip(S, r))], 'provisional': False}
json.dump(TL, open('web/timeline.json', 'w'), ensure_ascii=False)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'vo/p1.mp3', '-ac', '1', '-ar', '44100', 'voice_full.wav'], check=True)
print('dur', D)
for s in TL['S']: print(f"{s['t0']:6.2f} {s['t1']:6.2f} {s['t1']-s['t0']:5.2f} {s['text'][:50]}")
