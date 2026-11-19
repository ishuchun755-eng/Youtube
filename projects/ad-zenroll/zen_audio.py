import wave, numpy as np
SR = 44100; DUR = 26.63; N = int(SR * DUR); rng = np.random.default_rng(9)
mus = np.zeros(N); sfx = np.zeros(N)
def add(b, s, t, g=1.0):
    i = int(t * SR)
    if i < 0: s = s[-i:]; i = 0
    s = s[:max(0, N - i)]; b[i:i + len(s)] += s * g
def ld(n):
    with wave.open(f"/root/shorts/trucks/sfx/{n}.wav") as w: return np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768
def noise(d): return rng.standard_normal(int(d * SR))
def filt(x, lo=0, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = (f > lo) if hi is None else ((f > lo) & (f < hi))
    return np.fft.irfft(X * m, len(x))
def lp(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x))
def decay(d, k): return np.exp(-np.arange(int(d * SR)) / SR * k)

BPM = 112; b = 60 / BPM
t = np.arange(int(.3 * SR)) / SR
kick = np.sin(2 * np.pi * 52 * t * (1 + 3 * np.exp(-t * 35))) * np.exp(-t * 9)
snare = filt(noise(.25), 900) * decay(.25, 18) * .8 + np.sin(2 * np.pi * 190 * np.arange(int(.25 * SR)) / SR) * decay(.25, 30) * .4
hat = filt(noise(.04), 7500) * decay(.04, 90)
N2M = lambda m: 440 * 2 ** ((m - 69) / 12)
def bass(m, d):
    tt = np.arange(int(d * SR)) / SR; s = np.sin(2 * np.pi * N2M(m) * tt) + .4 * np.sign(np.sin(2 * np.pi * N2M(m) * tt))
    return lp(s, 700) * np.exp(-tt * 5)
def keys(ch, d):
    tt = np.arange(int(d * SR)) / SR
    return sum(np.sin(2 * np.pi * N2M(m) * tt) + .3 * np.sin(4 * np.pi * N2M(m) * tt) for m in ch) * np.exp(-tt * 3.5) / len(ch)
prog = [(50, [62, 65, 69, 72]), (55, [62, 67, 71, 74]), (48, [60, 64, 67, 71]), (45, [60, 64, 69, 72])]
groove = [0, 0.75, 1.5, 2, 2.75, 3.5]
bi = 0; t0 = 0.0
while t0 < DUR - 0.3:
    root, ch = prog[(bi // 4) % 4]
    if t0 > 1.25:
        add(mus, kick, t0, .9)
        if bi % 2 == 1: add(mus, snare, t0, .55)
        add(mus, hat, t0 + b / 2, .35); add(mus, hat, t0, .18)
        if bi % 4 == 0:
            for g in groove: add(mus, bass(root - 12, b * .7), t0 + g * b, .45)
            add(mus, keys(ch, b * 3.5), t0, .35)
    bi += 1; t0 += b
mus[-int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))

WH = ld("whoosh-reverse"); POP = ld("cartoon-zip")
for c in (1.30, 3.53, 5.16, 6.13, 6.74, 7.51, 8.11, 8.62, 9.0, 9.95, 11.53, 12.73, 14.08, 15.56, 16.68, 18.04, 21.30):
    add(sfx, WH, c - .5, .45)
for c in (6.13, 6.74, 7.51, 8.11, 8.62): add(sfx, POP, c, .55)
for j in range(9): add(sfx, POP, 9.95 + j * .05, .3)
gt = np.arange(int(SR)) / SR
add(sfx, lp(noise(1.0), 160) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * gt)) * np.sin(np.pi * gt) * 3, 0.0, .5)
add(sfx, ld("riser-short")[:int(SR)], 0.4, .3)
add(sfx, ld("swell-short"), 1.3, .35)
add(sfx, filt(noise(1.0), 2500, 9000) * (0.6 + 0.4 * rng.random(int(SR))) * np.sin(np.pi * gt), 5.16, .18)
def ding(f=1568, d=.7):
    tt = np.arange(int(d * SR)) / SR; return (np.sin(2 * np.pi * f * tt) + .5 * np.sin(3 * np.pi * f * tt)) * np.exp(-tt * 6)
for j in range(8): add(sfx, filt(noise(.02), 3500) * decay(.02, 150), 11.6 + j * .12, .45)
add(sfx, ding(), 13.0, .35); add(sfx, ding(1318), 14.3, .3)
for k in range(4): add(sfx, ld("paper-flip")[:int(.2 * SR)], 15.56 + k * .3, .3)
def ring(d=.9):
    tt = np.arange(int(d * SR)) / SR
    return (np.sin(2 * np.pi * 1400 * tt) + np.sin(2 * np.pi * 1750 * tt)) * (np.sin(2 * np.pi * 20 * tt) > 0) * np.exp(-tt * 1.5) * .5
add(sfx, ring(), 18.1, .35); add(sfx, ring(), 18.9, .3)
add(sfx, POP, 19.04, .5); add(sfx, POP, 19.54, .5)
add(sfx, ld("deep-boom"), 21.3, .45); add(sfx, ding(2093, 1.2), 21.5, .35)
def save(n, x):
    p = (np.clip(x / np.abs(x).max() * .9, -1, 1) * 32767).astype(np.int16)
    with wave.open(n, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(p.tobytes())
save("music.wav", mus); save("sfx.wav", sfx); print("ok")
