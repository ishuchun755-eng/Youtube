import json, wave, subprocess, sys, numpy as np
from scipy.signal import lfilter
D0 = '/root/shorts/doni'; SR = 44100; PRE = 1.2
SEN = json.load(open(f'{D0}/web/timeline.json'))['S']
S = lambda i: SEN[i]['t0'] + PRE; E = lambda i: SEN[i]['t1'] + PRE
DUR = E(len(SEN) - 1) + 4.0; N = int(DUR * SR); T = np.arange(N) / SR
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
# ---------- wind: level per region ----------
wind = lp(noise(DUR), .02)[:N] * 6 * (.65 + .35 * np.sin(T * .37) * np.sin(T * .11 + 1))
howl = np.zeros(N); f = 300 + 120 * np.sin(T * .23) + 60 * np.sin(T * .71); ph = 2 * np.pi * np.cumsum(f) / SR; howl = np.sin(ph) * (lp(np.abs(noise(DUR))[:N], .0005) * 4)
lvl = np.zeros(N)
REG = [(0, S(8), 1.0), (S(17), S(24), .15), (S(24), S(27), .25), (S(27), S(33), .7), (S(38), S(45), 1.0), (S(45), S(48), .35), (S(50), S(60), 1.1), (S(66), S(69), .3),
       (S(80), S(82), .3), (S(97), S(99), 1.0), (S(99), S(110), .3), (S(115), S(119), .3), (S(134), S(138), .8), (S(155), S(165), .3), (S(165), S(170), .15),
       (S(170), S(176), .25), (S(176), S(196), .3), (S(196), S(204), .05), (S(204), S(213), .05)]
for a, b, g in REG: lvl[seg(a, b)] = g
lvl = lfilter([.0005], [1, -.9995], lvl)  # smooth
amb += wind * lvl * .55 + howl * np.clip(lvl - .6, 0, 1) * .25
# engine hum while driving / idling
for a, b in [(S(17), S(38) + 2), (S(38), S(41) + 1.5), (S(80), S(82)), (S(99), S(102))]:
    n = int((b - a) * SR); tt = np.arange(n) / SR; hum = np.sin(2 * np.pi * 46 * tt) + .5 * np.sin(2 * np.pi * 92 * tt + 1) + .3 * lp(rng.standard_normal(n), .05) * 4
    put(amb, fade(hum, .4, .6) * .22, a)
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
bed(0, S(8), [Am, F, Dm, Em], 3.0, g=.14); drone(0, S(8), 55, .35)
bed(S(8), S(17), [C, G_, Am, F], 2.2, g=.18); beat(S(12), S(17), 100, .25)
bed(S(17), S(27), [C, G_, Am, F], 2.4, g=.18); beat(S(17), S(27), 92, .2)
drone(S(27), S(38), 55, .4); bed(S(33), S(38), [Am, Em], 2.4, g=.12)
drone(S(38), S(50), 49, .45); bed(S(48), S(50), [Dm], 2, g=.15)
drone(S(50), S(60), 49, .45); bed(S(58), S(66), [Am, F], 2.4, g=.16)
bed(S(66), S(80), [F, C, G_, Am], 2.4, g=.15); bed(S(80), S(85), [C, F], 2.4, g=.14)
drone(S(85), S(97), 46, .5); bed(S(97), S(110), [Am, F, Dm, Em], 2.6, g=.14)
drone(S(110), S(134), 52, .35); bed(S(110), S(134), [Am, Em, F, Em], 3.0, g=.12)
bed(S(134), S(165), [Am, F, C, G_], 2.6, g=.13); bed(S(165), S(176), [C, G_, Am, F], 2.2, g=.15)
drone(S(176), S(183), 49, .4); bed(S(183), S(196), [F, C, Am, G_], 2.6, g=.17)
bed(S(196), S(213), [C, G_, Am, F], 2.0, oct=2, g=.16, padg=.3); beat(S(204), S(213), 100, .22)
bed(S(213), DUR, [C, G_, Am, F], 2.2, g=.16); beat(S(213), DUR - 2, 100, .22)
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
PLATES = [0, 6, 7, 13, 19, 20, 22, 35, 36, 38, 48, 56, 58, 62, 64, 65, 75, 83, 88, 89, 95, 96, 97, 99, 100, 103, 104, 108, 111, 113, 116, 120, 121, 123, 125, 130, 132, 134, 144, 152, 153, 159, 160, 161, 164, 170, 174, 176, 179, 180, 181, 190, 195, 196, 203, 210, 213, 215, 218, 221, 223, 225, 228, 229, 231, 234, 238]
for i in PLATES: put(sfx, whoosh(.4), S(i) - .2, .5); put(sfx, pop(), S(i) + .05, .45)
# beat cuts (whoosh)
for i in [8, 12, 17, 24, 27, 33, 38, 45, 48, 50, 58, 60, 66, 69, 74, 80, 82, 85, 95, 97, 99, 106, 110, 115, 119, 125, 132, 134, 138, 146, 150, 155, 158, 165, 170, 176, 183, 191, 196, 204, 210, 213, 228, 232, 236]:
    put(sfx, whoosh(.6), S(i) - .35, .55)
put(sfx, skid(1.6), S(40) + .3, .7); put(sfx, thud(), S(41) + 1.8, 1.0); put(sfx, lp(noise(1.0), .05) * fade(np.ones(int(SR)), .01, .8) * 2, S(41) + 1.8, .6)
for k in range(10): put(sfx, lp(noise(.3), .3) * fade(np.ones(int(.3 * SR)), .02, .2), S(43) + k * .25, .25)  # spinning wheels
for k in range(int((E(47) - S(45)) / .75)): put(sfx, heartb(), S(45) + k * .75, .5); put(sfx, heartb(), S(45) + k * .75 + .22, .35)
for k in range(6): put(sfx, beep(950 + 120 * (k % 2), .18), S(74) + .3 + k * .5, .25)  # dialing
for k in range(int((E(79) - S(77)) / .13)): put(sfx, click(), S(77) + k * .13 + rng.random() * .03, .5)  # typing
put(sfx, beep(1300, .1), E(79), .3); put(sfx, beep(1500, .1), S(207) + .3, .3); put(sfx, beep(1800, .15), S(207) + .45, .3)
for k in range(14): put(sfx, lp(noise(.35), .2) * fade(np.ones(int(.35 * SR)), .03, .25), S(97) + k * .4, .3)  # digging
for k in range(int((E(133) - S(132)) / .5)): put(sfx, tick(), S(132) + k * .5, .5)
put(sfx, np.concatenate([beep(1000, .08), np.zeros(int(.05 * SR))] * 6), S(133), .35)  # alarm
for k in range(int((E(169) - S(165)) / 3)): pass
n = int((E(169) - S(165)) * SR); tt = np.arange(n) / SR; put(amb, fade(np.sin(2 * np.pi * 38 * tt) + .4 * lp(rng.standard_normal(n), .03) * 5, 1.5, 2.5) * .25, S(165))  # passing truck
# SOS horn: ... --- ...
t = S(174) + .2
for d in [.15, .15, .15, .45, .45, .45, .15, .15, .15]: put(sfx, horn(d), t, .35); t += d + .12
n = int((E(209) - S(204)) * SR); tt = np.arange(n) / SR; put(amb, fade(np.sin(2 * np.pi * 42 * tt) + .5 * np.sin(2 * np.pi * 84 * tt) + .4 * lp(rng.standard_normal(n), .04) * 5, 2.5, 1) * .3, S(204))  # plow
for k in range(int((E(195) - S(193)) / .3)): put(sfx, tone(500 + 60 * (k % 3), .12, .005, .06), S(193) + k * .3, .0)
for i in [215, 218, 221, 223, 225]: put(sfx, tone(1046, .25, .003, .15) * .6, S(i), .3)
# ---------- voice + mix ----------
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{D0}/voice_full.wav', '-ac', '1', '-ar', str(SR), f'{D0}/voice_m.wav'], check=True)
w = wave.open(f'{D0}/voice_m.wav'); v = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768.
voice = np.zeros(N); put(voice, v, PRE)
def grms(x):
    b = 4410; r = np.sqrt(np.array([np.mean(x[i:i + b] ** 2) for i in range(0, len(x) - b, b)]) + 1e-12); g = r[r > r.max() * .1]; return np.sqrt(np.mean(g ** 2))
vr = grms(voice)
mus *= .22 * vr / grms(mus); amb *= .18 * vr / grms(amb); sfx *= .35 * vr / grms(sfx)
# duck music under voice
venv = lfilter([.002], [1, -.998], np.abs(voice)); duck = 1 - .35 * np.clip(venv / (venv.max() * .3), 0, 1)
mix = voice + mus * duck + amb + sfx
mix /= max(1, np.abs(mix).max() * 1.05)
w = wave.open(f'{D0}/mix.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close()
# mouth envelope for lip-sync (60 Hz)
hop = SR // 60; e = np.array([np.sqrt(np.mean(v[i:i + hop] ** 2)) for i in range(0, len(v) - hop, hop)]); e = e / (np.percentile(e, 97) + 1e-9)
json.dump({'v': [round(float(x), 3) for x in np.clip(e, 0, 1.2)]}, open(f'{D0}/web/env.json', 'w'))
print('ok', round(DUR, 1))
