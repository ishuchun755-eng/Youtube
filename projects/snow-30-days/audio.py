import json, wave
import numpy as np
SR = 44100
S = json.load(open("sentences.json"))
VEND = S[-1]["end"]; DUR = VEND + 7.0
N = int(SR * (DUR + 0.5))
T = lambda i: S[i]["start"]; E = lambda i: S[i]["end"]
rng = np.random.default_rng(21)
mus = np.zeros(N); sfx = np.zeros(N)
def add(b, s, t, g=1.0):
    i = int(t * SR)
    if i < 0: s = s[-i:]; i = 0
    s = s[:max(0, N - i)]; b[i:i + len(s)] += s * g
def ld(n):
    with wave.open(f"/root/shorts/trucks/sfx/{n}.wav") as w: return np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768
def noise(d): return rng.standard_normal(int(d * SR))
def spec(x, f):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X * f(fr), len(x))
lp = lambda x, fc: spec(x, lambda f: 1 / (1 + (f / fc) ** 4))
bp = lambda x, a, b: spec(x, lambda f: ((f > a) & (f < b)).astype(float))
def env(n, a, r):
    e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
def bell(m, d=1.6):
    t = np.arange(int(d * SR)) / SR; f = NOTE(m)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 9)) * np.exp(-t * 2.2)
def piano(m, d=1.4):
    t = np.arange(int(d * SR)) / SR; f = NOTE(m)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) + 0.25 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 3)
def pad(notes, d, bright=800):
    t = np.arange(int(d * SR)) / SR
    s = sum(2 * ((t * NOTE(m) * (1 + dt)) % 1) - 1 for m in notes for dt in (-0.004, 0.004)) / (2 * len(notes))
    return lp(s, bright) * env(len(s), 1.2, 1.2)

def section(t0, t1, chords, bpm=88, inst="bell", padg=0.18, arpg=0.08, bright=900, arp=True):
    b = 60 / bpm; t = t0; k = 0
    while t < t1 - 0.3:
        ch = chords[k % len(chords)]; L = min(b * 8, t1 - t)
        add(mus, pad(ch, L + 1.2, bright), t, padg)
        if arp:
            for j in range(int(L / (b / 2))):
                m = ch[[0, 1, 2, 1, 3 % len(ch), 2, 1, 2][j % 8] % len(ch)] + 12
                add(mus, (bell if inst == "bell" else piano)(m), t + j * b / 2, arpg)
        t += b * 8; k += 1

C = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]]      # Cmaj7 Am7 Fmaj7 G
Dm = [[50, 53, 57, 60], [46, 50, 53, 57], [48, 52, 55, 58], [45, 49, 52, 57]]      # tension
Hope = [[48, 55, 60, 64], [53, 57, 60, 65], [55, 59, 62, 67], [52, 55, 60, 64]]
section(0.2, T(49), C, 92, "bell", 0.16, 0.07, 1100)
section(T(49), T(73), Dm, 80, "piano", 0.2, 0.05, 700)
section(T(73), T(100), C, 100, "bell", 0.15, 0.07, 1200)
section(T(100), T(117), Dm, 80, "piano", 0.2, 0.05, 650)
section(T(117), T(133), [[57, 60, 64, 67], [53, 57, 60, 64]], 76, "piano", 0.18, 0.05, 800)
section(T(133), T(143), Hope, 110, "bell", 0.16, 0.09, 1500)
section(T(143), T(149), Dm, 84, "piano", 0.18, 0.04, 700)
section(T(149), DUR - 0.5, Hope, 96, "bell", 0.15, 0.08, 1300)
# soft kick pulse in happy sections
for a, b_, bpm in ((T(73), T(100), 100), (T(133), T(143), 110), (T(149), DUR - 2, 96)):
    t = a
    while t < b_:
        k = np.arange(int(0.25 * SR)) / SR; add(mus, np.sin(2 * np.pi * 55 * k * (1 + 2 * np.exp(-k * 30))) * np.exp(-k * 10), t, 0.25); t += 60 / bpm
mus[-int(2.5 * SR):] *= np.linspace(1, 0, int(2.5 * SR))

# ---------------- sfx
WH = ld("whoosh-reverse"); BOOM = ld("deep-boom"); POP = ld("cartoon-zip")
# wind bed, stronger with days
wd = DUR; wn = bp(noise(wd), 150, 1200)
tt = np.arange(len(wn)) / SR
inten = np.interp(tt, [0, T(12), T(49), T(100), T(117), T(124), T(133), T(134), DUR], [0.1, 0.25, 0.45, 0.65, 1.0, 0.7, 0.4, 0.0, 0.0])
wn *= inten * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * tt) ** 2)
add(sfx, wn, 0, 0.35)
day_starts = [3, 12, 22, 32, 43, 49, 66, 73, 83, 93, 100, 110, 117, 125, 133]
for i in day_starts[1:]: add(sfx, WH, T(i) - 0.5, 0.45); add(sfx, BOOM, T(i), 0.35)
def chime(): return bell(84, 2.0) * 0.6 + bell(91, 2.0) * 0.4
add(sfx, chime(), 0.3, 0.4); add(sfx, chime(), T(3), 0.4)
for k in range(3): add(sfx, POP, T(5 + k) + 0.05, 0.4)
# kids playing
kids = bp(noise(E(15) - T(15)), 800, 3000) * (0.5 + 0.5 * np.sin(np.arange(int((E(15) - T(15)) * SR)) / SR * 9) ** 2)
add(sfx, kids * env(len(kids), 0.4, 0.6), T(15), 0.08)
for i in (16, 17): add(sfx, POP, T(i) + 0.4, 0.4)
add(sfx, ld("tada") if False else ld("swell-short"), T(18), 0.3)
# plow beeps + engine
for k in range(8): add(sfx, np.sin(2 * np.pi * 1000 * np.arange(int(0.2 * SR)) / SR) * env(int(0.2 * SR), 0.01, 0.05), T(25) + k * 0.5, 0.12)
eng = lp(noise(E(25) - T(22)), 120) * 2.5; add(sfx, eng * env(len(eng), 0.5, 0.8), T(22), 0.25)
# shovel scrapes
def scrape():
    d = 0.5; return bp(noise(d), 1500, 6000) * np.sin(np.linspace(0, np.pi, int(d * SR))) ** 2
for i in (27, 29, 63):
    for k in range(4): add(sfx, scrape(), T(i) + k * 0.6, 0.3)
add(sfx, ld("huh-voice") if False else ld("error-beep"), T(31) + 0.3, 0.2)
# store chaos murmur
mur = bp(noise(E(40) - T(38)), 300, 2500) * 0.5; add(sfx, mur * env(len(mur), 0.3, 0.5), T(38), 0.12)
# dog
def bark():
    t = np.arange(int(0.18 * SR)) / SR; f = 420 * (1 + 0.6 * np.exp(-t * 20))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * bp(noise(0.18), 300, 2000)) * np.exp(-t * 14)
for t0 in (T(8) + 0.4, T(46) + 0.5, T(107) + 0.5, T(112) + 0.3, T(112) + 0.7, T(141) + 0.2, T(141) + 0.6): add(sfx, bark(), t0, 0.35)
add(sfx, ld("cartoon-zip"), T(45) + 2.0, 0.4)
# branch snap + sparks + power down
snap = T(54) + 1.6
crack = bp(noise(0.35), 600, 8000) * np.exp(-np.arange(int(0.35 * SR)) / SR * 12); add(sfx, crack, snap, 0.6)
for k in range(10): add(sfx, bp(noise(0.05), 3000, 12000) * np.exp(-np.arange(int(0.05 * SR)) / SR * 40), snap + 0.05 + k * 0.05, 0.3)
pd = 1.2; tt2 = np.arange(int(pd * SR)) / SR
add(sfx, np.sin(2 * np.pi * (120 - 80 * tt2 / pd) * tt2) * np.exp(-tt2 * 2), T(55) + 0.8, 0.4)
# fire crackle
fd = E(58) - T(58) + 1; cr = np.zeros(int(fd * SR))
for k in range(int(fd * 25)): i = rng.integers(0, len(cr) - 800); cr[i:i + 800] += bp(noise(800 / SR), 1500, 8000) * np.exp(-np.arange(800) / 120) * rng.uniform(0.3, 1)
add(sfx, cr + lp(noise(fd), 300) * 0.4, T(58) - 0.2, 0.25)
add(sfx, ld("dark-sting"), T(62), 0.35)
add(sfx, ld("metal-clang")[:int(0.3 * SR)], T(64), 0.25)
# creaks
def creak(d=0.9):
    t = np.arange(int(d * SR)) / SR; f = 180 + 60 * np.sin(t * 9)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (np.sin(t * 90) > 0.3) * env(len(t), 0.1, 0.3) * 0.6
for t0 in (T(67), T(71) + 0.3, T(71) + 2.2): add(sfx, creak(), t0, 0.3)
# snowmobile
sm = (2 * ((np.arange(int(4 * SR)) / SR * 95) % 1) - 1); sm = lp(sm, 900) * env(len(sm), 0.3, 0.6)
add(sfx, sm, T(76), 0.18); add(sfx, sm, T(140), 0.2)
# drone buzz
dz = np.sin(2 * np.pi * 240 * np.arange(int(3 * SR)) / SR) * env(int(3 * SR), 0.4, 0.6); add(sfx, dz, T(98), 0.06)
add(sfx, ld("piano-sting"), T(99), 0.3)
# collapse + pipes
add(sfx, BOOM, T(104) + 1.4, 0.6); add(sfx, bp(noise(1.2), 200, 3000) * np.exp(-np.arange(int(1.2 * SR)) / SR * 3), T(104) + 1.4, 0.4)
add(sfx, bp(noise(1.5), 2000, 9000) * env(int(1.5 * SR), 0.05, 0.8), T(105) + 0.5, 0.25)
# helicopter
hd = E(109) - T(106); th = np.arange(int(hd * SR)) / SR
heli = lp(noise(hd), 250) * (0.5 + 0.5 * (np.sin(2 * np.pi * 12 * th) > 0.6)) * env(len(th), 1, 1) * 2
add(sfx, heli, T(106), 0.25)
# moose groan
mg = np.sin(2 * np.pi * np.cumsum(90 + 30 * np.sin(np.arange(int(1.4 * SR)) / SR * 3)) / SR) * env(int(1.4 * SR), 0.3, 0.6)
add(sfx, lp(mg, 600), T(111) + 0.8, 0.35)
# igloo warmth
add(sfx, ld("swell-short"), T(123), 0.3)
add(sfx, ld("piano-sting"), T(127) + 3, 0.3); add(sfx, BOOM, T(129), 0.35)
# day 30: silence then cheers
cheer = bp(noise(4), 500, 4000) * (0.6 + 0.4 * np.sin(np.arange(int(4 * SR)) / SR * 5) ** 2) * env(int(4 * SR), 0.2, 1.5)
add(sfx, cheer, T(139), 0.25); add(sfx, ld("swell-short"), T(138), 0.35)
# flood water
fd2 = E(148) - T(146) + 1; wat = bp(noise(fd2), 300, 3000) * (0.7 + 0.3 * np.sin(np.arange(int(fd2 * SR)) / SR * 4))
add(sfx, wat * env(len(wat), 0.8, 1), T(146), 0.2); add(sfx, BOOM, T(148), 0.3)
add(sfx, chime(), T(156), 0.4); add(sfx, POP, T(156) + 0.5, 0.4)
def save(n, x):
    p = (np.clip(x / max(1e-9, np.abs(x).max()) * 0.9, -1, 1) * 32767).astype(np.int16)
    with wave.open(n, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(p.tobytes())
save("music.wav", mus); save("sfx.wav", sfx); print("ok", round(DUR, 2))
