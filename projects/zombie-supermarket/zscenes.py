import sys, json, math, random
sys.path.insert(0, "/root/shorts/snow")
from functools import lru_cache
from snowlib import *
from lib import person, put, car, truck, font, building, SKINS
def ein(x): x = clamp(x); return x * x * x

S = json.load(open("sentences.json"))
VEND = S[-1]["end"]
DUR = round(VEND + 6.0, 2)
def T(i): return S[i]["start"]
def E(i): return S[i]["end"]
def path(lt, d, a, b, ease=ss):
    k = ease(lt / max(d, 0.1)); return Cam(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k))

# ================================================================ characters
def alex(expr="neutral", look=(0, 0), blink=False, pose="down", sweat=False): return hero(expr, look, blink, pose, sweat)
def mom(expr="worried", blink=False, pose="down"): return person("person", expr, (0, 0), blink, pose, False, 1, 1, (200, 90, 120))
def girl(expr="worried", blink=False, pose="down"): return person("person", expr, (0, 0), blink, pose, False, 0, 2, (250, 200, 60))
def oldman(expr="worried", blink=False, pose="down"): return person("person", expr, (0, 0), blink, pose, False, 0, 3, (130, 110, 90))
def teen1(expr="worried", blink=False, pose="down"): return person("person", expr, (0, 0), blink, pose, False, 2, 0, (80, 150, 90))
def teen2(expr="worried", blink=False, pose="down"): return person("person", expr, (0, 0), blink, pose, False, 1, 4, (90, 120, 220))
def staff(expr="worried", blink=False, pose="down", bite=False):
    def mk():
        p = person("person", expr, (0, 0), blink, pose, False, 3, 0, (40, 90, 200)).copy(); d = ImageDraw.Draw(p)
        d.rounded_rectangle([280, 520, 360, 556], 8, fill=(250, 210, 60), outline=OUT, width=4)
        d.text((320, 538), "STAFF", font=font(18, True), fill=OUT, anchor="mm")
        if bite: d.ellipse([360, 610, 410, 650], fill=(200, 30, 40), outline=OUT, width=3)
        return p
    return cached(("staff", expr, blink, pose, bite), mk)
def jacket(expr="annoyed", blink=False, pose="down", bat=False):
    def mk():
        p = person("person", expr, (0, 0), blink, pose, False, 0, 0, (30, 30, 38)).copy()
        if bat:
            d = ImageDraw.Draw(p); d.line([(400, 680), (470, 380)], fill=(170, 170, 180), width=26); d.line([(400, 680), (470, 380)], fill=OUT, width=4)
        return p
    return cached(("jacket", expr, blink, pose, bat), mk)
def zombie(seed=0, flip=False, step=0.0):
    def mk():
        rnd = random.Random(seed)
        p = person("person", rnd.choice(["shock", "annoyed", "sad"]), (0, 0), False, "push", False, rnd.randrange(4), rnd.randrange(5),
                   rnd.choice([(90, 80, 70), (70, 80, 100), (100, 70, 70), (80, 90, 70), (110, 100, 120)])).copy()
        a = np.asarray(p).astype(np.int16); rgb = a[..., :3]
        mask = np.zeros(rgb.shape[:2], bool)
        for sk in SKINS: mask |= (np.abs(rgb - np.array(sk)).sum(axis=2) < 40)
        a[mask, 0] = 120; a[mask, 1] = 170; a[mask, 2] = 110
        p = Image.fromarray(a.clip(0, 255).astype(np.uint8)); d = ImageDraw.Draw(p)
        for ex in (192, 308):
            d.ellipse([ex - 22, 282, ex + 22, 318], fill=(250, 250, 200))
        for k in range(3):
            x, y = rnd.uniform(150, 330), rnd.uniform(520, 680); d.polygon([(x, y), (x + 30, y + 10), (x + 10, y + 34)], fill=(40, 30, 30))
        return p
    return cached(("zombie", seed), mk)

# ================================================================ props
@lru_cache(None)
def cart():
    c = K(420, 340)
    c.poly([(40, 40), (400, 40), (360, 220), (80, 220)], fill=None, w=10)
    for x in range(80, 380, 50): c.line([(x, 45), (x + 10 * (x > 220) - 10 * (x < 220), 215)], (120, 130, 140), 5)
    for y in (90, 150): c.line([(55, y), (385, y)], (120, 130, 140), 5)
    c.line([(400, 40), (420, 0)], w=10); c.line([(80, 220), (100, 280), (340, 280)], w=8)
    for x in (110, 320): c.ell(x - 26, 274, x + 26, 326, fill=(40, 40, 46), w=5)
    return c.done()
@lru_cache(None)
def phone_nosig():
    c = K(380, 720); c.rect(20, 20, 360, 700, fill=(20, 20, 26), r=50, w=8); c.rect(44, 70, 336, 650, fill=(30, 40, 70), r=24, out=None)
    c.text((190, 250), "NO", 80, fill=(255, 80, 90), anchor="mm", black=True); c.text((190, 340), "SIGNAL", 60, fill=(255, 80, 90), anchor="mm", black=True)
    for k in range(4): c.rect(120 + k * 40, 480 - k * 30, 145 + k * 40, 500, fill=(80, 80, 100), out=None)
    c.line([(110, 520), (290, 400)], (255, 80, 90), 10); return c.done()
@lru_cache(None)
def radio():
    c = K(360, 300); c.rect(20, 80, 340, 280, fill=(60, 64, 70), r=20, w=6); c.line([(280, 80), (320, 0)], w=8)
    c.ell(50, 120, 170, 240, fill=(30, 30, 34), w=5)
    for y in range(130, 240, 18): c.line([(60, y), (160, y)], (80, 80, 90), 4)
    c.rect(200, 120, 320, 170, fill=(120, 220, 140), w=4); c.ell(220, 200, 260, 240, fill=(200, 60, 60), w=4)
    return c.done()
@lru_cache(None)
def bat_spr():
    c = K(120, 500); c.line([(60, 480), (60, 30)], (170, 170, 180), 34); c.line([(60, 480), (60, 380)], OUT, 22); return c.done()
@lru_cache(None)
def cans():
    c = K(700, 300)
    for i in range(7):
        x = 30 + i * 95; col = [(200, 60, 50), (60, 120, 200), (230, 190, 60)][i % 3]
        c.rect(x, 120, x + 80, 290, fill=col, r=10, w=5); c.rect(x, 170, x + 80, 230, fill=(240, 230, 210), out=None)
    c.rect(20, 0, 160, 290, fill=(240, 200, 80), w=5); c.text((90, 150), "CEREAL", 26, fill=(160, 40, 40), anchor="mm", black=True)
    return c.done()
@lru_cache(None)
def bite_arm():
    c = K(900, 500); c.rect(0, 150, 900, 360, fill=(80, 150, 90), r=40, w=8)
    c.rect(500, 150, 900, 360, fill=(240, 200, 170), r=40, w=8)
    for k in range(6): c.ell(620 + k * 26, 220 + (k % 2) * 30, 640 + k * 26, 240 + (k % 2) * 30, fill=(180, 30, 40), out=None)
    c.ell(600, 200, 800, 320, fill=None, w=6)
    return c.done()

# ================================================================ layers
def lot(c, gy):
    c.rect(-10, gy, LW + 10, LH + 10, fill=(56, 58, 70), out=None)
    for x in range(-100, LW, 240): c.line([(x, gy + 60), (x - 80, LH)], (230, 230, 230), 8)
@lru_cache(None)
def L_store(night=True, crowd=False):
    def f(c):
        lot(c, 1000)
        c.rect(150, 380, 2250, 1000, fill=(70, 90, 150) if night else (90, 120, 190), w=8)
        c.rect(130, 340, 2270, 400, fill=(40, 50, 90), w=8)
        c.rect(800, 160, 1600, 330, fill=(240, 240, 250), r=30, w=8)
        c.text((1200, 245), "MEGA MART", 120, fill=(30, 110, 220), anchor="mm", black=True)
        for x in (300, 520, 1800, 2020): c.rect(x, 520, x + 180, 760, fill=(255, 220, 140) if night else (170, 210, 240), w=6)
        c.rect(1000, 600, 1400, 1000, fill=(170, 210, 240), w=8); c.line([(1200, 600), (1200, 1000)], w=6)
        for x in (200, 2200): c.rect(x, 300, x + 24, 1000, fill=(80, 80, 90), out=None); c.ell(x - 30, 280, x + 54, 320, fill=(255, 240, 180), w=4)
    return layer(f)
@lru_cache(None)
def L_aisles(dark=False):
    def f(c):
        c.rect(0, 0, LW, LH, fill=(200, 205, 214) if not dark else (88, 92, 118), out=None)
        c.rect(0, 1050, LW, LH, fill=(220, 222, 228) if not dark else (100, 102, 122), out=None)
        for x in range(100, LW, 400): c.rect(x, 40, x + 250, 70, fill=(250, 250, 240) if not dark else (60, 60, 70), out=None)
        for k, x in enumerate((-200, 700, 1600)):
            c.rect(x, 380, x + 700, 1060, fill=(230, 232, 240) if not dark else (130, 134, 156), w=8)
            for r in range(4):
                y = 430 + r * 160
                c.rect(x + 10, y + 120, x + 690, y + 136, fill=(140, 146, 160), out=None)
                for i in range(12):
                    col = [(220, 60, 50), (240, 190, 60), (60, 120, 210), (90, 190, 110), (230, 120, 200)][(i + r + k) % 5]
                    if dark: col = tuple(int(v * .7) for v in col)
                    c.rect(x + 20 + i * 56, y + 20, x + 64 + i * 56, y + 120, fill=col, w=3)
    return layer(f, rgba=False)
@lru_cache(None)
def L_shelf_front(dark=False):
    def f(c):
        c.rect(1900, 200, 2420, LH, fill=(230, 232, 240) if not dark else (120, 124, 146), w=8)
        for r in range(6):
            y = 260 + r * 180; c.rect(1910, y + 140, 2420, y + 156, fill=(140, 146, 160), out=None)
            for i in range(8):
                col = [(220, 60, 50), (240, 190, 60), (60, 120, 210), (90, 190, 110)][(i + r) % 4]
                if dark: col = tuple(int(v * .7) for v in col)
                c.rect(1930 + i * 60, y + 30, 1980 + i * 60, y + 140, fill=col, w=3)
    return layer(f)
@lru_cache(None)
def L_glass_inside(cracked=False):
    def f(c):
        c.rect(0, 0, LW, 200, fill=(70, 90, 150), out=None); c.rect(0, 1150, LW, LH, fill=(220, 222, 228), out=None)
        c.rect(0, 0, 200, LH, fill=(70, 90, 150), out=None); c.rect(2200, 0, LW, LH, fill=(70, 90, 150), out=None)
        for x in (200, 1200, 2200): c.rect(x - 14, 200, x + 14, 1150, fill=(60, 64, 70), out=None)
        c.rect(200, 200, 2200, 1150, fill=None, w=12)
        if cracked:
            for cx, cy in ((800, 600), (1600, 500)):
                for k in range(8):
                    a = k * 0.8; c.line([(cx, cy), (cx + 260 * math.cos(a), cy + 260 * math.sin(a))], (230, 240, 255), 5)
    return layer(f)
@lru_cache(None)
def L_glass_tint():
    im = Image.new("RGBA", (LW, LH), (120, 160, 210, 40)); return im
@lru_cache(None)
def L_outside_day():
    def f(c): lot(c, 900)
    img = sky("day").convert("RGBA"); over = layer(f); img.paste(over, (0, 0), over); return img
@lru_cache(None)
def L_outside_night():
    def f(c):
        lot(c, 900)
        for x in (300, 1500, 2100): put_dummy = None
    img = sky("night", moon=True, stars=True).convert("RGBA")
    over = layer(f); img.paste(over, (0, 0), over); return img
@lru_cache(None)
def L_storage(flash=False):
    def f(c):
        c.rect(0, 0, LW, LH, fill=(96, 96, 118), out=None); c.rect(0, 1100, LW, LH, fill=(110, 104, 112), out=None)
        for x in (200, 600, 1700, 2050):
            for k in range(3): c.rect(x, 700 + k * 130, x + 260, 830 + k * 130, fill=(110, 84, 60), w=5)
        c.rect(1000, 300, 1500, 1110, fill=(90, 96, 110), w=10); c.ell(1420, 680, 1460, 720, fill=(200, 200, 210), out=None)
        # handprint
        hx, hy = 1180, 620
        c.ell(hx - 50, hy - 40, hx + 50, hy + 70, fill=(160, 20, 30), out=None)
        for k, (dx, l) in enumerate(((-45, 90), (-18, 115), (10, 120), (38, 100))): c.rect(hx + dx - 11, hy - 40 - l, hx + dx + 11, hy - 30, fill=(160, 20, 30), r=10, out=None)
        c.rect(hx + 45, hy - 10, hx + 110, hy + 14, fill=(160, 20, 30), r=10, out=None)
        for x, y, a in ((500, 1200, 20), (800, 1240, -30), (1700, 1220, 50)):
            c.poly([(x, y), (x + 150, y - 20), (x + 170, y + 60), (x + 10, y + 80)], fill=(140, 110, 80), w=4)
    return layer(f, rgba=False)
@lru_cache(None)
def L_office():
    def f(c):
        c.rect(0, 0, LW, LH, fill=(120, 110, 100), out=None); c.rect(0, 1100, LW, LH, fill=(90, 80, 74), out=None)
        c.rect(300, 250, 1100, 800, fill=(30, 40, 70), w=12)
        c.rect(1600, 350, 2000, 1110, fill=(170, 60, 50), w=10); c.rect(1940, 700, 1970, 760, fill=(220, 200, 80), out=None)
        c.rect(1650, 200, 1950, 300, fill=(30, 160, 80), r=10, w=6); c.text((1800, 250), "EXIT", 70, fill=(255, 255, 255), anchor="mm", black=True)
        c.rect(400, 900, 1200, 1100, fill=(140, 100, 70), w=6)
    return layer(f, rgba=False)
@lru_cache(None)
def L_dock(dark=True):
    def f(c):
        c.rect(0, 0, LW, LH, fill=(110, 112, 130), out=None); c.rect(0, 1100, LW, LH, fill=(120, 116, 124), out=None)
        c.rect(600, 250, 1800, 1110, fill=(110, 114, 124), w=10)
        for y in range(290, 1100, 60): c.line([(610, y), (1790, y)], (90, 94, 104), 6)
        c.rect(600, 960, 1800, 1110, fill=(10, 10, 14), out=None)
        c.rect(150, 200, 400, 300, fill=(200, 160, 40), w=5); c.text((275, 250), "DOCK", 60, fill=OUT, anchor="mm", black=True)
    return layer(f, rgba=False)
@lru_cache(None)
def L_tunnel():
    def f(c):
        c.rect(0, 0, LW, LH, fill=(78, 84, 98), out=None)
        for y in (150, 260): c.rect(-10, y, LW + 10, y + 60, fill=(70, 80, 90), w=5)
        c.rect(-10, 1050, LW + 10, LH, fill=(92, 92, 100), out=None)
        for x in range(0, LW, 380): c.rect(x, 330, x + 30, 1050, fill=(60, 64, 72), out=None)
    return layer(f, rgba=False)
@lru_cache(None)
def L_cab():
    def f(c):
        c.rect(0, 0, LW, LH, fill=(90, 92, 106), out=None)
        c.poly([(200, 120), (2200, 120), (2050, 640), (350, 640)], fill=(120, 80, 70), w=10)
        c.rect(0, 900, LW, LH, fill=(60, 56, 60), w=8)
        c.rect(300, 640, 2100, 700, fill=(50, 50, 56), w=6)
        c.ell(500, 720, 820, 1040, fill=None, w=24)
    return layer(f, rgba=False)

def tint(fr, col, a):
    if a <= 0: return fr
    return Image.blend(fr, Image.new("RGB", (W, H), col), a)
def red_alarm(fr, t, amt=0.35):
    k = 0.5 + 0.5 * math.sin(t * 7)
    return Image.blend(fr, Image.new("RGB", (W, H), (200, 30, 40)), amt * 0.5 * k)
def flashlight(fr, cx, cy, r=420):
    mask = Image.new("L", (W, H), 110); d = ImageDraw.Draw(mask)
    for k in range(12, 0, -1): d.ellipse([cx - r * k / 12, cy - r * k / 12, cx + r * k / 12, cy + r * k / 12], fill=int(110 * (k / 12) ** 2))
    dark = Image.new("RGB", (W, H), (4, 4, 10)); return Image.composite(dark, fr, mask)
def shake(fr, t, amt=10):
    dx, dy = int(amt * math.sin(t * 47)), int(amt * math.cos(t * 53))
    return fr.transform(fr.size, Image.AFFINE, (1, 0, dx, 0, 1, dy))
def zcrowd(fr, cam, t, n, y0, y1, z, scale, seed=0, x0=0, x1=LW, sway=1.0):
    rnd = random.Random(seed)
    items = sorted([(rnd.uniform(y0, y1), rnd.uniform(x0, x1), rnd.randrange(12)) for _ in range(n)])
    for y, x, s in items:
        put_at(fr, cam, zombie(s), x + 20 * math.sin(t * 1.3 + s) * sway, y, z, scale * (0.7 + 0.3 * (y - y0) / max(1, y1 - y0)), rot=4 * math.sin(t * 2 + s))

# ================================================================ scenes
SC = []
def scene(i0, interior=False):
    def deco(fn): SC.append((T(i0) - 0.12 if i0 > 0 else 0.0, fn)); return fn
    return deco

@scene(0)
def z_arrive(t, lt, d, fi):
    cam = path(lt, d, (-0.3, 0.2, 1.0), (0.1, 0, 1.08))
    fr = compose([(sky("sunset"), 6), (L_store(False), 1.5)], cam)
    for k, x in enumerate((300, 700, 1700, 2100)): put_at(fr, cam, car([(220, 70, 60), (80, 120, 200), (230, 200, 70), (200, 200, 210)][k]), x, 1250, 1.2, 0.9)
    x = lerp(800, 1150, clamp(lt / d))
    put_at(fr, cam, alex("happy", (0, 0), blink_at(t)), x, 1260, 1.2, 0.6)
    return fr

@scene(2)
def z_attack(t, lt, d, fi):
    cam = path(lt, d, (0.2, 0.1, 1.0), (-0.2, 0, 1.1))
    fr = compose([(sky("sunset"), 6), (L_store(False), 2.2)], cam)
    put_at(fr, cam, car((200, 200, 210)), 1500, 1200, 1.4, 1.0, rot=-6)
    for k in range(3):
        x = (lt * 500 + k * 700) % 2600 - 100
        put_at(fr, cam, person("person", "scared", (1, 0), False, "up", True, k, k + 1, [(90, 150, 220), (220, 90, 120), (240, 180, 40)][k]), x, 1280, 1.2, 0.55)
        put_at(fr, cam, zombie(k + 3), x - 260, 1290, 1.2, 0.58, rot=5 * math.sin(t * 4 + k))
    if t > T(5) - 0.05: fr = tint(fr, (200, 0, 20), 0.25 * (1 - clamp((t - T(5)) / 0.8))); text(fr, "THEY'RE BITING", 960, 160, 90, (255, 60, 60), t - T(5))
    return shake(fr, t, 5)

@scene(6)
def z_inside(t, lt, d, fi):
    cam = path(lt, d, (0, 0, 1.0), (0, 0, 1.18))
    fr = compose([(L_outside_day(), 3)], cam)
    zcrowd(fr, cam, t, 6, 1000, 1200, 2.2, 0.5, 1)
    k = clamp((t - T(6)) / 1.5)
    fr = compose([(L_glass_inside(), 1.0)], cam, fr)
    dd = ImageDraw.Draw(fr)
    gap = int(lerp(500, 0, ss(k)))
    if gap > 0:
        sx, sy, zl = proj(cam, 1200, 680, 1.0)
        dd.rectangle([sx - gap * zl * 0.8, 160, sx + gap * zl * 0.8, 920], fill=(20, 30, 50))
    put_at(fr, cam, alex("shock" if t < T(7) else "worried", (-1, 0), blink_at(t), "down", True), 1200, 1220, 0.9, 0.9)
    if t > T(8) - 0.05: fr = tint(fr, (0, 0, 0), 0.12 * clamp((t - T(8)) / 0.6))
    return fr

@scene(9)
def z_title(t, lt, d, fi):
    cam = path(lt, d, (0, -0.2, 1.08), (0, 0.1, 1.0))
    fr = compose([(sky("night", moon=True, stars=True), 6), (L_store(True), 1.6)], cam)
    zcrowd(fr, cam, t, 28, 1080, 1340, 1.6, 0.42, 2)
    fr = tint(fr, (20, 0, 30), 0.08)
    text(fr, "30 DAYS", 960, 440, 170, (255, 255, 255), lt - 0.3, 12)
    if t > T(10) - 0.1: text(fr, "TRAPPED", 960, 600, 120, (255, 60, 60), t - T(10), 10)
    return fr

@scene(11)
def z_alarm(t, lt, d, fi):
    cam = path(lt, d, (-0.3, 0, 1.0), (0.2, 0, 1.08))
    if t < T(14) - 0.1:
        fr = compose([(L_aisles(), 1.6), (L_shelf_front(), 0.9)], cam)
        put_at(fr, cam, alex("worried" if t > T(13) else "neutral", (1, 0), blink_at(t), "hold"), 1000, 1170, 1.3, 0.75)
        if t > T(13) - 0.1: fr = red_alarm(fr, t, 0.4)
        return fr
    fr = compose([(L_outside_day(), 3)], cam)
    for k in range(4):
        x = (lt * 400 + k * 600) % 2400
        put_at(fr, cam, person("person", "scared", (1, 0), False, "up", True, k % 4, k, [(90, 150, 220), (220, 90, 120), (240, 180, 40), (120, 200, 120)][k]), x, 1100, 2.0, 0.45)
        put_at(fr, cam, zombie(k + 5), x - 220, 1110, 2.0, 0.47)
    fr = compose([(L_glass_tint(), 1.2), (L_glass_inside(), 1.0)], cam, fr)
    return red_alarm(fr, t, 0.2)

@scene(15)
def z_barricade(t, lt, d, fi):
    cam = path(lt, d, (0, 0.1, 1.0), (0, 0, 1.08))
    fr = compose([(L_outside_day(), 3)], cam)
    zcrowd(fr, cam, t, 8, 1000, 1150, 2.0, 0.5, 3)
    fr = compose([(L_glass_inside(), 1.0)], cam, fr)
    for k in range(5):
        tk = clamp((t - T(15) - k * 0.5) / 0.6)
        put_at(fr, cam, cart(), lerp(-300, 500 + k * 340, eout(tk)), 1180 + (k % 2) * 40, 1.0, 0.75)
    for k, spr in enumerate((alex("worried", (1, 0), blink_at(t), "push", True), teen1("worried", False, "push"), staff("worried", False, "push"), oldman("worried", False, "push"))):
        put_at(fr, cam, spr, 600 + k * 380, 1360, 0.9, 0.62)
    return red_alarm(fr, t, 0.15)

@scene(16)
def z_lineup(t, lt, d, fi):
    cam = path(lt, d, (-0.4, 0, 1.05), (0.4, 0, 1.05))
    fr = compose([(L_aisles(), 1.6)], cam)
    peeps = [(17, mom("worried", blink_at(t)), "MOTHER", 350), (17, girl("worried", blink_at(t, 1)), "DAUGHTER", 620), (18, oldman("worried", blink_at(t, 2)), "OLD MAN", 900),
             (19, teen1("neutral", blink_at(t, 3)), "", 1170), (19, teen2("neutral", blink_at(t, 4)), "TEENAGERS", 1400), (20, staff("neutral", blink_at(t, 5)), "EMPLOYEE", 1700),
             (21, jacket("annoyed", blink_at(t, 6)), "???", 2050)]
    for i, spr, lab, x in peeps:
        if t > T(i) - 0.1:
            q = back(clamp((t - T(i) + 0.1) / 0.35), 1.8)
            sc = 0.42 if lab == "DAUGHTER" else 0.6
            put_at(fr, cam, spr, x, 1250, 1.3, sc * q)
            if lab:
                sx, sy, _ = proj(cam, x, 650, 1.3); tag(fr, lab, sx, sy - 40, 38, t - T(i), (30, 30, 40) if lab == "???" else (30, 110, 200))
    return fr

@scene(22)
def z_nosignal(t, lt, d, fi):
    if t < T(23) - 0.1:
        fr = compose([(L_aisles(), 1.6)], Cam(0, 0, 1.2))
        fr = Image.blend(fr, Image.new("RGB", (W, H), (10, 10, 20)), 0.6)
        put(fr, phone_nosig(), 960, 1000 + 8 * math.sin(t * 3), 1.2, 4 * math.sin(t * 2))
        return fr
    cam = path(t - T(23), E(24) - T(23), (0, -0.3, 1.1), (0, 0.2, 1.0))
    fr = compose([(sky("night", moon=True, stars=True), 6), (L_store(True), 1.8)], cam)
    zcrowd(fr, cam, t, 60, 1020, 1340, 1.8, 0.36, 4)
    if t > T(24) - 0.1: text(fr, "NO WAY OUT", 960, 160, 110, (255, 60, 60), t - T(24))
    return tint(fr, (20, 0, 30), 0.06)

@scene(25)
def z_food(t, lt, d, fi):
    cam = path(lt, d, (0, 0.1, 1.05), (0, 0, 1.12))
    fr = compose([(L_aisles(), 1.6)], cam)
    put_at(fr, cam, cans(), 1200, 1200, 1.2, 1.1)
    for k, (spr, x) in enumerate(((mom("neutral", blink_at(t)), 450), (girl("happy", blink_at(t, 1)), 700), (alex("neutral", (0, 0), blink_at(t, 2), "box"), 1000),
                                   (staff("neutral", blink_at(t, 3), "box"), 1450), (oldman("neutral", blink_at(t, 4)), 1750), (jacket("annoyed", blink_at(t, 5)), 2050))):
        put_at(fr, cam, spr, x, 1300, 1.2, 0.42 if k == 1 else 0.6)
    if t > T(29) - 0.1: tag(fr, "VANISHING FAST", 960, 140, 60, t - T(29), (220, 60, 60))
    return fr

@scene(30)
def z_storage(t, lt, d, fi):
    cam = path(lt, d, (-0.3, 0.1, 1.0), (0.1, 0, 1.15))
    fr = compose([(L_storage(), 1.3)], cam)
    if t > T(34) - 0.05:
        k = int((t - T(34)) * 4) % 4
        if k < 2: fr = shake(fr, t, 9)
        text(fr, "KNOCK", 1400 + 40 * (k % 2), 300, 90, (255, 255, 255), 1, 8)
    put_at(fr, cam, alex("scared" if t > T(33) else "worried", (1, 0), False, "hold", True), 500, 1220, 1.1, 0.75)
    sx, sy, _ = proj(cam, 1180 if t > T(33) - 0.2 else lerp(400, 1400, (lt % 3) / 3), 650 if t > T(33) - 0.2 else 1150, 1.3)
    fr = flashlight(fr, sx, sy, 380)
    return fr

@scene(35)
def z_bite(t, lt, d, fi):
    if t < T(37) + 0.6:
        cam = path(lt, d, (0, 0, 1.05), (0.1, 0, 1.1))
        fr = compose([(L_aisles(), 1.6)], cam)
        put_at(fr, cam, staff("worried", blink_at(t), "point"), 700, 1170, 1.2, 0.65)
        put_at(fr, cam, teen1("scared" if t > T(37) else "worried", False, "down", ), 1300, 1170, 1.2, 0.65)
        if t > T(36) + 1.6:
            put(fr, bite_arm(), 960, 760, 0.95 * back(clamp((t - T(36) - 1.6) / 0.3), 1.6))
        if t > T(37) - 0.05: text(fr, "INFECTED", 960, 160, 110, (255, 60, 60), t - T(37))
        return fr
    cam = path(t - T(38), E(42) - T(38), (0.2, 0, 1.0), (-0.1, 0, 1.12))
    fr = compose([(L_aisles(), 1.6)], cam)
    put_at(fr, cam, jacket("annoyed", blink_at(t), "down", True), 600, 1170, 1.2, 0.7)
    put_at(fr, cam, teen1("sad", blink_at(t, 1), "shrug"), 1300, 1170, 1.2, 0.65)
    put_at(fr, cam, alex("worried", (0, 0), blink_at(t, 2)), 1800, 1190, 1.2, 0.68)
    if t > T(42) - 0.1:
        tag(fr, "PROTECT HIM?", 640, 200, 60, t - T(42), (60, 160, 90)); tag(fr, "PROTECT EVERYONE?", 1300, 200, 60, t - T(42) - 0.5, (220, 60, 60))
    return fr

@scene(43)
def z_chaos(t, lt, d, fi):
    cam = path(lt, d, (0, 0, 1.0), (0, 0, 1.1))
    fr = compose([(L_aisles(), 1.6)], cam)
    if t < T(45) - 0.1:
        k = eout(clamp((t - T(43) - 1.2) / 0.5))
        put_at(fr, cam, oldman("scared", False, "up", ), 1500, 1170, 1.2, 0.65, rot=-10 * k)
        put_at(fr, cam, zombie(7), lerp(700, 1250, k), 1180, 1.2, 0.66, rot=10 * k)
        fr = shake(fr, t, 12 if t > T(44) - 0.1 else 3)
        if t > T(44) - 0.1: text(fr, "CHAOS", 960, 170, 130, (255, 60, 60), t - T(44))
        return red_alarm(fr, t, 0.2)
    x = lerp(1200, 500, clamp((t - T(45)) / 1.5))
    put_at(fr, cam, alex("scared", (-1, 0), False, "push", True), x, 1190, 1.2, 0.68)
    put_at(fr, cam, girl("scared", False, "up"), x - 250, 1190, 1.2, 0.45)
    if t > T(46) - 0.1: fr = tint(fr, (60, 0, 10), 0.12)
    return fr

@scene(47)
def z_day10(t, lt, d, fi):
    if t < T(49) - 0.1:
        cam = path(lt, d, (0, 0, 1.05), (0, 0, 1.12)); fr = compose([(L_storage(), 1.3)], cam)
        dd = ImageDraw.Draw(fr); sx, sy, zl = proj(cam, 1250, 700, 1.3)
        for k in range(8): dd.ellipse([sx - 250 * zl + k * 62 * zl, sy - 20, sx - 200 * zl + k * 62 * zl, sy + 30], outline=(190, 190, 200), width=8)
        tag(fr, "LOCKED", 960, 160, 70, t - T(48), (60, 60, 80))
        return flashlight(fr, sx, sy, 520)
    if t < T(52) - 0.1:
        cam = path(t - T(49), T(52) - T(49), (0, 0, 1.0), (0, 0, 1.15))
        fr = compose([(L_outside_night(), 3)], cam)
        zcrowd(fr, cam, t, 14, 900, 1150, 1.4, 0.62, 6, sway=0.3)
        fr = compose([(L_glass_inside(cracked=t > T(51) - 0.1), 1.0)], cam, fr)
        for k in range(5): put_at(fr, cam, cart(), 500 + k * 340, 1250 + (k % 2) * 40, 1.0, 0.75)
        if (fi // 6) % 2 == 0: fr = shake(fr, t, 8)
        return fr
    if t < T(54) - 0.1:
        cam = path(t - T(52), T(54) - T(52), (0, 0, 1.0), (0.3, 0, 1.1)); fr = compose([(L_office(), 1.3)], cam)
        put_at(fr, cam, alex("worried", (1, 0), blink_at(t), "box"), 800, 1190, 1.2, 0.7)
        put_at(fr, cam, staff("worried", blink_at(t, 2), "box"), 1150, 1190, 1.2, 0.7)
        return fr
    cam = path(t - T(54), T(56) - T(54), (0, 0, 1.0), (0, 0, 1.06))
    fr = compose([(L_office(), 1.3)], cam)
    sx, sy, zl = proj(cam, 300, 250, 1.3)
    win = compose([(L_outside_night(), 3)], Cam(0, 0.3, 1.4));
    zc = win.copy(); zcrowd(zc, Cam(0, 0.3, 1.4), t, 40, 950, 1340, 3, 0.4, 7)
    zc = zc.resize((int(800 * zl * 0.8), int(550 * zl * 0.8))); fr.paste(zc, (int(sx), int(sy)))
    put_at(fr, cam, alex("worried", (-1, 0), blink_at(t)), 1300, 1190, 1.2, 0.72)
    if t > T(55) - 0.1: text(fr, "YOU WAIT.", 960, 160, 90, (255, 255, 255), t - T(55))
    return fr

@scene(56)
def z_blackout(t, lt, d, fi):
    if t < T(62) - 0.1:
        cam = path(lt, T(62) - T(56), (-0.3, 0, 1.0), (0.2, 0, 1.12))
        dark = t > T(57) + 1.0
        fr = compose([(L_aisles(dark), 1.6), (L_shelf_front(dark), 0.9)], cam)
        if dark:
            fr = tint(fr, (0, 0, 10), 0.12)
            if t > T(59) - 0.1: fr = red_alarm(fr, t, 0.45)
            if t > T(61) - 0.1:
                sx = lerp(400, 1500, clamp((t - T(61)) / 2))
                sil = zombie(9).copy(); a = np.asarray(sil).copy(); a[..., :3] = 10; sil = Image.fromarray(a)
                put_at(fr, cam, sil, sx, 1250, 1.6, 0.55)
            put_at(fr, cam, alex("scared", (1, 0), False, "hold", True), 1500, 1220, 1.0, 0.7)
            if t > T(60) - 0.1 and t < T(61): text(fr, "step... step...", 960, 200, 60, (220, 220, 240), 1, 6)
        else:
            put_at(fr, cam, alex("neutral", (0, 0), blink_at(t), "down"), 1500, 1220, 1.0, 0.7)
        return fr
    cam = path(t - T(62), T(66) - T(62), (0, 0, 1.0), (0, 0, 1.1))
    fr = compose([(L_dock(), 1.3)], cam)
    fr = red_alarm(fr, t, 0.35)
    if t < T(64) - 0.1:
        put_at(fr, cam, zombie(10), 1300, 1190, 1.2, 0.7, rot=8 * math.sin(t * 6))
        put_at(fr, cam, jacket("scared", False, "up"), 1000, 1190, 1.2, 0.7, rot=-8 * math.sin(t * 6))
        return shake(fr, t, 8)
    if t < T(65) - 0.1:
        put_at(fr, cam, alex("annoyed", (1, 0), False, "push", True), 1200, 1200, 1.2, 0.7)
        text(fr, "SLAM!", 960, 200, 120, (255, 255, 255), t - T(64)); return shake(fr, t, 14 * (1 - clamp((t - T(64)) / 0.5)))
    put_at(fr, cam, alex("shock", (-1, 0), False, "down", True), 1200, 1200, 1.2, 0.7)
    text(fr, "GONE.", 960, 200, 110, (255, 60, 60), t - T(65) - 0.6)
    return fr

@scene(66)
def z_day21(t, lt, d, fi):
    if t < T(69) - 0.1:
        cam = path(lt, d, (0, 0, 1.05), (0, 0, 1.12)); fr = compose([(L_office(), 1.3)], cam)
        fr = tint(fr, (20, 20, 40), 0.1)
        put_at(fr, cam, mom("sad", True), 900, 1190, 1.2, 0.65, rot=-6); put_at(fr, cam, girl("sad", True), 1150, 1190, 1.2, 0.45, rot=6)
        tag(fr, "FOOD: ALMOST GONE", 960, 160, 60, t - T(67), (220, 60, 60))
        return fr
    if t < T(75) - 0.1:
        cam = path(t - T(69), T(75) - T(69), (0.2, 0, 1.0), (-0.1, 0, 1.12)); fr = compose([(L_tunnel(), 1.3)], cam)
        glow(fr, 1100, 700, 500, (255, 200, 120), 0.25)
        put_at(fr, cam, jacket("annoyed", blink_at(t), "hold"), 1250, 1170, 1.2, 0.7)
        put_at(fr, cam, radio(), 1440, 1080, 1.2, 0.5)
        put_at(fr, cam, alex("shock" if t < T(71) else "worried", (1, 0), False), 600, 1190, 1.2, 0.7)
        if t > T(72) - 0.1: tag(fr, "RESCUE: OUTSIDE THE CITY", 960, 140, 54, t - T(72), (60, 160, 90))
        if t > T(73) - 0.1: tag(fr, "HELICOPTERS IN 2 DAYS", 960, 260, 54, t - T(73), (30, 110, 200))
        if t > T(74) - 0.1: stamp(fr, "ROOM FOR 3", 960, 520, t - T(74), 120)
        return fr
    cam = path(t - T(75), T(78) - T(75), (0, 0, 1.15), (0, 0, 1.0))
    fr = compose([(L_outside_night(), 3)], cam)
    zcrowd(fr, cam, t, 20, 900, 1300, 1.3, 0.6, 8)
    fr = compose([(L_glass_inside(True), 1.0)], cam, fr)
    for k in range(5): put_at(fr, cam, cart(), 300 + k * 450, 1300, 1.0, 0.75, rot=30 * k - 60)
    text(fr, "THE DOORS ARE DOWN", 960, 170, 90, (255, 60, 60), t - T(76))
    return shake(red_alarm(fr, t, 0.3), t, 10 * (1 - clamp((t - T(75)) / 1.0)))

@scene(78)
def z_escape(t, lt, d, fi):
    if t < T(84) - 0.1:
        cam = Cam(lerp(-0.6, 0.6, clamp(lt / (T(84) - T(78)))), 0.1, 1.05)
        fr = compose([(sky("morning"), 6), (L_store(False), 3)], cam)
        for k, x in enumerate((200, 650, 1150, 1600, 2050)): put_at(fr, cam, car([(220, 70, 60), (80, 120, 200), (230, 200, 70), (200, 200, 210), (90, 170, 120)][k]), x, 1150, 1.6, 0.8, rot=(k - 2) * 4)
        n = 6 if t < T(82) else 18
        zcrowd(fr, cam, t, n, 1180, 1320, 1.3, 0.5, 9, x0=0, x1=1300)
        x = lerp(800, 2100, clamp((t - T(79)) / (T(84) - T(79))))
        for k, spr in enumerate((alex("scared", (1, 0), False, "push", True), girl("scared", False, "up"), staff("scared", False, "push"), mom("scared", False, "push"))):
            put_at(fr, cam, spr, x - k * 200, 1320 + 6 * math.sin(t * 14 + k), 1.1, 0.42 if k == 1 else 0.58)
        return fr
    cam = Cam(0, 0.1, 1.0)
    fr = compose([(sky("morning"), 6), (L_store(False), 3)], cam)
    k = clamp((t - T(86)) / 2.5)
    put_at(fr, cam, truck(cab=(200, 200, 210), trailer=(240, 240, 244), stripe=(220, 60, 50), lights=True), lerp(1300, 3200, ein(k)), 1250, 1.2, 0.85)
    zcrowd(fr, cam, t, 14, 1150, 1320, 1.3, 0.5, 10, x0=0, x1=lerp(1000, 2200, k))
    if t > T(87) - 0.1: text(fr, "FREE?", 960, 170, 120, (255, 255, 255), t - T(87))
    return fr

@scene(88)
def z_cab(t, lt, d, fi):
    cam = path(lt, d, (0, 0, 1.0), (0, 0.1, 1.12))
    fr = compose([(L_cab(), 1.3)], cam)
    glow(fr, 960, 300, 600, (255, 120, 60), 0.15)
    put_at(fr, cam, radio(), 1700, 900, 1.3, 0.7)
    if T(89) - 0.1 < t < E(90):
        for k in range(3): ImageDraw.Draw(fr).arc([1500 - k * 40, 600 - k * 40, 1700 + k * 40, 800 + k * 40], 300, 60, fill=(255, 255, 255), width=6)
    put_at(fr, cam, alex("worried", (0, 0), blink_at(t)), 700, 1170, 1.3, 0.65)
    put_at(fr, cam, girl("worried" if t > T(91) else "neutral", blink_at(t, 1)), 1050, 1170, 1.3, 0.45)
    put_at(fr, cam, mom("sad", blink_at(t, 2)), 1350, 1170, 1.3, 0.6)
    if t > T(91) - 0.1 and t < T(93): put(fr, Image.new("RGBA", (1, 1)), 0, 0); tag(fr, '"ARE WE SAFE NOW?"', 960, 160, 60, t - T(91), (60, 60, 80))
    if t > T(93) - 0.1:
        k = clamp((t - T(93)) / 2.5)
        fr = tint(fr, (0, 0, 0), 0.2 * k)
        put_at(fr, cam, staff("sad", False, "hold", bite=True), 1200, 1300, 1.1 - 0.0, 0.7 + 0.5 * ss(k))
    if t > T(94) - 0.05:
        put(fr, bite_arm(), 960, 800, 0.9)
        text(fr, "BITTEN", 960, 160, 120, (255, 60, 60), t - T(94))
    return fr

@scene(95)
def z_end(t, lt, d, fi):
    fr = compose([(sky("night", moon=True, stars=True), 6), (L_store(True), 1.8)], Cam(0, 0.6, 1.0))
    zcrowd(fr, Cam(0, 0.6, 1.0), t, 24, 1050, 1340, 1.8, 0.4, 11)
    fr = Image.blend(fr, Image.new("RGB", (W, H), (10, 0, 16)), 0.55)
    text(fr, "WOULD YOU LEAVE HIM BEHIND?", 960, 200, 80, (255, 255, 255), lt)
    if t > T(99) - 0.1: text(fr, "HOW LONG WOULD YOU SURVIVE?", 960, 310, 64, (255, 90, 90), t - T(99))
    if t > VEND + 0.2:
        dd = ImageDraw.Draw(fr)
        for x in (560, 1360): dd.rounded_rectangle([x - 330, 420, x + 330, 790], 24, outline=(255, 255, 255), width=4)
        text(fr, "DAY ZERO TALES", 960, 960, 64, (255, 150, 60), t - VEND - 0.2)
    return fr

SC.sort(key=lambda s: s[0])
