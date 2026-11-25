import json, wave, subprocess, sys, numpy as np
from scipy.signal import lfilter
D0 = '/root/shorts/svetru'; SR = 44100; PRE = 0.25
SEN = json.load(open(f'{D0}/web/timeline.json'))['S']
S = lambda i: SEN[i]['t0'] + PRE; E = lambda i: SEN[i]['t1'] + PRE
DUR = E(len(SEN) - 1) + 1.6; N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(7)
def env(n, a=.005, r=.2): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)
def lp(x, k): return lfilter([k], [1, -(1 - k)], x)
def hp(x, k): return x - lp(x, k)
def noise(d): return rng.standard_normal(int(d * SR))
def put(b, x, t, g=1.):
    i = int(t * SR); j = min(len(b), i + len(x))
    if 0 <= i < len(b) and j > i: b[i:j] += x[:j - i] * g
def fade(x, a=.05, b=.2):
    n = len(x); e = np.ones(n); na, nb = min(n, int(a * SR)), min(n, int(b * SR)); e[:na] = np.linspace(0, 1, na); e[n - nb:] *= np.linspace(1, 0, nb); return x * e
def seg(a, b): return slice(int(a * SR), int(b * SR))
def tone(f, d, a=.005, r=.3): n = int(d * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)) * env(n, a, r)
def piano(f, d=2.2): n = int(d * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * f * t) + .4 * np.sin(4 * np.pi * f * t) * np.exp(-t * 3) + .15 * np.sin(6 * np.pi * f * t)) * env(n, .004, .8)
def pad(fs, d): n = int(d * SR); t = np.arange(n) / SR; x = sum(np.sin(2 * np.pi * f * t + np.sin(t * .3 + f) * .5) for f in fs); return fade(x / len(fs), 1.2, 1.2)
amb = np.zeros(N); mus = np.zeros(N); sfx = np.zeros(N)
# ---------- music ----------
C = [261.6, 329.6, 392]; G_ = [196, 246.9, 293.7]; Am = [220, 261.6, 329.6]; F = [174.6, 220, 261.6]; Dm = [146.8, 174.6, 220]; Em = [164.8, 196, 246.9]
def bed(a, b, chords, step=2.4, oct=1, g=.2, padg=.25, arp=True):
    t = a; k = 0
    while t < b - 1:
        ch = chords[k % len(chords)]
        for j, fr in enumerate(ch): put(mus, piano(fr * oct), t + (j * .16 if arp else 0), g)
        put(mus, piano(ch[0] / 2, 3), t, g * 1.1); t += step; k += 1
    put(mus, pad([x / 2 for x in chords[0]], b - a), a, padg)
def beat(a, b, bpm=100, g=.3):
    bt = 60 / bpm; kn = int(.25 * SR); kt = np.arange(kn) / SR; kick = np.sin(2 * np.pi * (45 + 70 * np.exp(-kt / .03)) * kt) * env(kn, .002, .12)
    hat = hp(noise(.05), .5) * env(int(.05 * SR), .001, .015); t = a; i = 0
    while t < b: put(mus, kick, t, g); put(mus, hat, t + bt / 2, g * .35); t += bt; i += 1
def drone(a, b, base=55, g=.3):
    n = int((b - a) * SR); tt = np.arange(n) / SR; d = (np.sin(2 * np.pi * base * tt) + .7 * np.sin(2 * np.pi * base * 1.06 * tt) + .3 * np.sin(2 * np.pi * base * 2 * tt + np.sin(tt * .5))) * .35
    put(mus, fade(d, 1, 1.2), a, g)
# ---------- sfx ----------
def whoosh(d=.5): n = int(d * SR); return lp(noise(d), .12) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 3
def pop(): a = tone(900, .12, .002, .03); a[:int(.08 * SR)] += tone(1400, .08, .002, .02) * .5; return a
def thud(): n = int(.5 * SR); t = np.arange(n) / SR; return np.sin(2 * np.pi * (60 + 60 * np.exp(-t / .04)) * t) * env(n, .002, .18) + lp(noise(.5), .05) * env(n, .002, .1) * 3
def skid(d=1.4): n = int(d * SR); t = np.arange(n) / SR; return hp(noise(d), .3) * (np.sin(2 * np.pi * 900 * t) * .3 + 1) * fade(np.ones(n), .05, .5) * .5
def heartb(): return thud() * .8
def beep(f=880, d=.12): return tone(f, d, .002, d)
def horn(d): n = int(d * SR); t = np.arange(n) / SR; return fade((np.sign(np.sin(2 * np.pi * 330 * t)) + np.sign(np.sin(2 * np.pi * 415 * t))) * .25, .01, .03)
def click(): return hp(noise(.02), .6) * env(int(.02 * SR), .0005, .004)
def tick(): return tone(2200, .03, .0005, .01) * .6
def crackle(d): n = int(d * SR); x = np.zeros(n); idx = rng.integers(0, n, int(d * 40)); x[idx] = rng.standard_normal(len(idx)); return hp(lfilter([1], [1, -.6], x), .3) * 1.5
def knock(): return thud() * .8 + hp(noise(.05), .2)[:int(.5 * SR)].sum() * 0
def ping(): return tone(1320, .25, .002, .12) + tone(1760, .25, .002, .1) * .5
def creak(d=.8): n = int(d * SR); t = np.arange(n) / SR; f = 300 + 200 * np.sin(t * 3); return np.sin(2 * np.pi * np.cumsum(f) / SR) * (lp(np.abs(noise(d)), .01) * 3) * fade(np.ones(n), .05, .3)
def sweep(f0, f1, d): n = int(d * SR); t = np.arange(n) / SR; f = np.linspace(f0, f1, n); return np.sin(2 * np.pi * np.cumsum(f) / SR) * fade(np.ones(n), .02, .3)
amb = np.zeros(N); mus = np.zeros(N); sfx = np.zeros(N)
wind = lp(noise(DUR), .02)[:N] * 6 * (.65 + .35 * np.sin(T * .37) * np.sin(T * .11 + 1))
lvl = np.full(N, .1); lvl[seg(S(2), S(3))] = .7; lvl[seg(S(4), S(5))] = .6; lvl = lfilter([.0005], [1, -.9995], lvl); amb += wind * lvl * .55
amb += crackle(DUR)[:N] * .04
# music: tense drone + pulse, lift at kit, sting at end
drone(0, S(9), 46, .5); beat(S(2), S(9), 92, .2)
bed(S(9), S(12), [Am, F, C, G_], 1.6, g=.15, padg=.2); beat(S(9), S(12), 100, .2)
drone(S(12), DUR, 41, .55)
# sfx
for t in [S(0) + .3, S(1) + .2, S(3) + .2, S(4), S(5) + .8, S(6) + .3, S(7) + 1.2, S(8) + .3, S(9) + .2, S(11), S(12) + .6, S(13)]: put(sfx, whoosh(.35), t - .2, .5); put(sfx, pop(), t + .05, .5)
put(sfx, whoosh(.6), 0, .9); put(sfx, thud(), .08, .9)
put(sfx, beep(520, .14), S(5) + .7, .8); put(sfx, beep(380, .3), S(5) + .9, .8)
for i in range(6): put(sfx, hp(noise(.08), .3) * env(int(.08 * SR), .002, .03), S(7) + .3 + i * .09, .25)
for i, x in enumerate([26.7, 27.4, 28.1, 28.9, 29.6, 30.2]): put(sfx, pop(), x + PRE, .6); put(sfx, tick(), x + PRE + .05, .5)
for t in [S(7) + 2.2, S(7) + 3.1, S(7) + 4.0]: put(sfx, pop(), t, .5)
put(sfx, thud(), S(13), 1.0); put(sfx, sweep(200, 60, 1.0), S(13), .4); put(sfx, ping(), E(13) + .3, .4)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{D0}/voice_full.wav', '-ac', '1', '-ar', str(SR), f'{D0}/voice_m.wav'], check=True)
w = wave.open(f'{D0}/voice_m.wav'); v = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768.
voice = np.zeros(N); put(voice, v, PRE)
def grms(x):
    b = 4410; r = np.sqrt(np.array([np.mean(x[i:i + b] ** 2) for i in range(0, len(x) - b, b)]) + 1e-12); g = r[r > r.max() * .1]; return np.sqrt(np.mean(g ** 2))
vr = grms(voice)
mus *= .25 * vr / grms(mus); amb *= .15 * vr / grms(amb); sfx *= .4 * vr / grms(sfx)
venv = lfilter([.002], [1, -.998], np.abs(voice)); duck = 1 - .35 * np.clip(venv / (venv.max() * .3), 0, 1)
mix = voice + mus * duck + amb + sfx
mix /= max(1, np.abs(mix).max() * 1.05)
w = wave.open(f'{D0}/mix.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close()
print('ok', round(DUR, 2))
