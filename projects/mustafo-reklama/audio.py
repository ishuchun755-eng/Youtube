import wave, subprocess, numpy as np
D0 = '/root/shorts/mustafo'; SR = 44100
DUR = 28.45 + 1.6; N = int(DUR * SR)
rng = np.random.default_rng(2)
def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / r)
def tone(f, d, a=0.005, r=0.3):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.1 * np.sin(6 * np.pi * f * t)) * env(n, a, r)
def put(b, x, t, g=1.0):
    i = int(t * SR); j = min(len(b), i + len(x))
    if 0 <= i < len(b): b[i:j] += x[:j - i] * g
def lpf(x, k):
    L = int(4 / k); h = k * (1 - k) ** np.arange(L); return np.convolve(x, h)[:len(x)]
mus = np.zeros(N); sfx = np.zeros(N)
bpm = 118; beat = 60 / bpm
# Fmaj7 - Am7 - Dm9 - Bbmaj7 (warm, upscale)
prog = [[174.6, 220, 261.6, 329.6], [220, 261.6, 329.6, 392], [146.8, 220, 261.6, 329.6], [233.1, 293.7, 349.2, 440]]
nb = int(DUR / beat) + 1
kick_n = int(0.3 * SR); kt = np.arange(kick_n) / SR
kick = np.sin(2 * np.pi * (45 + 80 * np.exp(-kt / 0.03)) * kt) * env(kick_n, 0.002, 0.15)
hat = lpf(rng.standard_normal(int(0.05 * SR)), 0.9) * env(int(0.05 * SR), 0.001, 0.015)
hat = hat - lpf(hat, 0.2)
clap = (rng.standard_normal(int(0.2 * SR)) * env(int(0.2 * SR), 0.002, 0.06)); clap = clap - lpf(clap, 0.1)
for b in range(nb):
    t = b * beat; ch = prog[(b // 4) % 4]
    intro = t < 1.0
    if b % 4 == 0:
        for f in ch: put(mus, tone(f, beat * 4, 0.05, 1.6) * 0.18, t)
    if not intro:
        put(mus, kick, t, 0.9)
        put(mus, hat, t + beat / 2, 0.35); put(mus, hat, t + beat / 4 * 3, 0.15)
        if b % 2 == 1: put(mus, clap, t, 0.35)
        put(mus, tone(ch[0] / 2, beat * 0.9, 0.01, 0.25) * 0.45, t)
        put(mus, tone(ch[(b * 3) % 4] * 2, beat * 0.5, 0.003, 0.12) * 0.12, t + beat / 2)
# gentle outro: stop drums last 1.2s
fade = np.ones(N); i0 = int((DUR - 2.0) * SR); fade[i0:] = np.linspace(1, 0, N - i0); mus *= fade
# sfx: whoosh on cuts, shimmer on sweeps/brand
cuts = [0.25, 0.5, 0.75, 1.0, 3.0, 6.15, 7.4, 9.0, 10.0, 10.5, 11.05, 12.25, 13.45, 14.15, 14.8, 16.8, 19.5, 21.4]
wn = int(0.35 * SR)
whoosh = lpf(rng.standard_normal(wn), 0.12) * np.sin(np.linspace(0, np.pi, wn)) ** 2 * 3
for c in cuts: put(sfx, whoosh, c - 0.15, 0.5 if c < 1.1 else 0.8)
shimmer = sum(tone(f, 1.5, 0.02, 0.6) * 0.2 for f in (1568, 2093, 2637, 3136, 4186))
for t in (1.25, 21.6, 23.8): put(sfx, shimmer, t, 0.8)
pop = tone(1200, 0.12, 0.002, 0.03)
for t in (3.0, 3.75, 4.35, 19.75, 20.4, 22.7): put(sfx, pop, t, 0.7)
hit = kick * 1.0; put(sfx, hit, 14.8, 1.0); put(sfx, hit, 16.8, 0.8)
def wr(name, x):
    w = wave.open(f'{D0}/{name}', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{D0}/voice.mp3', '-ac', '1', '-ar', str(SR), f'{D0}/voice.wav'])
w = wave.open(f'{D0}/voice.wav'); v = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768
v = np.concatenate([v, np.zeros(max(0, N - len(v)))])[:N]
def grms(x):
    b = 4410; r = np.sqrt(np.array([np.mean(x[i:i + b] ** 2) for i in range(0, len(x) - b, b)]) + 1e-12)
    g = r[r > r.max() * 0.1]; return np.sqrt(np.mean(g ** 2))
vr = grms(v)
mus *= 0.35 * vr / grms(mus)   # ad: music ~ -9 dB under voice
sfx *= 0.3 * vr / grms(sfx); sfx *= min(1, 0.6 * np.abs(v).max() / np.abs(sfx).max())
mix = v + mus + sfx
wr('mix.wav', mix / max(1, np.abs(mix).max() * 1.05))
print('ok')
