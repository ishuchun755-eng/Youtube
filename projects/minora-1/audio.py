import numpy as np, wave
SR = 44100; DUR = 42.2
N = int(SR * DUR)
rng = np.random.default_rng(7)
out = np.zeros((N, 2))
t_all = np.arange(N) / SR

def env(n, a=0.01, r=0.2):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
def add(sig, t0, g=1.0, pan=0.0):
    i = int(t0 * SR); sig = sig[: max(0, N - i)]
    out[i:i + len(sig), 0] += sig * g * (1 - max(0, pan))
    out[i:i + len(sig), 1] += sig * g * (1 + min(0, pan))
def lp(x, a):  # one-pole lowpass
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def noise(d): return rng.standard_normal(int(d * SR))
def tone(f, d, ph=0): t = np.arange(int(d * SR)) / SR; return np.sin(2 * np.pi * f * t + ph)

# fast lowpass via FFT for long signals
def lpf(x, fc):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (fr / fc) ** 4); return np.fft.irfft(X, len(x))
def bpf(x, lo, hi):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    X *= ((fr > lo) & (fr < hi)); return np.fft.irfft(X, len(x))

# drone bed (dark), stops at 37.0 then sting
d = 37.0
dr = (tone(55, d) * 0.5 + tone(82.4, d) * 0.25 + tone(110.7, d) * 0.15) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.15 * np.arange(int(d * SR)) / SR))
dr += lpf(noise(d), 300) * 0.4
add(dr * env(len(dr), 1.5, 1.0), 0, 0.35)
# wind (ambient whole, stronger in storm)
w = bpf(noise(DUR), 200, 1200)
w *= (0.4 + 0.6 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.21 * t_all[:len(w)]))) * 0.25
gain = np.where(t_all[:len(w)] > 31.9, 2.6, 1.0)
add(w * gain, 0, 0.6)
# crickets/forest in intro
for k in range(10):
    c = tone(4200, 0.06) * env(int(0.06 * SR), 0.005, 0.03)
    for j in range(3): add(c, 0.4 + k * 0.5 + j * 0.08, 0.05, 0.6 if k % 2 else -0.6)
# whoosh helper
def whoosh(d=0.6):
    n = noise(d); n = bpf(n, 400, 4000)
    e = np.sin(np.pi * np.linspace(0, 1, len(n))) ** 2
    return n * e
for t0 in (5.55, 9.5, 23.35, 27.8, 29.35):
    add(whoosh(), t0 - 0.2, 0.35)
# vertigo low swirl
sw = tone(70, 3.9) * (0.5 + 0.5 * np.sin(2 * np.pi * 1.2 * np.arange(int(3.9 * SR)) / SR))
add(sw * env(len(sw), 0.5, 0.8), 5.71, 0.35)
# "?" pop at 11.7 and question pops
def pop():
    t = np.arange(int(0.12 * SR)) / SR
    return np.sin(2 * np.pi * (600 + 900 * t / 0.12) * t) * np.exp(-t * 30)
for t0 in (11.7, 24.63, 25.37, 25.9): add(pop(), t0, 0.5)
# phone buzz 14.6-16.8
for k in range(3):
    b = (tone(150, 0.4) * 0.6 + tone(300, 0.4) * 0.3) * (np.sign(tone(30, 0.4)) * 0.5 + 0.5) * env(int(0.4 * SR), 0.01, 0.05)
    add(b, 14.6 + k * 0.7, 0.6)
# alert beeps on SMS
for k in range(6):
    add(tone(1100, 0.15) * env(int(0.15 * SR), 0.005, 0.05), 17.32 + k * 0.32, 0.25)
# typing ticks
for k in range(70):
    tk = noise(0.012) * env(int(0.012 * SR), 0.001, 0.008)
    add(tk, 17.4 + k * (5.5 / 70) + rng.uniform(0, 0.03), 0.18)
# 7 stamp
def thump(f=60, d=0.6):
    t = np.arange(int(d * SR)) / SR
    return np.sin(2 * np.pi * f * t * (1 + np.exp(-t * 12))) * np.exp(-t * 6)
add(thump(55, 0.9), 21.2, 1.0)
# heartbeat 23.4-27.9
for k in range(7):
    t0 = 23.5 + k * 0.62
    add(thump(48, 0.3), t0, 0.8); add(thump(44, 0.3), t0 + 0.18, 0.55)
# hatch: metal scrape + clank + lock click
sc = bpf(noise(0.9), 1500, 5000) * env(int(0.9 * SR), 0.1, 0.3)
add(sc, 28.0, 0.25)
def clank():
    d = 0.8; t = np.arange(int(d * SR)) / SR
    s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dcy) for f, dcy in ((420, 6), (1130, 9), (2240, 12), (3310, 16)))
    return s * 0.4 + noise(d)[: len(t)] * np.exp(-t * 60) * 0.5
add(clank(), 29.0, 0.6)
add(noise(0.03) * env(int(0.03 * SR), 0.001, 0.02), 29.12, 0.6)
# food items pop-in ticks
for k in range(16): add(pop() * 0.6, 29.55 + k * 0.12, 0.25)
# rain (storm)
rn = bpf(noise(10.3), 1200, 9000) * 0.25
rn *= env(len(rn), 0.8, 1.5)
add(rn, 31.9, 0.8)
# thunder
def thunder(d=3.0):
    n = lpf(noise(d), 180); t = np.arange(len(n)) / SR
    crack = bpf(noise(0.25), 800, 6000) * np.exp(-np.arange(int(0.25 * SR)) / SR * 14)
    e = np.exp(-t * 1.3) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t) ** 2)
    s = n * e * 3.0; s[: len(crack)] += crack * 0.8
    return s
for t0, g in ((32.05, 1.0), (34.35, 0.8), (35.6, 1.0)): add(thunder(), t0, g)
# end sting + low boom
add(thump(40, 1.5), 37.03, 1.0)
st = (tone(233, 2.5) + tone(247, 2.5) * 0.8 + tone(466, 2.5) * 0.3) * np.exp(-np.arange(int(2.5 * SR)) / SR * 1.5)
add(st, 37.03, 0.35)
# low drone continues after sting
d2 = DUR - 37.2
dd = (tone(41, d2) * 0.6 + lpf(noise(d2), 200) * 0.3) * env(int(d2 * SR), 0.5, 1.0)
add(dd, 37.2, 0.35)
add(pop(), 39.11, 0.6)

out /= np.max(np.abs(out)) / 0.9
pcm = (out * 32767).astype(np.int16)
with wave.open("sfx.wav", "wb") as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
print("ok")
