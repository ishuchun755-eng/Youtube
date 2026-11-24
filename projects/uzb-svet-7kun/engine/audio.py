import json, wave, subprocess, sys, numpy as np
from scipy.signal import lfilter
D0 = '/root/shorts/svet'; SR = 44100; PRE = 1.2
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
# wind outside (city/yard), quiet room tone inside
wind = lp(noise(DUR), .02)[:N] * 6 * (.65 + .35 * np.sin(T * .37) * np.sin(T * .11 + 1))
lvl = np.full(N, .08)
REG = [(0, S(3), .55), (S(9), S(16), .6), (S(25), S(29), .7), (S(36), S(38), .5), (S(52), S(55), .6), (S(57), S(61), .4), (S(62), S(63), .4), (S(71), S(75), .35), (S(77), S(79), .35),
       (S(79), S(87), .25), (S(91), S(96), .3), (S(113), S(117), .3), (S(136), DUR, .5)]
for a, b, g in REG: lvl[seg(a, b)] = g
lvl = lfilter([.0005], [1, -.9995], lvl)
amb += wind * lvl * .55
# electrical hum while power on: s3..chiq, s115..s120 cut
def hum(a, b, g=.12):
    n = int((b - a) * SR); tt = np.arange(n) / SR; h = np.sin(2 * np.pi * 50 * tt) + .4 * np.sin(2 * np.pi * 100 * tt) + .2 * lp(rng.standard_normal(n), .1); put(amb, fade(h, .05, .02) * g, a)
CHIQ = S(4) + .9; hum(S(3), CHIQ); hum(S(117), S(120) + 1.3)
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

drone(0, S(3), 55, .3); bed(0, S(3), [Am, F], 3.0, g=.12)
bed(S(3), CHIQ, [C, G_], 2.0, g=.1)
drone(S(9), S(16), 49, .45); bed(S(12), S(16), [Am, F, Dm, Em], 2.6, g=.15)
bed(S(16), S(29), [Am, F, C, G_], 2.6, g=.13); beat(S(21), S(29), 88, .15)
drone(S(29), S(38), 52, .3); bed(S(29), S(38), [Dm, Am], 2.8, g=.11)
drone(S(38), S(57), 46, .5); bed(S(52), S(57), [Am, Em], 3.0, g=.12)
bed(S(57), S(67), [Am, F, C, G_], 2.4, g=.14); beat(S(57), S(67), 96, .18)
drone(S(67), S(79), 52, .3); bed(S(71), S(79), [F, C, Am, G_], 2.6, g=.12)
bed(S(79), S(91), [C, F, G_, C], 2.2, oct=2, g=.15, padg=.3); beat(S(79), S(87), 100, .14)
drone(S(91), S(98), 49, .35); bed(S(96), S(98), [Am], 2.4, g=.1)
drone(S(98), S(113), 44, .5); bed(S(105), S(113), [Am, F, Dm, Em], 3.0, g=.12)
bed(S(113), S(117), [C, G_, Am, F], 1.8, oct=2, g=.18, padg=.35)
drone(S(117), S(123), 49, .4)
bed(S(123), DUR, [C, G_, Am, F], 2.2, g=.16); beat(S(123), DUR - 2, 100, .2)
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
# plates: whoosh + pop at sentences that pop a label
PLATES = [1, 2, 5, 10, 11, 12, 14, 18, 20, 21, 22, 27, 30, 32, 33, 35, 36, 37, 39, 41, 42, 44, 46, 47, 49, 53, 54, 55, 59, 60, 61, 62, 64, 66, 70, 73, 74, 76, 78, 86, 88, 93, 94, 95, 96, 97, 100, 101, 103, 104, 105, 107, 109, 110, 111, 112, 116, 117, 119, 120, 121, 124, 126, 128, 130, 132, 133, 134, 135, 136, 140]
for i in PLATES: put(sfx, whoosh(.4), S(i) - .2, .45); put(sfx, pop(), S(i) + .05, .4)
for i in [3, 6, 9, 12, 13, 16, 21, 25, 29, 34, 36, 38, 42, 46, 48, 52, 55, 57, 61, 62, 63, 67, 69, 71, 75, 77, 79, 83, 84, 85, 87, 89, 91, 96, 98, 100, 105, 109, 113, 117, 121, 123, 133, 134, 136]:
    put(sfx, whoosh(.6), S(i) - .35, .5)
# power cut "chiq": click + low thump, silence of hum
put(sfx, click() * 4, CHIQ, 1.0); put(sfx, thud(), CHIQ, .6)
# city powering down + map lights off
put(sfx, sweep(220, 40, 2.4) * .5, S(9) + .1, .6); 
for k in range(14): put(sfx, click(), S(12) + .3 + k * .2, .5)
# phone pings
put(sfx, ping(), S(23) + .4, .35); put(sfx, ping(), S(24) + .1, .35); put(sfx, ping(), S(24) + .9, .3)
put(sfx, np.concatenate([beep(440, .12), beep(330, .25)]), S(27) + .2, .4)  # no network
for k in range(3): put(sfx, click() * 3, S(32) + .3 + k * .5, .5)  # kotel click attempts
for k in range(6): put(sfx, hp(noise(.08), .3) * env(int(.08 * SR), .002, .04), S(35) + .2 + k * .18, .4)  # dry tap sputter
put(sfx, click() * 3, S(43), .7); put(sfx, lp(noise(.6), .2) * fade(np.ones(int(.6 * SR)), .01, .4), S(43) + .05, .5)  # stove ignition
put(sfx, thud(), S(43) + 1.9, .6)  # door closes
put(sfx, crackle(4), S(45), .35)
for k in range(int((E(51) - S(49)) / 1.2)): put(sfx, heartb(), S(49) + k * 1.2, .4)
put(sfx, creak(), S(56) + .1, .4); put(amb, wind[seg(0, 3)] * fade(np.ones(int(3 * SR)), .3, 1), S(56) + .5, .5)
put(sfx, horn(.4), S(59) + .3, .25); put(sfx, horn(.8), S(59) + 1.4, .2); put(sfx, horn(.3), S(60) + .5, .2)
put(sfx, np.concatenate([beep(600, .15), beep(400, .3)]), S(61) + 1.0, .4)  # card declined
put(sfx, thud() + hp(noise(.5), .4) * env(int(.5 * SR), .001, .1) * 2, S(70) + 1.2, .8); put(sfx, hp(noise(3), .3) * fade(np.ones(int(3 * SR)), .05, 1), S(70) + 1.3, .25)  # pipe burst + spray
put(sfx, creak(.5), S(75) + .2, .3)
put(sfx, crackle(6), S(84), .35); put(sfx, crackle(5), S(85), .35)
put(sfx, hp(noise(E(97) - S(96)), .2) * .15 + crackle(E(97) - S(96)) * .2, S(96), .5)  # radio static
for k in range(int((E(99) - S(98)) / .5)): put(sfx, tick(), S(98) + k * .5, .5)
for k in range(3): put(sfx, thud(), S(107) - .3 + k * .28, .5)
put(sfx, creak(1.0), S(107) + .5, .35)
put(sfx, sweep(60, 300, 2.0) * .4, S(115), .5); put(sfx, tone(1046, .4, .003, .3), S(116), .35); put(sfx, tone(1318, .4, .003, .3), S(116) + .12, .3)
put(sfx, crackle(2.5) * 1.5, S(119) + .5, .5); put(sfx, thud(), S(120) + 1.3, .9); put(sfx, click() * 4, S(120) + 1.3, .8)
put(sfx, click() * 3, S(121) + 1.3, .6)
for i in range(6): put(sfx, pop(), S(133) + i * .5, .35)
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
print('ok', round(DUR, 1))
