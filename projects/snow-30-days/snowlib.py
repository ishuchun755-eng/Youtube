"""2.5D toolkit for 'What If It Snowed for 30 Days'. Layer space = 2400x1350, screen = 1920x1080."""
import sys, math, random
sys.path.insert(0, "/root/shorts/trucks")
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from lib import K, person, put, truck, car, font, clamp, ss, eout, back, lerp, OUT, glow, stamp, blink_at, vgrad, pine, cloud

W, H, FPS = 1920, 1080, 30
LW, LH = 2400, 1350
SNOW, SNOWS = (246, 249, 255), (196, 212, 238)

# ------------------------------------------------------------------ camera
class Cam:
    def __init__(self, px=0.0, py=0.0, zoom=1.0): self.px, self.py, self.zoom = px, py, zoom
def _view(cam, z):
    zl = 1 + (cam.zoom - 1) / z
    cx = LW / 2 + cam.px * (LW - W) / 2 / z
    cy = LH / 2 + cam.py * (LH - H) / 2 / z
    return zl, cx, cy
def compose(layers, cam, base=None):
    """layers: list of (RGBA/RGB image LWxLH, z) far->near"""
    fr = base if base is not None else Image.new("RGB", (W, H))
    for img, z in layers:
        zl, cx, cy = _view(cam, z)
        cw, ch = W / zl, H / zl
        box = (int(cx - cw / 2), int(cy - ch / 2), int(cx + cw / 2), int(cy + ch / 2))
        piece = img.crop(box).resize((W, H), Image.BILINEAR)
        if piece.mode == "RGBA": fr.paste(piece, (0, 0), piece)
        else: fr.paste(piece, (0, 0))
    return fr
def proj(cam, x, y, z):
    zl, cx, cy = _view(cam, z)
    return (x - cx) * zl + W / 2, (y - cy) * zl + H / 2, zl
def put_at(fr, cam, spr, x, footy, z, scale=1.0, rot=0.0, flip=False):
    sx, sy, zl = proj(cam, x, footy, z)
    s = scale * zl * (W / LW) * 1.25
    put(fr, spr, sx, sy, s, rot, flip)

def layer(draw_fn, rgba=True, bg=None):
    c = K(LW, LH, bg=(0, 0, 0, 0) if rgba else (bg or (0, 0, 0)), mode="RGBA" if rgba else "RGB")
    draw_fn(c)
    return c.done()

# ------------------------------------------------------------------ skies
SKIES = {
    "morning": ((150, 190, 235), (255, 214, 190), (220, 200, 225)),
    "day": ((170, 190, 215), (225, 232, 242)),
    "overcast": ((140, 150, 170), (205, 212, 224)),
    "sunset": ((70, 60, 130), (255, 160, 110), (190, 110, 140)),
    "dusk": ((40, 44, 96), (150, 120, 160)),
    "night": ((12, 16, 44), (44, 52, 96)),
    "blizzard": ((175, 182, 196), (228, 232, 240)),
    "sunny": ((90, 160, 240), (200, 228, 252)),
    "spring": ((110, 180, 245), (220, 240, 252)),
}
def sky(kind, moon=False, stars=False, sun=False):
    s = SKIES[kind]
    img = vgrad(LW, LH, s[0], s[-1]) if len(s) == 2 else vgrad(LW, LH, s[0], s[2], s[1])
    c = K(LW, LH, mode="RGB", img=img.resize((LW * 2, LH * 2)))
    rnd = random.Random(5)
    if stars:
        for _ in range(220):
            x, y, r = rnd.uniform(0, LW), rnd.uniform(0, LH * .55), rnd.uniform(1, 2.6)
            c.ell(x - r, y - r, x + r, y + r, fill=(235, 238, 255), out=None)
    if moon: c.ell(1800, 160, 1960, 320, fill=(246, 244, 226), out=None); c.ell(1840, 200, 1880, 240, fill=(226, 222, 204), out=None)
    if sun:
        for r, a in ((260, 40), (190, 70), (140, 120)): c.ell(1700 - r, 260 - r, 1700 + r, 260 + r, fill=(255, 240, 200), out=None) if a == 120 else None
        c.ell(1590, 150, 1810, 370, fill=(255, 236, 160), out=None)
    if kind in ("day", "overcast", "morning", "sunny", "spring"):
        for i in range(6): cloud(c, 120 + i * 420, 110 + 70 * (i % 2), 1.2, (250, 252, 255) if kind != "overcast" else (225, 230, 240))
    return c.done()

# ------------------------------------------------------------------ scenery
def snow_bank(c, y, x0=-50, x1=LW + 50, amp=24, seed=1, col=SNOW, shade=SNOWS, bottom=LH + 40):
    rnd = random.Random(seed); pts = [(x0, bottom)]
    x = x0
    while x <= x1:
        pts.append((x, y - amp * (0.5 + 0.5 * math.sin(x * 0.006 + seed)) - rnd.uniform(0, amp * 0.4))); x += 60
    pts.append((x1, bottom))
    c.poly(pts, fill=shade, out=None)
    c.poly([(px, py + 14) for px, py in pts], fill=col, out=None)

def house(c, x, gy, w=520, h=560, body=(200, 110, 90), roof=(90, 70, 110), snow_h=0, lights=0.0, seed=0, roof_snow=40, door=True, chimney=True):
    """two-story house, bottom-left at (x, gy)."""
    rnd = random.Random(seed)
    top = gy - h
    c.rect(x, top, x + w, gy, fill=body, w=6)
    rh = w * 0.42
    if chimney: c.rect(x + w * 0.68, top - rh * 0.75, x + w * 0.8, top - rh * 0.2, fill=(120, 70, 60), w=5)
    c.poly([(x - 30, top + 6), (x + w / 2, top - rh), (x + w + 30, top + 6)], fill=roof, w=6)
    # roof snow cap
    if roof_snow > 0:
        c.poly([(x - 34, top + 2), (x + w / 2, top - rh - roof_snow * 0.4), (x + w + 34, top + 2), (x + w + 20, top + roof_snow * 0.35), (x + w / 2, top - rh + roof_snow * 0.6), (x - 20, top + roof_snow * 0.35)], fill=SNOW, w=4)
    for row in range(2):
        wy = top + 60 + row * (h / 2)
        for k in range(3):
            wx = x + 50 + k * (w - 100) / 2.2
            lit = rnd.random() < lights
            c.rect(wx, wy, wx + 90, wy + 120, fill=(255, 214, 120) if lit else (110, 140, 180), w=5)
            c.line([(wx + 45, wy), (wx + 45, wy + 120)], w=4); c.line([(wx, wy + 60), (wx + 90, wy + 60)], w=4)
            c.rect(wx - 6, wy - 8, wx + 96, wy, fill=SNOW, out=None)
    if door: c.rect(x + w / 2 - 45, gy - 170, x + w / 2 + 45, gy, fill=(120, 60, 50), w=5)
    if snow_h > 0: snow_bank(c, gy - snow_h, x - 120, x + w + 120, 30, seed + 3, bottom=gy + 200)

def snow_pine(c, x, y, h, col=(40, 90, 70)):
    w = h * .42
    for i in range(4):
        yy = y - h * (.18 + i * .22); ww = w * (1 - i * .2)
        c.poly([(x - ww, yy + h * .25), (x + ww, yy + h * .25), (x, yy - h * .22)], fill=col, w=4)
        c.poly([(x - ww * .9, yy + h * .2), (x + ww * .9, yy + h * .2), (x + ww * .5, yy + h * .12), (x, yy - h * .2), (x - ww * .5, yy + h * .12)], fill=SNOW, out=None)
    c.rect(x - h * .03, y - h * .08, x + h * .03, y, fill=(90, 60, 40), out=None)

def ground(c, y, col=SNOW, shade=SNOWS):
    c.rect(-10, y, LW + 10, LH + 10, fill=col, out=None)
    for i in range(14): c.line([(i * 180 - 60, y + 40 + (i % 3) * 30), (i * 180 + 80, y + 40 + (i % 3) * 30)], shade, 5)

def street_bg(c, gy, kind="day", lights=0.2, snow_h=0, seed=0):
    rnd = random.Random(seed)
    cols = [(196, 110, 92), (120, 156, 196), (226, 196, 120), (150, 190, 150), (180, 140, 190)]
    x = -100
    i = 0
    while x < LW:
        w = rnd.uniform(420, 520); hh = rnd.uniform(480, 560)
        house(c, x, gy, w, hh, cols[i % 5], (80, 70, 100), snow_h, lights, seed + i)
        x += w + rnd.uniform(90, 160); i += 1

# ------------------------------------------------------------------ sprites
_sc = {}
def cached(key, fn):
    if key not in _sc: _sc[key] = fn()
    return _sc[key]

def dog(pose="stand", tail=0.0, blink=False):
    def mk():
        c = K(520, 380)
        gold, dk = (226, 168, 82), (180, 120, 50)
        tx, ty = 70, 170
        a = math.radians(-30 + tail * 40)
        c.line([(tx + 30, ty), (tx - 40 * math.cos(a) + 30, ty - 90 * math.sin(a + 1.0))], dk, 34)
        c.ell(80, 120, 380, 280, fill=gold, w=6)
        legs = [(120, 0), (180, 0.3), (300, -0.3), (350, 0)]
        for i, (lx, ph) in enumerate(legs):
            off = 0 if pose != "run" else 30 * math.sin(i * 1.7 + ph * 3)
            c.rect(lx - 18 + off, 240, lx + 18 + off, 360, fill=gold, r=14, w=5)
            c.ell(lx - 22 + off, 340, lx + 26 + off, 372, fill=dk, w=4)
        c.ell(320, 40, 480, 200, fill=gold, w=6)
        c.ell(420, 120, 510, 190, fill=(240, 196, 120), w=5)
        c.ell(478, 128, 506, 152, fill=OUT, out=None)
        c.ell(320, 70, 380, 200, fill=dk, w=5)
        if blink: c.arc((400, 80, 440, 110), 10, 170, w=6)
        else:
            c.ell(400, 78, 436, 114, fill=(255, 255, 255), w=4); c.ell(414, 88, 432, 106, fill=OUT, out=None)
        c.rect(330, 180, 410, 205, fill=(220, 40, 50), r=10, w=4)
        if pose == "happy": c.pie((440, 150, 500, 200), 0, 180, fill=(230, 90, 110), w=4)
        return c.done()
    return cached(("dog", pose, round(tail, 1), blink), mk)

def dog_tail_only(t):
    c = K(140, 200); a = math.sin(t * 14) * 0.5
    c.line([(70, 190), (70 + 50 * math.sin(a), 30)], (180, 120, 50), 30)
    return c.done()

def snowman(scale=1.0, hat=True, big=False):
    def mk():
        c = K(400, 700)
        c.ell(60, 380, 340, 690, fill=SNOW, w=6)
        c.ell(100, 210, 300, 410, fill=SNOW, w=6)
        c.ell(130, 80, 270, 220, fill=SNOW, w=6)
        c.ell(165, 130, 185, 150, fill=OUT, out=None); c.ell(215, 130, 235, 150, fill=OUT, out=None)
        c.poly([(200, 160), (270, 175), (200, 182)], fill=(250, 140, 40), w=3)
        for y in (260, 310, 360): c.ell(190, y, 210, y + 20, fill=OUT, out=None)
        c.rect(110, 200, 290, 225, fill=(220, 40, 50), r=10, w=4)
        if hat: c.rect(140, 0, 260, 90, fill=(30, 30, 40), w=5); c.rect(110, 80, 290, 100, fill=(30, 30, 40), w=5)
        c.line([(110, 280), (10, 200)], (110, 70, 40), 10); c.line([(290, 280), (390, 200)], (110, 70, 40), 10)
        return c.done()
    return cached(("snowman", hat), mk)

def moose():
    def mk():
        c = K(760, 680)
        br, dk = (120, 80, 50), (80, 50, 30)
        for lx in (150, 230, 470, 550): c.rect(lx, 380, lx + 46, 660, fill=dk, w=5)
        c.ell(100, 180, 620, 450, fill=br, w=6)
        c.poly([(560, 260), (640, 120), (720, 160), (740, 300), (650, 330)], fill=br, w=6)
        c.ell(640, 260, 750, 340, fill=(140, 96, 60), w=5)
        c.ell(640, 170, 664, 194, fill=OUT, out=None)
        for s in (-1, 1):
            bx, by = 640, 120
            c.poly([(bx, by), (bx - 60 + s * 30, by - 90), (bx - 140 + s * 50, by - 70), (bx - 120 + s * 40, by - 120), (bx + 40 + s * 30, by - 100)], fill=(214, 190, 150), w=5)
        c.poly([(110, 220), (60, 160), (90, 260)], fill=br, w=4)
        return c.done()
    return cached("moose", mk)

def deer():
    def mk():
        c = K(420, 420); br = (170, 120, 80)
        for lx in (110, 150, 270, 310): c.rect(lx, 230, lx + 18, 410, fill=br, w=4)
        c.ell(80, 140, 360, 270, fill=br, w=5)
        c.poly([(320, 170), (370, 60), (410, 80), (380, 190)], fill=br, w=5)
        c.ell(350, 40, 410, 100, fill=br, w=5); c.ell(386, 56, 398, 68, fill=OUT, out=None)
        c.line([(370, 50), (350, 0)], (214, 190, 150), 8); c.line([(395, 48), (415, 0)], (214, 190, 150), 8)
        c.ell(80, 150, 110, 190, fill=(250, 250, 250), w=4)
        return c.done()
    return cached("deer", mk)

def squirrel():
    def mk():
        c = K(200, 200); col = (170, 90, 50)
        c.ell(10, 20, 100, 170, fill=col, w=5)
        c.ell(70, 80, 160, 190, fill=col, w=5); c.ell(110, 40, 180, 110, fill=col, w=5)
        c.ell(150, 60, 164, 74, fill=OUT, out=None); c.ell(130, 30, 150, 55, fill=col, w=4)
        return c.done()
    return cached("squirrel", mk)

def snowmobile(boxes=False):
    def mk():
        c = K(720, 400)
        c.line([(40, 360), (500, 360), (560, 330)], (40, 40, 48), 16)
        c.poly([(150, 300), (480, 300), (620, 230), (640, 280), (520, 340), (160, 340)], fill=(220, 40, 50), w=6)
        c.poly([(470, 300), (560, 200), (620, 230)], fill=(170, 220, 250), w=5)
        c.rect(200, 250, 420, 300, fill=(30, 30, 36), r=16, w=5)
        c.rect(120, 320, 520, 370, fill=(30, 30, 36), r=20, w=5)
        if boxes:
            for i in range(3): c.rect(60, 170 - i * 34, 210, 210 - i * 34, fill=(230, 200, 150), w=4)
        return c.done()
    return cached(("smob", boxes), mk)

def helicopter():
    def mk():
        c = K(900, 420)
        col = (96, 110, 80)
        c.rect(40, 150, 420, 190, fill=col, w=5)
        c.poly([(20, 120), (60, 120), (90, 180), (30, 190)], fill=col, w=5)
        c.ell(330, 110, 720, 330, fill=col, w=6)
        c.poly([(560, 140), (700, 150), (720, 240), (600, 230)], fill=(170, 220, 250), w=5)
        c.line([(400, 360), (720, 360)], OUT, 10); c.line([(450, 320), (430, 360)], OUT, 8); c.line([(660, 320), (680, 360)], OUT, 8)
        c.rect(500, 80, 540, 112, fill=(70, 80, 60), w=4)
        return c.done()
    return cached("heli", mk)

def crate():
    def mk():
        c = K(260, 420)
        c.pie((10, 0, 250, 220), 180, 360, fill=(240, 240, 250), w=5)
        for x in (40, 130, 220): c.line([(x, 110), (130, 300)], OUT, 3)
        c.rect(80, 290, 180, 400, fill=(180, 130, 80), w=5); c.line([(80, 345), (180, 345)], w=4)
        return c.done()
    return cached("crate", mk)

def plow():
    def mk():
        base = truck(cab=(245, 150, 30), trailer=(245, 150, 30), stripe=(30, 30, 36), lights=True)
        c = K(1300, 460)
        im = c.done().convert("RGBA")
        im.paste(base, (0, 0), base)
        d = ImageDraw.Draw(im)
        d.polygon([(1080, 250), (1240, 200), (1290, 420), (1080, 400)], fill=(230, 210, 40), outline=OUT)
        d.ellipse([1000, 60, 1040, 100], fill=(255, 170, 40))
        return im
    return cached("plow", mk)

def hero(expr="neutral", look=(0, 0), blink=False, pose="down", sweat=False):
    return person("hero", expr, look, blink, pose, sweat)

def dave(expr="happy", blink=False, pose="down", look=(0, 0)):
    def mk():
        p = person("trucker", expr, look, blink, pose, False, 0, 1, (200, 60, 50), None).copy()
        d = ImageDraw.Draw(p)
        d.chord([108, 300, 392, 470], 0, 180, fill=(110, 70, 40), outline=OUT, width=5)
        d.chord([205, 352, 295, 400], 0, 180, fill=(120, 30, 40))
        d.rounded_rectangle([110, 186, 390, 232], 18, fill=(80, 80, 90), outline=OUT, width=5)
        d.ellipse([140, 190, 230, 228], fill=(170, 220, 250), outline=OUT, width=4); d.ellipse([270, 190, 360, 228], fill=(170, 220, 250), outline=OUT, width=4)
        return p
    return cached(("dave", expr, blink, pose, look), mk)

def patterson(expr="happy", blink=False, pose="down"):
    def mk():
        p = person("person", expr, (0, 0), blink, pose, False, 0, 3, (140, 90, 170)).copy()
        d = ImageDraw.Draw(p)
        for x in (192, 308): d.ellipse([x - 48, 252, x + 48, 348], outline=OUT, width=7)
        d.line([(240, 300), (260, 300)], fill=OUT, width=7)
        return p
    return cached(("pat", expr, blink, pose), mk)

def kid(seed, expr="happy", pose="up"):
    rnd = random.Random(seed)
    return person("person", expr, (0, 0), False, pose, False, rnd.randrange(4), rnd.randrange(5),
                  rnd.choice([(240, 90, 80), (80, 150, 230), (250, 200, 60), (120, 200, 120), (230, 120, 200)]))

# ------------------------------------------------------------------ snowfall
_flake = {}
def flake_sprite(r, blur):
    k = (r, blur)
    if k not in _flake:
        s = int(r * 4 + 6); im = Image.new("RGBA", (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.ellipse([s / 2 - r, s / 2 - r, s / 2 + r, s / 2 + r], fill=(255, 255, 255, 235))
        if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
        _flake[k] = im
    return _flake[k]
def snowfall(fr, t, inten=1.0, wind=0.3, seed=1):
    if inten <= 0: return
    d = ImageDraw.Draw(fr, "RGBA"); rnd = random.Random(seed)
    for band, (n, rmin, rmax, sp, a) in enumerate(((260, 1.2, 2.4, 60, 150), (150, 2.5, 4.0, 120, 210), (40, 6, 10, 260, 255))):
        for i in range(int(n * inten)):
            x0, y0 = rnd.uniform(0, W), rnd.uniform(0, H); r = rnd.uniform(rmin, rmax); s = sp * rnd.uniform(0.7, 1.3)
            y = (y0 + t * s) % (H + 40) - 20
            x = (x0 + t * s * wind + 20 * math.sin(t * 0.8 + i)) % (W + 40) - 20
            if band < 2: d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
            else:
                sp_ = flake_sprite(int(r), 3); fr.paste(sp_, (int(x - sp_.width / 2), int(y - sp_.height / 2)), sp_)

def text(fr, s, x, y, size, fill=(255, 255, 255), t=1.0, stroke=8, anchor="mm", black=True):
    if t <= 0: return
    q = back(t / 0.28, 1.8) if t < 0.5 else 1.0
    ImageDraw.Draw(fr).text((x, y), s, font=font(max(1, int(size * q)), black), fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=OUT)

def tag(fr, s, x, y, size, t, bg=(30, 110, 200), fg=(255, 255, 255), rot=0):
    if t <= 0: return
    q = back(clamp(t / 0.3), 1.8)
    f = font(int(size), True); tw = ImageDraw.Draw(Image.new("L", (1, 1))).textlength(s, font=f)
    lay = Image.new("RGBA", (int(tw + size * 1.2), int(size * 1.8)), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    d.rounded_rectangle([0, 0, lay.width - 1, lay.height - 1], int(size * .45), fill=bg, outline=OUT, width=6)
    d.text((lay.width / 2, lay.height / 2), s, font=f, fill=fg, anchor="mm")
    put(fr, lay, x, y + lay.height / 2, q, rot)
