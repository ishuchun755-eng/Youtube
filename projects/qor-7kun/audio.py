import json, wave, subprocess, numpy as np
D0 = '/root/shorts/qor'; SR = 44100; PRE = 4.0
SENT = json.load(open(f'{D0}/web/timeline.json'))['S']
S = lambda i: SENT[i]['start'] + PRE; E = lambda i: SENT[i]['end'] + PRE
DUR = PRE + SENT[-1]['end'] + 6.0; N = int(DUR * SR)
rng = np.random.default_rng(5)
def env(n, a=0.005, r=0.2): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)
def lp(x, k):
    from scipy.signal import lfilter
    return lfilter([k], [1, -(1 - k)], x)
def hp(x, k): return x - lp(x, k)
def tone(f, d, a=0.01, r=0.5, kind='sin'):
    n = int(d * SR); t = np.arange(n) / SR; ph = 2 * np.pi * np.cumsum(np.broadcast_to(f, n)) / SR if np.ndim(f) else 2 * np.pi * f * t
    w = np.sin(ph) if kind == 'sin' else np.sign(np.sin(ph)) * 0.6 if kind == 'sq' else (2 * ((ph / (2 * np.pi)) % 1) - 1)
    return w * env(n, a, r)
def noise(d): return rng.standard_normal(int(d * SR))
def put(b, x, t, g=1.0):
    i = int(t * SR); j = min(len(b), i + len(x))
    if 0 <= i < len(b) and j > i: b[i:j] += x[:j - i] * g
def fade(x, a=0.05, b=0.2):
    n = len(x); e = np.ones(n); na, nb = int(a * SR), int(b * SR); e[:na] = np.linspace(0, 1, na); e[-nb:] *= np.linspace(1, 0, nb); return x * e
mus = np.zeros(N); amb = np.zeros(N); sfx = np.zeros(N)
T = np.arange(N) / SR
# ---------------- ambience: wind everywhere (stronger outdoors-heavy days), engine hum when running
w = lp(noise(DUR), 0.02) * 6; gust = 0.6 + 0.4 * np.sin(T * 0.37) * np.sin(T * 0.11 + 1)
storm = np.ones(N);
for a, b, g in [(S(86), S(90), 2.2), (S(6), S(7), 1.6), (S(11), S(13), 1.5)]: storm[int(a * SR):int(b * SR)] = g
amb += w[:N] * gust * storm * 0.5
eng = np.zeros(N)
for a, b in [(0, S(22) + 1.5), (S(31), S(32)), (S(44), S(54)), (S(54), S(58)), (S(110), S(111) + 1.8), (S(183), S(184) + 3)]:
    i, j = int(a * SR), int(b * SR); n = j - i; tt = np.arange(n) / SR
    hum = (np.sin(2 * np.pi * 48 * tt) + 0.5 * np.sin(2 * np.pi * 96 * tt + 1) + 0.3 * lp(rng.standard_normal(n), 0.05) * 4)
    eng[i:j] += fade(hum, 0.3, 0.3) * 0.25
amb += eng
# ---------------- music: sparse cold piano + pad; tension drones; hopeful end
def piano(f, d=2.5): n = int(d * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) * np.exp(-t * 3) + 0.15 * np.sin(6 * np.pi * f * t)) * env(n, 0.004, 0.9)
def pad(fs, d): n = int(d * SR); t = np.arange(n) / SR; x = sum(np.sin(2 * np.pi * f * t + np.sin(t * 0.3 + f) * 0.5) for f in fs); return fade(x / len(fs), 1.5, 1.5)
Am = [220, 261.6, 329.6]; F = [174.6, 220, 261.6]; Dm = [146.8, 174.6, 220]; Em = [164.8, 196, 246.9]
seq = [Am, F, Dm, Em]
# sections: (start, end, mood)
SEC = [(0, S(20), 'calm'), (S(20), S(23), 'hit'), (S(23), S(65), 'cold'), (S(65), S(81), 'tense'), (S(81), S(110), 'cold'), (S(110), S(123), 'dark'), (S(123), S(135), 'hope_fail'),
       (S(135), S(154), 'cold'), (S(154), S(171), 'build'), (S(171), S(179), 'rescue'), (S(179), DUR, 'end')]
for a, b, mood in SEC:
    if mood in ('calm', 'cold', 'end', 'rescue', 'build'):
        step = 2.6 if mood != 'build' else 1.3; t = a; k = 0
        while t < b - 1:
            ch = seq[(k // 2) % 4] if mood != 'rescue' and mood != 'end' else [F, [196, 246.9, 293.7], Am, [261.6, 329.6, 392]][(k // 2) % 4]
            for j, f in enumerate(ch): put(mus, piano(f * (2 if mood in ('end', 'rescue') else 1)), t + j * 0.18 * (k % 2), 0.22)
            put(mus, piano(ch[0] / 2, 3), t, 0.25)
            t += step; k += 1
        put(mus, pad([x / 2 for x in seq[0]] if mood != 'end' else [x / 2 for x in F], b - a), a, 0.35 if mood != 'calm' else 0.2)
    elif mood in ('tense', 'dark', 'hope_fail'):
        n = int((b - a) * SR); tt = np.arange(n) / SR
        dr = (np.sin(2 * np.pi * 55 * tt) + 0.7 * np.sin(2 * np.pi * 58.3 * tt) + 0.3 * np.sin(2 * np.pi * 110 * tt + np.sin(tt * 0.5))) * 0.35
        put(mus, fade(dr, 1.0, 1.0), a)
        for tb in np.arange(a + 1, b - 1, 2.0 if mood == 'tense' else 3.0): put(mus, piano(110, 2.0), tb, 0.3)
    elif mood == 'hit':
        put(mus, tone(np.linspace(80, 30, int(1.5 * SR)), 1.5, 0.003, 0.6) * 1.2, a + 2.6)
# ---------------- sfx
def whoosh(d=0.6): n = int(d * SR); return lp(noise(d), 0.1) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 4
def boom(d=1.4): n = int(d * SR); t = np.arange(n) / SR; return np.sin(2 * np.pi * (35 + 60 * np.exp(-t / 0.08)) * t) * env(n, 0.003, 0.5)
def thud(): return lp(noise(0.4), 0.05) * env(int(0.4 * SR), 0.002, 0.08) * 6 + boom(0.4) * 0.5
def creak(d=1.5): n = int(d * SR); t = np.arange(n) / SR; f = 120 + 60 * np.sin(t * 3) + 30 * np.sin(t * 17); x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (0.5 + 0.5 * np.sin(t * 40) ** 8); return lp(x, 0.2) * fade(np.ones(n), 0.2, 0.4) * 0.8
def howl(d=3.0, f0=420): n = int(d * SR); t = np.arange(n) / SR; f = f0 + 160 * np.sin(np.minimum(t / d, 1) * np.pi) + 8 * np.sin(t * 30); x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR); return fade(x, 0.5, 1.0) * 0.5
def horn(d=1.5): n = int(d * SR); t = np.arange(n) / SR; x = (np.sign(np.sin(2 * np.pi * 400 * t)) + np.sign(np.sin(2 * np.pi * 500 * t))) * 0.3; return lp(fade(x, 0.02, 0.1), 0.3)
def scratch(d=1.2): x = hp(noise(d), 0.3); return x * (0.5 + 0.5 * np.sign(np.sin(np.arange(len(x)) / SR * 2 * np.pi * 5))) * 0.5 * fade(np.ones(len(x)), 0.05, 0.2)
def knock():
    out = np.zeros(int(1.2 * SR))
    for i in range(3): put(out, thud() * 0.7, i * 0.28)
    return out
def skid(d=2.0): n = int(d * SR); x = hp(noise(d), 0.2) * 0.6 + lp(noise(d), 0.04) * 3; return fade(x, 0.05, 0.6) * 0.6
def sputter(): n = int(1.8 * SR); t = np.arange(n) / SR; g = (np.sin(t * 2 * np.pi * (8 - 4 * t)) > 0.3) * np.exp(-t * 1.2); return lp(noise(1.8), 0.05) * 5 * g + np.sin(2 * np.pi * 45 * t) * g * 0.4
def beep(f=1200, d=0.12): return tone(f, d, 0.002, 0.05) * 0.5
def strike(): return hp(noise(0.35), 0.2) * env(int(0.35 * SR), 0.002, 0.12) * 1.2
def crackle(d): n = int(d * SR); x = np.zeros(n); idx = rng.integers(0, n, int(d * 40)); x[idx] = rng.uniform(-1, 1, len(idx)); return hp(lp(x, 0.5), 0.1) * 3 + lp(noise(d), 0.02) * 1.5
def sled(d, near0=0.2, near1=1.0): n = int(d * SR); t = np.arange(n) / SR; f = 90 + 10 * np.sin(t * 7); x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + lp(noise(d), 0.1) * 2; return lp(x, 0.15) * np.linspace(near0, near1, n)
def pass_car(d=8): n = int(d * SR); t = np.arange(n) / SR; g = np.exp(-((t - d * 0.45) / (d * 0.22)) ** 2); f = 70 * (1 + 0.08 * np.tanh((d * 0.45 - t) * 1.2)); x = np.sin(2 * np.pi * np.cumsum(f) / SR) + lp(noise(d), 0.04) * 3; return x * g * 0.6
def snowstep(): return lp(noise(0.18), 0.15) * env(int(0.18 * SR), 0.01, 0.05) * 2
# day slams
for i in [7, 44, 58, 81, 110, 135, 154]: put(sfx, whoosh(0.7), S(i) - 0.7, 0.8); put(sfx, boom(), S(i) - 0.35, 0.7)
put(sfx, whoosh(1.0), 0.2, 0.6)
put(sfx, beep(900), S(14)); put(sfx, beep(600, 0.3), S(15) + 0.3)
put(sfx, skid(2.2), S(20)); put(sfx, skid(1.5), S(22)); put(sfx, thud() * 1.5, S(22) + 1.5); put(sfx, boom(1.0), S(22) + 1.5, 0.8)
put(sfx, whoosh(1.2) * 1.5, S(23) + 0.2); put(sfx, thud(), S(25) + 0.55, 1.2)
for i in range(3): put(sfx, howl(3.0, 380 + i * 60), S(34) + 0.5 + i * 0.9, 0.5 - i * 0.12)
put(sfx, creak(2.5), S(36) + 0.5); put(sfx, creak(2.0), S(37) + 0.3)
put(sfx, thud() * 1.2, S(40) + 0.2); put(sfx, lp(noise(0.8), 0.08) * env(int(0.8 * SR), 0.01, 0.3) * 3, S(40) + 0.2)
for k in range(10): put(sfx, snowstep(), S(54) + k * 0.25, 0.8)
put(sfx, howl(3.0, 450), S(66), 0.5); put(sfx, lp(noise(1.0), 0.1) * 0.6 * fade(np.ones(int(1.0 * SR)), 0.1, 0.4), S(69))
for k in range(6): put(sfx, snowstep(), S(70) + k * 0.4, 0.6)
put(sfx, scratch(1.4), S(71) + 0.3)
put(sfx, horn(2.2), S(73) + 1.6); put(sfx, horn(1.0), S(74) + 0.8)
for k in range(10): put(sfx, snowstep(), S(76) + k * 0.15, 0.5)
for k in range(14): put(sfx, snowstep(), S(86) + k * 0.4, 0.7 * (1 - k / 14))
put(sfx, knock(), S(90) + 0.6, 1.0)
put(sfx, sputter(), S(111)); put(sfx, beep(400, 0.4), S(112) + 0.3, 0.6)
put(sfx, pass_car(9), S(123) - 1, 0.9)
for k in range(4): put(sfx, horn(0.5), S(127) + k * 0.7, 0.8)
put(sfx, beep(1000), S(143)); put(sfx, beep(1500), S(143) + 0.15); put(sfx, beep(800), S(148)); put(sfx, beep(400, 0.5), S(151))
for k in range(16): put(sfx, snowstep(), S(140) + k * 0.4, 0.7)
put(sfx, strike(), S(160) - 0.1); put(sfx, strike(), S(161) - 0.1); put(sfx, strike(), S(162) + 0.3)
put(sfx, lp(noise(1.5), 0.05) * 3 * fade(np.ones(int(1.5 * SR)), 0.05, 0.5), S(163) - 0.1)
fc = crackle(S(179) - S(163)); put(sfx, fade(fc, 0.5, 2), S(163), 0.5)
put(sfx, crackle(E(195) - S(189)), S(189), 0.35)
put(sfx, sled(S(171) - S(167), 0.0, 0.25), S(167)); put(sfx, sled(S(174) - S(171), 0.25, 1.0), S(171)); put(sfx, fade(sled(4, 1.0, 0.2), 0.05, 2), S(174))
put(sfx, whoosh(1.0), S(178) + 2.6); put(sfx, piano(523.3, 3) * 0.5, S(178) + 3.0)
for i, si in enumerate([181, 183, 184, 185, 186]): put(sfx, beep(700 + i * 100, 0.15), S(si) - 0.1, 0.6)
put(sfx, whoosh(0.8), S(192)); put(sfx, boom(1.2), S(192) + 0.2, 0.6)
def wr(name, x):
    wv = wave.open(f'{D0}/{name}', 'wb'); wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR)
    wv.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); wv.close()
# voice
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{D0}/voice_full.wav', '-ac', '1', '-ar', str(SR), f'{D0}/voice_m.wav'])
wv = wave.open(f'{D0}/voice_m.wav'); v = np.frombuffer(wv.readframes(wv.getnframes()), np.int16) / 32768
vo = np.zeros(N); vo[int(PRE * SR):int(PRE * SR) + len(v)] = v[:N - int(PRE * SR)]
def grms(x):
    b = 4410; r = np.sqrt(np.array([np.mean(x[i:i + b] ** 2) for i in range(0, len(x) - b, b)]) + 1e-12); g = r[r > r.max() * 0.1]; return np.sqrt(np.mean(g ** 2))
vr = grms(vo)
mus *= 0.28 * vr / grms(mus); amb *= 0.16 * vr / grms(amb); sfx *= 0.4 * vr / grms(sfx)
sfx *= min(1, 0.8 * np.abs(vo).max() / np.abs(sfx).max())
# duck music/amb a little under voice
venv = lp(np.abs(vo), 0.0005) ; venv /= venv.max(); duck = 1 - 0.35 * np.clip(venv * 4, 0, 1)
mix = vo + (mus + amb) * duck + sfx
mix /= max(1, np.abs(mix).max() * 1.02)
wr('mix.wav', mix)
print('ok', round(DUR, 2), 'music dB', round(20 * np.log10(grms(mus) / vr), 1))
