import json, wave, numpy as np, subprocess
D0 = '/root/shorts/btc'; SR = 44100
SENT = json.load(open(f'{D0}/sentences.json'))
S = lambda i: SENT[i]['start']
DUR = 34.86 + 1.3; N = int(DUR * SR)
rng = np.random.default_rng(1)
def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / r)
def tone(f, d, a=0.005, r=0.2, kind='sin'):
    n = int(d * SR); t = np.arange(n) / SR
    if kind == 'sin': w = np.sin(2 * np.pi * f * t)
    elif kind == 'saw': w = 2 * ((f * t) % 1) - 1
    elif kind == 'sq': w = np.sign(np.sin(2 * np.pi * f * t))
    return w * env(n, a, r)
def noise(d, r=0.1, a=0.002):
    n = int(d * SR); return rng.standard_normal(n) * env(n, a, r)
def lp(x, k=0.1):
    y = np.zeros_like(x); s = 0
    for i in range(len(x)): s += k * (x[i] - s); y[i] = s
    return y
def lpf(x, k):  # fast one-pole via cumulative trick (approx) using filter
    from numpy import convolve
    L = int(3 / k); h = k * (1 - k) ** np.arange(L); return convolve(x, h)[:len(x)]
def put(buf, x, t, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if i < len(buf) and j > i: buf[i:j] += x[:j - i] * g
mus = np.zeros(N); sfx = np.zeros(N)
# ---- music: light pulse until S4, upbeat until S9, then dark drone
bpm = 104; beat = 60 / bpm
prog = [(220, 277.2, 329.6), (174.6, 220, 261.6), (196, 246.9, 293.7), (164.8, 207.7, 246.9)]
t = 0.0; k = 0
while t < S(9) - 0.05:
    ch = prog[(k // 8) % 4]
    full = t >= S(4) - 0.05
    if full or k % 2 == 0:
        kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-np.arange(int(0.25 * SR)) / SR / 0.03)) * np.arange(int(0.25 * SR)) / SR) * env(int(0.25 * SR), 0.002, 0.12)
        if k % 2 == 0: put(mus, kick, t, 0.9 if full else 0.4)
    put(mus, tone(ch[0] / 2, beat * 0.9, 0.005, 0.18, 'saw') * 0.25, t, 0.8 if full else 0.4)
    arp = ch[k % 3] * 2
    put(mus, tone(arp, beat * 0.5, 0.003, 0.09) * 0.35, t, 1.0 if full else 0.6)
    if full: put(mus, tone(arp * 2, beat * 0.5, 0.003, 0.06) * 0.15, t + beat / 2)
    if full and k % 2 == 1: put(mus, noise(0.08, 0.03) * 0.15, t)
    t += beat / 2 * 2 if False else beat / 2; k += 1
# drone after the message arrives
n = N - int(S(9) * SR); tt = np.arange(n) / SR
dr = (np.sin(2 * np.pi * 55 * tt) + 0.6 * np.sin(2 * np.pi * 58.3 * tt) + 0.3 * np.sin(2 * np.pi * 110.5 * tt)) * np.minimum(1, tt / 1.5) * 0.4
dr *= 1 + 0.5 * np.clip((tt - (S(13) - S(9))) / 3, 0, 1)
put(mus, dr, S(9))
# heartbeat in choice section
hb = np.sin(2 * np.pi * 45 * np.arange(int(0.15 * SR)) / SR) * env(int(0.15 * SR), 0.003, 0.05)
for tb in np.arange(S(13), S(19), 0.75): put(mus, hb, tb, 0.9); put(mus, hb, tb + 0.22, 0.6)
# ---- sfx
pop = tone(900, 0.15, 0.002, 0.04) + tone(1400, 0.15, 0.002, 0.03) * 0.5
ding = tone(1318, 0.6, 0.002, 0.25) + tone(1975, 0.6, 0.002, 0.18) * 0.5
msg = tone(988, 0.25, 0.002, 0.07) + tone(1480, 0.25, 0.002, 0.06) * 0.6
tap = noise(0.03, 0.008) * 0.6
whoosh = lpf(rng.standard_normal(int(0.4 * SR)), 0.08) * np.sin(np.linspace(0, np.pi, int(0.4 * SR))) * 2.5
boom = np.sin(2 * np.pi * (40 + 60 * np.exp(-np.arange(int(1.2 * SR)) / SR / 0.08)) * np.arange(int(1.2 * SR)) / SR) * env(int(1.2 * SR), 0.003, 0.45)
shimmer = sum(tone(f, 1.2, 0.01, 0.5) * 0.25 for f in (1568, 2093, 2637, 3136))
kach = tone(2200, 0.3, 0.001, 0.08) + np.pad(noise(0.12, 0.03), (0, int(0.3*SR)-int(0.12*SR))) * 0.4 + tone(3300, 0.3, 0.001, 0.15) * 0.5
put(sfx, pop, 0.9)
for i in range(5): put(sfx, tap, S(1) + i * 1.1 / 5 + 0.05)
put(sfx, ding * 0.6, S(1) + 1.1)
for i in range(5): put(sfx, whoosh * 0.4, S(2) + 0.15 * i)
for i in range(6): put(sfx, tap * 0.6, S(3) + 0.2 * i)
put(sfx, boom, S(4) - 0.05); put(sfx, shimmer, S(4) - 0.05)
put(sfx, pop, S(6)); put(sfx, kach, S(6) + 0.1); put(sfx, boom * 0.6, S(6) + 1.0)
put(sfx, kach, S(7)); put(sfx, kach, S(7) + 0.15); put(sfx, lpf(rng.standard_normal(int(1.2 * SR)), 0.3) * env(int(1.2 * SR), 0.05, 0.5) * 0.5, S(7))
put(sfx, whoosh * 0.6, S(8))
for st in (S(8), S(8) + 1.0, S(8) + 1.75): put(sfx, pop, st)
put(sfx, pop * 0.8, S(9)); put(sfx, ding, S(9) + 0.15)
for i in range(10, 15): put(sfx, msg, S(i))
for tt_ in np.arange(S(15) - 0.1, S(16), 0.12): put(sfx, tap * 0.5, tt_)
put(sfx, boom * 1.2, S(16)); put(sfx, lpf(rng.standard_normal(int(1.5 * SR)), 0.05) * env(int(1.5 * SR), 0.01, 0.6) * 3, S(16))
put(sfx, whoosh, S(17) + 0.2); put(sfx, whoosh, S(17) + 0.5)
put(sfx, whoosh, S(19)); put(sfx, pop, S(20)); put(sfx, pop, S(20) + 1.1)
put(sfx, np.pad(tap * 1.5, (0, int(0.08*SR)-len(tap))) + tone(600, 0.08, 0.001, 0.02), S(20) + 1.9); put(sfx, ding, S(20) + 1.95)
def wr(name, x):
    x = np.clip(x, -1, 1); w = wave.open(f'{D0}/{name}', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()
mus /= np.abs(mus).max() * 1.05; sfx /= np.abs(sfx).max() * 1.05
wr('music.wav', mus); wr('sfx.wav', sfx)
# ---- mix: music at 50% of voice gated RMS, sfx <= 50% with peaks capped at 0.7x voice peak
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{D0}/voice.wav', '-ac', '1', '-ar', str(SR), f'{D0}/voice_m.wav'])
w = wave.open(f'{D0}/voice_m.wav'); v = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768
v = np.concatenate([v, np.zeros(max(0, N - len(v)))])[:N]
def grms(x):
    b = 4410; r = np.sqrt(np.array([np.mean(x[i:i + b] ** 2) for i in range(0, len(x) - b, b)]) + 1e-12)
    g = r[r > r.max() * 0.1]; return np.sqrt(np.mean(g ** 2))
vr = grms(v); mus *= 0.5 * vr / grms(mus)
sfx *= 0.5 * vr / grms(sfx); pk = np.abs(sfx).max()
if pk > 0.7 * np.abs(v).max(): sfx *= 0.7 * np.abs(v).max() / pk
db = lambda a, b: 20 * np.log10(grms(a) / grms(b))
print('music vs voice dB', round(db(mus, v), 2), 'sfx vs voice dB', round(db(sfx, v), 2))
mix = v + mus + sfx
wr('mix_pre.wav', mix / max(1, np.abs(mix).max()))
