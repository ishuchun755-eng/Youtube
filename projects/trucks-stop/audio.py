"""Music bed + SFX stems for 'What If Every Truck in America Stopped'."""
import json, wave
import numpy as np
from scenes import S, T, E, SC, DT, SLAM, DUR, VOICE_END

SR = 44100
N = int(SR * (DUR + 0.5))
rng = np.random.default_rng(3)
music = np.zeros(N); sfx = np.zeros(N)

def load(name):
    with wave.open(f"sfx/{name}.wav") as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
def add(buf, sig, t0, g=1.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[: N - i]; buf[i:i + len(sig)] += sig * g
def env(n, a=0.01, r=0.1):
    e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
def tone(f, d, kind="sin"):
    t = np.arange(int(d * SR)) / SR
    if kind == "saw": return 2 * ((t * f) % 1) - 1
    return np.sin(2 * np.pi * f * t)
def lpf(x, fc):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (fr / fc) ** 4), len(x))
def bpf(x, lo, hi):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * ((fr > lo) & (fr < hi)), len(x))
def noise(d): return rng.standard_normal(int(d * SR))

# ---------------- music
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
def pad(chord, d, bright=900):
    s = sum(tone(NOTE(m) * (1 + dt), d, "saw") for m in chord for dt in (-0.004, 0.004))
    s = lpf(s, bright) / (len(chord) * 2)
    return s * env(len(s), 0.6, 0.6)
def pluck(m, d=0.4):
    t = np.arange(int(d * SR)) / SR
    return (np.sin(2 * np.pi * NOTE(m) * t) + 0.3 * np.sin(4 * np.pi * NOTE(m) * t)) * np.exp(-t * 9)
def kick():
    t = np.arange(int(0.35 * SR)) / SR
    return np.sin(2 * np.pi * 50 * t * (1 + 2 * np.exp(-t * 30))) * np.exp(-t * 9)
BPM = 84; beat = 60 / BPM; bar = beat * 4
MINOR = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]   # Am F C G
MAJOR = [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]]   # C G Am F

def section(t0, t1, chords, pulse=True, arp=True, gain=1.0, bright=900):
    t = t0; k = 0
    while t < t1 - 0.5:
        d = min(bar * 2, t1 - t)
        add(music, pad(chords[k % 4], d + 0.6, bright), t, 0.5 * gain)
        if pulse:
            for b in range(int(d / beat)):
                add(music, kick(), t + b * beat, 0.35 * gain)
        if arp:
            ch = chords[k % 4]
            for b in range(int(d / (beat / 2))):
                add(music, pluck(ch[b % 3] + 12 * (b % 4 == 3)), t + b * beat / 2, 0.12 * gain)
        t += d; k += 1

t_day0 = T("This is Day Zero"); t_d30 = T("Day thirty"); t_ret = T("And then, at six A.M."); t_now = T("Now, look outside")
# intro tension drone
dr = (tone(55, t_day0) * .5 + tone(82.4, t_day0) * .2 + lpf(noise(t_day0), 200) * .3) * env(int(t_day0 * SR), 0.3, 0.3)
add(music, dr, 0, 0.5)
for b in range(int(t_day0 / beat)):
    add(music, bpf(noise(0.03), 3000, 9000) * env(int(0.03 * SR), 0.001, 0.02), b * beat, 0.15)
section(t_day0 + 1.6, t_d30, MINOR, gain=0.9)
d30 = t_ret - t_d30
add(music, (tone(55, d30) * .4 + tone(65.4, d30) * .2) * env(int(d30 * SR), 1.0, 1.5), t_d30, 0.45)
section(t_ret, t_now, MAJOR, pulse=False, arp=False, gain=0.8, bright=600)
section(t_now, DUR, MAJOR, gain=1.0, bright=1400)
fade = int(3 * SR); music[int((DUR - 3) * SR):int(DUR * SR)] *= np.linspace(1, 0, int(DUR * SR) - int((DUR - 3) * SR))

# ---------------- sfx
WH = load("whoosh-reverse"); BOOM = load("deep-boom"); POP = load("cartoon-zip"); ERR = load("error-beep")
def thunk():
    t = np.arange(int(0.3 * SR)) / SR
    return np.sin(2 * np.pi * 90 * t * (1 + np.exp(-t * 25))) * np.exp(-t * 14) + bpf(noise(0.3), 200, 2000) * np.exp(-t * 40) * .4
def ding():
    t = np.arange(int(0.6 * SR)) / SR
    return (np.sin(2 * np.pi * 1320 * t) + .5 * np.sin(2 * np.pi * 1980 * t)) * np.exp(-t * 7)
def buzz(d=0.35):
    t = np.arange(int(d * SR)) / SR
    return (np.sin(2 * np.pi * 160 * t) * (np.sin(2 * np.pi * 25 * t) > 0)) * env(len(t), 0.01, 0.05)

for st, fn in SC[1:]:
    add(sfx, WH, st - 0.45, 0.35)
for ts, v in DT:
    if v in SLAM: add(sfx, BOOM, ts, 0.55)

# intro: engines + air brakes
stopT = E("At six A.M. on a Monday") - 0.2
eng = lpf(noise(stopT + 0.3), 120) * 2.5 * (0.7 + 0.3 * tone(9, stopT + 0.3))
add(sfx, eng * env(len(eng), 0.3, 0.5), 0, 0.5)
add(sfx, bpf(noise(1.0), 2500, 9000) * env(int(SR), 0.02, 0.7), stopT, 0.35)
for k in range(5): add(sfx, bpf(noise(0.02), 1500, 6000), T("Not one engine") + 0.15 + k * 0.33, 0.4)
add(sfx, load("glitch-hit"), t_day0, 0.6)
# infographic pops
t0 = T("Almost three quarters")
for i in range(3): add(sfx, POP, t0 + 0.4 + i * 0.35, 0.5)
add(sfx, thunk(), t0 + 1.6, 0.6)
for frag in ("Your food", "Your medicine", "Your gas", "The toilet paper"): add(sfx, load("paper-flip"), T(frag), 0.45)
add(sfx, ding(), T("A few posts say"), 0.3); add(sfx, ding(), T("Someone jokes"), 0.3)
add(sfx, load("piano-sting"), T("Hour twelve") + 1.0, 0.35)
add(sfx, load("group-ooh"), T("They go shopping"), 0.35)
for k in range(4): add(sfx, load("bike-honk"), T("By evening, the lines") + 0.4 + k * 0.9, 0.25)
add(sfx, thunk(), T("Signs go up") + 0.3, 0.6); add(sfx, thunk(), T("Sorry"), 0.6)
add(sfx, thunk(), T("Surgeries that can wait") + 0.4, 0.6)
for k in range(3): add(sfx, buzz(), T("Meanwhile, your phone") + k * 0.45, 0.4)
add(sfx, ERR, T("The package you ordered") + 0.9, 0.5); add(sfx, ERR, T("again") + 0.3, 0.5)
add(sfx, BOOM, T("Trucking industry reports") + 2.5, 0.6)
for frag in ("The bread aisle", "Milk, gone", "Eggs, gone", "chips are gone"): add(sfx, load("cartoon-zip"), T(frag), 0.4)
add(sfx, load("cricket-chirp"), T("And two people") + 0.2, 0.45)
fl = bpf(noise(E("A big city makes") - T("Day four")), 180, 400) * (0.5 + 0.5 * tone(4, E("A big city makes") - T("Day four")))
add(sfx, fl * env(len(fl), 1, 1), T("Day four"), 0.08)
add(sfx, ERR, T("When the machines"), 0.5); add(sfx, ERR, T("When the machines") + 0.3, 0.5)
for k in range(3): add(sfx, thunk(), T("Many of them have no railroad") + [0.3, 1.4, 2.2][k], 0.45)
add(sfx, load("air-horn") * 0.5, T("The only way anything arrives") + 0.3, 0.25)
pd = 1.5; t = np.arange(int(pd * SR)) / SR
add(sfx, np.sin(2 * np.pi * (220 - 160 * t / pd) * t) * np.exp(-t * 1.5), T("Factories shut down") + 1.0, 0.35)
for i in range(3): add(sfx, thunk(), T("Car plants") + i * 0.8, 0.5)
add(sfx, load("metal-clang"), T("And milk that can't") + 0.2, 0.4)
for k in range(int((E("this is no longer") - T("Day ten")) / 0.9)):
    add(sfx, tone(880, 0.12) * env(int(0.12 * SR), 0.005, 0.05), T("Day ten") + 1 + k * 0.9, 0.12)
wf = bpf(noise(T("But the chemicals") - T("Day fourteen")), 800, 6000)
add(sfx, wf * env(len(wf), 0.3, 0.3), T("Day fourteen") + 0.5, 0.12)
add(sfx, ding(), T("Without them, cities") + 0.3, 0.35); add(sfx, ding(), T("Then they ask people") + 0.3, 0.35)
add(sfx, BOOM, T("Trucks."), 0.6)
for frag in ("Trains only go", "Planes are expensive", "Ships need ports"): add(sfx, POP, T(frag), 0.5)
wn = bpf(noise(t_ret - t_d30), 150, 900) * 0.6
add(sfx, wn * env(len(wn), 1.5, 1.5), t_d30, 0.25)
rum = lpf(noise(5), 80) * 3
add(sfx, rum * env(len(rum), 1.0, 1.0), T("A low rumble"), 0.6)
add(sfx, load("riser-short"), T("Somewhere down the highway") - 0.5, 0.35)
add(sfx, load("air-horn"), T("Somewhere down the highway") + 2.2, 0.45)
for frag in ("The bread in your kitchen", "The medicine in your cabinet", "The gas in your car"): add(sfx, POP, T(frag), 0.5)
add(sfx, load("dark-sting"), T("When trucks stop, America stops"), 0.5)
add(sfx, BOOM, T("And it only takes") + 0.8, 0.5)
add(sfx, load("swell-short"), VOICE_END + 0.6, 0.4)
add(sfx, POP, VOICE_END + 1.8, 0.5)

def save(name, x):
    pcm = (np.clip(x / max(1e-6, np.abs(x).max()) * 0.9, -1, 1) * 32767).astype(np.int16)
    with wave.open(name, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
save("music.wav", music); save("sfx.wav", sfx)
print("ok", DUR)
