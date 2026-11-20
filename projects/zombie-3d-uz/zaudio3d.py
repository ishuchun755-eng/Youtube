import json, wave
import numpy as np
SR = 44100
TL = json.load(open("web/timeline.json")); PRE = 2.5
S = [dict(s, start=s["start"] + PRE, end=s["end"] + PRE) for s in TL["S"]]
VEND = S[-1]["end"]; DUR = VEND + 4.5
PH = TL["CUT"] + PRE; GAP = TL["GAP"]
N = int(SR * (DUR + 0.5))
T = lambda i: S[i]["start"]; E = lambda i: S[i]["end"]
rng = np.random.default_rng(31)
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
def tone(f, d): return np.sin(2 * np.pi * f * np.arange(int(d * SR)) / SR)
def pad(notes, d, bright=600):
    t = np.arange(int(d * SR)) / SR
    s = sum(2 * ((t * NOTE(m) * (1 + dt)) % 1) - 1 for m in notes for dt in (-0.005, 0.005)) / (2 * len(notes))
    return lp(s, bright) * env(len(s), 1.5, 1.5)
def section(t0, t1, chords, bright, g, L=6.0):
    t = t0; k = 0
    while t < t1 - 0.3:
        d = min(L, t1 - t); add(mus, pad(chords[k % len(chords)], d + 1.5, bright), t, g); t += L; k += 1
def pulse(t0, t1, bpm, g=0.4):
    t = t0
    while t < t1:
        k = np.arange(int(0.3 * SR)) / SR; add(mus, np.sin(2 * np.pi * 48 * k * (1 + 2 * np.exp(-k * 30))) * np.exp(-k * 9), t, g); t += 60 / bpm
Calm = [[60, 64, 67], [57, 60, 64]]
Dread = [[45, 48, 52], [44, 47, 51], [46, 49, 53], [45, 48, 51]]
section(0.2, T(2), Calm, 1200, 0.18)
section(T(2), T(11), Dread, 700, 0.3); pulse(T(2), T(11), 120, 0.4)
section(T(11), T(25), Dread, 600, 0.28); pulse(T(13), T(16), 140, 0.35)
section(T(25), T(35), [[45, 48, 52], [41, 45, 48]], 500, 0.26)
section(T(35), T(47), Dread, 700, 0.3); pulse(T(43), T(47), 150, 0.45)
section(T(47), T(56), [[40, 47, 52], [41, 48, 53]], 500, 0.3)
section(T(56), T(66), [[38, 45, 50], [39, 46, 51]], 450, 0.32); pulse(T(61), T(66), 130, 0.4)
section(T(66), T(78), Dread, 600, 0.3); pulse(T(75), T(78), 160, 0.5)
section(T(78), T(88), Dread, 900, 0.32); pulse(T(78), T(88), 170, 0.5)
section(T(88), DUR - 0.5, [[40, 43, 47], [39, 42, 46]], 450, 0.32)
mus[-int(2.5 * SR):] *= np.linspace(1, 0, int(2.5 * SR))

WH = ld("whoosh-reverse"); BOOM = ld("deep-boom"); STING = ld("dark-sting"); GL = ld("glitch-hit")
def groan(d=1.5, f0=110):
    t = np.arange(int(d * SR)) / SR; f = f0 + 25 * np.sin(t * 3.3) + 10 * np.sin(t * 11)
    return lp((2 * ((np.cumsum(f) / SR) % 1) - 1) + 0.4 * bp(noise(d), 200, 900), 900) * env(len(t), 0.25, 0.5)
def scream(d=0.9):
    t = np.arange(int(d * SR)) / SR; f = 700 + 300 * np.sin(t * 18) * np.exp(-t)
    return bp(np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * noise(d), 500, 3000) * env(len(t), 0.05, 0.4)
def thud(): k = np.arange(int(0.3 * SR)) / SR; return np.sin(2 * np.pi * 70 * k * (1 + np.exp(-k * 20))) * np.exp(-k * 12) + bp(noise(0.3), 100, 900) * np.exp(-k * 20) * 0.5
def alarm(d):
    t = np.arange(int(d * SR)) / SR; return np.sign(np.sin(2 * np.pi * 880 * t)) * (np.sin(2 * np.pi * 2 * t) > 0) * 0.4
# zombie ambience groans across exterior/frozen parts
for k in range(int(DUR / 3.5)):
    t0 = 7 + k * 3.5 + rng.uniform(0, 1.5)
    if t0 < T(25) or (T(47) < t0 < T(56)) or (T(75) < t0 < T(88)) or t0 > T(95): add(sfx, groan(rng.uniform(1.0, 2.0), rng.uniform(80, 140)), t0, 0.18)
for k in range(4): add(sfx, scream(), T(2) + 0.3 + k * 0.9, 0.18)
add(sfx, thud(), T(3) + 0.5, 0.5); add(sfx, STING, T(5), 0.4)
add(sfx, WH, T(6) - 0.4, 0.4); add(sfx, BOOM, T(6) + 1.4, 0.4); add(sfx, BOOM, T(8), 0.35)
add(sfx, GL, T(9), 0.5)
for i in (11, 25, 35, 47, 56, 66, 78): add(sfx, WH, T(i) - 0.5, 0.45); add(sfx, BOOM, T(i), 0.4)
add(sfx, alarm(E(15) - T(13)), T(13), 0.1)
for k in range(5): add(sfx, bp(noise(0.25), 800, 6000) * np.exp(-np.arange(int(0.25 * SR)) / SR * 12), T(15) + k * 0.5 + 0.3, 0.35)
POP = ld("cartoon-zip")
for i in (17, 18, 19, 20, 21): add(sfx, POP, T(i), 0.3)
add(sfx, ld("error-beep"), T(22) + 0.2, 0.3)
add(sfx, ld("paper-flip"), T(27), 0.3)
add(sfx, STING, T(33), 0.4)
for k in range(3): add(sfx, thud(), T(34) + 0.2 + k * 0.5, 0.6)
add(sfx, STING, T(37), 0.4); add(sfx, ld("metal-clang")[:int(0.4 * SR)], T(38) + 0.6, 0.35)
add(sfx, groan(1.2, 150), T(43) + 1.2, 0.4); add(sfx, scream(), T(43) + 1.4, 0.3); add(sfx, BOOM, T(44), 0.45)
add(sfx, ld("metal-clang")[:int(0.4 * SR)], T(48) + 0.5, 0.3)
for k in range(10): add(sfx, thud(), T(50) + k * 0.4, 0.35)
add(sfx, bp(noise(0.6), 2000, 9000) * np.exp(-np.arange(int(0.6 * SR)) / SR * 6), T(51) + 0.2, 0.45)
pd = 1.5; tt = np.arange(int(pd * SR)) / SR
add(sfx, np.sin(2 * np.pi * (120 - 80 * tt / pd) * tt) * np.exp(-tt * 2), T(57) + 1.0, 0.5)
add(sfx, alarm(E(61) - T(59)) * 0.5, T(59), 0.08)
for k in range(6): add(sfx, bp(noise(0.08), 200, 1500) * np.exp(-np.arange(int(0.08 * SR)) / SR * 30), T(60) + k * 0.45, 0.4)
add(sfx, groan(1.5, 100), T(62) + 0.3, 0.4); add(sfx, scream(), T(63) + 0.3, 0.3)
add(sfx, BOOM, T(64), 0.6); add(sfx, ld("metal-clang"), T(64) + 0.05, 0.4)
add(sfx, STING, T(65) + 0.6, 0.35)
st = bp(noise(E(74) - T(71)), 1500, 6000) * 0.25 * (rng.random(int((E(74) - T(71)) * SR)) > 0.5); add(sfx, st, T(71), 0.15)
add(sfx, BOOM, T(75), 0.7); add(sfx, bp(noise(1.2), 1500, 9000) * np.exp(-np.arange(int(1.2 * SR)) / SR * 4), T(75), 0.5)
for k in range(30): add(sfx, bp(noise(0.06), 150, 900) * np.exp(-np.arange(int(0.06 * SR)) / SR * 40), T(79) + 1 + k * 0.28, 0.35)
eng = lp(2 * ((np.arange(int(6 * SR)) / SR * 60) % 1) - 1, 400) * env(int(6 * SR), 0.3, 1.5); add(sfx, eng, T(85), 0.3)
st2 = bp(noise(E(90) - T(88) + 0.5), 1500, 6000) * 0.4; add(sfx, st2 * env(len(st2), 0.05, 0.3), T(88), 0.2)
add(sfx, STING, T(94), 0.5); add(sfx, BOOM, T(94), 0.4)
# ---- phone break: duck music, ring, hang-up
a0, a1 = int((PH - 0.2) * SR), int((PH + GAP - 0.4) * SR)
mus[a0:a1] *= 0.04
fade = int(0.4 * SR); mus[a1:a1 + fade] *= np.linspace(0.04, 1, fade)
def ringtone(d):
    t = np.arange(int(d * SR)) / SR
    tone_ = (np.sin(2 * np.pi * 1318 * t) + np.sin(2 * np.pi * 1568 * t)) * 0.5
    gate = ((t % 0.5) < 0.18) | (((t % 0.5) > 0.24) & ((t % 0.5) < 0.42))
    return tone_ * gate * ((t % 2.0) < 1.0) * 0.6
add(sfx, ringtone(3.6), PH + 1.2, 0.5)
add(sfx, bp(noise(0.08), 800, 4000) * np.exp(-np.arange(int(0.08 * SR)) / SR * 40), PH + 5.0, 0.5)
PV1 = PH + 5.6 + 13.8
for k in range(3): add(sfx, tone(425, 0.18) * env(int(0.18 * SR), 0.01, 0.02), PV1 + 0.3 + k * 0.32, 0.25)
add(sfx, groan(1.3, 120), PV1 + 1.4, 0.15)
def save(n, x):
    p = (np.clip(x / max(1e-9, np.abs(x).max()) * 0.9, -1, 1) * 32767).astype(np.int16)
    with wave.open(n, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(p.tobytes())
save("music.wav", mus); save("sfx.wav", sfx); print("ok", round(DUR, 2))
