"""Drawing kit for Day Zero Tales long-form (1920x1080)."""
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1920, 1080, 30
OUT = (28, 20, 36)
FB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FBK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
_fc = {}
def font(s, black=False):
    k = (s, black)
    if k not in _fc:
        try: _fc[k] = ImageFont.truetype(FBK if black else FB, s)
        except OSError: _fc[k] = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", s)
    return _fc[k]

def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def ss(x): x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10)
def eout(x): x = clamp(x); return 1 - (1 - x) ** 3
def back(x, s=1.7): x = clamp(x) - 1; return x * x * ((s + 1) * x + s) + 1
def lerp(a, b, t): return a + (b - a) * t

def vgrad(w, h, top, bot, mid=None):
    t = np.linspace(0, 1, h)[:, None, None]
    a = np.array(top, float)[None, None]; b = np.array(bot, float)[None, None]
    if mid is not None:
        m = np.array(mid, float)[None, None]
        arr = np.where(t < 0.5, a + (m - a) * (t * 2), m + (b - m) * ((t - 0.5) * 2))
    else:
        arr = a + (b - a) * t
    return Image.fromarray(np.repeat(arr, w, 1).astype(np.uint8)).convert("RGB")

class K:
    """Supersampled canvas: draw in 1x coordinates, stored at 2x."""
    def __init__(self, w, h, bg=(0, 0, 0, 0), k=2, mode="RGBA", img=None):
        self.k = k; self.w, self.h = w, h
        self.im = img if img is not None else Image.new(mode, (w * k, h * k), bg)
        self.d = ImageDraw.Draw(self.im)
    def s(self, pts): return [p * self.k for p in pts]
    def rect(self, *b, fill=None, out=OUT, w=5, r=0):
        if r: self.d.rounded_rectangle(self.s(b), r * self.k, fill=fill, outline=out, width=int(w * self.k) if out else 0)
        else: self.d.rectangle(self.s(b), fill=fill, outline=out, width=int(w * self.k) if out else 0)
    def ell(self, *b, fill=None, out=OUT, w=5):
        self.d.ellipse(self.s(b), fill=fill, outline=out, width=int(w * self.k) if out else 0)
    def poly(self, pts, fill=None, out=OUT, w=5):
        flat = [c * self.k for p in pts for c in p]
        self.d.polygon(flat, fill=fill, outline=out, width=int(w * self.k) if out else 0)
    def line(self, pts, fill=OUT, w=5):
        flat = [c * self.k for p in pts for c in p]
        self.d.line(flat, fill=fill, width=int(w * self.k), joint="curve")
    def arc(self, b, a0, a1, fill=OUT, w=5): self.d.arc(self.s(b), a0, a1, fill=fill, width=int(w * self.k))
    def pie(self, b, a0, a1, fill=None, out=OUT, w=5): self.d.pieslice(self.s(b), a0, a1, fill=fill, outline=out, width=int(w * self.k) if out else 0)
    def text(self, xy, txt, size, fill=(255, 255, 255), anchor="la", stroke=0, sfill=OUT, black=False):
        self.d.text((xy[0] * self.k, xy[1] * self.k), txt, font=font(int(size * self.k), black), fill=fill, anchor=anchor,
                    stroke_width=int(stroke * self.k), stroke_fill=sfill)
    def done(self):
        return self.im.resize((self.w, self.h), Image.LANCZOS)

# ------------------------------------------------------------------ people
SKINS = [(247, 214, 186), (226, 178, 140), (176, 122, 86), (120, 80, 56)]
HAIRS = [(40, 28, 24), (120, 72, 36), (214, 170, 90), (90, 90, 96), (170, 60, 30)]
_pc = {}
def person(kind="hero", expr="neutral", look=(0, 0), blink=False, pose="down", sweat=False,
           skin=0, hair=0, shirt=(70, 110, 200), hat=None, prop=None):
    """Bean-head cartoon person. Canvas 500x820, soles at y=820."""
    if isinstance(look, bool): blink, look = look, (0, 0)
    key = (kind, expr, look, blink, pose, sweat, skin, hair, shirt, hat, prop)
    if key in _pc: return _pc[key]
    c = K(500, 820)
    sk = SKINS[skin] if kind != "hero" else (250, 236, 222)
    hc = HAIRS[hair]
    if kind == "hero":
        jacket, pants = (38, 170, 158), (40, 52, 90)
    else:
        jacket, pants = shirt, (52, 60, 84)
    def arm(pts):
        c.line(pts, OUT, 46); c.line(pts, jacket, 32)
        hx, hy = pts[-1]; c.ell(hx - 23, hy - 23, hx + 23, hy + 23, fill=sk, w=5)
    def held(name, x, y):
        if name == "phone":
            c.rect(x - 40, y - 70, x + 40, y + 60, fill=(24, 24, 30), r=12, w=5)
            c.rect(x - 31, y - 58, x + 31, y + 48, fill=(140, 215, 255), out=None, r=6)
        elif name == "coffee":
            c.rect(x - 36, y - 60, x + 36, y + 40, fill=(250, 250, 250), r=10, w=5)
            c.rect(x - 36, y - 30, x + 36, y + 5, fill=(200, 60, 50), out=None)
            c.arc((x + 22, y - 40, x + 62, y + 10), 270, 90, w=7)
        elif name == "can":
            c.rect(x - 34, y - 56, x + 34, y + 40, fill=(150, 40, 80), r=8, w=5)
            c.rect(x - 34, y - 30, x + 34, y + 10, fill=(240, 220, 200), out=None)
        elif name == "box":
            c.rect(x - 70, y - 70, x + 70, y + 40, fill=(210, 160, 96), w=5)
            c.line([(x - 70, y - 40), (x + 70, y - 40)], w=4)
        elif name == "clipboard":
            c.rect(x - 50, y - 80, x + 50, y + 50, fill=(170, 120, 70), r=8, w=5)
            c.rect(x - 38, y - 64, x + 38, y + 40, fill=(250, 250, 250), out=None)
            for i in range(4): c.line([(x - 28, y - 46 + i * 22), (x + 28, y - 46 + i * 22)], (120, 120, 140), 4)
        elif name == "nozzle":
            c.line([(x, y), (x + 40, y + 10), (x + 80, y + 4)], (40, 40, 40), 18)
            c.rect(x - 20, y - 26, x + 30, y + 26, fill=(60, 60, 64), r=6, w=5)
    # back arms for 'up'
    if pose == "up":
        arm([(130, 520), (70, 430), (80, 320)]); arm([(370, 520), (430, 430), (420, 320)])
    # legs
    c.rect(170, 690, 238, 800, fill=pants, w=5); c.rect(262, 690, 330, 800, fill=pants, w=5)
    c.rect(150, 786, 244, 820, fill=(30, 30, 34), r=14, w=4); c.rect(256, 786, 350, 820, fill=(30, 30, 34), r=14, w=4)
    # body
    c.rect(112, 470, 388, 720, fill=jacket, r=80, w=6)
    if kind == "hero":
        c.line([(250, 480), (250, 715)], (24, 130, 120), 6)
        for y in (560, 640): c.line([(125, y), (375, y)], (30, 150, 140), 5)
        c.rect(200, 462, 300, 500, fill=(30, 150, 140), r=18, w=5)
    elif kind == "nurse":
        c.rect(225, 480, 275, 560, fill=(255, 255, 255), out=None); c.rect(205, 500, 295, 540, fill=(255, 255, 255), out=None)
    elif kind == "trucker":
        c.rect(150, 480, 350, 715, fill=(200, 60, 50), r=40, w=0, out=None)
        for x in range(160, 350, 40): c.line([(x, 485), (x, 712)], (150, 40, 34), 6)
        for y in range(500, 712, 40): c.line([(150, y), (350, y)], (150, 40, 34), 6)
    elif kind == "anchor":
        c.poly([(220, 475), (280, 475), (250, 560)], fill=(250, 250, 250), w=0, out=None)
        c.poly([(242, 490), (258, 490), (264, 600), (250, 620), (236, 600)], fill=(200, 40, 50), w=3)
    if pose == "down":
        arm([(128, 520), (102, 610), (98, 690)]); arm([(372, 520), (398, 610), (402, 690)])
    elif pose == "phone":
        arm([(128, 520), (102, 610), (98, 690)])
        held("phone", 300, 520); arm([(372, 520), (380, 640), (300, 600)])
    elif pose in ("hold", "coffee", "can", "box", "clipboard"):
        thing = {"hold": None, "coffee": "coffee", "can": "can", "box": "box", "clipboard": "clipboard"}[pose]
        if pose == "box":
            held("box", 250, 600); arm([(128, 520), (150, 630), (185, 600)]); arm([(372, 520), (350, 630), (315, 600)])
        else:
            arm([(128, 520), (102, 610), (98, 690)])
            if thing: held(thing, 310, 560)
            arm([(372, 520), (390, 660), (310, 620)])
    elif pose == "point":
        arm([(128, 520), (102, 610), (98, 690)]); arm([(372, 520), (450, 470), (490, 430)])
    elif pose == "push":
        arm([(128, 520), (200, 600), (300, 590)]); arm([(372, 520), (430, 600), (480, 590)])
    elif pose == "wave":
        arm([(128, 520), (102, 610), (98, 690)]); arm([(372, 520), (440, 430), (430, 320)])
    elif pose == "nozzle":
        arm([(128, 520), (102, 610), (98, 690)]); arm([(372, 520), (430, 600), (470, 580)]); held("nozzle", 470, 580)
    elif pose == "shrug":
        arm([(128, 520), (70, 560), (50, 480)]); arm([(372, 520), (430, 560), (450, 480)])
    # head
    c.ell(76, 260, 114, 336, fill=sk, w=5); c.ell(386, 260, 424, 336, fill=sk, w=5)
    c.ell(90, 120, 410, 450, fill=sk, w=6)
    if kind == "hero":
        c.pie((96, 70, 404, 360), 180, 360, fill=(242, 122, 40), w=6)
        c.rect(84, 196, 416, 240, fill=(220, 96, 26), r=18, w=5)
        c.ell(225, 40, 275, 90, fill=(242, 122, 40), w=5)
        for x in range(130, 380, 36): c.line([(x, 120 if 160 < x < 340 else 150), (x, 194)], (215, 100, 30), 4)
    else:
        if hat == "cap":
            c.pie((96, 90, 404, 340), 180, 360, fill=(40, 70, 150), w=6)
            c.poly([(250, 205), (440, 205), (450, 228), (250, 228)], fill=(30, 56, 120), w=5)
            c.rect(150, 150, 260, 200, fill=(250, 250, 250), out=None, r=8)
        elif hat == "nurse":
            c.pie((100, 110, 400, 330), 180, 360, fill=hc, w=0, out=None)
            c.rect(170, 92, 330, 150, fill=(255, 255, 255), r=12, w=5)
            c.rect(238, 104, 262, 140, fill=(220, 40, 50), out=None); c.rect(226, 116, 274, 128, fill=(220, 40, 50), out=None)
        else:
            c.pie((92, 110, 408, 330), 180, 360, fill=hc, w=0, out=None)
            c.poly([(96, 230), (150, 150), (250, 128), (360, 150), (404, 230), (330, 190), (180, 196)], fill=hc, out=None)
            if hair == 4: c.ell(320, 120, 420, 230, fill=hc, out=None)
    scared = expr in ("scared", "shock")
    for ex in (192, 308):
        ey = 300
        if blink:
            c.arc((ex - 36, ey - 18, ex + 36, ey + 18), 10, 170, w=6); continue
        ry = 54 if scared else 46
        if expr == "happy":
            c.arc((ex - 34, ey - 24, ex + 34, ey + 24), 200, 340, w=8); continue
        c.ell(ex - 40, ey - ry, ex + 40, ey + ry, fill=(255, 255, 255), w=5)
        pr = 10 if scared else 17
        px, py = ex + look[0] * 14, ey + look[1] * 14
        c.ell(px - pr, py - pr, px + pr, py + pr, fill=OUT, out=None)
        c.ell(px - pr * .3 + 3, py - pr * .7, px + pr * .3 + 3, py - pr * .15, fill=(255, 255, 255), out=None)
    if expr in ("neutral", "happy"):
        br = [(160, 236, 226, 232), (274, 232, 340, 236)]
    elif expr == "sad":
        br = [(160, 228, 226, 244), (274, 244, 340, 228)]
    elif expr == "annoyed":
        br = [(160, 236, 226, 250), (274, 250, 340, 236)]
    else:
        lift = 14 if scared else 0
        br = [(156, 244 - lift, 226, 222 - lift), (274, 222 - lift, 344, 244 - lift)]
    for b in br: c.line([b[:2], b[2:]], OUT, 10)
    if expr == "neutral": c.arc((222, 352, 278, 386), 20, 160, w=6)
    elif expr == "happy":
        c.pie((210, 340, 290, 400), 0, 180, fill=(120, 30, 40), w=5)
    elif expr in ("worried", "annoyed"):
        c.line([(214, 380), (230, 370), (246, 380), (262, 370), (278, 380), (288, 374)], OUT, 6)
    elif expr == "sad": c.arc((222, 372, 278, 404), 200, 340, w=6)
    else:
        hh = 64 if expr == "shock" else 46
        c.ell(216, 352, 284, 352 + hh, fill=(110, 26, 40), w=5)
        c.ell(232, 352 + hh * .55, 268, 352 + hh - 4, fill=(226, 96, 110), out=None)
    if sweat:
        c.poly([(398, 226), (384, 260), (394, 276), (410, 270), (414, 254)], fill=(150, 210, 255), w=4)
    im = c.done(); _pc[key] = im
    return im

def put(fr, spr, cx, footy, scale=1.0, rot=0.0, flip=False):
    s = spr
    if flip: s = s.transpose(Image.FLIP_LEFT_RIGHT)
    if scale != 1.0: s = s.resize((max(1, int(s.width * scale)), max(1, int(s.height * scale))), Image.BILINEAR)
    if rot: s = s.rotate(rot, Image.BICUBIC, expand=True)
    fr.paste(s, (int(cx - s.width / 2), int(footy - s.height)), s)

def blink_at(t, seed=0): return ((t + seed * 1.37) % 3.3) < 0.12

# ------------------------------------------------------------------ vehicles
_vc = {}
def truck(cab=(210, 50, 50), trailer=(244, 244, 248), stripe=(60, 120, 200), lights=False, logo=""):
    key = (cab, trailer, stripe, lights, logo)
    if key in _vc: return _vc[key]
    c = K(1100, 460)
    c.rect(20, 40, 760, 360, fill=trailer, r=12, w=6)
    c.rect(20, 250, 760, 280, fill=stripe, out=None)
    if logo: c.text((390, 150), logo, 70, fill=stripe, anchor="mm", black=True)
    c.rect(760, 300, 800, 340, fill=(60, 60, 66), w=4)
    c.poly([(800, 120), (960, 120), (1060, 230), (1070, 360), (800, 360)], fill=cab, w=6)
    c.poly([(840, 140), (950, 140), (1020, 225), (840, 225)], fill=(170, 220, 250), w=5)
    c.rect(800, 100, 830, 360, fill=tuple(int(v * .8) for v in cab), w=5)
    c.rect(1040, 300, 1080, 340, fill=(250, 220, 120) if lights else (230, 230, 230), r=6, w=4)
    c.rect(1000, 250, 1060, 270, fill=(60, 60, 66), out=None)
    for x in (120, 230, 560, 670, 900, 1010):
        c.ell(x - 52, 312, x + 52, 416, fill=(36, 36, 40), w=5)
        c.ell(x - 22, 342, x + 22, 386, fill=(170, 170, 176), w=4)
    im = c.done(); _vc[key] = im
    return im

def car(col=(90, 140, 220)):
    key = ("car", col)
    if key in _vc: return _vc[key]
    c = K(520, 240)
    c.poly([(20, 150), (60, 100), (150, 90), (210, 30), (360, 30), (430, 95), (500, 110), (505, 175), (20, 180)], fill=col, w=6)
    c.poly([(230, 45), (340, 45), (395, 95), (220, 95)], fill=(170, 220, 250), w=5)
    c.line([(310, 45), (310, 95)], w=6)
    for x in (120, 410):
        c.ell(x - 42, 140, x + 42, 224, fill=(36, 36, 40), w=5); c.ell(x - 16, 166, x + 16, 198, fill=(180, 180, 186), w=4)
    c.rect(480, 120, 505, 140, fill=(255, 230, 140), r=5, w=3)
    im = c.done(); _vc[key] = im
    return im

# ------------------------------------------------------------------ scenery
def pine(c, x, y, h, col):
    w = h * .42
    for i in range(4):
        yy = y - h * (.18 + i * .22); ww = w * (1 - i * .2)
        c.poly([(x - ww, yy + h * .25), (x + ww, yy + h * .25), (x, yy - h * .22)], fill=col, out=None)

def hills(c, y, col, amp=60, seed=1, w=W):
    rnd = random.Random(seed); pts = [(0, y + 400)]
    for i in range(0, w + 81, 80): pts.append((i, y - amp * (0.5 + 0.5 * math.sin(i * 0.004 + seed) * rnd.uniform(.6, 1))))
    pts.append((w, y + 400)); c.poly(pts, fill=col, out=None)

def cloud(c, x, y, s, col=(255, 255, 255)):
    for dx, dy, r in ((0, 0, 60), (60, -20, 70), (130, 0, 55), (65, 20, 60)):
        c.ell(x + dx * s - r * s, y + dy * s - r * s, x + dx * s + r * s, y + dy * s + r * s, fill=col, out=None)

def building(c, x, y, w, h, col, win=(255, 220, 140), lit=0.5, seed=0):
    c.rect(x, y - h, x + w, y, fill=col, w=5)
    rnd = random.Random(seed)
    for yy in range(int(y - h + 24), int(y - 40), 46):
        for xx in range(int(x + 18), int(x + w - 30), 44):
            c.rect(xx, yy, xx + 24, yy + 28, fill=win if rnd.random() < lit else tuple(int(v * .6) for v in col), out=None)

SKY_DAY = ((120, 190, 245), (200, 232, 250))
SKY_DAWN = ((70, 60, 130), (250, 170, 120), (170, 100, 140))
SKY_NIGHT = ((10, 14, 40), (40, 50, 96))
SKY_GRAY = ((140, 146, 160), (196, 198, 204))

def sky(top_bot, w=W, h=H):
    if len(top_bot) == 3: return vgrad(w, h, top_bot[0], top_bot[1], top_bot[2]) if False else vgrad(w, h, top_bot[0], top_bot[2], top_bot[1])
    return vgrad(w, h, *top_bot)

# ------------------------------------------------------------------ fx
def glow(fr, x, y, r, col, a):
    if a <= 0.02: return
    lay = Image.new("RGBA", (int(r * 2), int(r * 2)), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    for i in range(7, 0, -1):
        rr = r * i / 7
        ld.ellipse([r - rr, r - rr, r + rr, r + rr], fill=col + (int(a * 255 * (0.1 + 0.9 * (1 - i / 7) ** 2)),))
    fr.paste(lay, (int(x - r), int(y - r)), lay)

def stamp(fr, txt, cx, cy, t, size=150, col=(220, 40, 50), rot=-8):
    if t < 0: return
    q = back(t / 0.28, 2.2)
    sc = 1.8 - 0.8 * q
    f = font(int(size), True)
    d0 = ImageDraw.Draw(Image.new("L", (1, 1)))
    tw = d0.textlength(txt, font=f)
    lay = Image.new("RGBA", (int(tw + 80), int(size * 1.5)), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    ld.rounded_rectangle([6, 6, lay.width - 6, lay.height - 6], 20, outline=col, width=12)
    ld.text((lay.width / 2, lay.height / 2), txt, font=f, fill=col, anchor="mm")
    lay = lay.rotate(rot, Image.BICUBIC, expand=True)
    lay = lay.resize((max(1, int(lay.width * sc)), max(1, int(lay.height * sc))), Image.BILINEAR)
    a = np.asarray(lay).copy(); a[..., 3] = (a[..., 3] * min(1, t / 0.12)).astype(np.uint8)
    lay = Image.fromarray(a)
    fr.paste(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2)), lay)

def vignette(strength=0.55):
    y, x = np.mgrid[0:H, 0:W]
    r = np.sqrt(((x - W / 2) / (W * .62)) ** 2 + ((y - H / 2) / (H * .62)) ** 2)
    return (1 - strength * np.clip(r - .45, 0, 1) ** 1.5)[..., None].astype(np.float32)
