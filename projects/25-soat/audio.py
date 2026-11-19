import json, wave
import numpy as np
SR = 44100
SENT = json.load(open("web/sentences.json"))
PRE = 2.5
VEND = SENT[-1]["end"]
DUR = PRE + VEND + 5.5
N = int(SR * (DUR + 0.5))
S = lambda i: SENT[i]["start"] + PRE
E = lambda i: SENT[i]["end"] + PRE
rng = np.random.default_rng(11)
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
hp = lambda x, fc: spec(x, lambda f: (f > fc).astype(float))
bp = lambda x, a, b: spec(x, lambda f: ((f > a) & (f < b)).astype(float))
def env(n, a, r):
    e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
def tone(f, d, kind="sin"):
    t = np.arange(int(d * SR)) / SR
    if kind == "saw": return 2 * ((t * f) % 1) - 1
    if kind == "tri": return 2 * np.abs(2 * ((t * f) % 1) - 1) - 1
    return np.sin(2 * np.pi * f * t)
def pad(notes, d, bright=900, kind="saw"):
    s = sum(tone(NOTE(m) * (1 + dt), d, kind) for m in notes for dt in (-0.005, 0.0, 0.005)) / (len(notes) * 3)
    return lp(s, bright) * env(len(s), min(1.5, d / 3), min(1.5, d / 3))
def section_pad(t0, t1, chords, bright, gain, kind="saw"):
    t = t0; k = 0; L = 6.0
    while t < t1 - 0.5:
        d = min(L, t1 - t) + 1.5
        add(mus, pad(chords[k % len(chords)], d, bright, kind), t, gain); t += L; k += 1

# ---------------- music sections
Am = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]]          # Am F G E
Dk = [[45, 52, 57, 60], [46, 53, 58, 61], [41, 48, 53, 56]]             # dark
Hope = [[48, 55, 60, 64], [53, 57, 60, 65], [55, 59, 62, 67], [57, 60, 64, 69]]
T_FREEZE, T_UNF = 24.0 + PRE, 55.5 + PRE
T_MONT, T_STR, T_HALL, T_SIREN = S(23), S(27), S(47), S(67)
T_END = VEND + PRE

# title riser + hit
add(sfx, ld("riser-short"), 0.0, 0.5); add(sfx, ld("glitch-hit"), 0.55, 0.6)
section_pad(0.3, S(6), [[60, 64, 67, 71], [57, 60, 64, 67]], 1400, 0.22, "tri")                       # soft morning
section_pad(S(6), T_FREEZE, Dk, 700, 0.3)                                                            # night tension
# frozen 1: filtered eerie + shimmer
section_pad(T_FREEZE, T_UNF, Dk, 380, 0.34)
sh = bp(noise(T_UNF - T_FREEZE), 5000, 9000) * 0.05 * (0.6 + 0.4 * np.sin(np.arange(int((T_UNF - T_FREEZE) * SR)) / SR * 0.7))
add(mus, sh * env(len(sh), 1, 1), T_FREEZE, 1.0)
section_pad(T_UNF, T_MONT, Am, 1100, 0.26)
# montage hopeful with pulse
section_pad(T_MONT, T_STR, Hope, 1500, 0.24, "tri")
b = 60 / 96; t = T_MONT
while t < T_STR - 0.2:
    k = np.arange(int(0.25 * SR)) / SR
    add(mus, np.sin(2 * np.pi * 55 * k * (1 + 2 * np.exp(-k * 30))) * np.exp(-k * 10), t, 0.35)
    for j, m in enumerate([72, 76, 79, 76]):
        kk = np.arange(int(0.3 * SR)) / SR; add(mus, np.sin(2 * np.pi * NOTE(m) * kk) * np.exp(-kk * 9), t + j * b / 4, 0.06)
    t += b
# stranger: mystery drone + heartbeat
section_pad(T_STR, T_HALL, Dk, 520, 0.32)
t = S(27) + 2
while t < S(30):
    for o, g in ((0, 0.55), (0.18, 0.4)):
        k = np.arange(int(0.3 * SR)) / SR; add(mus, np.sin(2 * np.pi * 48 * k) * np.exp(-k * 12), t + o, g)
    t += 0.9
section_pad(T_HALL, T_SIREN, [[45, 52, 57], [44, 51, 56], [43, 50, 55], [42, 49, 54]], 600, 0.34)
# siren: fast pulse + tension stab
t = T_SIREN
while t < S(76):
    k = np.arange(int(0.22 * SR)) / SR
    add(mus, np.sin(2 * np.pi * 52 * k * (1 + 2.5 * np.exp(-k * 35))) * np.exp(-k * 11), t, 0.5)
    add(mus, hp(noise(0.04), 6000) * np.exp(-np.arange(int(0.04 * SR)) / SR * 90), t + 0.19, 0.25)
    t += 0.38
section_pad(T_SIREN, S(76), [[45, 48, 52, 56]], 900, 0.26)
section_pad(S(76), T_END, [[40, 47, 52, 55]], 450, 0.36)
add(sfx, ld("dark-sting"), T_END + 0.4, 0.55)

# ---------------- sfx
WH = ld("whoosh-reverse"); BOOM = ld("deep-boom")
def tick():
    k = np.arange(int(0.03 * SR)) / SR; return hp(noise(0.03), 2500) * np.exp(-k * 160)
# clock ticks at night until freeze
t = S(6)
while t < T_FREEZE: add(sfx, tick(), t, 0.5); t += 1.0
# fan hum at night until freeze
hum = (tone(110, T_FREEZE - S(6)) * 0.3 + bp(noise(T_FREEZE - S(6)), 100, 600) * 0.5) * env(int((T_FREEZE - S(6)) * SR), 0.5, 0.05)
add(sfx, hum, S(6), 0.12)
# phone dies in flashback
k3 = S(3) + (E(3) - S(3)) * 0.62 + 0.1; add(sfx, ld("error-beep"), k3, 0.35)
# freeze: whoom + reverse
fz = lp(noise(2.2), 200) * np.exp(-np.arange(int(2.2 * SR)) / SR * 1.6) * 3
add(sfx, WH, T_FREEZE - 0.55, 0.6); add(sfx, BOOM, T_FREEZE, 0.6); add(sfx, fz, T_FREEZE, 0.4)
for tt in (S(9), S(10)): add(sfx, ld("metal-clang")[:int(0.25 * SR)], tt + 0.1, 0.12)
# TV static bursts
for a, b_ in ((0.4, 0.55), (1.4, 1.52), (2.3, 2.36)):
    add(sfx, bp(noise(b_ - a), 1500, 8000), S(19) - 0.1 + a, 0.25)
add(sfx, ld("cartoon-zip"), S(20) + 0.9, 0.25)
# unfreeze: reverse + impact + traffic
add(sfx, WH, T_UNF - 0.55, 0.7); add(sfx, BOOM, T_UNF, 0.5)
tr = lp(noise(T_MONT - T_UNF), 300) * 2 * env(int((T_MONT - T_UNF) * SR), 0.3, 1.0)
add(sfx, tr, T_UNF, 0.18)
for k in range(4):
    p = bp(noise(1.6), 200, 2500) * np.sin(np.linspace(0, np.pi, int(1.6 * SR))) ** 2; add(sfx, p, T_UNF + 0.2 + k * 1.3, 0.3)
add(sfx, ld("swell-short"), S(22) + (E(22) - S(22)) * 0.55, 0.35)
# re-freeze at montage
add(sfx, WH, T_MONT - 0.55, 0.4); add(sfx, BOOM, T_MONT, 0.35)
# stranger reveal
add(sfx, ld("piano-sting"), S(27) + 3.0, 0.35); add(sfx, ld("riser-short"), S(28) - 0.3, 0.3)
add(sfx, ld("dark-sting"), S(35), 0.3)
# hall
add(sfx, WH, S(47) - 0.5, 0.35); add(sfx, ld("piano-sting"), S(50), 0.4)
add(sfx, ld("dark-sting"), S(59), 0.4); add(sfx, BOOM, S(66), 0.4)
# siren wail
sd = S(76) - T_SIREN; tt = np.arange(int(sd * SR)) / SR
fsw = 650 + 300 * (np.sin(2 * np.pi * tt / 1.6) > 0)
ph = 2 * np.pi * np.cumsum(fsw) / SR
siren = (np.sin(ph) + 0.4 * np.sin(2 * ph)) * env(len(tt), 0.3, 1.0)
add(sfx, lp(siren, 2500), T_SIREN, 0.12)
# countdown beeps
t0 = S(68) + 3.0
for k in range(11): add(sfx, tone(1500 if k < 10 else 600, 0.12) * env(int(0.12 * SR), 0.005, 0.05), t0 + k, 0.18)
# ctrl glitch
tc = S(74) + (E(74) - S(74)) * 0.45
add(sfx, ld("glitch-hit"), tc, 0.6); add(sfx, BOOM, tc + 0.05, 0.4)
# dissolve shimmer
dd = 2.5; kk = np.arange(int(dd * SR)) / SR
shim = sum(np.sin(2 * np.pi * f * kk) for f in (2093, 2637, 3136, 4186)) * np.exp(-kk * 1.4) * (0.5 + 0.5 * np.sin(kk * 40))
add(sfx, shim * 0.25 + bp(noise(dd), 4000, 12000) * np.exp(-kk * 2) * 0.4, S(76) - 0.1, 0.25)
# phone ring (melodic)
t = S(77)
while t < S(79) + 0.4:
    for j, m in enumerate([76, 79, 84, 79]):
        k = np.arange(int(0.16 * SR)) / SR; add(sfx, (np.sin(2 * np.pi * NOTE(m) * k) + 0.3 * np.sin(4 * np.pi * NOTE(m) * k)) * np.exp(-k * 8), t + j * 0.16, 0.22)
    t += 1.2
# final glitch under phone voice
q = S(79) + (E(79) - S(79)) * 0.5
add(sfx, bp(noise(E(80) - q), 300, 3000) * 0.15 * (rng.random(int((E(80) - q) * SR)) > 0.97), q, 1.0)
mus[int(T_END * SR):int((T_END + 0.4) * SR)] *= np.linspace(1, 0, int((T_END + 0.4) * SR) - int(T_END * SR))
mus[int((T_END + 0.4) * SR):] *= 0.0
def save(n, x):
    p = (np.clip(x / max(1e-9, np.abs(x).max()) * 0.9, -1, 1) * 32767).astype(np.int16)
    with wave.open(n, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(p.tobytes())
save("music.wav", mus); save("sfx.wav", sfx); print("ok", round(DUR, 2))
