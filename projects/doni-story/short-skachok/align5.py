import json, sys
sys.path.insert(0, '/root/shorts/trucks'); import timing
NZ = float(sys.argv[1]) if len(sys.argv) > 1 else -30
_p = timing.pauses; timing.pauses = lambda a, noise=-35, d=.18: _p(a, noise=NZ, d=d)
S = ["Свет дали — и через секунду сгорел холодильник.", "Почему?", "Когда свет возвращают, в сети бывает скачок напряжения.", "Все приборы включаются одновременно — и напряжение прыгает.",
 "Горят холодильник, телевизор, роутер, зарядки.", "Правило простое: свет пропал — выдерни технику из розеток.", "Оставь включённой одну лампу.",
 "Лампа загорелась — подожди пять минут.", "И только потом включай всё по одному.", "Сохрани, чтобы не забыть."]
timing.sentences = lambda text: S
r, D = timing.align('vo/p5.mp3', '', 0)
json.dump({'S': [{'i': i, 'p': i, 'text': s, 't0': x['start'], 't1': x['end']} for i, (s, x) in enumerate(zip(S, r))], 'provisional': False}, open('web/timeline5.json', 'w'), ensure_ascii=False)
for i, (s, x) in enumerate(zip(S, r)): print(i, f"{x['start']:6.2f} {x['end']:6.2f}", s[:45])
