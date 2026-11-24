import json, sys, subprocess
sys.path.insert(0, '/root/shorts/trucks'); import timing
_p = timing.pauses; timing.pauses = lambda a, noise=-35, d=.18: _p(a, noise=-27, d=d)
TL = json.load(open('web/timeline.json')); S = TL['S']
ranges = [(0, 9), (10, 19), (20, 30), (31, 43)]
GAP = 0.6; off = 0.0; out = []; files = []
for k, (a, b) in enumerate(ranges):
    sents = [s['text'] for s in S if a <= s['p'] <= b]
    timing.sentences = lambda text, ss=sents: ss
    r, D = timing.align(f'vo/p{k+1}.mp3', '', off)
    out += r; off += D + GAP; files.append(f'vo/p{k+1}.mp3')
assert len(out) == len(S), (len(out), len(S))
for s, r in zip(S, out): s['t0'] = r['start']; s['t1'] = r['end']
TL['provisional'] = False; json.dump(TL, open('web/timeline.json', 'w'), ensure_ascii=False)
# concat with gaps
inputs = []; fc = ''
for i, f in enumerate(files): inputs += ['-i', f]
parts = ''.join(f'[{i}:a]aresample=44100,apad=pad_dur={GAP}[a{i}];' for i in range(len(files)))
cmd = ['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', parts + ''.join(f'[a{i}]' for i in range(len(files))) + f'concat=n={len(files)}:v=0:a=1[o]', '-map', '[o]', '-ac', '1', 'voice_full.wav']
subprocess.run(cmd, check=True)
print('total', round(off, 2))
for s in S[:6] + S[60:64] + S[-4:]: print(f"{s['t0']:7.2f} {s['t1']:7.2f} {s['text'][:60]}")
