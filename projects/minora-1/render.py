#!/usr/bin/env python3
"""Minorada 7 kun - 1-qism. PIL frames -> ffmpeg rawvideo. 1080x1920, 30fps."""
import math, random, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1080, 1920, 30
DUR = 42.11
NF = int(round(DUR * FPS))
OUT = (30, 18, 38)
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def font(s): return ImageFont.truetype(FB, s)

def clamp(x, a=0, b=1): return max(a, min(b, x))
def ss(x):  # smootherstep
    x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10)
def eout(x): x = clamp(x); return 1 - (1 - x) ** 3
def back(x, s=1.7):
    x = clamp(x); x -= 1; return x * x * ((s + 1) * x + s) + 1

def vgrad(w, h, top, bot):
    t = np.linspace(0, 1, h)[:, None, None]
    a = np.array(top, float)[None, None]; b = np.array(bot, float)[None, None]
    return Image.fromarray(np.repeat((a + (b - a) * t), w, 1).astype(np.uint8))

def pine(d, x, y, h, col, k=1.0):
    w = h * 0.42
    for i in range(4):
        yy = y - h * (0.18 + i * 0.22); ww = w * (1 - i * 0.2)
        d.polygon([(x - ww, yy + h * 0.25), (x + ww, yy + h * 0.25), (x, yy - h * 0.22)], fill=col)
    d.rectangle([x - h * 0.03, y - h * 0.08, x + h * 0.03, y], fill=col)

def forest(d, w, ybase, rows, seed=1):
    rnd = random.Random(seed)
    for (yo, hmin, hmax, col, step) in rows:
        x = -40
        while x < w + 60:
            h = rnd.uniform(hmin, hmax)
            pine(d, x, ybase + yo + rnd.uniform(-10, 10), h, col)
            x += step * rnd.uniform(0.6, 1.1)

# ---------------- character sprites ----------------
_sc = {}
def char(expr="neutral", look=(0, 0), blink=False, pose="down", sweat=False, k=3):
    key = (expr, look, blink, pose, sweat)
    if key in _sc: return _sc[key]
    CW, CH = 500, 740
    im = Image.new("RGBA", (CW * k, CH * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    S = lambda *p: [v * k for v in p]
    lw = 6 * k
    shirt, skin = (44, 62, 118), (246, 206, 168)
    def arm(pts, sleeve=shirt):
        d.line(S(*sum(pts, ())), fill=OUT, width=48 * k, joint="curve")
        d.line(S(*sum(pts, ())), fill=sleeve, width=34 * k, joint="curve")
        hx, hy = pts[-1]
        d.ellipse(S(hx - 24, hy - 24, hx + 24, hy + 24), fill=skin, outline=OUT, width=5 * k)
    def phone(x0, y0):
        d.rounded_rectangle(S(x0, y0, x0 + 92, y0 + 150), 14 * k, fill=(20, 20, 26), outline=OUT, width=5 * k)
        d.rounded_rectangle(S(x0 + 10, y0 + 14, x0 + 82, y0 + 136), 6 * k, fill=(140, 215, 255))
    # back arms
    if pose == "up":
        arm([(135, 480), (70, 400), (78, 300)]); arm([(365, 480), (430, 400), (422, 300)])
    # torso
    d.rounded_rectangle(S(118, 430, 382, 760), 70 * k, fill=shirt, outline=OUT, width=lw)
    org = (242, 122, 30)
    d.polygon(S(140, 448, 236, 440, 236, 760, 140, 760), fill=org, outline=OUT, width=4 * k)
    d.polygon(S(264, 440, 360, 448, 360, 760, 264, 760), fill=org, outline=OUT, width=4 * k)
    for yy in (565, 640):
        d.rectangle(S(142, yy, 234, yy + 20), fill=(225, 230, 236))
        d.rectangle(S(266, yy, 358, yy + 20), fill=(225, 230, 236))
    if pose == "down":
        arm([(132, 480), (105, 580), (100, 660)]); arm([(368, 480), (395, 580), (400, 660)])
    elif pose == "phone":
        arm([(132, 480), (105, 580), (100, 660)])
        phone(250, 455)
        arm([(368, 480), (380, 600), (300, 590)])
    elif pose == "lock":
        arm([(132, 480), (150, 610), (215, 640)]); arm([(368, 480), (350, 610), (285, 640)])
    # head
    d.ellipse(S(78, 255, 116, 325), fill=skin, outline=OUT, width=5 * k)
    d.ellipse(S(384, 255, 422, 325), fill=skin, outline=OUT, width=5 * k)
    d.ellipse(S(92, 128, 408, 428), fill=skin, outline=OUT, width=lw)
    # helmet
    d.pieslice(S(100, 62, 400, 340), 180, 360, fill=(252, 204, 44), outline=OUT, width=lw)
    d.line(S(250, 66, 250, 198), fill=(220, 168, 20), width=14 * k)
    d.rounded_rectangle(S(78, 186, 422, 222), 16 * k, fill=(236, 180, 28), outline=OUT, width=5 * k)
    # eyes
    scared = expr in ("scared", "shock")
    for ex in (192, 308):
        ey = 292
        if blink:
            d.arc(S(ex - 38, ey - 20, ex + 38, ey + 20), 10, 170, fill=OUT, width=6 * k)
            continue
        ry = 54 if scared else 46
        d.ellipse(S(ex - 40, ey - ry, ex + 40, ey + ry), fill=(255, 255, 255), outline=OUT, width=5 * k)
        pr = 9 if scared else 16
        px, py = ex + look[0] * 14, ey + look[1] * 14 + (4 if scared else 0)
        d.ellipse(S(px - pr, py - pr, px + pr, py + pr), fill=OUT)
        d.ellipse(S(px - pr * .35 + 3, py - pr * .7, px + pr * .25 + 3, py - pr * .1), fill=(255, 255, 255))
    # brows
    if expr == "neutral":
        br = [(158, 232, 226, 226), (274, 226, 342, 232)]
    else:
        lift = 14 if scared else 0
        br = [(156, 238 - lift, 226, 216 - lift), (274, 216 - lift, 344, 238 - lift)]
    for b in br: d.line(S(*b), fill=OUT, width=10 * k)
    # mouth
    if expr == "neutral":
        d.arc(S(222, 345, 278, 380), 20, 160, fill=OUT, width=6 * k)
    elif expr == "worried":
        pts = [(214, 375), (230, 364), (246, 375), (262, 364), (278, 375), (288, 368)]
        d.line(S(*sum(pts, ())), fill=OUT, width=6 * k, joint="curve")
    else:
        hh = 62 if expr == "shock" else 46
        d.ellipse(S(216, 348, 284, 348 + hh), fill=(96, 22, 34), outline=OUT, width=5 * k)
        d.ellipse(S(232, 348 + hh * .55, 268, 348 + hh - 4), fill=(226, 96, 110))
    if sweat:
        d.polygon(S(398, 218, 384, 252, 394, 268, 410, 262, 414, 246), fill=(150, 210, 255), outline=OUT, width=4 * k)
    im = im.resize((CW, CH), Image.LANCZOS)
    _sc[key] = im
    return im

def paste_char(fr, spr, cx, footy, scale=1.0, rot=0.0):
    s = spr
    if scale != 1.0:
        s = s.resize((int(s.width * scale), int(s.height * scale)), Image.LANCZOS)
    if rot: s = s.rotate(rot, Image.BICUBIC, expand=True)
    fr.paste(s, (int(cx - s.width / 2), int(footy - s.height)), s)

def blink_at(t, seed=0):
    p = (t + seed * 1.37) % 3.1
    return p < 0.12

# ---------------- static layers (drawn 2x, downscaled) ----------------
def big_tower_bg():
    k = 2; BW, BH = W, 3400
    im = vgrad(BW * k, BH * k, (6, 8, 28), (28, 36, 78)).convert("RGB")
    d = ImageDraw.Draw(im)
    rnd = random.Random(3)
    for _ in range(260):
        x, y = rnd.uniform(0, BW * k), rnd.uniform(0, BH * k * 0.7); r = rnd.uniform(1, 3.2) * k
        c = int(rnd.uniform(150, 255)); d.ellipse([x - r, y - r, x + r, y + r], fill=(c, c, min(255, c + 20)))
    # moon
    mx, my = 800 * k, 420 * k
    for r, a in ((260, 18), (190, 30), (140, 50)):
        d.ellipse([mx - r * k, my - r * k, mx + r * k, my + r * k], fill=(40 + a, 48 + a, 90 + a))
    d.ellipse([mx - 110 * k, my - 110 * k, mx + 110 * k, my + 110 * k], fill=(244, 240, 214))
    d.ellipse([mx - 60 * k, my - 40 * k, mx - 25 * k, my - 5 * k], fill=(222, 216, 186))
    d.ellipse([mx + 20 * k, my + 20 * k, mx + 60 * k, my + 60 * k], fill=(222, 216, 186))
    # far forest
    forest(d, BW * k, 2850 * k, [(0, 260 * k, 380 * k, (18, 30, 48), 70 * k)], seed=5)
    # tower
    cx = 540 * k; yb = 3300 * k; yc = 760 * k; wb = 230 * k; wt = 70 * k
    col = (70, 64, 92); colh = (110, 102, 140)
    segs = 14
    def lx(y, s): return cx + s * (wt + (wb - wt) * (y - yc) / (yb - yc))
    for s in (-1, 1):
        d.line([lx(yb, s), yb, lx(yc, s), yc], fill=OUT, width=26 * k)
        d.line([lx(yb, s), yb, lx(yc, s), yc], fill=colh if s < 0 else col, width=16 * k)
    for i in range(segs):
        y0 = yc + (yb - yc) * i / segs; y1 = yc + (yb - yc) * (i + 1) / segs
        d.line([lx(y0, -1), y0, lx(y1, 1), y1], fill=col, width=7 * k)
        d.line([lx(y0, 1), y0, lx(y1, -1), y1], fill=col, width=7 * k)
        d.line([lx(y1, -1), y1, lx(y1, 1), y1], fill=colh, width=8 * k)
    # cabin
    d.rounded_rectangle([cx - 210 * k, yc - 250 * k, cx + 210 * k, yc + 30 * k], 20 * k, fill=(58, 70, 96), outline=OUT, width=10 * k)
    d.rectangle([cx - 240 * k, yc + 10 * k, cx + 240 * k, yc + 50 * k], fill=(44, 50, 70), outline=OUT, width=8 * k)
    for i in range(4):
        x0 = cx - 185 * k + i * 95 * k
        d.rectangle([x0, yc - 200 * k, x0 + 75 * k, yc - 70 * k], fill=(255, 214, 120), outline=OUT, width=6 * k)
    d.polygon([cx - 230 * k, yc - 250 * k, cx + 230 * k, yc - 250 * k, cx + 150 * k, yc - 300 * k, cx - 150 * k, yc - 300 * k], fill=(44, 50, 70), outline=OUT)
    # antenna
    for i in range(10):
        y0 = 300 * k + i * 46 * k
        d.rectangle([cx - 16 * k, y0, cx + 16 * k, y0 + 46 * k], fill=(220, 50, 50) if i % 2 == 0 else (235, 235, 240), outline=OUT, width=4 * k)
    d.line([cx, 120 * k, cx, 300 * k], fill=(200, 200, 210), width=8 * k)
    # near forest (two rows)
    forest(d, BW * k, 3150 * k, [(0, 300 * k, 460 * k, (12, 22, 34), 80 * k)], seed=8)
    forest(d, BW * k, 3420 * k, [(0, 380 * k, 560 * k, (6, 12, 20), 110 * k)], seed=9)
    im = im.resize((BW, BH), Image.LANCZOS)
    lights = [(540, 120), (540, 300), (540 - 240, 760 + 30), (540 + 240, 760 + 30), (540 - 150, 1700), (540 + 150, 1700)]
    return im, lights

def topdown_bg():
    k = 1; S = 2400
    im = Image.new("RGB", (S, S), (8, 18, 22))
    d = ImageDraw.Draw(im)
    rnd = random.Random(11)
    c = S / 2
    for _ in range(2600):
        a = rnd.uniform(0, 2 * math.pi); r = rnd.uniform(160, S * 0.72)
        x, y = c + r * math.cos(a), c + r * math.sin(a); rr = rnd.uniform(26, 60) * (0.5 + r / S)
        g = rnd.randint(28, 58)
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(10, g, 34 + g // 3), outline=(4, 10, 14), width=3)
    # ground clearing at base
    d.ellipse([c - 150, c - 150, c + 150, c + 150], fill=(40, 34, 30))
    # tower legs converging (perspective downwards)
    for a in (45, 135, 225, 315):
        ra = math.radians(a)
        d.line([c + 900 * math.cos(ra), c + 900 * math.sin(ra), c + 60 * math.cos(ra), c + 60 * math.sin(ra)], fill=(4, 4, 8), width=48)
        d.line([c + 900 * math.cos(ra), c + 900 * math.sin(ra), c + 60 * math.cos(ra), c + 60 * math.sin(ra)], fill=(84, 78, 108), width=30)
    for rr in (700, 480, 320, 210, 140, 95):
        pts = [(c + rr * math.cos(math.radians(a)), c + rr * math.sin(math.radians(a))) for a in (45, 135, 225, 315, 45)]
        d.line(sum(pts, ()), fill=(70, 64, 92), width=max(4, rr // 40))
    return im.filter(ImageFilter.GaussianBlur(1.2))

def cabin_bg():
    k = 2
    im = Image.new("RGB", (W * k, H * k), (24, 44, 58))
    d = ImageDraw.Draw(im)
    S = lambda *p: [v * k for v in p]
    # wall panels
    for i in range(7):
        d.line(S(i * 170, 0, i * 170, 1250), fill=(18, 34, 46), width=6 * k)
    # window
    d.rectangle(S(130, 260, 950, 900), fill=(10, 14, 36), outline=OUT, width=16)
    win = vgrad(820 * k, 640 * k, (8, 10, 34), (30, 40, 84))
    wd = ImageDraw.Draw(win)
    forest(wd, 820 * k, 700 * k, [(0, 200 * k, 320 * k, (10, 20, 30), 70 * k)], seed=21)
    wd.ellipse(S(560, 60, 660, 160), fill=(240, 236, 210))
    im.paste(win, S(130, 260))
    d.rectangle(S(130, 260, 950, 900), outline=OUT, width=16 * k)
    d.line(S(540, 260, 540, 900), fill=OUT, width=14 * k)
    d.line(S(130, 580, 950, 580), fill=OUT, width=10 * k)
    # floor
    d.rectangle(S(0, 1250, 1080, 1920), fill=(36, 30, 40))
    for i in range(12):
        d.line(S(0, 1250 + i * 60, 1080, 1250 + i * 60), fill=(28, 22, 32), width=4 * k)
    # console
    d.rounded_rectangle(S(40, 1120, 1040, 1420), 24 * k, fill=(60, 66, 84), outline=OUT, width=8 * k)
    for i in range(3):
        x0 = 90 + i * 320
        d.rounded_rectangle(S(x0, 1150, x0 + 260, 1290), 12 * k, fill=(14, 30, 26), outline=OUT, width=6 * k)
    # clock
    d.ellipse(S(30, 90, 180, 240), fill=(236, 232, 220), outline=OUT, width=8 * k)
    d.line(S(105, 165, 105, 110), fill=OUT, width=8 * k)
    d.line(S(105, 165, 145, 165), fill=OUT, width=6 * k)
    # door
    d.rectangle(S(960, 380, 1080, 1120), fill=(70, 52, 48), outline=OUT, width=8 * k)
    return im.resize((W, H), Image.LANCZOS)

def chair(d, x, y, s=1.0):
    d.rounded_rectangle([x - 90 * s, y - 330 * s, x + 90 * s, y - 120 * s], 30 * s, fill=(110, 40, 46), outline=OUT, width=7)
    d.rounded_rectangle([x - 110 * s, y - 140 * s, x + 110 * s, y - 90 * s], 18 * s, fill=(130, 48, 54), outline=OUT, width=7)
    d.line([x, y - 90 * s, x, y - 20 * s], fill=OUT, width=14)
    d.line([x - 70 * s, y, x + 70 * s, y], fill=OUT, width=12)

# ---------------- overlays ----------------
def vignette_mask(strength=0.75):
    y, x = np.mgrid[0:H, 0:W]
    r = np.sqrt(((x - W / 2) / (W * 0.62)) ** 2 + ((y - H / 2) / (H * 0.6)) ** 2)
    return (1 - strength * np.clip(r - 0.35, 0, 1) ** 1.4)[..., None].astype(np.float32)
VIG = vignette_mask()

def rain(fr, f, n=240, ang=0.25, col=(160, 180, 220)):
    d = ImageDraw.Draw(fr); rnd = random.Random(f * 7 + 1)
    for _ in range(n):
        x, y = rnd.uniform(-200, W), rnd.uniform(-100, H); L = rnd.uniform(40, 90)
        d.line([x, y, x + L * ang, y + L], fill=col, width=3)

def bolt(fr, x, seed):
    d = ImageDraw.Draw(fr); rnd = random.Random(seed)
    pts = [(x, 0)]; y = 0
    while y < 900:
        y += rnd.uniform(60, 120); x += rnd.uniform(-70, 70); pts.append((x, y))
    d.line(sum(pts, ()), fill=(200, 210, 255), width=14)
    d.line(sum(pts, ()), fill=(255, 255, 255), width=6)

def red_glow(fr, x, y, r, a):
    if a <= 0.02: return
    lay = Image.new("RGBA", (int(r * 2), int(r * 2)), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lay)
    for i in range(6, 0, -1):
        rr = r * i / 6
        ld.ellipse([r - rr, r - rr, r + rr, r + rr], fill=(255, 40, 40, int(a * 255 * (0.12 + 0.88 * (1 - i / 6) ** 2))))
    fr.paste(lay, (int(x - r), int(y - r)), lay)

# ---------------- captions ----------------
CAPS = [
    (0.05, 2.54, "Siz oʻrmon ichidagi televizion minoradasiz."),
    (2.92, 5.25, "Toʻrt tomoningiz faqat qop-qorongʻu daraxtlar."),
    (5.71, 9.07, "Minora shu qadar baland — pastga qarasangiz, boshingiz aylanadi."),
    (9.62, 10.99, "Siz kechki smenadasiz,"),
    (11.33, 13.64, "hamkasbingiz esa smena almashishga kelmadi."),
    (14.34, 16.77, "Birdan telefoningizga SMS keladi:"),
    (23.46, 24.43, "Siz hayronsiz:"),
    (24.63, 25.22, "«Nima boʻldi?"),
    (25.37, 26.50, "Nega aynan 7 kun?»"),
    (26.73, 27.57, "Qoʻllaringiz titraydi."),
    (27.92, 29.40, "Siz minora lyukini qulflaysiz"),
    (29.45, 31.56, "va zaxira ovqatlarni tekshira boshlaysiz."),
    (31.90, 33.92, "Shu payt tashqarida kuchli shamol turadi,"),
    (34.29, 36.37, "yomgʻir minora devorlariga urila boshlaydi."),
]
CF = font(66)
def caption(fr, t, ybase=1480):
    cur = None
    for (a, b, txt) in CAPS:
        if a - 0.05 <= t <= b + 0.30: cur = (a, b, txt)
    if not cur: return
    a, b, txt = cur
    words = txt.split()
    total = sum(len(w) + 1 for w in words)
    starts, acc = [], 0
    for w in words:
        starts.append(a + (b - a) * acc / total); acc += len(w) + 1
    d = ImageDraw.Draw(fr)
    lines, line = [], []
    for i, w in enumerate(words):
        test = " ".join(words[j] for j in line + [i])
        if line and d.textlength(test, font=CF) > 940: lines.append(line); line = [i]
        else: line.append(i)
    lines.append(line)
    y0 = ybase - (len(lines) - 1) * 44
    for li, ln in enumerate(lines):
        widths = [d.textlength(words[i] + " ", font=CF) for i in ln]
        x = W / 2 - sum(widths) / 2
        for i, wd in zip(ln, widths):
            dt = t - starts[i]
            if dt >= 0:
                active = dt < (starts[i + 1] - starts[i] if i + 1 < len(words) else b - starts[i])
                sc = 0.6 + 0.4 * back(dt / 0.14)
                col = (255, 222, 40) if active else (255, 255, 255)
                fs = int(66 * sc)
                ff = font(fs)
                yy = y0 + li * 88 + (66 - fs) * 0.6
                d.text((x + (66 - fs) * 0.15 * len(words[i]) / 2, yy), words[i], font=ff, fill=col, stroke_width=7, stroke_fill=(0, 0, 0))
            x += wd

TF = font(42)
def title_badge(fr, t):
    a = eout(t / 0.5)
    txt = "MINORADA 7 KUN • 1-QISM"
    d = ImageDraw.Draw(fr)
    tw = d.textlength(txt, font=TF)
    y = -80 + 210 * a
    d.rounded_rectangle([W / 2 - tw / 2 - 34, y - 8, W / 2 + tw / 2 + 34, y + 68], 36, fill=(215, 30, 40), outline=(0, 0, 0), width=5)
    d.text((W / 2 - tw / 2, y + 5), txt, font=TF, fill=(255, 255, 255))

# ---------------- scenes ----------------
TOWER, LIGHTS = big_tower_bg()
TOPD = topdown_bg()
CABIN = cabin_bg()

def lights_on(fr, f, offy, scale=1.0, offx=0):
    on = (f // 15) % 2 == 0
    for (x, y) in LIGHTS:
        X = (x - W / 2) * scale + W / 2 + offx; Y = (y - offy) * scale
        if -50 < Y < H + 50:
            ImageDraw.Draw(fr).ellipse([X - 10, Y - 10, X + 10, Y + 10], fill=(255, 70, 60) if on else (120, 20, 20))
            red_glow(fr, X, Y, 70 * scale, 0.85 if on else 0.15)

def s_intro(f, t):
    # tilt up from forest floor to cabin
    p = ss(t / 5.4)
    y0 = (TOWER.height - H) * (1 - p) + 60 * p
    zoom = 1.0 + 0.06 * (1 - p)
    ch = int(H / zoom); cw = int(W / zoom)
    box = (int((W - cw) / 2), int(y0), int((W - cw) / 2) + cw, int(y0) + ch)
    fr = TOWER.crop(box).resize((W, H), Image.BILINEAR)
    lights_on(fr, f, y0, zoom, 0)
    # small character in cabin window when near top
    if p > 0.75:
        spr = char("neutral", (0, 0), blink_at(t))
        paste_char(fr, spr, W / 2 + 60, (760 - 70 - y0) * zoom + 10, 0.24)
    return fr

def s_vertigo(f, t):
    ang = 8 * math.sin(t * 1.1) + t * 6
    z = 1.0 + 0.25 * ss(t / 3.9) + 0.03 * math.sin(t * 5)
    S = TOPD.width; cs = int(1500 / z)
    c = S / 2 + 40 * math.sin(t * 2)
    crop = TOPD.crop((int(c - cs / 2), int(S / 2 - cs * 0.89), int(c + cs / 2), int(S / 2 + cs * 0.89)))
    crop = crop.rotate(ang, Image.BILINEAR)
    fr = crop.resize((W, H), Image.BILINEAR)
    # railing foreground + feet
    d = ImageDraw.Draw(fr)
    d.rectangle([0, 1650, W, 1700], fill=(60, 56, 80), outline=OUT, width=6)
    for x in range(40, W, 140): d.rectangle([x, 1700, x + 24, H], fill=(60, 56, 80), outline=OUT, width=5)
    # swirl lines (dizzy)
    a = 0.5 + 0.5 * math.sin(t * 3)
    for i in range(3):
        r = 180 + i * 90 + 30 * math.sin(t * 4 + i)
        d.arc([W / 2 - r, 960 - r, W / 2 + r, 960 + r], (t * 200 + i * 80) % 360, (t * 200 + i * 80 + 120) % 360, fill=(255, 255, 255), width=5)
    return fr

def s_cabin(f, t):
    z = 1.0 + 0.05 * ss(t / 4.7)
    cw, chh = int(W / z), int(H / z)
    fr = CABIN.crop(((W - cw) // 2, (H - chh) // 2, (W - cw) // 2 + cw, (H - chh) // 2 + chh)).resize((W, H), Image.BILINEAR)
    d = ImageDraw.Draw(fr)
    # blinking console lights
    rnd = random.Random(f // 6)
    for i in range(18):
        x = 80 + (i % 9) * 110; y = 1320 + (i // 9) * 50
        on = rnd.random() > 0.4
        d.ellipse([x, y, x + 24, y + 24], fill=((60, 230, 120) if i % 3 else (255, 70, 60)) if on else (40, 40, 50))
    # screens waveform
    for s in range(3):
        x0 = 95 + s * 320
        pts = [(x0 + j * 8, 1215 + 30 * math.sin(j * 0.5 + t * 6 + s)) for j in range(32)]
        d.line(sum(pts, ()), fill=(90, 255, 160), width=4)
    # empty chair right
    chair(d, 760, 1760, 1.15)
    lt = t + 9.62
    worried = lt > 11.4
    look = (1, 0) if 11.6 < lt < 13.3 else (0, 0)
    spr = char("worried" if worried else "neutral", look, blink_at(t), "down", sweat=worried)
    bob = 6 * math.sin(t * 2.2)
    paste_char(fr, spr, 330, 1830 + bob, 1.3)
    # "?" over empty chair
    if lt > 11.7:
        q = back((lt - 11.7) / 0.35)
        qf = font(int(200 * q) + 1)
        d.text((720, 1170 - 30 * q + 8 * math.sin(t * 4)), "?", font=qf, fill=(255, 222, 40), stroke_width=8, stroke_fill=(0, 0, 0))
    return fr

CAB_DARK = Image.blend(CABIN, Image.new("RGB", (W, H), (0, 0, 0)), 0.55).filter(ImageFilter.GaussianBlur(8))
def s_phone_buzz(f, t):
    fr = CAB_DARK.copy()
    buzz = t > 0.25
    jx = (6 * math.sin(f * 2.7)) if buzz else 0
    expr = "worried" if t > 0.9 else "neutral"
    spr = char(expr, (0, 1) if t > 0.6 else (0, 0), blink_at(t, 2), "phone", sweat=t > 1.5)
    z = 2.05 + 0.15 * ss(t / 3)
    paste_char(fr, spr, W / 2 + jx * 0.3, 2050, z)
    # phone glow + vibration marks
    d = ImageDraw.Draw(fr)
    px, py = W / 2 + (295 - 250) * z, 2050 - (740 - 530) * z
    if buzz and (f // 3) % 2 == 0:
        for s in (-1, 1):
            for i in range(3):
                x = px + s * (130 + i * 30)
                d.line([x, py - 60 + i * 10, x + s * 10, py + 60 - i * 10], fill=(255, 255, 255), width=8)
    return fr

MSG = "SOS. Ogohlantirish: uyda qoling, koʻchaga chiqmang. Qutqaruv guruhi 7 kundan keyin boradi."
def wrap(d, txt, fnt, maxw):
    out, line = [], ""
    for w in txt.split():
        tl = (line + " " + w).strip()
        if d.textlength(tl, font=fnt) > maxw and line: out.append(line); line = w
        else: line = tl
    if line: out.append(line)
    return out

PF = font(50); PH = font(64); PS = font(36)
def s_sms(f, t):
    lt = t + 17.32
    fr = Image.new("RGB", (W, H), (12, 4, 8))
    pulse = 0.5 + 0.5 * math.sin(t * 7)
    red_glow(fr, W / 2, H / 2, 900, 0.35 + 0.25 * pulse)
    sc = 0.85 + 0.15 * eout(t / 0.35) + 0.02 * ss(t / 6)
    pw, ph = int(820 * sc), int(1600 * sc)
    x0, y0 = W / 2 - pw / 2, H / 2 - ph / 2 + 40
    d = ImageDraw.Draw(fr)
    d.rounded_rectangle([x0, y0, x0 + pw, y0 + ph], 90, fill=(16, 16, 20), outline=(0, 0, 0), width=10)
    d.rounded_rectangle([x0 + 30, y0 + 40, x0 + pw - 30, y0 + ph - 40], 66, fill=(236, 238, 244))
    # header
    hc = (220, 30, 40) if (f // 8) % 2 == 0 else (160, 14, 24)
    d.rounded_rectangle([x0 + 30, y0 + 40, x0 + pw - 30, y0 + 300 * sc], 66, fill=hc)
    d.rectangle([x0 + 30, y0 + 200 * sc, x0 + pw - 30, y0 + 300 * sc], fill=hc)
    ht = "⚠ FAVQULODDA"
    tw = d.textlength(ht, font=PH)
    d.text((W / 2 - tw / 2, y0 + 150 * sc), ht, font=PH, fill=(255, 255, 255))
    d.text((x0 + 80, y0 + 330 * sc), "Hozir • Xabar", font=PS, fill=(110, 110, 124))
    # typed message
    a0, a1 = 17.40, 22.90
    n = int(len(MSG) * clamp((lt - a0) / (a1 - a0)))
    lines = wrap(d, MSG, PF, pw - 220)
    shown, rem = [], n
    for ln in lines:
        if rem <= 0: break
        shown.append(ln[:rem]); rem -= len(ln) + 1
    bh = max(1, len(lines)) * 78 + 70
    bx, by = x0 + 70, y0 + 400 * sc
    if n > 0:
        d.rounded_rectangle([bx, by, x0 + pw - 70, by + bh], 40, fill=(255, 255, 255), outline=(200, 200, 210), width=3)
        for i, ln in enumerate(shown):
            col = (200, 20, 30) if i == 0 else (20, 20, 30)
            d.text((bx + 40, by + 35 + i * 78), ln, font=PF, fill=col)
        if (f // 8) % 2 == 0 and n < len(MSG):
            i = len(shown) - 1
            cx = bx + 40 + d.textlength(shown[-1], font=PF)
            d.rectangle([cx + 4, by + 40 + i * 78, cx + 10, by + 100 + i * 78], fill=(20, 20, 30))
    # big "7" stamp at "7 kundan"
    if lt > 21.2:
        q = back((lt - 21.2) / 0.3)
        sf = font(int(300 * q) + 1)
        tw = d.textlength("7", font=sf)
        d.text((W / 2 - tw / 2, y0 + ph - 580 * sc), "7", font=sf, fill=(220, 30, 40), stroke_width=12, stroke_fill=(255, 255, 255))
        kf = font(int(90 * q) + 1); tw = d.textlength("KUN", font=kf)
        d.text((W / 2 - tw / 2, y0 + ph - 230 * sc), "KUN", font=kf, fill=(220, 30, 40))
    return fr

def s_why(f, t):
    lt = t + 23.46
    fr = Image.new("RGB", (W, H), (20, 14, 34))
    d = ImageDraw.Draw(fr)
    # calendar with 7 behind
    cx, cy = W / 2, 620
    d.rounded_rectangle([cx - 300, cy - 300, cx + 300, cy + 300], 40, fill=(238, 234, 226), outline=OUT, width=10)
    d.rounded_rectangle([cx - 300, cy - 300, cx + 300, cy - 160], 40, fill=(200, 30, 40), outline=OUT, width=10)
    d.rectangle([cx - 295, cy - 200, cx + 295, cy - 160], fill=(200, 30, 40))
    sf = font(380); tw = d.textlength("7", font=sf)
    d.text((cx - tw / 2, cy - 200), "7", font=sf, fill=(30, 20, 40))
    for x in (cx - 180, cx + 180):
        d.rounded_rectangle([x - 18, cy - 340, x + 18, cy - 250], 10, fill=(150, 150, 160), outline=OUT, width=6)
    red_glow(fr, cx, cy, 520, 0.25 + 0.15 * math.sin(t * 5))
    # question marks pop on "Nima bo'ldi" / "Nega 7 kun"
    for (ts, x, y, s) in ((24.63, 170, 340, 170), (25.37, 900, 300, 210), (25.9, 210, 900, 140)):
        if lt > ts:
            q = back((lt - ts) / 0.3)
            qf = font(int(s * q) + 1)
            d.text((x, y + 10 * math.sin(t * 4 + x)), "?", font=qf, fill=(255, 222, 40), stroke_width=8, stroke_fill=(0, 0, 0))
    shake = lt > 26.73
    expr = "scared" if lt > 24.6 else "worried"
    spr = char(expr, (0, 0), blink_at(t, 3) and not shake, "up" if shake else "down", sweat=True)
    jx = 9 * math.sin(f * 3.3) if shake else 0
    rot = 2.5 * math.sin(f * 2.1) if shake else 1.5 * math.sin(t * 2)
    paste_char(fr, spr, W / 2 + jx, 1900, 1.55, rot)
    return fr

def s_hatch(f, t):
    lt = t + 27.92
    fr = Image.new("RGB", (W, H), (34, 30, 40))
    d = ImageDraw.Draw(fr)
    for i in range(0, H, 90): d.line([0, i, W, i], fill=(28, 24, 32), width=5)
    cx, cy = W / 2, 820
    d.ellipse([cx - 380, cy - 380, cx + 380, cy + 380], fill=(80, 84, 96), outline=OUT, width=12)
    d.ellipse([cx - 320, cy - 320, cx + 320, cy + 320], fill=(98, 102, 116), outline=OUT, width=8)
    for a in range(0, 360, 30):
        r = math.radians(a); d.ellipse([cx + 350 * math.cos(r) - 12, cy + 350 * math.sin(r) - 12, cx + 350 * math.cos(r) + 12, cy + 350 * math.sin(r) + 12], fill=(60, 62, 70))
    # turning wheel
    rot = 180 * ss((lt - 28.0) / 1.0)
    d.ellipse([cx - 170, cy - 170, cx + 170, cy + 170], outline=(200, 40, 40), width=28)
    for k in range(4):
        r = math.radians(rot + k * 45 * 2)
        d.line([cx - 170 * math.cos(r), cy - 170 * math.sin(r), cx + 170 * math.cos(r), cy + 170 * math.sin(r)], fill=(200, 40, 40), width=24)
    d.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], fill=(160, 30, 30), outline=OUT, width=6)
    # padlock drops in
    lp = back((lt - 28.75) / 0.25)
    ly = cy + 330 - 300 * (1 - lp)
    if lt > 28.6:
        d.arc([cx + 220, ly - 110, cx + 340, ly + 10], 180, 360, fill=(190, 190, 200), width=22)
        d.rounded_rectangle([cx + 200, ly - 40, cx + 360, ly + 110], 18, fill=(240, 190, 40), outline=OUT, width=8)
        d.ellipse([cx + 268, ly + 20, cx + 292, ly + 44], fill=OUT)
    spr = char("worried", (0, 1), blink_at(t, 4), "lock", sweat=True)
    paste_char(fr, spr, W / 2 - 40, 2340, 1.35)
    return fr

def s_food(f, t):
    lt = t + 29.45
    fr = Image.new("RGB", (W, H), (26, 40, 52))
    d = ImageDraw.Draw(fr)
    # shelves
    for row, y in enumerate((520, 860, 1200)):
        d.rectangle([60, y, 1020, y + 30], fill=(110, 74, 50), outline=OUT, width=6)
        rnd = random.Random(row)
        x = 90
        while x < 960:
            kind = rnd.choice(["can", "bottle", "box"])
            appear = 29.55 + (x / 960) * 0.8 + row * 0.25
            if lt > appear:
                q = back((lt - appear) / 0.25); h = 0
                if kind == "can":
                    h = 120 * q
                    d.rounded_rectangle([x, y - h, x + 90, y], 10, fill=(200, 60, 50), outline=OUT, width=5)
                    d.rectangle([x, y - h * 0.65, x + 90, y - h * 0.35], fill=(240, 220, 170))
                elif kind == "bottle":
                    h = 190 * q
                    d.rounded_rectangle([x + 10, y - h, x + 70, y], 16, fill=(120, 190, 240), outline=OUT, width=5)
                    d.rectangle([x + 28, y - h - 20 * q, x + 52, y - h], fill=(40, 100, 200), outline=OUT, width=3)
                else:
                    h = 150 * q
                    d.rectangle([x, y - h, x + 110, y], fill=(220, 170, 90), outline=OUT, width=5)
            x += {"can": 110, "bottle": 90, "box": 130}[kind]
    # big checklist counter
    cnt = min(7, int(clamp((lt - 29.6) / 1.8) * 7) + 1) if lt > 29.6 else 0
    if cnt:
        tf = font(70)
        d.rounded_rectangle([600, 250, 1010, 380], 30, fill=(255, 255, 255), outline=OUT, width=6)
        d.text((640, 275), f"{cnt}/7 kun", font=tf, fill=(200, 30, 40))
    spr = char("worried", (1, -1), blink_at(t, 5), "down", sweat=True)
    paste_char(fr, spr, 260, 2340 + 5 * math.sin(t * 3), 1.4)
    return fr

def s_storm(f, t):
    lt = t + 31.56
    flash = 0
    for ts in (32.05, 34.35, 35.6):
        if 0 <= lt - ts < 0.35: flash = max(flash, 1 - (lt - ts) / 0.35)
    # mid shot of tower cabin
    shx = 10 * math.sin(f * 1.9) * (0.5 + flash); shy = 6 * math.cos(f * 2.3)
    z = 1.55 + 0.08 * ss(t / 5.5)
    cw, ch = int(W / z), int(H / z)
    y0 = 760 - ch * 0.42
    x0 = (W - cw) / 2 + shx
    fr = TOWER.crop((int(x0), int(y0 + shy), int(x0) + cw, int(y0 + shy) + ch)).resize((W, H), Image.BILINEAR)
    # darken + blue tint
    a = np.asarray(fr).astype(np.float32) * np.array([0.55, 0.6, 0.85])
    fr = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    # bending trees in foreground
    d = ImageDraw.Draw(fr)
    bend = 30 * math.sin(t * 3.2) + 40
    for i, x in enumerate(range(-60, W + 120, 170)):
        h = 520 + (i % 3) * 90; b = bend * (1 + 0.2 * (i % 2))
        pts = [(x - 110, H + 20), (x + 110, H + 20), (x + b, H - h)]
        d.polygon(pts, fill=(4, 10, 16))
    lights_on(fr, f, y0, z, -x0 * z + 0)
    if flash > 0:
        if flash > 0.6: bolt(fr, 200 + 600 * ((int(lt * 10)) % 3) / 2, int(lt))
        fr = Image.blend(fr, Image.new("RGB", (W, H), (230, 236, 255)), 0.75 * flash)
    rain(fr, f, 300, 0.45 + 0.15 * math.sin(t * 2))
    return fr

EF = font(118); EF2 = font(58)
def s_end(f, t):
    lt = t + 37.03
    fr = vgrad(W, H, (40, 4, 10), (8, 0, 4)).convert("RGB")
    d0 = ImageDraw.Draw(fr); cx = W / 2
    d0.line([cx, 360, cx, 560], fill=(0, 0, 0), width=14)
    d0.polygon([(cx - 120, 560), (cx + 120, 560), (cx + 90, 700), (cx - 90, 700)], fill=(0, 0, 0))
    for s_ in (-1, 1): d0.line([cx + s_ * 50, 700, cx + s_ * 260, 1040], fill=(0, 0, 0), width=18)
    for i in range(6):
        ya = 700 + i * 57; yb_ = ya + 57
        xa = 50 + 210 * (ya - 700) / 340; xb = 50 + 210 * (yb_ - 700) / 340
        d0.line([cx - xa, ya, cx + xb, yb_], fill=(0, 0, 0), width=7); d0.line([cx + xa, ya, cx - xb, yb_], fill=(0, 0, 0), width=7)
    on = (f // 15) % 2 == 0
    red_glow(fr, W / 2, 360, 120, 0.9 if on else 0.2)
    d = ImageDraw.Draw(fr)
    q = back(t / 0.4)
    for txt, y, fn in (("DAVOMI", 1060, EF), ("2-QISMDA", 1200, EF)):
        ff = font(int(118 * q) + 1); tw = d.textlength(txt, font=ff)
        d.text((W / 2 - tw / 2, y), txt, font=ff, fill=(255, 222, 40), stroke_width=9, stroke_fill=(0, 0, 0))
    if lt > 39.11:
        q2 = back((lt - 39.11) / 0.35)
        bw, bh = 760 * q2, 220 * q2
        d.rounded_rectangle([W / 2 - bw / 2, 1480, W / 2 + bw / 2, 1480 + bh], 40, fill=(255, 255, 255), outline=(0, 0, 0), width=6)
        if q2 > 0.6:
            t1 = "Izohga yozing:"; tw = d.textlength(t1, font=EF2)
            d.text((W / 2 - tw / 2 - 60, 1555), t1, font=EF2, fill=(30, 30, 40))
            pf = font(int(120 + 14 * math.sin(lt * 8)))
            d.text((W / 2 + tw / 2 - 20, 1520), "2", font=pf, fill=(215, 30, 40), stroke_width=4, stroke_fill=(0, 0, 0))
        ay = 1740 + 18 * math.sin(lt * 7)
        d.polygon([(W / 2 - 50, ay), (W / 2 + 50, ay), (W / 2, ay + 70)], fill=(255, 222, 40), outline=(0, 0, 0))
    rain(fr, f, 120, 0.3, (120, 60, 70))
    return fr

SCENES = [
    (0.00, 5.71, s_intro), (5.71, 9.62, s_vertigo), (9.62, 14.34, s_cabin),
    (14.34, 17.32, s_phone_buzz), (17.32, 23.46, s_sms), (23.46, 27.92, s_why),
    (27.92, 29.45, s_hatch), (29.45, 31.90, s_food), (31.90, 37.03, s_storm), (37.03, 99, s_end),
]
NOCAP = (17.2, 23.4)

def frame(f):
    t = f / FPS
    for (a, b, fn) in SCENES:
        if a <= t < b: break
    fr = fn(f, t - a)
    lt = t - a
    # scene-in: white flash on SMS / storm / end, else quick fade from black
    a_in = clamp(1 - lt / 0.17)
    if a_in > 0 and a > 0:
        col = (255, 255, 255) if fn in (s_sms, s_storm) else (0, 0, 0)
        fr = Image.blend(fr, Image.new("RGB", (W, H), col), a_in)
    arr = (np.asarray(fr).astype(np.float32) * VIG)
    fr = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
    if fn is not s_end:
        title_badge(fr, t)
        if not (NOCAP[0] < t < NOCAP[1]): caption(fr, t, 1270 if fn in (s_hatch, s_food) else 1480)
    return fr

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "stills":
        ts = [float(x) for x in sys.argv[2].split(",")]
        for i, tt in enumerate(ts):
            frame(int(tt * FPS)).save(f"stills/s{i:02d}.jpg", quality=88)
        sys.exit()
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "video.mp4"], stdin=subprocess.PIPE)
    for f in range(NF):
        ff.stdin.write(frame(f).tobytes())
        if f % 60 == 0: print(f"{f}/{NF}", flush=True)
    ff.stdin.close(); ff.wait()
    print("done")
