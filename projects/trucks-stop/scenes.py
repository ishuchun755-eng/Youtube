import json, math, random
from functools import lru_cache
from PIL import ImageChops
from lib import *

S = json.load(open("sentences.json"))
VOICE_END = S[-1]["end"]
OUTRO = 9.0
DUR = round(VOICE_END + OUTRO, 2)

def T(frag, k=0):
    hits = [s for s in S if frag in s["text"]]
    return hits[k]["start"]
def E(frag, k=0):
    hits = [s for s in S if frag in s["text"]]
    return hits[k]["end"]

def cam(img, z=1.0, cx=None, cy=None):
    iw, ih = img.size
    cw, ch = W / z * (iw / W if iw < W else 1), H / z * (iw / W if iw < W else 1)
    cw, ch = W / z, H / z
    cx = iw / 2 if cx is None else cx; cy = ih / 2 if cy is None else cy
    x0 = clamp(cx - cw / 2, 0, iw - cw); y0 = clamp(cy - ch / 2, 0, ih - ch)
    return img.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((W, H), Image.BILINEAR)

def push(img, lt, dur, z0=1.0, z1=1.07, cx0=None, cy0=None, cx1=None, cy1=None):
    p = ss(lt / max(dur, 0.1))
    iw, ih = img.size
    cx0 = iw / 2 if cx0 is None else cx0; cy0 = ih / 2 if cy0 is None else cy0
    cx1 = cx0 if cx1 is None else cx1; cy1 = cy0 if cy1 is None else cy1
    return cam(img, lerp(z0, z1, p), lerp(cx0, cx1, p), lerp(cy0, cy1, p))

def pop(t, d=0.3): return back(t / d) if t > 0 else 0

def bubble(fr, txt, x, y, t, size=46, fill=(255, 255, 255), col=OUT):
    if t <= 0: return
    q = pop(t, 0.25)
    d = ImageDraw.Draw(fr); f = font(int(size * q) + 1)
    tw = d.textlength(txt, font=f); h = size * q * 1.6
    d.rounded_rectangle([x - tw / 2 - 26 * q, y - h / 2, x + tw / 2 + 26 * q, y + h / 2], int(24 * q) + 1, fill=fill, outline=OUT, width=5)
    d.polygon([(x - 16 * q, y + h / 2 - 2), (x + 10 * q, y + h / 2 - 2), (x - 24 * q, y + h / 2 + 30 * q)], fill=fill, outline=OUT)
    d.rectangle([x - 14 * q, y + h / 2 - 6, x + 8 * q, y + h / 2 - 1], fill=fill)
    d.text((x, y), txt, font=f, fill=col, anchor="mm")

def label(fr, txt, x, y, size=54, fill=(255, 255, 255), stroke=7, anchor="mm", t=1.0):
    if t <= 0: return
    q = pop(t, 0.25)
    ImageDraw.Draw(fr).text((x, y), txt, font=font(int(size * q) + 1, True), fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=OUT)

def qmark(fr, x, y, t, s=120):
    if t <= 0: return
    q = pop(t, 0.3)
    ImageDraw.Draw(fr).text((x, y + 8 * math.sin(t * 4 + x)), "?", font=font(int(s * q) + 1, True), fill=(255, 214, 40), anchor="mm", stroke_width=8, stroke_fill=OUT)

# ================================================================ backgrounds
@lru_cache(None)
def bg_highway(kind="dawn", w=W * 2):
    c = K(w, H, mode="RGB", img=sky({"dawn": SKY_DAWN, "day": SKY_DAY, "night": SKY_NIGHT}[kind], w * 2, H * 2))
    if kind == "dawn":
        c.ell(w * .3 - 120, 520, w * .3 + 120, 760, fill=(255, 220, 150), out=None)
    if kind == "night":
        rnd = random.Random(4)
        for _ in range(160):
            x, y = rnd.uniform(0, w), rnd.uniform(0, 500); r = rnd.uniform(1, 3)
            c.ell(x - r, y - r, x + r, y + r, fill=(230, 230, 255), out=None)
        c.ell(w * .7, 90, w * .7 + 110, 200, fill=(245, 240, 214), out=None)
    for i in range(6):
        cloud(c, 150 + i * w / 6, 120 + 60 * (i % 2), .9, (255, 236, 220) if kind == "dawn" else (250, 250, 255) if kind == "day" else (60, 70, 110))
    far = {"dawn": (150, 110, 150), "day": (130, 170, 200), "night": (30, 36, 70)}[kind]
    mid = {"dawn": (110, 80, 120), "day": (90, 150, 110), "night": (22, 28, 54)}[kind]
    rnd = random.Random(7); x = 0
    while x < w:
        bw, bh = rnd.uniform(70, 150), rnd.uniform(120, 340)
        building(c, x, 640, bw, bh, far, win=(255, 220, 150) if kind != "day" else (190, 220, 240), lit=.3 if kind != "day" else .9, seed=int(x))
        x += bw + rnd.uniform(10, 60)
    hills(c, 700, mid, 50, 3, w)
    c.rect(0, 690, w, 1080, fill=(70, 74, 86) if kind != "night" else (34, 36, 46), out=None)
    c.rect(0, 690, w, 712, fill=(150, 150, 160) if kind != "night" else (70, 70, 84), out=None)
    c.rect(0, 1040, w, 1080, fill=(120, 160, 90) if kind == "day" else (70, 90, 70), out=None)
    for x in range(0, w, 200):
        c.rect(x, 862, x + 110, 876, fill=(240, 220, 120), out=None)
    return c.done()

def road_scene(fr_bg, scroll, items, kind="dawn"):
    """items: list of (sprite, x_world, lane_y, scale, speedfactor)"""
    bw = fr_bg.width
    off = scroll % (bw - W)
    fr = fr_bg.crop((int(off), 0, int(off) + W, H))
    return fr

@lru_cache(None)
def bg_store(state="full"):
    c = K(W, H, mode="RGB", img=Image.new("RGB", (W * 2, H * 2), (236, 232, 222)))
    c.rect(0, 0, W, 120, fill=(250, 250, 246), out=None)
    for x in range(80, W, 260): c.rect(x, 30, x + 160, 60, fill=(255, 255, 230), out=None)
    c.rect(0, 900, W, H, fill=(200, 196, 186), out=None)
    for x in range(0, W, 120): c.line([(x, 900), (x - 200, H)], (180, 176, 166), 3)
    return c.done()

SHELF_ROWS = (330, 520, 710)
CATS = [("BREAD", (214, 160, 90)), ("MILK", (245, 245, 250)), ("EGGS", (250, 236, 200)), ("CHIPS", (240, 80, 60)), ("CANS", (150, 40, 80))]

def draw_shelves(fr, amount, x0=120, x1=1800, cats=CATS, beets=False, seed=1):
    """amount: dict cat->0..1 remaining"""
    d = ImageDraw.Draw(fr)
    d.rectangle([x0 - 20, 200, x1 + 20, 880], fill=(170, 176, 188), outline=OUT, width=6)
    d.rectangle([x0, 220, x1, 860], fill=(214, 218, 226))
    n = len(cats); cw = (x1 - x0) / n
    rnd = random.Random(seed)
    for ci, (name, col) in enumerate(cats):
        cx0 = x0 + ci * cw
        d.rounded_rectangle([cx0 + cw / 2 - 90, 228, cx0 + cw / 2 + 90, 276], 12, fill=(250, 250, 255), outline=OUT, width=4)
        d.text((cx0 + cw / 2, 252), name, font=font(30, True), fill=OUT, anchor="mm")
        for ry in SHELF_ROWS:
            items = int((cw - 30) // 52)
            for i in range(items):
                k = (ci * 7 + i * 13 + ry) % 97 / 97.0
                if k < amount.get(name, 1):
                    x = cx0 + 16 + i * 52; h = 100 + (i % 3) * 14
                    cc = tuple(int(clamp(v + (k - .5) * 50, 0, 255)) for v in col)
                    d.rounded_rectangle([x, ry - h + 150, x + 44, ry + 150], 8, fill=cc, outline=OUT, width=3)
                    d.rectangle([x + 6, ry - h * .5 + 150, x + 38, ry - h * .5 + 172], fill=(255, 255, 255))
            d.rectangle([x0, ry + 150, x1, ry + 168], fill=(120, 126, 140), outline=OUT, width=3)
    if beets:
        x, y = (x0 + x1) / 2, SHELF_ROWS[1] + 150
        d.rounded_rectangle([x - 34, y - 100, x + 34, y], 8, fill=(150, 30, 80), outline=OUT, width=4)
        d.rectangle([x - 34, y - 70, x + 34, y - 34], fill=(240, 220, 200))
        d.text((x, y - 52), "BEETS", font=font(16, True), fill=(150, 30, 80), anchor="mm")

@lru_cache(None)
def bg_kitchen(night=False):
    c = K(W, H, mode="RGB", img=Image.new("RGB", (W * 2, H * 2), (240, 214, 170) if not night else (90, 80, 90)))
    c.rect(0, 760, W, H, fill=(180, 130, 90), out=None)
    for x in range(0, W, 160): c.line([(x, 760), (x, H)], (160, 110, 76), 4)
    c.rect(1080, 160, 1700, 600, fill=(150, 210, 245) if not night else (30, 40, 80), w=12)
    c.rect(1080, 480, 1700, 600, fill=(110, 170, 110) if not night else (20, 40, 30), out=None)
    for i in range(3): building(c, 1110 + i * 200, 480, 150, 160 + i * 40, (190, 170, 160), lit=.2, seed=i)
    c.rect(1080, 160, 1700, 600, w=12)
    c.line([(1390, 160), (1390, 600)], w=10); c.line([(1080, 380), (1700, 380)], w=8)
    c.rect(0, 700, 1000, 780, fill=(230, 230, 236), w=6)
    c.rect(0, 780, 1000, 1080, fill=(160, 110, 80), w=6)
    for x in (40, 360, 680): c.rect(x, 820, x + 280, 1040, fill=(176, 124, 90), w=5)
    c.rect(120, 560, 260, 700, fill=(60, 60, 70), r=16, w=6)
    c.rect(150, 600, 230, 690, fill=(30, 30, 36), out=None)
    c.rect(400, 140, 760, 330, fill=(250, 250, 250), w=6)
    for i in range(6): c.rect(420 + i * 56, 170, 460 + i * 56, 300, fill=[(220, 80, 60), (250, 190, 60), (90, 160, 220)][i % 3], out=None)
    return c.done()

@lru_cache(None)
def bg_lot():
    c = K(W * 1.4 if False else int(W * 1.4), H, mode="RGB", img=sky(SKY_DAWN, int(W * 1.4) * 2, H * 2))
    w = int(W * 1.4)
    hills(c, 520, (120, 90, 130), 60, 2, w)
    c.rect(0, 520, w, H, fill=(96, 96, 104), out=None)
    for y in (600, 760, 950):
        for x in range(-100, w, 260): c.rect(x, y, x + 12, y + 90, fill=(240, 240, 240), out=None)
    c.rect(120, 200, 140, 560, fill=(80, 80, 90), w=4)
    c.rect(20, 120, 420, 240, fill=(30, 90, 170), r=18, w=6)
    c.text((220, 180), "TRUCK STOP", 56, anchor="mm", black=True)
    base = c.done()
    rnd = random.Random(3)
    cols = [(210, 50, 50), (40, 90, 170), (240, 180, 40), (40, 140, 90), (230, 230, 236), (120, 60, 140)]
    for row, (y, sc) in enumerate(((660, .42), (830, .55), (1060, .72))):
        x = -80 + row * 90
        while x < w:
            tr = truck(cab=rnd.choice(cols), stripe=rnd.choice(cols))
            put(base, tr, x + 1100 * sc / 2, y, sc)
            x += 1100 * sc + 30
    return base

@lru_cache(None)
def bg_tv():
    c = K(W, H, mode="RGB", img=Image.new("RGB", (W * 2, H * 2), (120, 100, 140)))
    c.rect(0, 860, W, H, fill=(110, 80, 60), out=None)
    c.rect(260, 80, 1660, 880, fill=(30, 30, 36), r=30, w=8)
    c.rect(700, 880, 1220, 940, fill=(60, 50, 60), w=6)
    c.rect(1720, 400, 1860, 860, fill=(70, 130, 90), r=40, w=6)
    return c.done()

@lru_cache(None)
def bg_studio():
    c = K(1300, 700, mode="RGB", img=vgrad(2600, 1400, (20, 40, 90), (50, 90, 170)))
    for i in range(8): c.line([(i * 180, 0), (i * 180 - 200, 700)], (60, 100, 180), 10)
    c.rect(0, 520, 1300, 700, fill=(25, 30, 60), out=None)
    return c.done()

@lru_cache(None)
def bg_gas():
    c = K(int(W * 1.6), H, mode="RGB", img=sky(SKY_DAY, int(W * 1.6) * 2, H * 2))
    w = int(W * 1.6)
    for i in range(5): cloud(c, 200 + i * 600, 140 + 40 * (i % 2), 1.0)
    hills(c, 620, (130, 190, 120), 50, 5, w)
    c.rect(0, 640, w, H, fill=(96, 98, 108), out=None)
    for x in range(0, w, 220): c.rect(x, 960, x + 120, 974, fill=(240, 240, 240), out=None)
    gx = w - 1500
    c.rect(gx, 200, gx + 1300, 260, fill=(220, 40, 50), w=6)
    c.text((gx + 650, 230), "GAS  •  FOOD  •  DIESEL", 40, anchor="mm", black=True)
    for x in (gx + 80, gx + 1180): c.rect(x, 260, x + 40, 700, fill=(230, 230, 236), w=5)
    c.rect(gx + 1315, 300, gx + 1345, 700, fill=(80, 80, 90), w=4)
    c.rect(gx + 1195, 80, gx + 1465, 360, fill=(250, 250, 250), r=16, w=6)
    c.text((gx + 1330, 130), "REGULAR", 30, fill=OUT, anchor="mm", black=True)
    for i in range(3):
        x = gx + 260 + i * 360
        c.rect(x, 440, x + 150, 720, fill=(240, 240, 244), r=14, w=6)
        c.rect(x + 20, 470, x + 130, 540, fill=(40, 60, 50), out=None)
        c.rect(x - 20, 712, x + 170, 740, fill=(150, 150, 160), w=4)
    return c.done()

@lru_cache(None)
def bg_hospital(red=False):
    c = K(W, H, mode="RGB", img=Image.new("RGB", (W * 2, H * 2), (214, 236, 236) if not red else (70, 50, 70)))
    c.rect(0, 860, W, H, fill=(180, 200, 204) if not red else (50, 40, 54), out=None)
    for x in range(0, W, 140): c.line([(x, 860), (x - 120, H)], (160, 186, 190) if not red else (60, 50, 64), 3)
    return c.done()

@lru_cache(None)
def bg_street(gray=False, trash=False):
    c = K(int(W * 1.3), H, mode="RGB", img=sky(SKY_GRAY if gray else SKY_DAY, int(W * 1.3) * 2, H * 2))
    w = int(W * 1.3)
    rnd = random.Random(9)
    cols = [(220, 120, 100), (120, 170, 210), (240, 210, 120), (150, 200, 150), (200, 160, 210)]
    for i in range(5):
        x = 40 + i * 500; col = cols[i]
        if gray: col = tuple(int(v * .6 + 150 * .4) for v in col)
        c.rect(x, 360, x + 400, 760, fill=col, w=6)
        c.poly([(x - 30, 370), (x + 200, 200), (x + 430, 370)], fill=tuple(int(v * .7) for v in col), w=6)
        c.rect(x + 160, 580, x + 240, 760, fill=(120, 80, 60), w=5)
        for wx in (x + 40, x + 290): c.rect(wx, 450, wx + 80, 540, fill=(200, 230, 250) if not gray else (150, 160, 170), w=5)
    c.rect(0, 760, w, 820, fill=(200, 200, 196), out=None)
    c.rect(0, 820, w, H, fill=(90, 92, 100), out=None)
    c.rect(0, 812, w, 826, fill=(160, 160, 160), out=None)
    for x in range(0, w, 260): c.rect(x, 960, x + 140, 972, fill=(230, 230, 230), out=None)
    return c.done()

@lru_cache(None)
def bg_plain(col=(240, 236, 226), grid=True):
    c = K(W, H, mode="RGB", img=Image.new("RGB", (W * 2, H * 2), col))
    if grid:
        g = tuple(int(v * .94) for v in col)
        for x in range(0, W, 60): c.line([(x, 0), (x, H)], g, 2)
        for y in range(0, H, 60): c.line([(0, y), (W, y)], g, 2)
    return c.done()

@lru_cache(None)
def bg_factory():
    c = K(W, H, mode="RGB", img=sky(SKY_GRAY, W * 2, H * 2))
    hills(c, 700, (120, 130, 120), 40, 6)
    c.rect(0, 740, W, H, fill=(110, 110, 116), out=None)
    for i, x in enumerate((300, 520, 740)):
        c.rect(x, 200 + i * 30, x + 90, 520, fill=(150, 90, 80), w=6)
        c.rect(x, 230 + i * 30, x + 90, 260 + i * 30, fill=(240, 240, 240), out=None)
    c.rect(150, 480, 1300, 760, fill=(170, 170, 176), w=6)
    for x in range(150, 1300, 190): c.poly([(x, 480), (x + 95, 400), (x + 190, 480)], fill=(150, 150, 158), w=5)
    for x in range(210, 1260, 160): c.rect(x, 560, x + 100, 640, fill=(90, 110, 130), w=5)
    c.rect(560, 640, 760, 760, fill=(90, 90, 100), w=5)
    c.text((725, 520), "PLANT 7", 60, fill=OUT, anchor="mm", black=True)
    return c.done()

@lru_cache(None)
def bg_farm():
    c = K(W, H, mode="RGB", img=sky(SKY_DAY, W * 2, H * 2))
    hills(c, 560, (140, 200, 120), 60, 8)
    c.rect(0, 600, W, H, fill=(150, 200, 110), out=None)
    c.rect(1200, 260, 1700, 640, fill=(190, 50, 50), w=6)
    c.poly([(1170, 270), (1450, 120), (1730, 270)], fill=(150, 36, 36), w=6)
    c.rect(1380, 440, 1520, 640, fill=(240, 240, 240), w=6)
    c.line([(1380, 440), (1520, 640)], w=6); c.line([(1520, 440), (1380, 640)], w=6)
    for x in range(0, 1150, 120): c.rect(x, 640, x + 16, 760, fill=(240, 240, 240), w=3)
    c.rect(0, 670, 1150, 690, fill=(240, 240, 240), w=3)
    c.rect(300, 820, 900, 900, fill=(120, 90, 60), w=6)
    return c.done()

def cow(fr, x, y, s=1.0, t=0, flip=False):
    c = K(360, 260)
    c.rect(40, 60, 300, 190, fill=(250, 250, 250), r=50, w=6)
    for bx, by in ((90, 80), (190, 120), (240, 70)): c.ell(bx, by, bx + 60, by + 46, fill=(40, 40, 46), out=None)
    for lx in (70, 120, 220, 270): c.rect(lx, 170, lx + 26, 250, fill=(250, 250, 250), w=5)
    c.ell(270, 30, 360, 130, fill=(250, 250, 250), w=6)
    c.ell(300, 90, 362, 132, fill=(250, 180, 190), w=5)
    c.ell(300, 60, 316, 76, fill=OUT, out=None)
    c.line([(285, 34), (270, 4)], w=8); c.line([(330, 34), (345, 4)], w=8)
    im = c.done()
    put(fr, im, x, y, s * (1 + 0.01 * math.sin(t * 3)), flip=flip)

def chicken(fr, x, y, s=1.0, t=0):
    c = K(160, 160)
    c.ell(20, 50, 130, 140, fill=(255, 255, 255), w=5)
    c.ell(80, 10, 140, 70, fill=(255, 255, 255), w=5)
    c.poly([(138, 36), (158, 44), (138, 52)], fill=(250, 170, 40), w=3)
    c.ell(100, 0, 124, 20, fill=(230, 40, 40), out=None)
    c.ell(110, 30, 120, 40, fill=OUT, out=None)
    c.line([(60, 140), (56, 160)], (250, 170, 40), 5); c.line([(90, 140), (94, 160)], (250, 170, 40), 5)
    put(fr, c.done(), x, y - abs(math.sin(t * 6 + x)) * 10, s)

# ================================================================ scenes
def sc_intro(t, lt, f):
    bg = bg_highway("dawn")
    stopT = E("At six A.M. on a Monday") - 0.2
    v0 = 900.0
    tt = min(t, stopT)
    scroll = v0 * (tt - tt * tt / (2 * stopT)) if tt > 0 else 0
    fr = bg.crop((int(scroll * 0.25) % (bg.width - W), 0, int(scroll * 0.25) % (bg.width - W) + W, H))
    d = ImageDraw.Draw(fr)
    for x in range(-int(scroll) % 200 - 200, W, 200): d.rectangle([x, 862, x + 110, 876], fill=(240, 220, 120))
    stopped = t > stopT
    trucks = [((210, 50, 50), 160, 880, .52), ((40, 90, 170), 900, 880, .52), ((240, 180, 40), 1500, 880, .52),
              ((230, 230, 236), 420, 1060, .62), ((40, 140, 90), 1250, 1060, .62)]
    for i, (col, x, y, sc) in enumerate(trucks):
        bob = 0 if stopped else 2 * math.sin(f * 1.3 + i)
        jolt = 0
        if 0 < t - stopT < 0.4: jolt = -14 * math.sin((t - stopT) / 0.4 * math.pi) * (1 - (t - stopT) / 0.4)
        put(fr, truck(cab=col, stripe=col, lights=not stopped or t < T("Not one engine")), x, y + bob, sc, rot=jolt * 0.1)
        if not stopped:
            for k in range(3):
                pf = (f * 0.07 + k / 3) % 1
                r = 10 + 30 * pf
                glow(fr, x - 280 * sc - pf * 200, y - 120 * sc - pf * 40, r, (200, 200, 210), 0.5 * (1 - pf))
    label(fr, "6:00 AM", 1700, 120, 64, t=t - 0.1)
    label(fr, "MONDAY", 1700, 190, 40, fill=(255, 214, 40), t=t - 0.3)
    if t > T("Not one engine"):
        for i, (col, x, y, sc) in enumerate(trucks[:3]):
            if (f // 8 + i) % 3 == 0: label(fr, "click", x + 320 * sc, y - 380 * sc, 34, t=1)
    if t > T("Nobody knows why"):
        for i, (col, x, y, sc) in enumerate(trucks):
            qmark(fr, x + 300 * sc, y - 480 * sc, t - T("Nobody knows why") - i * 0.1, 90)
    return fr

def sc_friday(t, lt, f):
    fr = bg_store().copy()
    draw_shelves(fr, {"BREAD": 0, "MILK": .3, "EGGS": .2, "CHIPS": .4, "CANS": .5})
    fr = push(fr, lt, 3.5, 1.0, 1.08, 600, 560)
    put(fr, person("hero", "sad", blink_at(t), pose="hold"), 1300, 1120, 1.05)
    stamp(fr, "FRIDAY", 500, 160, lt - 0.2, 80, (220, 40, 50), -6)
    return fr

def sc_title0(t, lt, f):
    fr = vgrad(W, H, (40, 6, 12), (6, 0, 4))
    d = ImageDraw.Draw(fr)
    q = pop(lt, 0.35)
    gx = 14 * math.sin(f * 7) if (f % 9) < 2 else 0
    for dx, col in ((-8 + gx, (0, 200, 255)), (8 - gx, (255, 40, 60)), (0, (255, 255, 255))):
        d.text((W / 2 + dx, 470), "DAY 0", font=font(int(280 * q) + 1, True), fill=col, anchor="mm")
    sil = truck(cab=(0, 0, 0), trailer=(0, 0, 0), stripe=(0, 0, 0))
    put(fr, sil, W / 2, 1000, 0.55)
    label(fr, "WHEN THE TRUCKS STOP", W / 2, 690, 54, fill=(255, 214, 40), t=lt - 0.3)
    return fr

def sc_drive(t, lt, f):
    bg = bg_highway("day")
    scroll = 1200 * lt
    off = int(scroll * 0.3) % (bg.width - W)
    fr = bg.crop((off, 0, off + W, H))
    d = ImageDraw.Draw(fr)
    for x in range(-int(scroll) % 200 - 200, W, 200): d.rectangle([x, 862, x + 110, 876], fill=(240, 220, 120))
    tx = 1500 - 160 * lt
    put(fr, truck(cab=(40, 90, 170), stripe=(240, 180, 40), logo=""), tx, 880 + 2 * math.sin(f), .62)
    cx = 300 + 80 * lt
    put(fr, car((240, 120, 40)), cx, 1050 + 2 * math.sin(f * 1.7), 1.0)
    head = person("hero", "neutral" if lt < 2 else "happy", blink_at(t)).crop((60, 30, 440, 470))
    put(fr, head, cx + 30, 1050 - 150, 0.32)
    put(fr, car((240, 120, 40)).crop((0, 0, 520, 150)), cx, 1050 - 90, 1.0)
    if (f // 4) % 2 == 0 and tx > cx:
        for i in range(3): d.line([(tx + 380, 680 + i * 30), (tx + 440, 670 + i * 34)], fill=(255, 255, 255), width=6)
    label(fr, "BIG. LOUD. EVERYWHERE.", W / 2, 140, 60, t=t - T("They're just the big"))
    return fr

def sc_share(t, lt, f):
    fr = bg_plain((236, 244, 250)).copy()
    d = ImageDraw.Draw(fr)
    t0 = T("Almost three quarters")
    label(fr, "U.S. FREIGHT, BY WEIGHT", 520, 150, 52, t=t - t0)
    for i in range(4):
        x = 140 + i * 200; y = 260
        d.rounded_rectangle([x, y, x + 170, y + 170], 24, fill=(250, 250, 255), outline=OUT, width=6)
        if i < 3 and t > t0 + 0.4 + i * 0.35:
            q = pop(t - t0 - 0.4 - i * 0.35)
            put(fr, truck(cab=(220, 50, 50), stripe=(60, 120, 200)), x + 85, y + 125, 0.14 * q)
    if t > t0 + 1.6:
        label(fr, "~72%", 520, 560, 150, fill=(220, 50, 50), t=t - t0 - 1.6)
        label(fr, "rides on a truck", 520, 680, 50, t=t - t0 - 1.8)
    tc = (1060, 330, 1800, 760)
    if t > T("Your food") - 0.6:
        d.rounded_rectangle(tc, 20, fill=(250, 250, 255), outline=OUT, width=8)
        d.rectangle([tc[0], tc[3] - 70, tc[2], tc[3] - 40], fill=(60, 120, 200))
        for x in (1150, 1260, 1600, 1710): d.ellipse([x - 50, 730, x + 50, 830], fill=(36, 36, 40), outline=OUT, width=5)
    items = [("Your food", "FOOD", (230, 160, 70)), ("Your medicine", "MEDS", (240, 240, 250)),
             ("Your gas", "GAS", (220, 50, 50)), ("The toilet paper", "TP", (250, 250, 250))]
    for i, (frag, name, col) in enumerate(items):
        ts = T(frag)
        if t > ts:
            p = eout((t - ts) / 0.45)
            sx, sy = 1430, 120; ex, ey = 1170 + i * 160, 560
            x = lerp(sx, ex, p); y = lerp(sy, ey, p) - 140 * math.sin(p * math.pi)
            if name == "TP":
                d.ellipse([x - 55, y - 70, x + 55, y + 70], fill=col, outline=OUT, width=5); d.ellipse([x - 18, y - 22, x + 18, y + 22], fill=(200, 200, 200), outline=OUT, width=4)
            else:
                d.rounded_rectangle([x - 60, y - 70, x + 60, y + 70], 14, fill=col, outline=OUT, width=5)
                d.text((x, y), name, font=font(34, True), fill=OUT, anchor="mm")
    if t > T("At some point, every one"):
        label(fr, "EVERYTHING. ON A TRAILER.", 1430, 900, 58, fill=(255, 214, 40), t=t - T("At some point, every one"))
    return fr

def sc_parked(t, lt, f):
    bg = bg_lot()
    fr = push(bg, lt, E("And today, all of them") - T("And today, all of them") + 0.6, 1.0, 1.05, W * .55, H / 2, W * .8, H / 2)
    d = ImageDraw.Draw(fr)
    for i in range(3):
        bx = (lt * 120 + i * 300) % (W + 200) - 100; by = 200 + 40 * i + 10 * math.sin(lt * 3 + i)
        d.line([(bx - 18, by), (bx, by + 10), (bx + 18, by)], fill=OUT, width=5)
    label(fr, "PARKED.", W / 2, 120, 90, t=lt - 0.4)
    return fr

def phone_ui(fr, x, y, s, lines, t, title="", shake=0, header=(30, 30, 40)):
    d = ImageDraw.Draw(fr)
    w, h = 420 * s, 820 * s
    x += shake
    d.rounded_rectangle([x - w / 2, y - h / 2, x + w / 2, y + h / 2], int(60 * s), fill=(20, 20, 26), outline=OUT, width=6)
    d.rounded_rectangle([x - w / 2 + 18 * s, y - h / 2 + 30 * s, x + w / 2 - 18 * s, y + h / 2 - 30 * s], int(40 * s), fill=(246, 246, 250))
    d.rounded_rectangle([x - w / 2 + 18 * s, y - h / 2 + 30 * s, x + w / 2 - 18 * s, y - h / 2 + 130 * s], int(40 * s), fill=header)
    d.rectangle([x - w / 2 + 18 * s, y - h / 2 + 90 * s, x + w / 2 - 18 * s, y - h / 2 + 130 * s], fill=header)
    if title: d.text((x, y - h / 2 + 82 * s), title, font=font(int(30 * s), True), fill=(255, 255, 255), anchor="mm")
    yy = y - h / 2 + 160 * s
    for (ts, who, txt, col) in lines:
        if t < ts: continue
        q = pop(t - ts, 0.25)
        bh = 150 * s
        d.rounded_rectangle([x - w / 2 + 34 * s, yy, x + w / 2 - 34 * s, yy + bh * q], int(20 * s), fill=(255, 255, 255), outline=(200, 200, 214), width=3)
        if q > .7:
            d.text((x - w / 2 + 56 * s, yy + 18 * s), who, font=font(int(22 * s), True), fill=(90, 110, 160))
            words = txt.split(); ln = ""; ly = yy + 54 * s
            for wd in words:
                if d.textlength(ln + " " + wd, font=font(int(26 * s))) > w - 120 * s:
                    d.text((x - w / 2 + 56 * s, ly), ln.strip(), font=font(int(26 * s)), fill=col); ly += 34 * s; ln = wd
                else: ln += " " + wd
            d.text((x - w / 2 + 56 * s, ly), ln.strip(), font=font(int(26 * s)), fill=col)
        yy += bh + 20 * s

def sc_kitchen(t, lt, f):
    fr = push(bg_kitchen(), lt, 8, 1.0, 1.06, 700, 600)
    tp = T("You wake up") + 1.4
    pose = "coffee" if t < tp else "phone"
    expr = "happy" if t < tp else "neutral"
    put(fr, person("hero", expr, (1, 1) if pose == "phone" else (0, 0), blink_at(t), pose=pose), 620, 1110 + 4 * math.sin(t * 2), 1.08)
    if pose == "coffee":
        for i in range(3):
            p = (lt * 0.6 + i / 3) % 1
            ImageDraw.Draw(fr).arc([700 + 10 * math.sin(p * 6), 620 - p * 120, 740, 660 - p * 120], 90, 270, fill=(255, 255, 255), width=4)
    ta = T("A few posts say")
    if t > ta - 0.3:
        lines = [(ta, "@jenny_ohio", "anyone else notice the highway is totally EMPTY??", OUT),
                 (T("Someone jokes"), "@big_dave77", "lol feels like a holiday. day off for everybody", OUT)]
        sl = eout((t - ta + 0.3) / 0.4)
        phone_ui(fr, lerp(2300, 1420, sl), 560, 1.15, lines, t, "FEED")
    return fr

def sc_drivers(t, lt, f):
    if t > T("But you don't know") - 0.1:
        fr = push(bg_kitchen(), t - T("But you don't know"), 3, 1.08, 1.12, 700, 600)
        put(fr, person("hero", "happy", (0, 0), blink_at(t), pose="coffee"), 620, 1110, 1.08)
        bubble(fr, "la la la", 820, 330, t - T("But you don't know"))
        return fr
    bg = bg_lot()
    fr = cam(bg, 1.0, W * .9, H / 2)
    d = ImageDraw.Draw(fr)
    d.rectangle([0, 0, W, H], fill=None)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 120)); fr.paste(ov, (0, 0), ov)
    c = K(900, 760)
    c.rect(40, 40, 860, 740, fill=(200, 50, 50), r=40, w=8)
    c.rect(110, 110, 790, 520, fill=(170, 220, 250), r=20, w=8)
    fr2 = c.done()
    put(fr, fr2, 760, 1000, 1.0)
    dv = person("trucker", "annoyed", (0, 0), blink_at(t, 3), hat="cap", skin=2, pose="down")
    crop = dv.crop((0, 0, 500, 560))
    put(fr, crop, 760, 760, 0.8)
    win = K(900, 760); win.rect(110, 110, 790, 520, fill=None, w=8); put(fr, win.done(), 760, 1000, 1.0)
    if (f // 10) % 3 == 0: label(fr, "click... click...", 760, 860, 46, t=1)
    t1 = T("Millions of truck drivers")
    label(fr, "MILLIONS OF DRIVERS", 1480, 300, 60, fill=(255, 214, 40), t=t - t1)
    ts = t1 + 2.6
    if t > ts:
        y = 620; d = ImageDraw.Draw(fr)
        p = eout((t - ts) / 1.6)
        d.line([(1220, y), (lerp(1220, 1820, p), y)], fill=(255, 255, 255), width=10)
        for i, nm in enumerate(("CA", "TX", "OH", "ME")):
            if p > i / 3 - 0.01:
                x = 1220 + i * 200; d.ellipse([x - 22, y - 22, x + 22, y + 22], fill=(220, 50, 50), outline=OUT, width=5)
                d.text((x, y + 56), nm, font=font(40, True), fill=(255, 255, 255), anchor="mm", stroke_width=5, stroke_fill=OUT)
    return fr

def sc_news(t, lt, f):
    if t > T("And that's when people start") - 0.1:
        return sc_rush(t, t - T("And that's when people start"), f)
    fr = bg_tv().copy()
    st = bg_studio().copy()
    put(st, person("anchor", "worried" if t > T("Nationwide") else "neutral", (0, 0), blink_at(t), skin=1, hair=2, shirt=(50, 60, 90)), 650, 980, 0.85)
    d = ImageDraw.Draw(st)
    d.rectangle([0, 540, 1300, 640], fill=(200, 30, 40))
    d.rectangle([0, 540, 300, 640], fill=(255, 255, 255))
    d.text((150, 590), "BREAKING", font=font(44, True), fill=(200, 30, 40), anchor="mm")
    if t > T("Nationwide"):
        n = int(len("NATIONWIDE TRUCKING SHUTDOWN") * clamp((t - T("Nationwide")) / 1.2))
        d.text((330, 590), "NATIONWIDE TRUCKING SHUTDOWN"[:n], font=font(44, True), fill=(255, 255, 255), anchor="lm")
    else:
        d.text((330, 590), "LIVE", font=font(44, True), fill=(255, 255, 255), anchor="lm")
    if t > T("No explanation"):
        d.rectangle([330, 640, 830, 690], fill=(20, 20, 30)); d.text((350, 665), "CAUSE: UNKNOWN", font=font(32, True), fill=(255, 214, 40), anchor="lm")
    fr.paste(st, (310, 130))
    fr = push(fr, lt, 6, 1.0, 1.1, W / 2, 480)
    return fr

def sc_rush(t, lt, f):
    fr = push(bg_store(), lt, 6, 1.0, 1.04)
    draw_shelves(fr, {"BREAD": .9, "MILK": .9, "EGGS": .9, "CHIPS": .9, "CANS": .9})
    rnd = random.Random(5)
    for i in range(7):
        sp = rnd.uniform(380, 620) * (1.6 if t > T("They go shopping") else 1.0)
        x = (lt * sp + i * 330) % (W + 600) - 300
        p = person("person", rnd.choice(["shock", "scared", "worried"]), (1, 0), False, pose="push",
                   skin=rnd.randrange(4), hair=rnd.randrange(5), shirt=rnd.choice([(240, 180, 40), (90, 150, 220), (200, 70, 90), (90, 170, 110)]))
        y = 1080 + 6 * abs(math.sin(lt * 9 + i))
        put(fr, p, x, y, 0.6)
        d = ImageDraw.Draw(fr)
        cx = x + 160
        d.rectangle([cx - 20, y - 330, cx + 140, y - 210], outline=(150, 150, 160), width=8)
        for k in range(1, 4): d.line([(cx - 20 + k * 40, y - 330), (cx - 20 + k * 40, y - 210)], fill=(150, 150, 160), width=4)
        d.ellipse([cx - 10, y - 210, cx + 20, y - 180], fill=OUT); d.ellipse([cx + 100, y - 210, cx + 130, y - 180], fill=OUT)
    if t > T("They go shopping"):
        label(fr, "PANIC BUYING", W / 2, 130, 90, fill=(255, 214, 40), t=t - T("They go shopping"))
    return fr

def sc_gas(t, lt, f):
    bg = bg_gas()
    pan = ss(lt / 6.0)
    fr = cam(bg, 1.0, lerp(W / 2 + 200, bg.width - W / 2, pan), H / 2)
    ox = lerp(W / 2 + 200, bg.width - W / 2, pan) - W / 2
    d = ImageDraw.Draw(fr)
    t_line = T("By evening, the lines")
    gx = bg.width - 1500 - ox
    cols = [(90, 140, 220), (220, 70, 60), (240, 200, 60), (100, 180, 120), (180, 180, 190)]
    if t > t_line - 0.3:
        for i in range(3): put(fr, car(cols[(i + 2) % 5]), gx + 200 + i * 360, 790, 0.62)
        for i in range(14):
            x = gx + 1100 - i * 300 - 40 * clamp((t - t_line) / 3)
            put(fr, car(cols[i % 5]), x, 1010 + 2 * math.sin(f * .3 + i), 0.62)
    bags = t > T("Pump handles")
    for i in range(3):
        x = gx + 260 + i * 360
        if bags:
            d.ellipse([x + 110, 520, x + 200, 640], fill=(250, 250, 250), outline=OUT, width=4)
            d.line([(x + 150, 520), (x + 160, 500)], fill=OUT, width=4)
        else:
            d.rectangle([x + 150, 560, x + 175, 640], fill=(50, 50, 56))
    sx = gx + 1330
    d.rectangle([sx - 120, 170, sx + 120, 340], fill=(250, 250, 250))
    if t > T("Signs go up") + 0.3:
        stamp(fr, "NO GAS", sx, 220, t - T("Signs go up") - 0.3, 46, (220, 40, 50), 0)
        stamp(fr, "SORRY", sx, 300, t - T("Sorry") , 40, (220, 40, 50), 0)
    else:
        price = 3.49 + 2.5 * clamp((t - T("Day one")) / 12)
        d.text((sx, 255), f"${price:.2f}", font=font(64, True), fill=(220, 40, 50), anchor="mm")
    if t > T("You fill up") - 0.1:
        put(fr, person("hero", "worried", (1, 0), blink_at(t), pose="nozzle", sweat=True), gx + 1010, 1000, 0.62)
    if t > T("So does everyone else"):
        for i in range(3):
            put(fr, person("person", "worried", (1, 0), False, pose="box", skin=i, hair=i + 1, shirt=[(200, 70, 90), (90, 150, 220), (240, 180, 40)][i]),
                gx + 300 + i * 220 + 30 * math.sin(lt * 3 + i), 1060, 0.5)
    return fr

def sc_hospital(t, lt, f):
    fr = push(bg_hospital(), lt, 20, 1.0, 1.06)
    d = ImageDraw.Draw(fr)
    t0 = T("Day two")
    names = ["GLOVES", "SYRINGES", "IV BAGS", "MEDS"]
    d.rectangle([140, 160, 1180, 860], fill=(200, 210, 214), outline=OUT, width=6)
    left = 1 - clamp((t - T("Without trucks, hospitals")) / 6)
    for r in range(4):
        y = 200 + r * 165
        d.rectangle([140, y + 140, 1180, y + 155], fill=(140, 150, 160), outline=OUT, width=3)
        d.text((170, y + 20), names[r], font=font(30, True), fill=OUT)
        for i in range(8):
            k = ((i * 5 + r * 3) % 8) / 8
            if k < left:
                x = 170 + i * 124
                d.rectangle([x, y + 60, x + 108, y + 140], fill=(250, 250, 250) if r != 1 else (190, 220, 250), outline=OUT, width=4)
                d.rectangle([x + 30, y + 90, x + 78, y + 110], fill=(90, 160, 220))
    put(fr, person("nurse", "worried" if left < .8 else "neutral", (-1, 0), blink_at(t), hat="nurse", skin=1, hair=1, shirt=(110, 190, 200), pose="clipboard"), 1520, 1110, 1.0)
    if t > T("Nurses start counting"):
        n = max(1, 12 - int((t - T("Nurses start counting")) * 4))
        bubble(fr, f"{n}... ", 1620, 280, t - T("Nurses start counting"), 60)
    if t > T("Surgeries that can wait"):
        d.rounded_rectangle([1300, 160, 1840, 400], 18, fill=(250, 250, 250), outline=OUT, width=6)
        d.text((1570, 200), "SURGERY SCHEDULE", font=font(30, True), fill=OUT, anchor="mm")
        for i in range(3): d.line([(1340, 260 + i * 44), (1800, 260 + i * 44)], fill=(160, 160, 176), width=6)
        stamp(fr, "POSTPONED", 1570, 290, t - T("Surgeries that can wait") - 0.4, 54)
    label(fr, "JUST IN TIME", 660, 110, 56, fill=(255, 214, 40), t=t - T("Most of them run on"))
    return fr

def sc_package(t, lt, f):
    fr = bg_plain((60, 70, 110), False).copy()
    buzz = 10 * math.sin(f * 2.6) if lt < 1.2 else 0
    t1, t2, t3 = T("The package you ordered"), T("again"), T("Then nothing at all")
    lines = [(lt * 0 + T("Meanwhile, your phone"), "ORDER #4471", "Out for delivery today", OUT),
             (t1 + 0.9, "UPDATE", "DELAYED", (220, 40, 50)),
             (t2 + 0.3, "UPDATE", "DELAYED", (220, 40, 50))]
    if t > t3 + 0.4: lines = [(0, "ORDER #4471", "No updates available.", (140, 140, 150))]
    phone_ui(fr, W / 2 + 300, 540, 1.2, lines, t, "TRACKING", shake=buzz)
    put(fr, person("hero", "annoyed" if t > t1 + 1 else "neutral", (1, 0), blink_at(t), pose="down"), 520, 1180, 1.05)
    if lt < 1.2 and (f // 3) % 2 == 0:
        d = ImageDraw.Draw(fr)
        for s in (-1, 1): d.line([(W / 2 + 300 + s * 290, 300), (W / 2 + 300 + s * 310, 380)], fill=(255, 255, 255), width=8)
    return fr

def sc_grocery(t, lt, f):
    fr = bg_store().copy()
    tw = T("You walk into your local store")
    am = {c[0]: 1.0 for c in CATS}
    if t > tw:
        for frag, cat in (("The bread aisle", "BREAD"), ("Milk, gone", "MILK"), ("Eggs, gone", "EGGS"), ("chips are gone", "CHIPS")):
            am[cat] = 1 - clamp((t - T(frag) + 0.2) / 0.5)
        am["CANS"] = 1 - clamp((t - T("chips are gone")) / 1.2)
    beets = t > T("The only thing left")
    draw_shelves(fr, am, beets=beets)
    if t < T("Trucking industry reports"):
        fr = push(fr, lt, 8, 1.0, 1.05)
        if t > T("Most of it gets restocked"):
            ov = Image.new("RGBA", (W, H), (10, 14, 40, 150)); fr.paste(ov, (0, 0), ov)
            x = lerp(-700, W + 700, clamp((t - T("Most of it gets restocked")) / 2.6))
            put(fr, truck(lights=True), x, 1060, 0.6)
            label(fr, "OVERNIGHT", W / 2, 120, 70, t=t - T("Most of it gets restocked"))
        if t > T("The shelves you see"):
            label(fr, "THE SHELF IS THE WAREHOUSE", W / 2, 960, 56, fill=(255, 214, 40), t=t - T("The shelves you see"))
        return fr
    if t < tw:
        fr = push(fr, t - T("Trucking industry reports"), 8, 1.04, 1.04)
        stamp(fr, "3 DAYS", W / 2, 520, t - T("Trucking industry reports") - 2.5, 200)
        if t > T("With panic"): label(fr, "WITH PANIC: FASTER", W / 2, 860, 64, fill=(255, 214, 40), t=t - T("With panic"))
        return fr
    if beets:
        tb = T("The only thing left")
        z = lerp(1.0, 1.9, ss((t - tb) / 1.2))
        fr = cam(fr, z, (120 + 1800) / 2, SHELF_ROWS[1] + 60)
        if t > T("And two people"):
            put(fr, person("hero", "shock", (1, -1), False), 260, 1300, 1.2)
            put(fr, person("person", "shock", (-1, -1), False, skin=2, hair=3, shirt=(200, 70, 90)), 1660, 1300, 1.2, flip=True)
        return fr
    put(fr, person("hero", "worried" if am["BREAD"] < .5 else "neutral", (0, -1), blink_at(t), pose="down", sweat=am["EGGS"] < .5), 1500, 1120, 0.95)
    return fr

def sc_trash(t, lt, f):
    if t > T("By day four, downtown"):
        lt2 = t - T("By day four, downtown")
        fr = bg_plain((250, 214, 150), False).copy()
        d = ImageDraw.Draw(fr)
        glow(fr, 1700, 160, 260, (255, 230, 120), 0.9)
        put(fr, car((90, 140, 220)), 760, 900, 2.2)
        d.rounded_rectangle([600, 560, 960, 700], 40, fill=(60, 70, 160), outline=OUT, width=6)
        d.text((780, 630), "GYM", font=font(50, True), fill=(255, 255, 255), anchor="mm")
        for i in range(4):
            p = (lt2 * .5 + i / 4) % 1
            x = 640 + i * 90
            d.line([(x + 20 * math.sin(p * 9 + k * 0.4), 540 - p * 260 - k * 10) for k in range(12)], fill=(120, 190, 60), width=7)
        put(fr, person("hero", "annoyed", (-1, 0), blink_at(t), pose="down"), 1500, 1120, 1.0)
        label(fr, "120°F", 1700, 160, 60, fill=(220, 50, 50), t=lt2)
        return fr
    fr = cam(bg_street(), 1.0 + 0.05 * ss(lt / 12), W * .6, H / 2)
    d = ImageDraw.Draw(fr)
    n = int(3 + 40 * clamp((t - T("Bags pile up")) / 6)) if t > T("Bags pile up") else 3
    rnd = random.Random(2)
    for i in range(n):
        x = 200 + (i * 97) % 1500 + rnd.uniform(-20, 20)
        y = 830 + (i // 15) * 70 if t > T("Then on the sidewalk") or i < 15 else 830
        y = 810 + rnd.uniform(-10, 40) + (0 if i < 15 else 80 + (i - 15) // 15 * 60)
        r = rnd.uniform(50, 75)
        d.ellipse([x - r, y - r * 1.2, x + r, y + r * .4], fill=(34, 34, 40), outline=OUT, width=4)
        d.line([(x - 12, y - r * 1.2), (x, y - r * 1.5), (x + 12, y - r * 1.2)], fill=(60, 60, 70), width=6)
    for i in range(14):
        a = t * 3 + i
        fx = 300 + (i * 113) % 1300 + 60 * math.sin(a * 1.7); fy = 650 + 60 * math.cos(a * 2.3)
        d.ellipse([fx - 5, fy - 5, fx + 5, fy + 5], fill=OUT)
    if t > T("Garbage trucks are trucks"):
        label(fr, "GARBAGE TRUCKS = TRUCKS", W / 2, 130, 66, t=t - T("Garbage trucks are trucks"))
    if t > T("A big city makes"):
        label(fr, "THOUSANDS OF TONS / DAY", W / 2, 230, 56, fill=(255, 214, 40), t=t - T("A big city makes"))
    return fr

def sc_atm(t, lt, f):
    if t > T("And small towns") - 0.1:
        return sc_town(t, t - T("And small towns"), f)
    fr = bg_street().copy()
    fr = cam(fr, 1.15, W * .5, H * .55)
    d = ImageDraw.Draw(fr)
    d.rectangle([700, 200, 1220, 1000], fill=(170, 170, 180), outline=OUT, width=8)
    d.rounded_rectangle([780, 280, 1140, 520], 16, fill=(40, 120, 180) if t < T("When the machines") else (30, 30, 40), outline=OUT, width=6)
    if t > T("When the machines"):
        d.text((960, 370), "OUT OF", font=font(54, True), fill=(220, 50, 50), anchor="mm")
        d.text((960, 440), "SERVICE", font=font(54, True), fill=(220, 50, 50), anchor="mm")
    else:
        d.text((960, 400), "WELCOME", font=font(50, True), fill=(255, 255, 255), anchor="mm")
    d.rectangle([820, 600, 1100, 640], fill=(40, 40, 46))
    d.rounded_rectangle([780, 700, 1140, 860], 12, fill=(150, 150, 160), outline=OUT, width=5)
    put(fr, person("hero", "annoyed" if t > T("When the machines") else "neutral", (1, -1), blink_at(t), pose="shrug" if t > T("they stay empty") + 0.5 else "down"), 460, 1120, 0.95)
    if t > T("ATMs are refilled"):
        x = lerp(W + 600, 1600, eout((t - T("ATMs are refilled")) / 1.2))
        if t > T("When the machines"): x = 1600
        put(fr, truck(cab=(90, 96, 104), trailer=(120, 126, 134), stripe=(60, 66, 74), logo="ARMORED"), x, 1080, 0.5)
    return fr

def sc_town(t, lt, f):
    fr = bg_plain((206, 228, 190), False).copy()
    d = ImageDraw.Draw(fr)
    p = eout(lt / 0.6)
    d.line([(W / 2, H / 2), (W / 2 + 900, H / 2 - 200)], fill=(90, 90, 100), width=60)
    d.line([(W / 2, H / 2), (W / 2 + 900, H / 2 - 200)], fill=(240, 220, 120), width=6)
    for i in range(9):
        a = i * 0.7; r = 120 + (i % 3) * 60
        x, y = W / 2 + r * math.cos(a), H / 2 + r * math.sin(a)
        d.rectangle([x - 40, y - 30, x + 40, y + 30], fill=[(220, 120, 100), (120, 170, 210), (240, 210, 120)][i % 3], outline=OUT, width=4)
        d.polygon([(x - 48, y - 30), (x, y - 70), (x + 48, y - 30)], fill=(150, 80, 70), outline=OUT)
    label(fr, "SMALL TOWN, USA", W / 2, 160, 66, t=lt)
    icons = [("no railroad", "RAIL", 400, 360), ("no port", "PORT", 400, 720), ("no airport", "AIRPORT", 1500, 820)]
    t0 = T("Many of them have no railroad")
    for i, (frag, nm, x, y) in enumerate(icons):
        ts = t0 + [0.3, 1.4, 2.2][i]
        if t > ts - 0.4:
            d.rounded_rectangle([x - 150, y - 70, x + 150, y + 70], 20, fill=(250, 250, 255), outline=OUT, width=6)
            d.text((x, y), nm, font=font(48, True), fill=OUT, anchor="mm")
        if t > ts:
            q = clamp((t - ts) / 0.2)
            d.line([(x - 150, y - 70), (lerp(x - 150, x + 150, q), lerp(y - 70, y + 70, q))], fill=(220, 40, 50), width=16)
            d.line([(x + 150, y - 70), (lerp(x + 150, x - 150, q), lerp(y - 70, y + 70, q))], fill=(220, 40, 50), width=16)
    if t > T("The only way anything arrives"):
        tp = clamp((t - T("The only way anything arrives")) / 2)
        x = lerp(W / 2 + 900, W / 2 + 60, tp); y = lerp(H / 2 - 200, H / 2 - 10, tp)
        put(fr, truck(), x, y + 40, 0.22)
        label(fr, "ROAD ONLY", 1450, 300, 70, fill=(255, 214, 40), t=t - T("The only way anything arrives"))
    return fr

def sc_factory(t, lt, f):
    if t > T("Farms are in trouble") - 0.1:
        return sc_farm(t, t - T("Farms are in trouble"), f)
    fr = push(bg_factory(), lt, 12, 1.0, 1.05)
    d = ImageDraw.Draw(fr)
    off = t > T("Factories shut down") + 1.0
    for i, x in enumerate((345, 565, 785)):
        if not off:
            for k in range(4):
                p = (lt * .4 + k / 4 + i * .2) % 1
                glow(fr, x + 30 * p, 180 + i * 30 - p * 200, 40 + 50 * p, (230, 230, 236), .7 * (1 - p))
    if t > T("somewhere in Nebraska") if any("Nebraska" in s["text"] for s in S) else False:
        pass
    tn = T("Factories shut down") + 1.6
    if t > tn:
        d.rounded_rectangle([1360, 200, 1820, 330], 14, fill=(30, 120, 60), outline=(255, 255, 255), width=6)
        d.text((1590, 265), "NEBRASKA  I-80", font=font(48, True), fill=(255, 255, 255), anchor="mm")
        put(fr, truck(cab=(120, 120, 130), stripe=(200, 60, 60)), 1600, 760, 0.38)
        qmark(fr, 1750, 470, t - tn, 90)
    if t > T("Car plants"):
        for i, nm in enumerate(("CAR PLANTS", "FOOD PLANTS", "PAPER MILLS")):
            ts = T("Car plants") + i * 0.8
            if t > ts: stamp(fr, nm, 420 + i * 520, 900, t - ts, 50, (220, 40, 50), [-5, 3, -2][i])
    if t > T("Millions of people are sent home"):
        tt = t - T("Millions of people are sent home")
        for i in range(5):
            x = 660 + tt * 160 - i * 150
            put(fr, person("person", "sad", (1, 0), False, pose="box", skin=i % 4, hair=i % 5, shirt=[(90, 150, 220), (240, 180, 40), (200, 70, 90)][i % 3]), x, 1060, 0.42)
    return fr

def sc_farm(t, lt, f):
    fr = push(bg_farm(), lt, 7, 1.0, 1.05)
    d = ImageDraw.Draw(fr)
    for i in range(3): cow(fr, 360 + i * 260, 830, 0.85, t + i, flip=i == 1)
    if t > T("Chickens still need feed") - 0.2:
        for i in range(5): chicken(fr, 980 + i * 70, 1000, 0.6, t + i)
    bubble(fr, "MOO?", 520, 480, t - T("Cows still need feed"))
    label(fr, "EMPTY", 600, 870, 40, t=t - T("Cows still need feed") - 0.2)
    if t > T("And milk that can't be picked up"):
        tt = t - T("And milk that can't be picked up")
        d.rectangle([1500, 600, 1640, 820], fill=(220, 220, 230), outline=OUT, width=6)
        d.text((1570, 700), "MILK", font=font(34, True), fill=OUT, anchor="mm")
        d.line([(1640, 640), (1700, 660), (1720, 1000)], fill=(255, 255, 255), width=24)
        d.ellipse([1640, 980, 1800, 1030], fill=(60, 60, 70), outline=OUT, width=5)
    return fr

def sc_oxygen(t, lt, f):
    fr = push(bg_hospital(red=True), lt, 14, 1.0, 1.06)
    d = ImageDraw.Draw(fr)
    d.rounded_rectangle([200, 640, 1100, 760], 20, fill=(240, 240, 246), outline=OUT, width=6)
    d.rectangle([220, 760, 250, 880], fill=(150, 150, 160)); d.rectangle([1050, 760, 1080, 880], fill=(150, 150, 160))
    d.rounded_rectangle([230, 560, 420, 660], 30, fill=(250, 250, 255), outline=OUT, width=5)
    pat = person("person", "worried", (0, -1), blink_at(t, 2), skin=0, hair=3, shirt=(160, 200, 230)).rotate(90, expand=True)
    put(fr, pat.crop((0, 0, 820, 500)), 520, 700, 0.55)
    d.rectangle([380, 640, 1080, 720], fill=(170, 210, 240), outline=OUT, width=5)
    tx = 1400
    d.rounded_rectangle([tx, 300, tx + 160, 880], 60, fill=(60, 150, 90), outline=OUT, width=6)
    d.text((tx + 80, 600), "O2", font=font(70, True), fill=(255, 255, 255), anchor="mm")
    gx, gy = tx + 80, 250
    d.ellipse([gx - 90, gy - 90, gx + 90, gy + 90], fill=(250, 250, 250), outline=OUT, width=6)
    d.pieslice([gx - 80, gy - 80, gx + 80, gy + 80], 180, 220, fill=(240, 80, 80))
    lvl = 1 - clamp((t - T("Some reports warn that medical oxygen")) / 5)
    a = math.radians(180 + 180 * (1 - lvl) * -1 + 180) if False else math.radians(180 + 180 * lvl)
    d.line([(gx, gy), (gx + 70 * math.cos(a), gy + 70 * math.sin(a))], fill=OUT, width=8)
    d.line([(tx + 80, 300), (tx - 200, 200), (560, 600)], fill=(170, 210, 240), width=8)
    pulse = 0.5 + 0.5 * math.sin(t * 5)
    glow(fr, W - 200, 120, 160, (255, 40, 40), 0.25 + 0.4 * pulse * (1 - lvl))
    if t > T("Oxygen is delivered by truck"):
        label(fr, "DELIVERED BY TRUCK", 700, 160, 64, fill=(255, 214, 40), t=t - T("Oxygen is delivered by truck"))
    return fr

def sc_water(t, lt, f):
    tc = T("But the chemicals")
    if tc - 0.1 < t < T("Without them, cities") - 0.1:
        fr = bg_plain((214, 230, 240), False).copy()
        d = ImageDraw.Draw(fr)
        d.rectangle([0, 820, W, H], fill=(150, 160, 170))
        for i, x in enumerate((300, 800)):
            d.ellipse([x - 200, 500, x + 200, 860], fill=(110, 170, 210), outline=OUT, width=6)
        d.rounded_rectangle([1200, 360, 1460, 820], 30, fill=(240, 240, 246), outline=OUT, width=6)
        d.text((1330, 420), "CHLORINE", font=font(34, True), fill=OUT, anchor="mm")
        lvl = 1 - clamp((t - tc) / 3.5)
        d.rectangle([1230, 800 - 340 * lvl, 1430, 800], fill=(250, 220, 90))
        d.rectangle([1230, 460, 1430, 800], outline=OUT, width=4)
        label(fr, "WATER TREATMENT PLANT", W / 2, 140, 62, t=t - tc)
        label(fr, "DELIVERED EVERY 1-2 WEEKS", 1330, 920, 44, fill=(255, 214, 40), t=t - tc - 1.5)
        return fr
    fr = push(bg_kitchen(), lt, 16, 1.25, 1.3, 400, 640)
    d = ImageDraw.Draw(fr)
    flow = 1.0 if t < T("Then they ask people") else max(0.0, 1 - (t - T("Then they ask people")) / 1.5)
    d.rectangle([700, 360, 760, 420], fill=(180, 180, 190), outline=OUT, width=5)
    d.line([(730, 360), (730, 300), (900, 300), (900, 360)], fill=(180, 180, 190), width=30)
    if flow > 0.05:
        d.rectangle([892 - 16 * flow, 370, 908 + 16 * flow, 760], fill=(150, 210, 250))
    else:
        y = 380 + ((t * 300) % 380)
        d.ellipse([890, y, 910, y + 26], fill=(150, 210, 250), outline=OUT, width=3)
    put(fr, person("hero", "worried" if t > T("Without them") else "neutral", (1, 0), blink_at(t), pose="down"), 1300, 1140, 1.0)
    if t > T("Without them, cities"):
        lines = [(T("Without them, cities") + 0.3, "CITY ALERT", "BOIL WATER NOTICE in effect for your area.", (200, 40, 50))]
        if t > T("Then they ask people"):
            lines.append((T("Then they ask people") + 0.3, "CITY ALERT", "Please conserve water. Save every drop.", OUT))
        phone_ui(fr, 1620, 540, 1.0, lines, t, "ALERTS", header=(200, 40, 50))
    return fr

def sc_alts(t, lt, f):
    fr = bg_plain((244, 242, 236)).copy()
    d = ImageDraw.Draw(fr)
    tl = T("That last mile")
    if t > tl - 0.1:
        tt = t - tl
        for x, nm, col in ((300, "WAREHOUSE", (150, 160, 180)), (1620, "YOUR STORE", (220, 80, 70))):
            d.rectangle([x - 200, 360, x + 200, 700], fill=col, outline=OUT, width=6)
            d.text((x, 760), nm, font=font(48, True), fill=OUT, anchor="mm")
        p = clamp(tt / 3.5)
        for x in range(520, 1400, 60):
            if (x - 520) / 880 < p: d.rectangle([x, 640, x + 34, 652], fill=OUT)
        put(fr, truck(), lerp(560, 1360, ss(p)), 700, 0.3)
        label(fr, "THE LAST MILE", W / 2, 180, 80, fill=(220, 50, 50), t=tt)
        return fr
    if t < T("Trains only go") - 0.1:
        ts = T("Trucks.")
        label(fr, "WHAT'S MISSING?", W / 2, 300, 80, t=lt)
        if t > ts:
            label(fr, "TRUCKS.", W / 2, 520, 200, fill=(220, 50, 50), t=t - ts)
        return fr
    panels = [("Trains only go", "TRAINS", "tracks only"), ("Planes are expensive", "PLANES", "pricey & tiny"), ("Ships need ports", "SHIPS", "ports only")]
    for i, (frag, nm, sub) in enumerate(panels):
        ts = T(frag)
        if t < ts - 0.1: continue
        x = 340 + i * 620
        q = pop(t - ts, 0.3)
        d.rounded_rectangle([x - 260 * q, 220, x + 260 * q, 820], 30, fill=(250, 250, 255), outline=OUT, width=6)
        if q > .8:
            if nm == "TRAINS":
                d.line([(x - 220, 600), (x + 120, 600)], fill=(120, 80, 60), width=14)
                for k in range(8): d.rectangle([x - 210 + k * 44, 590, x - 196 + k * 44, 616], fill=(120, 80, 60))
                d.rounded_rectangle([x - 200, 470, x + 60, 590], 16, fill=(40, 120, 190), outline=OUT, width=5)
                d.line([(x + 140, 560), (x + 200, 640)], fill=(220, 40, 50), width=12); d.line([(x + 200, 560), (x + 140, 640)], fill=(220, 40, 50), width=12)
            elif nm == "PLANES":
                d.polygon([(x - 200, 520), (x + 180, 500), (x + 220, 530), (x + 180, 560), (x - 200, 545)], fill=(230, 230, 240), outline=OUT)
                d.polygon([(x - 20, 530), (x + 60, 430), (x + 100, 430), (x + 60, 530)], fill=(200, 200, 214), outline=OUT)
                d.text((x, 640), "$$$", font=font(70, True), fill=(40, 150, 80), anchor="mm")
            else:
                d.polygon([(x - 220, 520), (x + 220, 520), (x + 170, 620), (x - 170, 620)], fill=(60, 80, 120), outline=OUT)
                for k in range(5): d.rectangle([x - 180 + k * 70, 460, x - 120 + k * 70, 520], fill=[(220, 80, 60), (240, 180, 40), (60, 140, 90)][k % 3], outline=OUT)
                d.rectangle([x - 260, 640, x + 260, 700], fill=(110, 170, 220))
            d.text((x, 300), nm, font=font(64, True), fill=OUT, anchor="mm")
            d.text((x, 760), sub, font=font(42, True), fill=(220, 50, 50), anchor="mm")
    return fr

def sc_day30(t, lt, f):
    bg = bg_street(gray=True)
    fr = cam(bg, 1.0 + 0.04 * ss(lt / 18), W * .55 + 60 * ss(lt / 18), H / 2)
    d = ImageDraw.Draw(fr)
    if t > T("Stores are boarded up") - 0.2:
        x = 1540
        for k in range(3): d.rectangle([x - 20, 420 + k * 80, x + 420, 470 + k * 80], fill=(170, 130, 90), outline=OUT, width=4)
        d.text((x + 200, 380), "CLOSED", font=font(50, True), fill=(220, 40, 50), anchor="mm", stroke_width=5, stroke_fill=(255, 255, 255))
    d.rectangle([380, 640, 980, 820], fill=None)
    for x in range(420, 980, 40): d.rectangle([x, 700, x + 24, 820], fill=(240, 240, 240), outline=OUT, width=3)
    d.rectangle([400, 730, 990, 750], fill=(240, 240, 240), outline=OUT, width=3)
    if t > T("Neighbors trade"):
        tt = t - T("Neighbors trade")
        put(fr, person("hero", "neutral", (1, 0), blink_at(t), pose="can"), 520, 1000, 0.62)
        put(fr, person("person", "happy", (-1, 0), blink_at(t, 4), skin=2, hair=0, shirt=(200, 120, 60), pose="can"), 860, 1000, 0.62, flip=True)
    if t > T("People ride bikes"):
        bx = lerp(-200, W + 200, clamp((t - T("People ride bikes")) / 5))
        d.ellipse([bx - 90, 920, bx - 10, 1000], outline=OUT, width=8); d.ellipse([bx + 50, 920, bx + 130, 1000], outline=OUT, width=8)
        d.line([(bx - 50, 960), (bx + 20, 900), (bx + 90, 960)], fill=(200, 40, 50), width=8)
        put(fr, person("person", "worried", (1, 0), False, skin=1, hair=2, shirt=(90, 150, 220)).crop((0, 0, 500, 700)), bx + 20, 930, 0.4)
    quiet = clamp((t - T("Your street has gone quiet")) / 2) if t > T("Your street has gone quiet") else 0
    if quiet > 0:
        rnd = random.Random(1)
        for i in range(120):
            x = (rnd.uniform(0, W) + t * 20) % W; y = (rnd.uniform(0, H) + t * rnd.uniform(30, 70)) % H; r = rnd.uniform(2, 5)
            d.ellipse([x - r, y - r, x + r, y + r], fill=(235, 235, 240))
        a = np.asarray(fr).astype(np.float32); g = a.mean(axis=2, keepdims=True)
        fr = Image.fromarray((a * (1 - .6 * quiet) + g * .6 * quiet).astype(np.uint8))
    return fr

def sc_return(t, lt, f):
    bg = bg_highway("dawn")
    fr = bg.crop((0, 0, W, H))
    rumble = t > T("A low rumble")
    sh = (6 * math.sin(f * 2.1), 4 * math.cos(f * 1.7)) if rumble else (0, 0)
    if rumble: fr = fr.transform(fr.size, Image.AFFINE, (1, 0, sh[0], 0, 1, sh[1]))
    put(fr, person("hero", "happy" if t > T("Somewhere down the highway") + 1.5 else "worried" if rumble else "sad", (-1, 0), blink_at(t)), 1600, 760, 0.55)
    if t > T("A diesel engine"):
        for k in range(4):
            p = (lt * .5 + k / 4) % 1
            glow(fr, 200 + 60 * p, 700 - 160 * p, 50 + 60 * p, (220, 220, 230), .6 * (1 - p))
    if t > T("Somewhere down the highway"):
        x = lerp(-600, 900, ss((t - T("Somewhere down the highway")) / 4))
        put(fr, truck(lights=True), x, 880, 0.62)
        glow(fr, x + 330, 740, 120, (255, 230, 150), 0.7)
    label(fr, "6:00 AM", 1700, 120, 64, t=lt - 0.2)
    label(fr, "DAY 31", 1700, 190, 40, fill=(255, 214, 40), t=lt - 0.4)
    return fr

def sc_today(t, lt, f):
    bg = bg_highway("day")
    scroll = 1600 * lt
    off = int(scroll * 0.3) % (bg.width - W)
    fr = bg.crop((off, 0, off + W, H))
    d = ImageDraw.Draw(fr)
    for x in range(-int(scroll) % 200 - 200, W, 200): d.rectangle([x, 862, x + 110, 876], fill=(240, 220, 120))
    cols = [(210, 50, 50), (40, 90, 170), (240, 180, 40), (40, 140, 90), (120, 60, 140)]
    for i in range(6):
        x = (i * 700 - lt * 260) % (W + 1400) - 700
        put(fr, truck(cab=cols[i % 5], stripe=cols[(i + 2) % 5]), x, 880 + 2 * math.sin(f + i), .5)
    for i in range(4):
        x = (i * 900 + lt * 380) % (W + 1400) - 700
        put(fr, truck(cab=cols[(i + 3) % 5], stripe=cols[i % 5]), x, 1060 + 2 * math.sin(f * 1.3 + i), .62)
    for i, (frag, nm, col) in enumerate((("The bread in your kitchen", "BREAD", (214, 160, 90)), ("The medicine in your cabinet", "MEDICINE", (250, 250, 255)), ("The gas in your car", "GAS", (220, 50, 50)))):
        if t > T(frag):
            q = pop(t - T(frag)); x = 460 + i * 500
            d.rounded_rectangle([x - 190 * q, 260 - 70 * q, x + 190 * q, 260 + 70 * q], 30, fill=col, outline=OUT, width=6)
            if q > .7: d.text((x, 260), nm, font=font(56, True), fill=OUT, anchor="mm")
    label(fr, "RIGHT NOW", W / 2, 110, 70, t=t - T("Right now, while"))
    return fr

def sc_driver(t, lt, f):
    bg = bg_highway("night")
    fr = bg.crop((int(lt * 200) % (bg.width - W), 0, int(lt * 200) % (bg.width - W) + W, H))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 90)); fr.paste(ov, (0, 0), ov)
    c = K(900, 760)
    c.rect(40, 40, 860, 740, fill=(40, 90, 170), r=40, w=8)
    c.rect(110, 110, 790, 520, fill=(60, 80, 120), r=20, w=8)
    put(fr, c.done(), 960, 1060, 1.0)
    dv = person("trucker", "happy", (0, 0), blink_at(t), hat="cap", skin=2, pose="wave")
    put(fr, dv.crop((0, 0, 500, 560)), 960, 820, 0.8)
    win = K(900, 760); win.rect(110, 110, 790, 520, fill=None, w=8); put(fr, win.done(), 960, 1060, 1.0)
    glow(fr, 1500, 860, 160, (255, 230, 150), 0.5)
    label(fr, "THANK A TRUCKER", W / 2, 140, 70, fill=(255, 214, 40), t=t - T("When they do their job right"))
    return fr

def sc_final(t, lt, f):
    fr = vgrad(W, H, (40, 6, 12), (6, 0, 4))
    sil = truck(cab=(0, 0, 0), trailer=(0, 0, 0), stripe=(0, 0, 0))
    put(fr, sil, W / 2, 1040, 0.6)
    t1 = T("When trucks stop, America stops"); t2 = T("And it only takes")
    if t > VOICE_END + 0.8:
        return sc_outro(t, t - VOICE_END - 0.8, f)
    label(fr, "BUT NOW YOU KNOW.", W / 2, 260, 60, t=lt)
    if t > t1:
        label(fr, "WHEN TRUCKS STOP,", W / 2, 420, 100, t=t - t1)
        label(fr, "AMERICA STOPS.", W / 2, 540, 120, fill=(220, 50, 50), t=t - t1 - 0.9)
    if t > t2:
        label(fr, "IN ABOUT 3 DAYS.", W / 2, 680, 80, fill=(255, 214, 40), t=t - t2 - 0.8)
    return fr

def sc_outro(t, lt, f):
    fr = vgrad(W, H, (26, 20, 60), (8, 6, 20))
    d = ImageDraw.Draw(fr)
    label(fr, "DAY ZERO TALES", W / 2, 150, 90, fill=(255, 140, 50), t=lt)
    label(fr, "What would YOU do on Day 3?", W / 2, 250, 50, t=lt - 0.5)
    label(fr, "Tell me in the comments.", W / 2, 320, 42, fill=(200, 200, 220), t=lt - 0.8)
    for x in (560, 1360):
        d.rounded_rectangle([x - 330, 450, x + 330, 820], 24, outline=(255, 255, 255), width=4)
    put(fr, person("hero", "happy", (0, 0), blink_at(t), pose="wave"), W / 2, 1080, 0.55)
    q = pop(lt - 1.0)
    if q > 0:
        d.rounded_rectangle([W / 2 - 230 * q, 900, W / 2 + 230 * q, 1000], 50, fill=(220, 30, 40))
        if q > .7: d.text((W / 2, 950), "SUBSCRIBE", font=font(54, True), fill=(255, 255, 255), anchor="mm")
    return fr

SCENES = [
    (0, sc_intro), ("And by Friday", sc_friday), ("This is Day Zero", sc_title0), ("You probably never", sc_drive),
    ("But here's the strange part", sc_share), ("And today, all of them", sc_parked), ("Hour one", sc_kitchen),
    ("Millions of truck drivers", sc_drivers), ("Hour twelve", sc_news), ("Day one", sc_gas), ("Day two", sc_hospital),
    ("Meanwhile, your phone", sc_package), ("Day three", sc_grocery), ("Day four", sc_trash), ("Day five", sc_atm),
    ("Day seven", sc_factory), ("Day ten", sc_oxygen), ("Day fourteen", sc_water), ("And here's the strangest", sc_alts),
    ("Day thirty", sc_day30), ("And then, at six A.M.", sc_return), ("Now, look outside", sc_today),
    ("You never think about them", sc_driver), ("But now you know", sc_final),
]
SC = [(0.0 if k == 0 else T(k) - 0.12, fn) for k, fn in SCENES]

DAYS = [("This is Day Zero", "DAY 0"), ("Hour one", "HOUR 1"), ("Hour twelve", "HOUR 12"), ("Day one", "DAY 1"), ("Day two", "DAY 2"),
        ("Day three", "DAY 3"), ("Day four", "DAY 4"), ("Day five", "DAY 5"), ("Day seven", "DAY 7"), ("Day ten", "DAY 10"),
        ("Day fourteen", "DAY 14"), ("Day thirty", "DAY 30"), ("And then, at six A.M.", "DAY 31"), ("Now, look outside", "TODAY")]
DT = [(T(k), v) for k, v in DAYS]
NOHUD = {sc_title0, sc_final}
SLAM = {"HOUR 1", "HOUR 12", "DAY 1", "DAY 2", "DAY 3", "DAY 4", "DAY 5", "DAY 7", "DAY 10", "DAY 14", "DAY 30"}

def hud(fr, t):
    cur = None
    for ts, v in DT:
        if t >= ts: cur = (ts, v)
    if not cur: return
    ts, v = cur
    lt = t - ts
    d = ImageDraw.Draw(fr)
    if v in SLAM and lt < 1.15:
        a = 1 - clamp((lt - 0.9) / 0.25)
        ov = Image.new("RGBA", (W, H), (0, 0, 0, int(110 * a))); fr.paste(ov, (0, 0), ov)
        q = back(lt / 0.3, 2.0)
        sc = 2.0 - q
        d.text((W / 2, H / 2 - 40), v, font=font(int(230 * max(sc, .2)), True), fill=(255, 255, 255) if v != "DAY 30" else (255, 80, 80), anchor="mm",
               stroke_width=12, stroke_fill=OUT)
        return
    q = pop(lt - (1.15 if v in SLAM else 0), 0.3)
    if q <= 0: return
    tw = d.textlength(v, font=font(46, True))
    d.rounded_rectangle([40, 36, 40 + (tw + 100) * q, 116], 40, fill=(220, 40, 50), outline=OUT, width=5)
    if q > .8:
        d.ellipse([62, 58, 98, 94], fill=(255, 255, 255)); d.ellipse([72, 68, 88, 84], fill=(220, 40, 50))
        d.text((116, 76), v, font=font(46, True), fill=(255, 255, 255), anchor="lm")

def captions(fr, t):
    cur = None
    for s in S:
        if s["start"] - 0.05 <= t <= s["end"] + 0.25: cur = s
    if not cur: return
    words = cur["text"].replace('"', "").split()
    a, b = cur["start"], cur["end"]
    tot = sum(len(w) + 1 for w in words); acc = 0; st = []
    for w in words: st.append(a + (b - a) * acc / tot); acc += len(w) + 1
    d = ImageDraw.Draw(fr); f = font(50)
    lines, ln = [], []
    for i, w in enumerate(words):
        test = " ".join(words[j] for j in ln + [i])
        if ln and d.textlength(test, font=f) > 1500: lines.append(ln); ln = [i]
        else: ln.append(i)
    lines.append(ln)
    y0 = 1000 - (len(lines) - 1) * 62
    for li, ln in enumerate(lines):
        ws = [d.textlength(words[i] + " ", font=f) for i in ln]
        x = W / 2 - sum(ws) / 2
        for i, wd in zip(ln, ws):
            act = st[i] <= t < (st[i + 1] if i + 1 < len(words) else b + 0.25)
            col = (255, 214, 40) if act else (255, 255, 255)
            d.text((x, y0 + li * 62), words[i], font=f, fill=col, stroke_width=6, stroke_fill=(0, 0, 0))
            x += wd

VIG = Image.fromarray((vignette(0.5)[..., 0] * 255).astype(np.uint8)).convert("RGB")

def frame(fi):
    t = fi / FPS
    cur = SC[0]
    for s in SC:
        if t >= s[0]: cur = s
    st, fn = cur
    lt = t - st
    fr = fn(t, lt, fi)
    if fr.mode != "RGB": fr = fr.convert("RGB")
    if lt < 0.12 and st > 0:
        fr = Image.blend(fr, Image.new("RGB", (W, H), (0, 0, 0)), 1 - lt / 0.12)
    fr = ImageChops.multiply(fr, VIG)
    if fn not in NOHUD and t < VOICE_END + 0.5: hud(fr, t)
    if t < VOICE_END + 0.3: captions(fr, t)
    return fr
