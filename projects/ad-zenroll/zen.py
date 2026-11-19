"""ZenRoll promo — 1080x1920, 30 fps. Timeline from sentences.json."""
import sys, os, math, random, json, subprocess, re
sys.path.insert(0, "/root/shorts/trucks")
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageEnhance, ImageFont
from lib import K, ss, eout, back, clamp, lerp, OUT

W, H, FPS = 1080, 1920, 30
RED, DRED, WHT, YEL, BLK = (226, 30, 38), (150, 10, 18), (255, 255, 255), (255, 200, 40), (14, 12, 14)
FBI = "/usr/share/fonts/opentype/inter/Inter-BlackItalic.otf"
FB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
_f = {}
def font(s, it=True):
    k = (s, it)
    if k not in _f: _f[k] = ImageFont.truetype(FBI if it else FB, max(1, int(s)))
    return _f[k]

S = json.load(open("sentences.json"))
def ST(i): return S[i]["start"]
def EN(i): return S[i]["end"]
DUR = round(EN(len(S) - 1) + 3.2, 2)
NF = int(DUR * FPS)

PAUSES = []
if os.path.exists("voice.mp3"):
    out = subprocess.run(["ffmpeg", "-i", "voice.mp3", "-af", "silencedetect=noise=-32dB:d=0.06", "-f", "null", "-"], capture_output=True, text=True).stderr
    PAUSES = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]

def wtime(i, word, k=0):
    s = S[i]; txt = s["text"]
    pos = [m.start() for m in re.finditer(re.escape(word), txt)][k]
    t = s["start"] + (s["end"] - s["start"]) * pos / len(txt)
    near = [p for p in PAUSES if abs(p - t) < 0.3 and s["start"] - 0.05 <= p <= s["end"]]
    return min(near, key=lambda p: abs(p - t)) if near else t

# ------------------------------------------------------------ assets
PH = {n: Image.open(f"ph/{n}.png").convert("RGB") for n in ("roll1", "roll2", "roll3", "burger", "crepes", "roll4", "hotdog", "pizza", "lavash", "shaurma")}
LAVCUT = Image.open("ph/lavash_cut.png").convert("RGBA")
FRICUT = Image.open("ph/fries_cut.png").convert("RGBA")
LOGO = Image.open("img/logo.jpg").convert("RGB")
def logo_rgba(size):
    im = LOGO.resize((size, size), Image.LANCZOS)
    m = Image.new("L", (size, size), 0); ImageDraw.Draw(m).ellipse([size * .02, size * .02, size * .98, size * .98], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0)); out.paste(im, (0, 0), m)
    return out
LOGO_BIG = logo_rgba(760)

def cover(name, fx, fy, z, w=W, h=H, dx=0.0, dy=0.0):
    im = PH[name]; iw, ih = im.size
    base = max(w / iw, h / ih)
    cw, ch = w / (base * z), h / (base * z)
    cx = clamp(fx * iw + dx * iw, cw / 2, iw - cw / 2); cy = clamp(fy * ih + dy * ih, ch / 2, ih - ch / 2)
    return im.crop((int(cx - cw / 2), int(cy - ch / 2), int(cx + cw / 2), int(cy + ch / 2))).resize((w, h), Image.BICUBIC)

_cardc = {}
def card(name, w, h, fx=0.5, fy=0.5, r=44, z=1.0):
    key = (name, w, h, fx, fy, round(z, 3))
    if key in _cardc: return _cardc[key]
    ph = cover(name, fx, fy, z, w, h)
    out = Image.new("RGBA", (w + 60, h + 60), (0, 0, 0, 0))
    sh = Image.new("L", out.size, 0); ImageDraw.Draw(sh).rounded_rectangle([30, 42, w + 30, h + 42], r, fill=170)
    out.paste((0, 0, 0, 255), (0, 0), sh.filter(ImageFilter.GaussianBlur(16)))
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], r, fill=255)
    out.paste(ph, (30, 30), m)
    ImageDraw.Draw(out).rounded_rectangle([30, 30, w + 29, h + 29], r, outline=RED, width=6)
    if len(_cardc) > 40: _cardc.clear()
    _cardc[key] = out
    return out

def put(fr, im, cx, cy, sc=1.0, rot=0.0):
    if sc <= 0.01: return
    if sc != 1: im = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.BILINEAR)
    if rot: im = im.rotate(rot, Image.BICUBIC, expand=True)
    fr.paste(im, (int(cx - im.width / 2), int(cy - im.height / 2)), im)

# ------------------------------------------------------------ icons (flat illustrations)
_ic = {}
def icon(kind, size=640):
    k = (kind, size)
    if k in _ic: return _ic[k]
    c = K(600, 600)
    if kind == "pizza":
        c.ell(40, 40, 560, 560, fill=(214, 140, 60), w=10)
        c.ell(80, 80, 520, 520, fill=(250, 200, 80), w=0, out=None)
        rnd = random.Random(2)
        for i in range(30):
            x, y = rnd.uniform(110, 490), rnd.uniform(110, 490)
            if (x - 300) ** 2 + (y - 300) ** 2 < 190 ** 2: c.ell(x - 12, y - 8, x + 12, y + 8, fill=(255, 236, 160), out=None)
        for (x, y) in ((200, 200), (380, 180), (420, 340), (260, 400), (330, 280), (170, 330), (380, 450)):
            c.ell(x - 38, y - 38, x + 38, y + 38, fill=(200, 40, 40), w=5)
            c.ell(x - 14, y - 20, x - 2, y - 8, fill=(230, 90, 80), out=None)
        for (x, y) in ((250, 150), (450, 260), (300, 470), (150, 260)): c.ell(x - 14, y - 10, x + 14, y + 10, fill=(60, 140, 60), out=None)
        c.poly([(300, 300), (560, 260), (560, 360)], fill=(14, 12, 14), out=None)
        c.poly([(330, 300), (600, 250), (590, 360)], fill=(250, 200, 80), w=8)
    elif kind == "hotdog":
        c.rect(60, 250, 540, 430, fill=(226, 160, 80), r=90, w=10)
        c.rect(40, 230, 560, 330, fill=(190, 70, 50), r=50, w=10)
        c.line([(80, 270), (130, 300), (180, 260), (230, 300), (280, 260), (330, 300), (380, 260), (430, 300), (480, 260), (520, 290)], (255, 214, 40), 16)
        c.rect(60, 320, 540, 470, fill=(240, 180, 100), r=80, w=10)
    elif kind == "fries":
        for i, x in enumerate(range(150, 460, 46)):
            h = 260 + (i % 3) * 40
            c.rect(x, 330 - h + 200, x + 40, 400, fill=(255, 210, 70), r=8, w=6)
        c.poly([(110, 300), (490, 300), (450, 560), (150, 560)], fill=RED, w=10)
        c.poly([(220, 360), (300, 330), (380, 360), (300, 440)], fill=(255, 255, 255), w=0, out=None)
    elif kind == "lavash":
        c.poly([(120, 520), (420, 80), (520, 150), (220, 590)], fill=(236, 200, 140), w=10)
        c.ell(380, 60, 540, 180, fill=(236, 200, 140), w=10)
        c.ell(400, 75, 525, 165, fill=(120, 70, 40), out=None)
        for (x, y, col) in ((430, 100, (80, 170, 60)), (470, 130, (220, 60, 50)), (450, 150, (250, 240, 220))):
            c.ell(x - 18, y - 14, x + 18, y + 14, fill=col, out=None)
        c.poly([(120, 520), (300, 260), (380, 330), (220, 590)], fill=(250, 250, 250), w=8)
        c.line([(170, 470), (320, 300)], (220, 220, 230), 6)
    elif kind == "shaurma":
        c.rect(290, 40, 310, 580, fill=(160, 160, 170), w=4)
        c.poly([(200, 110), (400, 110), (370, 500), (230, 500)], fill=(170, 90, 40), w=10)
        for y in range(140, 490, 40): c.line([(215 + (y - 110) * .07, y), (385 - (y - 110) * .07, y + 10)], (130, 60, 30), 8)
        c.rect(170, 500, 430, 540, fill=(120, 120, 130), r=10, w=6)
        for k in range(3):
            c.arc((420, 200 + k * 60, 520, 260 + k * 60), 300, 60, (255, 140, 40), 10)
    _ic[k] = c.done().resize((size, size), Image.LANCZOS)
    return _ic[k]

def stopwatch(fr, cx, cy, r, t):
    d = ImageDraw.Draw(fr)
    d.rounded_rectangle([cx - 30, cy - r - 60, cx + 30, cy - r - 10], 10, fill=WHT)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHT, outline=RED, width=18)
    a = -math.pi / 2 + t * 9
    d.pieslice([cx - r + 30, cy - r + 30, cx + r - 30, cy + r - 30], -90, math.degrees(a), fill=(255, 210, 210))
    d.line([(cx, cy), (cx + (r - 40) * math.cos(a), cy + (r - 40) * math.sin(a))], fill=RED, width=14)
    d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=RED)

def phone_icon(fr, cx, cy, s, t):
    c = K(400, 400)
    c.rect(60, 60, 340, 340, fill=RED, r=80, w=0, out=None)
    c.poly([(140, 120), (190, 110), (215, 170), (185, 195), (215, 240), (245, 270), (270, 245), (330, 270), (320, 320), (290, 330), (200, 300), (130, 210), (115, 150)], fill=WHT, out=None)
    rot = 12 * math.sin(t * 40) if (t % 0.8) < 0.4 else 0
    put(fr, c.done(), cx, cy, s, rot)
    d = ImageDraw.Draw(fr)
    if (t % 0.8) < 0.4:
        for k in (1, 2):
            d.arc([cx - 160 * s - k * 40, cy - 160 * s - k * 40, cx + 160 * s + k * 40, cy + 160 * s + k * 40], -60, -20, fill=WHT, width=10)
            d.arc([cx - 160 * s - k * 40, cy - 160 * s - k * 40, cx + 160 * s + k * 40, cy + 160 * s + k * 40], 200, 240, fill=WHT, width=10)

def pinmark(fr, cx, cy, s=1.0):
    c = K(200, 280)
    c.ell(10, 10, 190, 190, fill=WHT, w=0, out=None); c.poly([(30, 140), (170, 140), (100, 270)], fill=WHT, out=None)
    c.ell(60, 60, 140, 140, fill=RED, out=None)
    put(fr, c.done(), cx, cy, s)

# ------------------------------------------------------------ text
def brush_bar(fr, x0, y0, x1, y1, col=RED, seed=1, p=1.0):
    if p <= 0: return
    rnd = random.Random(seed); xe = lerp(x0, x1, eout(p))
    pts = [(x0, y0 + rnd.uniform(-6, 6))]
    n = 14
    for i in range(1, n + 1): pts.append((lerp(x0, xe, i / n), y0 + rnd.uniform(-10, 8)))
    for i in range(n, -1, -1): pts.append((lerp(x0, xe, i / n) + rnd.uniform(-6, 6), y1 + rnd.uniform(-8, 10)))
    ImageDraw.Draw(fr).polygon(pts, fill=col)

def title(fr, s, cx, cy, size, t, fill=WHT, bar=None, seed=1, stroke=0, it=True):
    if t <= 0: return
    f = font(size, it); d = ImageDraw.Draw(fr)
    tw = d.textlength(s, font=f)
    if bar: brush_bar(fr, cx - tw / 2 - 40, cy - size * .62, cx + tw / 2 + 40, cy + size * .62, bar, seed, t / 0.22)
    q = clamp(t / 0.18)
    off = (1 - eout(q)) * 70
    lay = Image.new("RGBA", (int(tw + 80), int(size * 1.6)), (0, 0, 0, 0))
    ImageDraw.Draw(lay).text((40, size * .8), s, font=f, fill=fill + (int(255 * q),), anchor="lm", stroke_width=stroke, stroke_fill=(0, 0, 0, int(200 * q)))
    fr.paste(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2 + off)), lay)

def wordpop(fr, words, times, cx, cy, size, t, cols=None, gap=22):
    f = font(size); d = ImageDraw.Draw(fr)
    ws = [d.textlength(w, font=f) for w in words]
    x = cx - (sum(ws) + gap * (len(words) - 1)) / 2
    for i, w in enumerate(words):
        tt = t - times[i]
        if tt > 0:
            q = back(tt / 0.22, 2.4); sz = int(size * (0.5 + 0.5 * q))
            col = (cols[i] if cols else WHT)
            d.text((x + ws[i] / 2, cy), w, font=font(sz), fill=col, anchor="mm", stroke_width=8, stroke_fill=(0, 0, 0))
        x += ws[i] + gap

# ------------------------------------------------------------ fx
rng = np.random.default_rng(1)
GRAIN = [Image.fromarray(np.clip(rng.normal(0, 9, (H // 2, W // 2)) + 128, 0, 255).astype(np.uint8)).resize((W, H)).convert("RGB") for _ in range(6)]
yy, xx = np.mgrid[0:H, 0:W]
_r = np.sqrt(((xx - W / 2) / (W * .7)) ** 2 + ((yy - H / 2) / (H * .62)) ** 2)
VIG = Image.fromarray(((1 - .55 * np.clip(_r - .5, 0, 1) ** 1.3) * 255).astype(np.uint8)).convert("RGB")
LEAK = Image.new("RGB", (W * 2, H * 2), (0, 0, 0))
_ld = ImageDraw.Draw(LEAK)
for i in range(10, 0, -1):
    r = 700 * i / 10; c = int(70 * (1 - i / 10) ** 1.5)
    _ld.ellipse([W - r, H * .6 - r, W + r, H * .6 + r], fill=(c * 2, int(c * .8), int(c * .2)))
LEAK = LEAK.filter(ImageFilter.GaussianBlur(40))

def finish(fr, t, fi):
    ox = int((math.sin(t * 0.5) * .5 + .5) * W); oy = int((math.cos(t * 0.37) * .5 + .5) * H * .6)
    fr = ImageChops.screen(fr, LEAK.crop((ox, oy, ox + W, oy + H)))
    fr = ImageChops.multiply(fr, VIG)
    g = GRAIN[fi % 6]
    fr = ImageChops.add(fr, g, 1.0, -128) if False else Image.blend(fr, ImageChops.overlay(fr, g), 0.5)
    return fr

def steam(fr, t, x0, x1, y, seed=1, a=60):
    lay = Image.new("RGBA", (W // 4, H // 4), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); rnd = random.Random(seed)
    for i in range(10):
        p = (t * 0.35 + rnd.random()) % 1
        x = (rnd.uniform(x0, x1) + 40 * math.sin(p * 6 + i)) / 4; yy = (y - p * 520) / 4; r = (20 + 50 * p) / 4
        d.ellipse([x - r, yy - r, x + r, yy + r], fill=(255, 255, 255, int(a * math.sin(p * math.pi))))
    lay = lay.filter(ImageFilter.GaussianBlur(5)).resize((W, H), Image.BILINEAR)
    fr.paste(lay, (0, 0), lay)

def bg_dark(t, red=0.3):
    a = np.linspace(0, 1, H)[:, None, None]
    arr = np.array((18, 14, 18), float) * (1 - a) + np.array((40, 8, 12), float) * a
    fr = Image.fromarray(np.repeat(arr, W, 1).astype(np.uint8))
    d = ImageDraw.Draw(fr)
    for k in range(3):
        y = 300 + k * 600 + 40 * math.sin(t + k)
        brush_bar(fr, -100, y, W + 100, y + 26, (90 + 30 * k, 12, 18), seed=k + 7)
    return fr

def bg_red(t):
    fr = Image.new("RGB", (W, H), RED); d = ImageDraw.Draw(fr)
    for i in range(-8, 10):
        x = i * 200 + (t * 120) % 200
        d.polygon([(x, 0), (x + 90, 0), (x - 500, H), (x - 590, H)], fill=(205, 22, 30))
    return fr

def whip(fr, lt, d=0.2, direction=1):
    if lt >= d: return fr
    p = 1 - eout(lt / d)
    shift = int(direction * p * W * 0.5)
    sm = fr.resize((max(1, int(W / (1 + p * 24))), H), Image.BILINEAR).resize((W, H), Image.BILINEAR)
    out = Image.new("RGB", (W, H)); out.paste(sm, (shift, 0)); out.paste(sm, (shift - direction * W, 0))
    return out

def punch(fr, lt, d=0.22, amt=0.18):
    if lt >= d: return fr
    z = 1 + amt * (1 - eout(lt / d))
    cw, ch = W / z, H / z
    return fr.crop((int((W - cw) / 2), int((H - ch) / 2), int((W + cw) / 2), int((H + ch) / 2))).resize((W, H), Image.BILINEAR)

# ------------------------------------------------------------ timeline
I_SUSHI = ST(2); I_BURG = wtime(2, "shirali"); I_LAV = wtime(2, "lavash"); I_SHA = wtime(2, "shaurma"); I_PIZ = wtime(2, "pizza")
I_HOT = wtime(2, "hot-dog"); I_FRI = wtime(2, "fri"); I_SHIR = wtime(2, "shirinliklar"); I_ALL = wtime(2, "hammasi")
I_TAT2 = wtime(6, "yana")
if PAUSES: I_FRI, I_SHIR = 8.62, 9.0

def shot_hook(t, lt):
    fr = cover("roll3", 0.42, 0.6, 1.3 + 0.12 * ss(t / EN(0)))
    fr = ImageEnhance.Brightness(fr).enhance(0.72)
    steam(fr, t, 200, 900, 1300, 3, 70)
    w1 = 0.05; w2 = wtime(0, "ochdimi")
    wordpop(fr, ["QORNINGIZ"], [w1], W / 2, 820, 150, t)
    wordpop(fr, ["OCHDIMI?"], [w2], W / 2, 1000, 190, t, [YEL])
    return punch(fr, lt, 0.25, 0.1)

def shot_logo(t, lt):
    fr = bg_dark(t)
    d = ImageDraw.Draw(fr)
    p = eout(lt / 0.5)
    cx, cy, r = W / 2, 820, 430
    d.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + 360 * p, fill=RED, width=40)
    sc = back(clamp((lt - 0.1) / 0.45), 1.6)
    if sc > 0:
        lg = LOGO_BIG.rotate(-12 * (1 - sc), Image.BICUBIC)
        put(fr, lg, cx, cy, 0.98 * sc)
    sw = (lt - 0.5) / 0.6
    if 0 < sw < 1:
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
        x = lerp(-300, W + 300, sw)
        ld.polygon([(x - 60, 300), (x + 60, 300), (x - 240, 1340), (x - 360, 1340)], fill=(255, 255, 255, 70))
        fr.paste(lay, (0, 0), lay)
    title(fr, "SIZNI KUTMOQDA!", W / 2, 1420, 96, t - wtime(1, "sizni"), WHT, RED, 3)
    return punch(fr, lt, 0.2, 0.15)

def label(fr, s, t, y=1560, size=110, seed=2):
    title(fr, s, W / 2, y, size, t, WHT, RED, seed)

def shot_list(t, lt):
    if t < I_BURG:
        half = (I_SUSHI + I_BURG) / 2
        if t < half:
            l2 = t - I_SUSHI
            fr = cover("roll1", 0.55, 0.62, 1.05 + 0.08 * l2)
            fr = whip(fr, l2, 0.2, 1)
        else:
            l2 = t - half
            fr = cover("roll2", 0.5, 0.48, 1.0 + 0.08 * l2)
            fr = punch(fr, l2)
        label(fr, "SUSHI & ROLLAR", t - I_SUSHI - 0.1)
        return fr
    if t < I_LAV:
        l2 = t - I_BURG
        fr = cover("burger", 0.5, 0.56, 1.05 + 0.07 * l2)
        steam(fr, t, 260, 820, 700, 5, 80)
        fr = punch(fr, l2, 0.22, 0.2)
        label(fr, "BURGER", l2 - 0.05)
        return fr
    items = [(I_LAV, "lavash", "LAVASH"), (I_SHA, "shaurma", "SHAURMA"), (I_PIZ, "pizza", "PIZZA"), (I_HOT, "hotdog", "HOT-DOG"), (I_FRI, "fries", "FRI")]
    for k, (ts, ic, nm) in enumerate(items):
        nxt = items[k + 1][0] if k + 1 < len(items) else I_SHIR
        if ts <= t < nxt:
            l2 = t - ts
            sc = back(clamp(l2 / 0.25), 2.0)
            if ic == "pizza":
                fr = cover("pizza", 0.5, 0.42, 1.05 + 0.12 * l2)
                fr = punch(fr, l2, 0.22, 0.2)
                title(fr, nm, W / 2, 1560, 150, l2 - 0.03, WHT, RED, k + 4)
                return fr
            fr = bg_red(t) if k % 2 == 0 else bg_dark(t)
            if ic in ("lavash", "fries"):
                src, hh = (LAVCUT, 1150) if ic == "lavash" else (FRICUT, 1000)
                lv = src.resize((int(src.width * hh / src.height), hh), Image.LANCZOS)
                shd = Image.new("RGBA", (lv.width + 80, lv.height + 80), (0, 0, 0, 0))
                shd.paste((0, 0, 0, 150), (40, 55), lv.split()[3]); shd = shd.filter(ImageFilter.GaussianBlur(18))
                rr = (-8 if ic == "lavash" else 4) + 3 * math.sin(t * 4)
                put(fr, shd, W / 2 + 20, 830, sc, rr)
                put(fr, lv, W / 2, 800, sc, rr)
                steam(fr, t, 380, 700, 380, 11, 60)
            elif ic == "shaurma":
                put(fr, card("shaurma", 1000, 680, 0.5, 0.5, z=1.0 + 0.05 * l2), W / 2, 840, sc, -2 * math.sin(t * 4))
                steam(fr, t, 260, 820, 640, 13, 40)
            elif ic == "hotdog":
                put(fr, card("hotdog", 1000, 700, 0.5, 0.55, z=1.0 + 0.05 * l2), W / 2, 840, sc, 2 * math.sin(t * 4))
                steam(fr, t, 260, 820, 640, 12, 40)
            else:
                put(fr, icon(ic, 760), W / 2, 860 + 10 * math.sin(t * 6), sc, 6 * math.sin(t * 5 + k))
            title(fr, nm, W / 2, 1500, 150, l2 - 0.03, WHT, BLK if k % 2 == 0 else RED, k + 4)
            return fr
    if t < I_ALL:
        l2 = t - I_SHIR
        fr = cover("crepes", 0.34, 0.6, 1.05 + 0.08 * l2)
        fr = whip(fr, l2, 0.18, -1)
        label(fr, "SHIRINLIKLAR", l2 - 0.05)
        return fr
    l2 = t - I_ALL
    fr = bg_dark(t)
    tiles = [("ph", "roll1"), ("ph", "pizza"), ("ph", "burger"), ("ph", "lavash"), ("logo", None), ("ph", "hotdog"), ("ph", "roll2"), ("ph", "shaurma"), ("ph", "crepes")]
    for j, (kind, nm) in enumerate(tiles):
        cx = 200 + (j % 3) * 340; cy = 360 + (j // 3) * 400
        q = back(clamp((l2 - j * 0.05) / 0.3), 1.8)
        if kind == "ph": put(fr, card(nm, 300, 360), cx, cy, q)
        elif kind == "ic":
            tile = Image.new("RGBA", (330, 390), (0, 0, 0, 0)); td = ImageDraw.Draw(tile)
            td.rounded_rectangle([15, 15, 315, 375], 40, fill=RED if j % 2 else (40, 30, 34), outline=RED, width=6)
            ii = icon(nm, 260); tile.paste(ii, (35, 65), ii)
            put(fr, tile, cx, cy, q)
        else: put(fr, logo_rgba(330), cx, cy, q)
    title(fr, "HAMMASI", W / 2, 1520, 130, l2 - 0.15, WHT, RED, 8)
    title(fr, "BIR JOYDA!", W / 2, 1680, 120, l2 - 0.3, YEL, None, 9, stroke=7)
    return punch(fr, l2, 0.2, 0.12)

def shot_benefits(t, lt):
    if t < ST(4):
        l2 = t - ST(3)
        fr = bg_dark(t)
        put(fr, card("roll4", 860, 900, 0.45, 0.5, z=1.0 + 0.04 * l2), W / 2, 760, 1.0, -2)
        stopwatch(fr, 860, 1180, 150, t)
        title(fr, "TEZKOR", W / 2, 1460, 170, l2, WHT, RED, 11)
        title(fr, "TAYYORLANADI", W / 2, 1640, 100, l2 - 0.2, WHT, None, stroke=7)
        return whip(fr, l2, 0.18, 1)
    if t < ST(5):
        l2 = t - ST(4)
        fr = cover("roll3", 0.62, 0.5, 1.1 + 0.08 * l2)
        d = ImageDraw.Draw(fr)
        q = back(clamp((l2 - 0.1) / 0.3), 2)
        if q > 0:
            r = 130 * q; cx, cy = W / 2, 1180
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(40, 180, 80), outline=WHT, width=10)
            if q > .8: d.line([(cx - 60, cy), (cx - 15, cy + 50), (cx + 70, cy - 55)], fill=WHT, width=24)
        title(fr, "SIFATLI", W / 2, 1460, 170, l2, WHT, RED, 12)
        title(fr, "MAHSULOTLAR", W / 2, 1640, 100, l2 - 0.2, WHT, None, stroke=7)
        return punch(fr, l2)
    l2 = t - ST(5)
    fr = bg_red(t)
    put(fr, card("burger", 760, 900, 0.5, 0.55), W / 2, 760, 1.0, 2)
    c = K(360, 260); c.poly([(60, 20), (340, 20), (340, 240), (60, 240), (10, 130)], fill=YEL, w=8); c.ell(40, 110, 70, 140, fill=OUT, out=None)
    c.text((205, 130), "ARZON", 64, fill=OUT, anchor="mm", black=True)
    put(fr, c.done(), 820, 1180, back(clamp(l2 / 0.3)), -14 + 8 * math.sin(t * 6))
    title(fr, "HAMYONBOP", W / 2, 1460, 132, l2, WHT, BLK, 13)
    title(fr, "NARXLAR", W / 2, 1640, 110, l2 - 0.2, YEL, None, stroke=7)
    return punch(fr, l2)

def shot_try(t, lt):
    seq = ["pizza", "roll1", "hotdog", "burger", "roll2", "crepes"]
    if t < I_TAT2:
        k = int(lt / 0.3) % len(seq)
        l2 = lt % 0.3
        fr = cover(seq[k], 0.5, 0.55, 1.15 + 0.2 * l2)
        if l2 < 0.05: fr = Image.blend(fr, Image.new("RGB", (W, H), WHT), 0.5)
        title(fr, "BIR MARTA", W / 2, 860, 140, lt, WHT, RED, 14)
        title(fr, "TATIB KO'RING", W / 2, 1040, 120, lt - 0.15, WHT, None, stroke=6)
        return fr
    l2 = t - I_TAT2
    fr = cover("roll2", 0.5, 0.5, 1.2 - 0.1 * ss(l2 / 1.5))
    fr = ImageEnhance.Brightness(fr).enhance(0.75)
    d = ImageDraw.Draw(fr)
    q = back(clamp(l2 / 0.35), 2)
    if q > 0:
        cx, cy, s = W / 2, 760, 1.6 * q
        d.polygon([(cx, cy + 110 * s), (cx - 120 * s, cy - 10 * s), (cx - 120 * s, cy - 60 * s), (cx - 70 * s, cy - 100 * s), (cx, cy - 60 * s),
                   (cx + 70 * s, cy - 100 * s), (cx + 120 * s, cy - 60 * s), (cx + 120 * s, cy - 10 * s)], fill=RED, outline=WHT)
    title(fr, "YANA QAYTIB", W / 2, 1220, 130, l2 - 0.1, WHT, RED, 15)
    title(fr, "KELASIZ!", W / 2, 1400, 170, l2 - 0.3, YEL, None, stroke=8)
    return punch(fr, l2)

PH1, PH2 = "+998 90 792 22 99", "+998 94 292 22 99"
def shot_call(t, lt):
    fr = bg_dark(t)
    phone_icon(fr, W / 2, 560, 1.2, lt)
    title(fr, "BUYURTMA UCHUN", W / 2, 900, 100, lt, WHT, RED, 16)
    d = ImageDraw.Draw(fr)
    for k, (num, ts) in enumerate(((PH1, ST(7) + 1.0), (PH2, ST(7) + 1.5))):
        q = back(clamp((t - ts) / 0.3), 1.8)
        if q <= 0: continue
        y = 1160 + k * 200
        d.rounded_rectangle([W / 2 - 450 * q, y - 80, W / 2 + 450 * q, y + 80], 40, fill=WHT)
        if q > .8: d.text((W / 2, y), num, font=font(78, False), fill=BLK, anchor="mm")
    title(fr, "QO'NG'IROQ QILING!", W / 2, 1650, 90, t - wtime(7, "raqamlar"), YEL, None, stroke=6)
    return whip(fr, lt, 0.18, -1)

def shot_end(t, lt):
    fr = bg_dark(t)
    strip = ["roll1", "pizza", "burger", "hotdog", "shaurma", "crepes"]
    off = (t * 140) % 360
    for j in range(8):
        x = -180 + j * 360 - off
        put(fr, card(strip[j % 6], 320, 320), x, 1740, 1.0)
    put(fr, LOGO_BIG, W / 2, 470, 0.72 * back(clamp(lt / 0.4), 1.6) + 0.01 * math.sin(t * 3))
    title(fr, "MAZASI ESDA QOLADI!", W / 2, 860, 90, lt - 0.4, WHT, RED, 17)
    d = ImageDraw.Draw(fr)
    q = eout(clamp((lt - 0.7) / 0.4))
    if q > 0:
        y0 = 980 + (1 - q) * 60
        d.rounded_rectangle([70, y0, W - 70, y0 + 300], 40, fill=WHT)
        d.text((W / 2, y0 + 80), PH1, font=font(70, False), fill=BLK, anchor="mm")
        d.text((W / 2, y0 + 200), PH2, font=font(70, False), fill=BLK, anchor="mm")
        d.rounded_rectangle([70, y0 + 330, W - 70, y0 + 530], 40, fill=RED)
        pinmark(fr, 160, y0 + 430, 0.55)
        d.text((240, y0 + 385), "Xumxona, yo'l bo'yida", font=font(54, False), fill=WHT, anchor="lm")
        d.text((240, y0 + 470), "svetofor oldida", font=font(54, False), fill=YEL, anchor="lm")
    return fr

SHOTS = [(0, shot_hook), (ST(1), shot_logo), (ST(2), shot_list), (ST(3), shot_benefits), (ST(6), shot_try), (ST(7), shot_call), (ST(8), shot_end)]

def frame(fi):
    t = fi / FPS
    st, fn = SHOTS[0]
    for s in SHOTS:
        if t >= s[0] - 0.04: st, fn = s
    fr = fn(t, t - st)
    if fr.mode != "RGB": fr = fr.convert("RGB")
    return finish(fr, t, fi)

if __name__ == "__main__":
    if sys.argv[1] == "stills":
        os.makedirs("stills", exist_ok=True)
        for i, tt in enumerate(sys.argv[2].split(",")): frame(int(float(tt) * FPS)).save(f"stills/{i:02d}.jpg", quality=85)
        sys.exit()
    a, b, out = int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for fi in range(a, min(b, NF)): ff.stdin.write(frame(fi).tobytes())
    ff.stdin.close(); ff.wait(); print("done", out)
