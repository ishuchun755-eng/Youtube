import json, sys
sys.path.insert(0, '/root/shorts/trucks'); import timing
NZ = float(sys.argv[1]) if len(sys.argv) > 1 else -30
_p = timing.pauses; timing.pauses = lambda a, noise=-35, d=.18: _p(a, noise=NZ, d=d)
S = ["Лифт сорвался с двадцатого этажа.", "Ты прыгаешь в последнюю секунду — и спасаешься?", "Нет.", "Кабина летит вниз больше ста километров в час.", "А твой прыжок — около десяти.", "Удар будет почти такой же.", "К тому же ты не знаешь, когда будет дно.",
 "Что делать?", "Ложись на спину, на весь пол.", "Удар распределится по всему телу.", "Руками закрой голову.", "Но хорошая новость: у лифта несколько тросов, и каждый держит кабину в одиночку.",
 "А аварийные ловители тормозят её ещё с тысяча восемьсот пятьдесят третьего года.", "Лифт почти никогда не падает."]
timing.sentences = lambda text: S
r, D = timing.align('vo/p6.mp3', '', 0)
json.dump({'S': [{'i': i, 'p': i, 'text': s, 't0': x['start'], 't1': x['end']} for i, (s, x) in enumerate(zip(S, r))], 'provisional': False}, open('web/timeline6.json', 'w'), ensure_ascii=False)
for i, (s, x) in enumerate(zip(S, r)): print(i, f"{x['start']:6.2f} {x['end']:6.2f}", s[:45])
