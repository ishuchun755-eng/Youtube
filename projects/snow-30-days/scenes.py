import json, math, random
from functools import lru_cache
from snowlib import *
from lib import person, put, car, truck, font, cloud, building

S = json.load(open("sentences.json"))
VEND = S[-1]["end"]
DUR = round(VEND + 7.0, 2)
def T(i): return S[i]["start"]
def E(i): return S[i]["end"]
def path(lt, d, a, b, ease=ss):
    k = ease(lt / max(d, 0.1)); return Cam(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k))
FT = 26  # px per foot in layer space
def feet_at(i):  # snow depth in feet by sentence index (story day)
    days = [(12, 1), (22, 2), (32, 3), (43, 4), (49, 5), (66, 7), (73, 8), (83, 10), (93, 12), (100, 14), (110, 17), (117, 20), (125, 25), (133, 30)]
    f = 0.1
    for k, dd in days:
        if i >= k: f = dd
    return f

# ================================================================ layer builders
@lru_cache(None)
def L_sky(kind, moon=False, stars=False, sun=False): return sky(kind, moon, stars, sun)
@lru_cache(None)
def L_street(gy, snow_ft, lights=0.25, seed=0, kind="day"):
    return layer(lambda c: street_bg(c, gy, lights=lights, snow_h=snow_ft * FT, seed=seed))
@lru_cache(None)
def L_ground(gy, trees=True, seed=0):
    def f(c):
        ground(c, gy)
        if trees:
            rnd = random.Random(seed)
            for x in (160, 2240) if seed % 2 == 0 else (380, 1980): snow_pine(c, x, gy + 40, rnd.uniform(480, 620))
    return layer(f)
@lru_cache(None)
def L_bank(y, seed=1): return layer(lambda c: snow_bank(c, y, amp=40, seed=seed))
@lru_cache(None)
def L_hero_house(gy, snow_ft, lights=0.4, body=(120, 156, 196)):
    def f(c):
        house(c, 820, gy, 760, 700, body, (70, 60, 96), snow_ft * FT, lights, 3, roof_snow=40 + snow_ft * 6)
        c.rect(1620, gy - 80, 1660, gy, fill=(130, 90, 60), out=None)  # post
    return layer(f)

def interior(kind="living", dark=0.0, warm=False):
    key = (kind, round(dark, 2), warm)
    return _interior(key)
@lru_cache(None)
def _interior(key):
    kind, dark, warm = key
    def f(c):
        wall = (226, 206, 176) if not dark else (60, 56, 70)
        c.rect(0, 0, LW, LH, fill=wall, out=None)
        c.rect(0, 1000, LW, LH, fill=(150, 104, 72) if not dark else (60, 44, 40), out=None)
        for x in range(0, LW, 200): c.line([(x, 1000), (x - 120, LH)], (130, 90, 62) if not dark else (50, 36, 32), 4)
        if kind == "living":
            # window
            c.rect(1500, 240, 2100, 760, fill=(200, 222, 245) if not dark else (240, 244, 250), w=12)
            c.line([(1800, 240), (1800, 760)], w=10); c.line([(1500, 500), (2100, 500)], w=8)
            # couch
            c.rect(300, 760, 1200, 1000, fill=(90, 110, 170), r=40, w=8); c.rect(260, 680, 1240, 800, fill=(80, 100, 160), r=40, w=8)
            c.rect(220, 740, 320, 1000, fill=(80, 100, 160), r=30, w=8); c.rect(1180, 740, 1280, 1000, fill=(80, 100, 160), r=30, w=8)
            # fireplace
            c.rect(1400, 760, 2000, 1010, fill=(150, 80, 60), w=8); c.rect(1500, 830, 1900, 1010, fill=(30, 20, 20), w=6)
            c.rect(1360, 730, 2040, 780, fill=(120, 70, 50), w=6)
            # lamp + picture
            c.rect(150, 300, 450, 520, fill=(250, 250, 250), w=8); c.ell(220, 340, 380, 480, fill=(255, 200, 80), out=None)
        elif kind == "kitchen":
            c.rect(200, 600, 1400, 1000, fill=(220, 220, 230), w=8)
            c.rect(1500, 220, 1950, 1000, fill=(240, 244, 250), r=20, w=8)
            c.line([(1500, 560), (1950, 560)], w=6); c.rect(1880, 300, 1910, 480, fill=(160, 160, 170), out=None)
            c.rect(200, 250, 1000, 520, fill=(200, 222, 245), w=12)
        elif kind == "bedroom":
            c.rect(300, 700, 1700, 1000, fill=(110, 90, 140), r=30, w=8); c.rect(300, 600, 1700, 760, fill=(240, 240, 250), r=40, w=8)
            c.rect(260, 400, 380, 1000, fill=(120, 80, 60), w=8)
            for x in range(0, LW, 300): c.rect(x, 0, x + 40, 160, fill=(150, 110, 80), out=None)
            c.rect(0, 140, LW, 180, fill=(140, 100, 70), out=None)
        if dark:
            c.rect(0, 0, LW, LH, fill=None, out=None)
    img = layer(f, rgba=False)
    if dark:
        img = Image.blend(img, Image.new("RGB", img.size, (10, 12, 30)), dark * 0.7)
    return img

def fireglow(fr, t, x, y, r=420, a=0.55):
    fl = 0.8 + 0.2 * math.sin(t * 11) * math.sin(t * 7.3)
    glow(fr, x, y, r * fl, (255, 140, 40), a * fl)
def flames(fr, t, cx, cy, s=1.0):
    d = ImageDraw.Draw(fr)
    for i in range(6):
        h = (80 + 40 * math.sin(t * 9 + i * 1.7)) * s; x = cx + (i - 2.5) * 32 * s
        d.polygon([(x - 22 * s, cy), (x + 22 * s, cy), (x + 6 * math.sin(t * 13 + i) * s, cy - h)], fill=(255, 150 + i * 15, 40))
    for i in range(3):
        h = (40 + 20 * math.sin(t * 12 + i)) * s; x = cx + (i - 1) * 40 * s
        d.polygon([(x - 14 * s, cy), (x + 14 * s, cy), (x, cy - h)], fill=(255, 240, 160))

# ================================================================ scenes
SC = []
def scene(i0, snow=1.0, wind=0.3, interior=False):
    def deco(fn): SC.append((T(i0) - 0.12 if i0 > 0 else 0.0, fn, snow, wind, interior)); return fn
    return deco

@scene(0, snow=0.25, wind=0.1, interior=True)
def s_window(t, lt, d, fi):
    cam = path(lt, d, (0.4, 0, 1.0), (0.2, -0.1, 1.12))
    out = [(L_sky("morning"), 6), (L_street(980, 0.1, 0.4, 1), 3), (L_ground(980, True, 1), 2)]
    fr = compose(out, cam)
    snowfall(fr, t, 0.25, 0.1, seed=3)
    # interior frame over it
    wf = _winframe()
    fr = compose([(wf, 0.9)], cam, fr)
    put_at(fr, cam, hero("happy" if lt > 2 else "neutral", (0, -1), blink_at(t), "coffee"), 700, 1420, 0.9, 1.1)
    return fr
@lru_cache(None)
def _winframe():
    def f(c):
        c.rect(0, 0, LW, 230, fill=(226, 206, 176), out=None); c.rect(0, 1150, LW, LH, fill=(226, 206, 176), out=None)
        c.rect(0, 0, 330, LH, fill=(226, 206, 176), out=None); c.rect(2070, 0, LW, LH, fill=(226, 206, 176), out=None)
        c.rect(330, 230, 2070, 1150, fill=None, w=30); c.line([(1200, 230), (1200, 1150)], w=22); c.line([(330, 690), (2070, 690)], w=18)
        c.rect(300, 1120, 2100, 1180, fill=(250, 250, 250), w=8)
        c.rect(140, 180, 330, 1250, fill=(170, 90, 110), w=6); c.rect(2070, 180, 2260, 1250, fill=(170, 90, 110), w=6)
    return layer(f)

@scene(2, snow=1.3, wind=0.5)
def s_hook(t, lt, d, fi):
    cam = path(lt, d, (-0.3, 0.3, 1.0), (0.2, -0.2, 1.15))
    fr = compose([(L_sky("blizzard"), 6), (L_street(1000, 26, 0.1, 2), 2.5), (L_bank(760, 2), 1.4), (L_hero_house(1300, 26, 0.0), 1.0), (L_bank(1180, 5), 0.8)], cam)
    k = ss((lt - 1.5) / 3)
    put_at(fr, cam, hero("shock", (0, -1), False, "up", True), 1200, lerp(870, 780, k), 1.0, 0.55)
    return fr

@scene(3, snow=0.6, wind=0.2)
def s_title(t, lt, d, fi):
    cam = path(lt, d, (0, 0, 1.05), (0, 0, 1.0))
    fr = compose([(L_sky("dusk", stars=True), 6), (L_street(1100, 0.1, 0.6, 4), 3), (L_ground(1100, True, 4), 2)], cam)
    d_ = ImageDraw.Draw(fr)
    q = back(clamp(lt / 0.4), 1.8)
    sf = _bigflake(); put(fr, sf, 960, 700, 0.9 * q, lt * 20)
    text(fr, "DAY 0", 960, 520, 220, (255, 255, 255), lt - 0.1, 12)
    return fr
@lru_cache(None)
def _bigflake():
    im = Image.new("RGBA", (600, 600), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for k in range(6):
        a = k * math.pi / 3
        d.line([(300, 300), (300 + 260 * math.cos(a), 300 + 260 * math.sin(a))], fill=(220, 240, 255, 230), width=22)
        for r in (120, 190):
            for s in (-1, 1):
                b = a + s * 0.6
                x0, y0 = 300 + r * math.cos(a), 300 + r * math.sin(a)
                d.line([(x0, y0), (x0 + 70 * math.cos(b), y0 + 70 * math.sin(b))], fill=(220, 240, 255, 230), width=16)
    g = im.filter(ImageFilter.GaussianBlur(14)); g.paste(im, (0, 0), im); return g

@scene(4, snow=0.2, wind=0.1)
def s_intro(t, lt, d, fi):
    cam = path(lt, d, (-0.5, 0, 1.0), (0.3, 0.1, 1.1))
    fr = compose([(L_sky("morning"), 6), (L_street(980, 0.1, 0.3, 5), 3), (L_ground(1300, True, 2), 1.6), (L_hero_house(1300, 0, 0.3), 1.0)], cam)
    car_s = car((220, 70, 60)); put_at(fr, cam, car_s, 600, 1330, 1.0, 1.1)
    shovel = _shovel(); put_at(fr, cam, shovel, 1700, 1320, 1.0, 0.8)
    put_at(fr, cam, hero("happy", (0, 0), blink_at(t)), 1250, 1330, 1.0, 0.75)
    for k, (lab, x, y) in enumerate((("TWO-STORY HOUSE", 960, 120), ("ONE CAR", 520, 520), ("ONE SHOVEL", 1450, 520))):
        tag(fr, lab, x, y, 54, t - T(5 + k) + 0.05)
    return fr
@lru_cache(None)
def _shovel():
    c = K(200, 600); c.line([(100, 20), (100, 420)], (140, 90, 50), 18); c.rect(70, 0, 130, 40, fill=(30, 30, 36), r=10, w=4)
    c.poly([(40, 420), (160, 420), (170, 580), (30, 580)], fill=(200, 50, 50), w=5); return c.done()

@scene(8, snow=0.1, interior=True)
def s_couch(t, lt, d, fi):
    cam = path(lt, d, (-0.2, 0.1, 1.05), (0.1, 0, 1.12))
    fr = compose([(interior("living"), 1.5)], cam)
    put_at(fr, cam, hero("happy" if t < T(10) else "neutral", (1, 0), blink_at(t), "phone"), 620, 1080, 1.4, 0.9)
    put_at(fr, cam, dog("happy" if t < T(11) else "stand", 0.5 + 0.5 * math.sin(t * 10), blink_at(t, 2)), 1000, 1000, 1.4, 0.7)
    tag(fr, "WEATHER:  LIGHT SNOW  •  1 INCH", 960, 120, 56, t - T(9), (240, 244, 250), (30, 40, 80))
    if t > T(11): text(fr, "zzz", 1240, 560, 70, (220, 230, 255), t - T(11) - 0.3, 6)
    return fr

@scene(12, snow=0.9, wind=0.25)
def s_day1(t, lt, d, fi):
    cam = path(lt, d, (-0.4, 0.2, 1.0), (0.4, 0, 1.08))
    fr = compose([(L_sky("day"), 6), (L_street(1000, 1, 0.3, 6), 2.6), (L_ground(1150, True, 6), 1.4), (L_bank(1300, 6), 0.8)], cam)
    if t > T(14) - 0.1:
        sg = _sign("SCHOOL CLOSED"); put_at(fr, cam, sg, 1900, 1200, 1.4, 0.8)
    for k in range(6):
        x = 400 + k * 280 + 60 * math.sin(t * 2 + k)
        y = 1250 - abs(math.sin(t * 6 + k)) * 40
        put_at(fr, cam, kid(k, "happy", "up" if k % 2 else "down"), x, y, 1.1, 0.42)
    return fr
@lru_cache(None)
def _sign(s, col=(250, 250, 250), fg=(200, 40, 50)):
    c = K(720, 560); c.line([(360, 300), (360, 560)], (120, 90, 60), 26)
    c.rect(20, 20, 700, 320, fill=col, r=20, w=8)
    c.text((360, 170), s, 64 if len(s) < 14 else 50, fill=fg, anchor="mm", black=True)
    c.rect(10, 0, 710, 40, fill=SNOW, r=16, out=None)
    return c.done()

@scene(16, snow=0.6, wind=0.2)
def s_snowmen(t, lt, d, fi):
    sunset = t > T(18) - 0.1
    cam = path(lt, d, (0, 0.2, 1.0), (0, 0, 1.06))
    fr = compose([(L_sky("sunset" if sunset else "day"), 6), (L_street(1000, 1, 0.5 if sunset else 0.2, 7), 2.6), (L_ground(1150, False, 7), 1.4)], cam)
    g1 = 0.7 + 0.15 * ss((t - T(16)) / 1.5) + (0.35 * ss((t - T(18)) / 2.5))
    g2 = 0.0 if t < T(17) else 0.8 + 0.25 * ss((t - T(17)) / 1.5) + 0.45 * ss((t - T(18)) / 2.5)
    put_at(fr, cam, snowman(), 700, 1250, 1.3, g1)
    put_at(fr, cam, dave("happy", blink_at(t), "point"), 980, 1260, 1.3, 0.55)
    if g2 > 0:
        put_at(fr, cam, snowman(), 1700, 1250, 1.3, g2)
        put_at(fr, cam, kid(9, "happy", "up"), 1420, 1260, 1.3, 0.45)
    if sunset: tag(fr, "SNOWMAN WAR", 960, 110, 70, t - T(18), (230, 60, 60))
    return fr

@scene(19, snow=0.4, wind=0.15)
def s_porch(t, lt, d, fi):
    cam = path(lt, d, (0.3, 0, 1.05), (0.0, 0, 1.15))
    fr = compose([(L_sky("sunset"), 6), (L_street(1000, 1, 0.7, 8), 2.6), (L_ground(1150, True, 8), 1.4), (_porch(), 0.9)], cam)
    put_at(fr, cam, hero("happy", (0, 0), blink_at(t), "coffee"), 1300, 1330, 0.9, 0.85)
    for i in range(3):
        p = (lt * 0.6 + i / 3) % 1; sx, sy, _ = proj(cam, 1400 + 20 * math.sin(p * 6), 900 - p * 160, 0.9)
        ImageDraw.Draw(fr).arc([sx, sy, sx + 40, sy + 60], 90, 270, fill=(255, 255, 255), width=5)
    return fr
@lru_cache(None)
def _porch():
    def f(c):
        c.rect(800, 1250, 2400, 1350, fill=(150, 100, 70), w=6)
        for x in range(820, 2400, 110): c.rect(x, 1050, x + 24, 1250, fill=(240, 240, 240), w=4)
        c.rect(800, 1040, 2400, 1070, fill=(240, 240, 240), w=4); c.rect(2050, 300, 2120, 1250, fill=(240, 240, 240), w=5)
        c.rect(800, 1030, 2400, 1046, fill=SNOW, out=None)
    return layer(f)

@scene(22, snow=1.4, wind=0.6)
def s_plow(t, lt, d, fi):
    cam = path(lt, d, (0.3, 0, 1.05), (-0.3, 0, 1.05))
    fr = compose([(L_sky("night", moon=False), 6), (L_street(1000, 2, 0.5, 9), 2.6), (L_ground(1150, False, 9), 1.4)], cam)
    x = lerp(-600, 2800, (lt / d))
    put_at(fr, cam, plow(), x, 1260, 1.4, 0.75)
    sx, sy, _ = proj(cam, x + 300, 960, 1.4)
    if (fi // 8) % 2 == 0: glow(fr, sx, sy, 120, (255, 170, 40), 0.8)
    return fr

@scene(26, snow=1.3, wind=0.5)
def s_shovel(t, lt, d, fi):
    cam = path(lt, d, (0.2, 0.1, 1.05), (-0.1, 0, 1.12))
    fr = compose([(L_sky("overcast"), 6), (L_street(1000, 2, 0.2, 10), 2.6), (L_ground(1150, False, 10), 1.4)], cam)
    lump = _carlump(); put_at(fr, cam, lump, 650, 1300, 1.2, 1.0)
    # path refills
    k = 0.0
    if t > T(27): k = 1 - clamp((t - T(27)) / 1.0)
    if t > T(28): k = 0 + 0.0
    if t > T(29): k = 1 - clamp((t - T(29)) / 0.8)
    if t > T(30): k = 0
    sx0, sy0, zl = proj(cam, 1100, 1260, 1.2)
    dd = ImageDraw.Draw(fr)
    dd.rectangle([sx0, sy0 - 10, sx0 + 600 * zl, sy0 + 200 * zl], fill=lerp_col(SNOW, (150, 150, 160), k))
    hurt = t > T(31) - 0.1
    sw = math.sin(t * 7) if not hurt else 0
    put_at(fr, cam, hero("sad" if hurt else "worried", (1, 1), blink_at(t), "push" if not hurt else "shrug", True), 1300, 1300 + 6 * sw, 1.2, 0.7, rot=(-8 if hurt else 6 * sw))
    if hurt: text(fr, "OUCH!", 1300, 300, 90, (255, 220, 60), t - T(31), 8)
    return fr
def lerp_col(a, b, k): return tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))
@lru_cache(None)
def _carlump():
    c = K(800, 400); c.ell(20, 60, 780, 420, fill=SNOW, w=6); c.ell(80, 280, 200, 400, fill=(40, 40, 46), out=None)
    c.ell(560, 280, 680, 400, fill=(40, 40, 46), out=None); c.ell(30, 200, 160, 300, fill=(220, 70, 60), out=None)
    c.ell(20, 60, 780, 340, fill=SNOW, out=None); return c.done()

@scene(32, snow=1.2, wind=0.4)
def s_day3(t, lt, d, fi):
    if t > T(36) - 0.1:
        cam = path(t - T(36), 1.6, (0, 0, 1.0), (0, 0, 1.1))
        fr = compose([(interior("kitchen"), 1.4)], cam)
        sx, sy, zl = proj(cam, 1500, 220, 1.4)
        dd = ImageDraw.Draw(fr); dd.rectangle([sx - 380 * zl * 0.8, sy, sx, sy + 640 * zl * .8], fill=(250, 252, 255), outline=OUT, width=6)
        put_at(fr, cam, hero("shock", (1, 0), False, "down"), 1100, 1250, 1.4, 0.8)
        text(fr, "EMPTY", 1520, 540, 80, (200, 40, 50), t - T(36) - 0.3, 6)
        return fr
    cam = path(lt, d, (-0.3, 0.1, 1.0), (0.3, 0, 1.06))
    fr = compose([(L_sky("overcast"), 6), (L_street(1000, 3, 0.3, 11), 2.6), (L_ground(1150, True, 11), 1.4)], cam)
    if t > T(34) - 0.1: put_at(fr, cam, _sign("WORK CANCELED", fg=(40, 80, 200)), 600, 1220, 1.4, 0.75)
    put_at(fr, cam, hero("happy", (0, 0), blink_at(t), "up"), 1300, 1260 - abs(math.sin(t * 4)) * 30, 1.2, 0.6)
    return fr

@scene(37, snow=1.2, wind=0.6)
def s_drive(t, lt, d, fi):
    cam = Cam(-0.6 + lt * 0.35, 0, 1.0)
    fr = compose([(L_sky("overcast"), 6), (L_street(1000, 3, 0.3, 12), 2.6), (L_ground(1120, True, 12), 1.4)], cam)
    x = 600 + lt * 260
    put_at(fr, cam, car((220, 70, 60)), x, 1260, 1.4, 0.8)
    put_at(fr, cam, hero("worried", (1, 0), blink_at(t)).crop((60, 30, 440, 470)), x + 50, 1100, 1.4, 0.32)
    put_at(fr, cam, car((220, 70, 60)).crop((0, 0, 520, 150)), x, 1150, 1.4, 0.8)
    text(fr, "5 MPH", 1700, 150, 70, (255, 255, 255), lt - 0.5)
    return fr

@scene(38, snow=0, interior=True)
def s_store(t, lt, d, fi):
    import scenes_trucks_stub as st
    return st.store(t, lt, d, fi, T(39), T(40))

@scene(41, snow=1.0, wind=0.6)
def s_trucks(t, lt, d, fi):
    cam = path(lt, d, (0.2, 0, 1.0), (-0.1, 0, 1.08))
    fr = compose([(L_sky("blizzard"), 6), (L_ground(1050, True, 13), 1.6)], cam)
    put_at(fr, cam, truck(cab=(40, 90, 170), stripe=(240, 180, 40)), 1200, 1180, 1.6, 0.9)
    put_at(fr, cam, _carlump(), 1200, 1200, 1.2, 1.4)
    tag(fr, "WHEN TRUCKS STOP...", 960, 140, 70, t - T(42), (220, 50, 50))
    return fr

@scene(43, snow=1.0, wind=0.4)
def s_backyard(t, lt, d, fi):
    trench = t > T(47) - 0.1
    cam = path(lt, d, (0, 0.2, 1.0), (0, 0, 1.1))
    fr = compose([(L_sky("overcast"), 6), (L_street(950, 4, 0.2, 14), 3), (L_ground(1050, True, 14), 1.6)], cam)
    if not trench:
        k = clamp((t - T(45) - 1.5) / 1.2)
        if k < 1: put_at(fr, cam, dog("stand", 0.5 + 0.5 * math.sin(t * 9), blink_at(t, 1)), 1200, lerp(1150, 1260, k), 1.6, 0.7)
        fr2 = compose([(_drift(), 1.2)], cam, fr); fr = fr2
        if k >= 1: put_at(fr, cam, dog_tail_only(t), 1180, 1090, 1.2, 0.8)
        put_at(fr, cam, hero("happy" if t > T(46) else "neutral", (1, 0), blink_at(t)), 600, 1320, 1.0, 0.8)
    else:
        fr = compose([(_trench(), 1.2)], cam, fr)
        x = 400 + ((t - T(47)) * 420) % 1700
        put_at(fr, cam, dog("run", 0.5 + 0.5 * math.sin(t * 14), False), x, 1230, 1.2, 0.6)
        put_at(fr, cam, hero("happy", (0, 0), blink_at(t), "push"), 2050, 1350, 1.0, 0.7)
        if t > T(48): text(fr, "♥", 960, 300, 120, (240, 80, 110), t - T(48), 6, black=False)
    return fr
@lru_cache(None)
def _drift(): return layer(lambda c: (snow_bank(c, 1180, amp=60, seed=21)))
@lru_cache(None)
def _trench():
    def f(c):
        c.rect(-10, 1080, LW + 10, LH, fill=SNOW, out=None)
        c.rect(200, 1160, 2200, 1250, fill=(200, 214, 236), out=None)
        snow_bank(c, 1300, amp=30, seed=22)
    return layer(f)

@scene(49, snow=1.1, wind=0.5)
def s_powerline(t, lt, d, fi):
    if t > T(56) - 0.1: return s_darkcity(t, t - T(56) + 0.1, E(57) - T(56), fi)
    snap = T(54) + 1.6
    cam = path(lt, d, (0, 0.3, 1.0), (0.1, -0.1, 1.15))
    fr = compose([(L_sky("dusk"), 6), (L_street(1050, 5, 0.6 if t < T(55) + 0.8 else 0.0, 15), 3), (L_ground(1100, False, 15), 1.6)], cam)
    dd = ImageDraw.Draw(fr)
    # poles and wire
    p1, p2 = proj(cam, 300, 500, 1.4), proj(cam, 2100, 500, 1.4)
    sag = 120 + (0 if t < snap else 300 * eout((t - snap) / 0.4))
    for p in (p1, p2): dd.rectangle([p[0] - 14, p[1], p[0] + 14, p[1] + 800], fill=(90, 70, 50))
    mid = ((p1[0] + p2[0]) / 2, p1[1] + sag)
    dd.line([p1[:2], mid, p2[:2]], fill=OUT, width=6, joint="curve")
    dd.line([(p1[0], p1[1] - 6), ((p1[0] + p2[0]) / 2, p1[1] + sag - 14), (p2[0], p2[1] - 6)], fill=SNOW, width=8)
    # branch
    bx, by, zl = proj(cam, 1250, 380, 1.3)
    ang = 0 if t < snap else min(60, (t - snap) * 220)
    br = _branch().rotate(-ang, Image.BICUBIC, expand=True); put(fr, br, bx, by + br.height / 2 * 0.8, zl * 0.8)
    if snap < t < snap + 0.6:
        for k in range(14):
            a = random.Random(k + fi).uniform(0, 6.28); r = random.Random(k * 3 + fi).uniform(20, 140)
            dd.line([mid, (mid[0] + r * math.cos(a), mid[1] + r * math.sin(a))], fill=(255, 230, 120), width=4)
        glow(fr, mid[0], mid[1], 200, (255, 220, 120), 0.9)
    if t > T(55) + 0.8:
        fl = 0.85 if (t - T(55) - 0.8) < 0.1 else 0
        fr = Image.blend(fr, Image.new("RGB", (W, H), (10, 12, 30)), 0.45 + fl * 0)
    if t < T(53): tag(fr, "IT'S THE WEIGHT", 960, 130, 66, t - T(52), (60, 60, 80))
    return fr
@lru_cache(None)
def _branch():
    c = K(900, 300); c.line([(0, 150), (900, 120)], (90, 60, 40), 40)
    for x in range(100, 900, 160): c.line([(x, 140), (x + 80, 40)], (90, 60, 40), 16)
    snow_bank(c, 120, 0, 900, 20, 4, bottom=140); return c.done()
def s_darkcity(t, lt, d, fi):
    cam = path(lt, d, (-0.2, 0.1, 1.0), (0.2, 0, 1.06))
    lit = 1 - clamp(lt / 2.5)
    fr = compose([(L_sky("night", moon=True, stars=True), 6), (L_street(1050, 5, round(lit * 0.6, 1), 16), 2.6), (L_ground(1100, True, 16), 1.6)], cam)
    if t > T(57) - 0.1: tag(fr, "NO POWER = NO HEAT", 960, 130, 66, t - T(57), (30, 40, 90))
    return fr

@scene(58, snow=0, interior=True)
def s_fire(t, lt, d, fi):
    cam = path(lt, d, (0.2, 0.1, 1.08), (0.0, 0, 1.16))
    fr = compose([(interior("living", dark=0.85), 1.5)], cam)
    sx, sy, zl = proj(cam, 1700, 1000, 1.5)
    flames(fr, t, sx, sy, zl * 0.9); fireglow(fr, t, sx, sy - 80, 700 * zl, 0.6)
    put_at(fr, cam, hero("happy", (1, 0), blink_at(t), "hold"), 700, 1080, 1.5, 0.9)
    put_at(fr, cam, _blanket(), 700, 1090, 1.5, 1.0)
    put_at(fr, cam, dog("stand", 0.2, True), 1250, 1010, 1.5, 0.6)
    return fr
@lru_cache(None)
def _blanket():
    c = K(600, 500); c.poly([(40, 120), (560, 120), (590, 490), (10, 490)], fill=(200, 70, 80), w=6)
    for x in range(60, 560, 80): c.line([(x, 130), (x - 20, 480)], (230, 120, 120), 8)
    return c.done()

@scene(59, snow=1.4, wind=0.8)
def s_buffalo(t, lt, d, fi):
    cam = path(lt, d, (0.2, 0.1, 1.0), (-0.1, 0, 1.18))
    fr = compose([(L_sky("blizzard"), 6), (_venthouse(), 1.2)], cam)
    k = clamp((t - T(60) - 2.5) / 2.5)
    sx, sy, zl = proj(cam, 1400, 980, 1.2)
    dd = ImageDraw.Draw(fr)
    dd.rectangle([sx - 240 * zl, sy + 160 * zl - 360 * zl * k, sx + 240 * zl, sy + 160 * zl], fill=SNOW)
    tag(fr, "TRUE STORY  •  BUFFALO, NY", 960, 110, 60, lt - 0.3, (200, 40, 50))
    if t > T(61) - 0.1:
        for i in range(6):
            p = ((t - T(61)) * 0.5 + i / 6) % 1
            glow(fr, sx - 380 * zl - p * 200, sy - p * 160, 60 + 60 * p, (150, 150, 160), 0.6 * (1 - p))
        text(fr, "CO", sx - 600 * zl, sy - 260, 110, (220, 60, 60), t - T(61), 8)
    return fr
@lru_cache(None)
def _venthouse():
    def f(c):
        c.rect(-10, 200, 1600, LH, fill=(196, 160, 140), w=6)
        for y in range(240, LH, 70): c.line([(0, y), (1600, y)], (176, 140, 120), 4)
        c.rect(1600, 1150, LW + 10, LH, fill=SNOW, out=None)
        c.rect(1250, 900, 1560, 1000, fill=(160, 160, 170), w=6); c.ell(1520, 890, 1620, 1010, fill=(60, 60, 70), w=6)
        snow_bank(c, 1160, amp=40, seed=31)
    return layer(f)

@scene(63, snow=1.2, wind=0.6)
def s_dig_vent(t, lt, d, fi):
    cam = path(lt, d, (0, 0, 1.05), (0.1, 0, 1.12))
    fr = compose([(L_sky("overcast"), 6), (_venthouse(), 1.2)], cam)
    sw = math.sin(t * 8)
    put_at(fr, cam, hero("annoyed", (1, 0), blink_at(t), "push"), 1780, 1260 + 6 * sw, 1.2, 0.62, rot=6 * sw, flip=True)
    if t > T(64) - 0.1: stamp(fr, "2x / DAY", 600, 300, t - T(64), 110, (30, 110, 200))
    return fr

@scene(66, snow=1.0, wind=0.4)
def s_roof(t, lt, d, fi):
    cam = path(lt, d, (0, -0.2, 1.0), (0, 0.1, 1.08))
    fr = compose([(L_sky("overcast"), 6), (_cutaway(t), 1.3)], cam)
    if t > T(68) - 0.1: tag(fr, "1 INCH  ≈  1 LB / FT²", 520, 160, 56, t - T(68), (30, 110, 200))
    if t > T(69) - 0.1: tag(fr, "ROOF  ≈  20 LB / FT²", 520, 290, 56, t - T(69), (60, 160, 90))
    if t > T(70) - 0.1: stamp(fr, "70+ INCHES", 1450, 260, t - T(70), 110, (220, 40, 50))
    return fr
def _cutaway(t):
    return _cut(int(t * 6) % 2)
@lru_cache(None)
def _cut(ph):
    def f(c):
        c.rect(-10, 1150, LW + 10, LH, fill=SNOW, out=None)
        c.rect(600, 700, 1800, 1200, fill=(226, 206, 176), w=8)
        c.poly([(520, 710), (1200, 330), (1880, 710)], fill=(140, 100, 70), w=8)
        for k in range(1, 6):
            x = 520 + k * 226; y0 = 710 - (k if k <= 3 else 6 - k) * 126
            c.line([(x, 710), (x + (1200 - x) * 0.2, y0 + 30 + ph * 6)], (110, 70, 40), 12)
        c.poly([(470, 700), (1200, 190), (1930, 700), (1880, 720), (1200, 330), (520, 720)], fill=SNOW, w=6)
        for x, y in ((700, 560), (1000, 400), (1400, 400), (1700, 560)):
            c.line([(x, y + 60), (x + 30, y + 120)], (60, 60, 70), 5)
    return layer(f)

@scene(71, snow=0, interior=True)
def s_bed(t, lt, d, fi):
    cam = path(lt, d, (0, -0.3, 1.1), (0, -0.4, 1.2))
    fr = compose([(interior("bedroom", dark=0.9), 1.4)], cam)
    put_at(fr, cam, hero("worried", (0, -1), blink_at(t)), 900, 1150, 1.4, 0.75)
    put_at(fr, cam, _blanket(), 900, 1260, 1.4, 1.0)
    if (int(t * 3) % 3) == 0: text(fr, "CREAK...", 1300, 260, 80, (220, 220, 240), 1, 6)
    return fr

@scene(72, snow=0.8, wind=0.4)
def s_rake(t, lt, d, fi):
    cam = path(lt, d, (-0.2, 0.3, 1.0), (0.2, 0, 1.1))
    fr = compose([(L_sky("morning"), 6), (L_street(1000, 7, 0.2, 17), 2.8), (_roofsurf(), 1.1)], cam)
    sw = math.sin(t * 4)
    put_at(fr, cam, hero("worried", (1, 0), blink_at(t), "push", True), 1200 + 30 * sw, 960, 1.1, 0.55, rot=-10)
    sx, sy, zl = proj(cam, 1420 + 30 * sw, 760, 1.1); ImageDraw.Draw(fr).line([(sx, sy), (sx + 260 * zl, sy + 220 * zl)], fill=(120, 90, 60), width=10); ImageDraw.Draw(fr).line([(sx + 200 * zl, sy + 240 * zl), (sx + 330 * zl, sy + 180 * zl)], fill=(60, 60, 70), width=14)
    return fr
@lru_cache(None)
def _roofsurf():
    def f(c):
        c.poly([(-10, 1350), (-10, 1050), (1300, 820), (2410, 1050), (2410, 1350)], fill=(90, 70, 110), w=8)
        c.poly([(-10, 1060), (1300, 830), (2410, 1060), (2410, 1000), (1300, 760), (-10, 1000)], fill=SNOW, out=None)
        snow_bank(c, 1100, 1400, 2400, 40, 9, bottom=1360)
    return layer(f)

@scene(73, snow=0.9, wind=0.4)
def s_dave(t, lt, d, fi):
    cam = path(lt, d, (-0.3, 0.1, 1.0), (0.3, 0, 1.06))
    fr = compose([(L_sky("day"), 6), (L_street(1000, 8, 0.2, 18), 2.8), (L_ground(1150, True, 18), 1.5)], cam)
    if t < T(76) - 0.1:
        put_at(fr, cam, dave("happy", blink_at(t), "point"), 900, 1260, 1.3, 0.6)
        put_at(fr, cam, snowmobile(False), 1500, 1280, 1.3, 0.8)
        if t > T(74) + 0.5: text(fr, "💡", 900, 420, 1, (255, 255, 255), 0)
        if t > T(75) - 0.1: tag(fr, "OLD SNOWMOBILE", 1500, 360, 54, t - T(75), (220, 60, 60))
    else:
        x = lerp(200, 2300, clamp((t - T(76)) / (E(77) - T(76))))
        put_at(fr, cam, snowmobile(t > T(77) - 0.2), x, 1260 + 6 * math.sin(t * 20), 1.3, 0.8)
        put_at(fr, cam, dave("happy", False, "up").crop((0, 0, 500, 640)), x + 40, 1060 + 6 * math.sin(t * 20), 1.3, 0.55)
        for k in range(10):
            p = ((t * 2 + k / 10) % 1); sx, sy, zl = proj(cam, x - 300 - p * 300, 1260 - p * 120, 1.3)
            ImageDraw.Draw(fr).ellipse([sx - 20 * (1 + p), sy - 20 * (1 + p), sx + 20 * (1 + p), sy + 20 * (1 + p)], fill=(250, 252, 255))
        if t > T(77) - 0.1: tag(fr, "PIZZA DELIVERY", 960, 130, 60, t - T(77), (230, 120, 30))
    return fr

@scene(78, snow=0.7, wind=0.3)
def s_patterson(t, lt, d, fi):
    cam = path(lt, d, (0, 0, 1.05), (0.1, -0.1, 1.12))
    fr = compose([(L_sky("day"), 6), (L_street(1000, 8, 0.3, 19), 2.8), (L_hero_house(1350, 8, 0.5, (210, 170, 200)), 1.0)], cam)
    put_at(fr, cam, patterson("happy", blink_at(t), "hold"), 1210, 900, 1.0, 0.45)
    put_at(fr, cam, dave("happy", blink_at(t, 2), "point"), 1600, 1150, 1.0, 0.6)
    if t > T(81) - 0.1: tag(fr, "CAPTAIN DAVE", 1600, 330, 70, t - T(81), (30, 110, 200))
    if t > T(80) - 0.1 and t < T(81): text(fr, "$0", 1900, 500, 110, (90, 220, 120), t - T(80), 8)
    return fr

@scene(83, snow=1.2, wind=0.5, interior=True)
def s_cave(t, lt, d, fi):
    if t > T(86) - 0.1:
        cam = path(t - T(86), 2.6, (0, 0, 1.0), (0, 0, 1.12))
        fr = compose([(_door(), 1.0)], cam)
        put_at(fr, cam, hero("shock", (0, 0), False, "up", True), 700, 1300, 1.0, 1.0)
        return fr
    cam = path(lt, d, (0, 0, 1.05), (0.1, 0, 1.12))
    fr = compose([(interior("living", dark=0.0), 1.4)], cam)
    sx, sy, zl = proj(cam, 1500, 240, 1.4)
    ImageDraw.Draw(fr).rectangle([sx, sy, sx + 600 * zl * 0.8, sy + 520 * zl * 0.8], fill=(240, 244, 250))
    if t > T(85) - 0.1: fr = Image.blend(fr, Image.new("RGB", (W, H), (20, 22, 40)), 0.55 * clamp((t - T(85)) / 0.6))
    put_at(fr, cam, hero("worried", (1, 0), blink_at(t), "phone"), 900, 1260, 1.4, 0.8)
    return fr
@lru_cache(None)
def _door():
    def f(c):
        c.rect(0, 0, LW, LH, fill=(226, 206, 176), out=None); c.rect(0, 1150, LW, LH, fill=(150, 104, 72), out=None)
        c.rect(1100, 200, 1900, 1160, fill=(246, 249, 255), w=14)
        for y in range(260, 1150, 90): c.line([(1110, y), (1890, y + 10)], (224, 232, 246), 6)
        c.poly([(1900, 200), (2150, 120), (2150, 1240), (1900, 1160)], fill=(120, 60, 50), w=8)
    return layer(f)

@scene(87, snow=1.0, wind=0.4)
def s_window_exit(t, lt, d, fi):
    cam = path(lt, d, (0, 0.2, 1.1), (0, -0.2, 1.0))
    fr = compose([(L_sky("overcast"), 6), (L_street(1050, 10, 0.2, 20), 2.6), (L_bank(1000, 7), 1.6), (L_hero_house(1450, 10, 0.2), 1.0), (L_bank(1250, 8), 0.8)], cam)
    k = ss((t - T(88)) / 1.5)
    put_at(fr, cam, hero("happy" if k > 0.8 else "neutral", (0, 0), blink_at(t), "down"), 1200, lerp(1060, 990, k), 1.0, 0.55)
    if t > T(89) - 0.1: tag(fr, "HALF BURIED", 960, 120, 64, t - T(89), (60, 60, 80))
    return fr

@scene(90, snow=0.8, wind=0.3)
def s_tunnels(t, lt, d, fi):
    cam = path(lt, d, (-0.3, 0, 1.0), (0.3, 0, 1.06))
    fr = compose([(L_sky("day"), 6), (_tunnel(), 1.2)], cam)
    for k in range(3):
        x = 500 + ((t * 160 + k * 700) % 1500)
        put_at(fr, cam, kid(k + 20, "happy", "down") if k else hero("happy", (1, 0), blink_at(t)), x, 1180, 1.2, 0.38)
    if t > T(91) - 0.1:
        sg = _sign2(); put_at(fr, cam, sg, 1900, 720, 1.2, 0.7)
    return fr
@lru_cache(None)
def _tunnel():
    def f(c):
        c.rect(-10, 500, LW + 10, LH, fill=SNOW, out=None)
        for x in (60, 1900): house(c, x, 1250, 440, 560, (196, 110, 92) if x < 500 else (150, 190, 150), (80, 70, 100), 0, 0.3, x, roof_snow=80)
        c.rect(-10, 640, LW + 10, 760, fill=SNOW, out=None)
        c.rect(400, 1000, 2000, 1200, fill=(190, 206, 232), w=6)
        c.ell(400, 900, 2000, 1100, fill=(190, 206, 232), out=None)
        for x in range(500, 2000, 300): glow_dummy = None
        c.rect(-10, 1200, LW + 10, LH, fill=SNOW, out=None)
    return layer(f)
@lru_cache(None)
def _sign2():
    c = K(820, 620); c.line([(410, 360), (410, 620)], (120, 90, 60), 26)
    c.rect(20, 20, 800, 380, fill=(170, 120, 70), r=16, w=8)
    c.text((410, 130), "SNOW STREET", 72, fill=(255, 250, 230), anchor="mm", black=True)
    c.text((410, 260), "POPULATION: US", 56, fill=(255, 250, 230), anchor="mm", black=True)
    return c.done()

@scene(93, snow=0.6, wind=0.2)
def s_fort(t, lt, d, fi):
    if t > T(98) + 1.5: return s_news(t, t - T(98) - 1.5, E(99) - T(98) - 1.5, fi)
    cam = path(lt, d, (-0.2, 0.1, 1.0), (0.2, -0.1, 1.1))
    fr = compose([(L_sky("sunny"), 6), (L_street(1000, 12, 0.1, 21), 3), (_fort(), 1.2)], cam)
    for i, key in enumerate((95, 96, 97)):
        if t > T(key) - 0.1: tag(fr, ["ROOMS", "A SLIDE", "A FLAG"][i], 500 + i * 460, 140, 60, t - T(key), (30, 110, 200))
    for k in range(4):
        x = 700 + k * 300 + 40 * math.sin(t * 3 + k); put_at(fr, cam, kid(k + 30, "happy", "up"), x, 1260 - abs(math.sin(t * 5 + k)) * 30, 1.2, 0.36)
    if t > T(98) - 0.1:
        dx, dy, _ = proj(cam, 1200 + 300 * math.sin(t), 300, 2.0)
        dd = ImageDraw.Draw(fr); dd.rectangle([dx - 60, dy - 10, dx + 60, dy + 14], fill=(40, 40, 50))
        for s in (-1, 1): dd.ellipse([dx + s * 70 - 40, dy - 20, dx + s * 70 + 40, dy - 6], outline=(40, 40, 50), width=4)
    return fr
@lru_cache(None)
def _fort():
    def f(c):
        c.rect(-10, 1150, LW + 10, LH, fill=SNOW, out=None)
        c.rect(700, 700, 1700, 1180, fill=(232, 240, 252), w=8)
        for x in range(700, 1700, 140): c.rect(x, 640, x + 90, 710, fill=(232, 240, 252), w=6)
        c.rect(1100, 950, 1300, 1180, fill=(150, 170, 210), w=6); c.ell(1100, 880, 1300, 1020, fill=(150, 170, 210), out=None)
        c.poly([(1700, 760), (2100, 1150), (2000, 1180), (1700, 860)], fill=(210, 226, 248), w=6)
        c.line([(1200, 640), (1200, 400)], (120, 90, 60), 12); c.poly([(1206, 400), (1400, 440), (1206, 490)], fill=(220, 50, 60), w=4)
        for x, y in ((850, 800), (1500, 800)): c.rect(x, y, x + 120, y + 100, fill=(90, 120, 170), w=5)
    return layer(f)
def s_news(t, lt, d, fi):
    fr = Image.new("RGB", (W, H), (20, 24, 40))
    tv = compose([(L_sky("sunny"), 6), (L_street(1000, 12, 0.1, 21), 3), (_fort(), 1.2)], Cam(0, -0.2, 1.3)).resize((1400, 788))
    fr.paste(tv, (260, 100))
    dd = ImageDraw.Draw(fr); dd.rectangle([250, 90, 1670, 898], outline=(10, 10, 14), width=20)
    dd.rectangle([260, 760, 1660, 888], fill=(200, 30, 40)); dd.rectangle([260, 760, 520, 888], fill=(255, 255, 255))
    dd.text((390, 824), "LIVE", font=font(52, True), fill=(200, 30, 40), anchor="mm")
    n = int(len("THE TOWN THAT REFUSED TO PANIC") * clamp((t - T(99)) / 1.2))
    dd.text((550, 824), "THE TOWN THAT REFUSED TO PANIC"[:n], font=font(46, True), fill=(255, 255, 255), anchor="lm")
    return fr

@scene(100, snow=1.5, wind=0.8)
def s_country(t, lt, d, fi):
    if t < T(103) - 0.1:
        cam = path(lt, d, (0, 0, 1.0), (0.1, 0, 1.08))
        fr = compose([(L_sky("blizzard"), 6), (_airport(), 1.5)], cam)
        if t > T(102) - 0.1: stamp(fr, "CLOSED", 960, 260, t - T(102), 120)
        return fr
    if t < T(104) - 0.1:
        cam = path(t - T(103), 1.5, (-0.2, 0, 1.0), (0.2, 0, 1.05))
        fr = compose([(L_sky("blizzard"), 6), (L_ground(900, True, 23), 2.0)], cam)
        for k in range(5): put_at(fr, cam, _carlump(), 300 + k * 450, 1150 + (k % 2) * 60, 1.3, 0.9)
        return fr
    cam = path(t - T(104), 3.5, (0, 0, 1.0), (0, 0, 1.08))
    fr = compose([(L_sky("overcast"), 6), (_warehouse(t > T(104) + 1.4), 1.3)], cam)
    if t > T(105) - 0.1: tag(fr, "PIPES BURST", 960, 140, 64, t - T(105), (40, 110, 200))
    return fr
@lru_cache(None)
def _airport():
    def f(c):
        c.rect(-10, 900, LW + 10, LH, fill=SNOW, out=None)
        c.rect(1300, 500, 2300, 900, fill=(150, 160, 180), w=8); c.rect(1700, 300, 1800, 500, fill=(140, 150, 170), w=6)
        c.rect(1650, 250, 1850, 320, fill=(120, 180, 220), w=6)
        c.poly([(200, 900), (1100, 860), (1180, 900), (1100, 940), (200, 920)], fill=(230, 232, 240), w=6)
        c.poly([(600, 900), (760, 760), (820, 760), (720, 900)], fill=(200, 206, 220), w=5)
        snow_bank(c, 920, amp=40, seed=41)
    return layer(f)
@lru_cache(None)
def _warehouse(collapsed):
    def f(c):
        c.rect(-10, 1100, LW + 10, LH, fill=SNOW, out=None)
        c.rect(400, 600, 2000, 1110, fill=(170, 170, 180), w=8)
        if not collapsed: c.rect(380, 520, 2020, 610, fill=SNOW, w=6)
        else:
            c.poly([(380, 610), (1000, 820), (1400, 820), (2020, 610), (2020, 640), (1400, 860), (1000, 860), (380, 640)], fill=SNOW, w=6)
            for x in range(500, 1900, 160): c.line([(x, 640), (x + 40, 760)], (90, 90, 100), 8)
        c.text((1200, 960), "WAREHOUSE", 80, fill=(90, 90, 110), anchor="mm", black=True)
    return layer(f)

@scene(106, snow=0.9, wind=0.4)
def s_heli(t, lt, d, fi):
    cam = path(lt, d, (0.2, -0.3, 1.0), (-0.1, 0, 1.08))
    fr = compose([(L_sky("overcast"), 6), (L_street(1100, 14, 0.1, 24), 2.6), (_roofsurf(), 1.1)], cam)
    hx = lerp(2500, 400, clamp(lt / d))
    put_at(fr, cam, helicopter(), hx, 520, 2.2, 0.9)
    sx, sy, zl = proj(cam, hx + 120, 300, 2.2)
    rw = 520 * zl * abs(math.sin(t * 30))
    ImageDraw.Draw(fr).line([(sx - rw, sy), (sx + rw, sy)], fill=(40, 40, 46), width=8)
    cy = 520 + ((lt * 260) % 500)
    put_at(fr, cam, crate(), hx - 80, cy, 2.0, 0.6)
    wave = math.sin(t * 9)
    put_at(fr, cam, hero("happy", (0, -1), blink_at(t), "wave"), 900, 960, 1.1, 0.5, rot=4 * wave)
    put_at(fr, cam, dog("happy", 0.5 + 0.5 * wave, False), 1180, 950, 1.1, 0.4)
    if t > T(108) - 0.1: tag(fr, "DESERT ISLAND... BUT WHITE", 960, 130, 56, t - T(108), (60, 60, 80))
    return fr

@scene(110, snow=0.6, wind=0.3)
def s_moose(t, lt, d, fi):
    if t > T(114) - 0.1:
        cam = path(t - T(114), E(116) - T(114), (-0.2, 0, 1.0), (0.2, 0, 1.06))
        fr = compose([(L_sky("dusk"), 6), (L_street(1050, 17, 0.4, 25), 2.6), (L_ground(1150, True, 25), 1.5)], cam)
        for k in range(2): put_at(fr, cam, deer(), 600 + k * 500 + (t - T(114)) * 30, 1250, 1.5, 0.7, flip=k == 1)
        if t > T(115) - 0.1: put_at(fr, cam, squirrel(), 1800, 900, 1.5, 0.6)
        if t > T(116) - 0.1: tag(fr, "NATURE DOCUMENTARY", 960, 130, 60, t - T(116), (60, 140, 80))
        return fr
    cam = path(lt, d, (0, 0, 1.0), (0, 0, 1.06))
    fr = compose([(L_sky("day"), 6), (L_street(1000, 17, 0.2, 26), 2.8), (_upwin(), 1.0)], cam)
    mx = lerp(-200, 2700, clamp((t - T(111)) / (E(112) - T(111) + 0.5)))
    put_at(fr, cam, moose(), mx, 1180, 1.6, 0.9)
    fr = compose([(_upwin_front(), 0.95)], cam, fr)
    put_at(fr, cam, hero("shock", (1, 0), False), 2050, 1420, 0.95, 0.75)
    put_at(fr, cam, dog("happy", 0.8, False), 2250, 1380, 0.95, 0.5)
    if (fi // 6) % 2 == 0 and t > T(112): text(fr, "WOOF!", 1700, 820, 70, (255, 230, 80), 1, 6)
    return fr
@lru_cache(None)
def _upwin(): return layer(lambda c: (c.rect(-10, 1150, LW + 10, LH, fill=SNOW, out=None), snow_bank(c, 1160, amp=30, seed=51)))
@lru_cache(None)
def _upwin_front():
    def f(c):
        c.rect(0, 0, LW, 160, fill=(120, 156, 196), out=None); c.rect(0, 1250, LW, LH, fill=(120, 156, 196), out=None)
        c.rect(0, 0, 140, LH, fill=(120, 156, 196), out=None); c.rect(1880, 0, LW, LH, fill=(120, 156, 196), out=None)
        c.rect(140, 160, 1880, 1250, fill=None, w=30); c.line([(1010, 160), (1010, 1250)], w=20)
    return layer(f)

@scene(117, snow=1.6, wind=1.0)
def s_igloo(t, lt, d, fi):
    cam = path(lt, d, (0, 0, 1.0), (0, 0.1, 1.15))
    fr = compose([(L_sky("blizzard"), 6), (_iglhouse(), 1.2)], cam)
    sx, sy, zl = proj(cam, 1200, 900, 1.2)
    fireglow(fr, t, sx, sy, 380 * zl, 0.5)
    put_at(fr, cam, hero("happy", (0, 0), blink_at(t), "hold"), 1050, 1010, 1.2, 0.5)
    put_at(fr, cam, dog("stand", 0.1, True), 1350, 1000, 1.2, 0.35)
    if t > T(120) - 0.1: tag(fr, "SNOW = INSULATION", 520, 160, 56, t - T(120), (30, 110, 200))
    if t > T(122) - 0.1: tag(fr, "OUTSIDE: -20°F", 1550, 160, 56, t - T(122), (60, 80, 140))
    if t > T(123) + 1: tag(fr, "INSIDE: +50°F", 1550, 300, 56, t - T(123) - 1, (230, 120, 40))
    return fr
@lru_cache(None)
def _iglhouse():
    def f(c):
        c.ell(200, 400, 2200, 1800, fill=SNOW, w=8)
        c.ell(320, 520, 2080, 1700, fill=(214, 226, 246), out=None)
        c.rect(700, 700, 1700, 1100, fill=(255, 214, 160), w=8)
        c.poly([(640, 710), (1200, 520), (1760, 710)], fill=(140, 100, 70), w=6)
        c.rect(800, 780, 1000, 940, fill=(255, 190, 90), w=5); c.rect(1400, 780, 1600, 940, fill=(255, 190, 90), w=5)
        c.rect(-10, 1150, LW + 10, LH, fill=SNOW, out=None)
    return layer(f)

@scene(125, snow=0.8, wind=0.4)
def s_record(t, lt, d, fi):
    if t < T(128) - 0.1:
        cam = path(lt, d, (0, 0, 1.05), (0, 0, 1.12))
        fr = compose([(_sepia(), 1.3)], cam)
        tag(fr, "TAMARACK, CALIFORNIA  •  1911", 960, 120, 56, t - T(127) + 1.5, (120, 80, 40))
        if t > T(127) + 3: stamp(fr, "390 INCHES", 960, 860, t - T(127) - 3, 120, (180, 40, 30), -4)
        return fr
    cam = path(t - T(128), E(132) - T(128), (0, 0.3, 1.0), (0, -0.2, 1.05))
    fr = compose([(L_sky("overcast"), 6), (_scale(), 1.2)], cam)
    tag(fr, "32 FEET", 1450, 300, 70, t - T(128), (220, 40, 50))
    return fr
@lru_cache(None)
def _sepia():
    def f(c):
        c.rect(0, 0, LW, LH, fill=(214, 196, 160), out=None)
        for x in (300, 700, 1800, 2150): pine(c, x, 900, 700, (120, 104, 80))
        c.rect(900, 700, 1500, 1000, fill=(140, 110, 80), w=8); c.poly([(860, 710), (1200, 520), (1540, 710)], fill=(110, 86, 60), w=8)
        c.rect(-10, 860, LW + 10, LH, fill=(236, 226, 206), out=None)
        snow_bank(c, 880, amp=50, seed=61, col=(236, 226, 206), shade=(214, 200, 174))
    img = layer(f, rgba=False)
    return img
@lru_cache(None)
def _scale():
    def f(c):
        c.rect(-10, 1200, LW + 10, LH, fill=SNOW, out=None)
        building(c, 900, 1200, 500, 900, (170, 120, 110), seed=3)
        c.rect(-10, 380, LW + 10, 1210, fill=(246, 249, 255, ), out=None)
        snow_bank(c, 380, amp=40, seed=62, bottom=1210)
        c.rect(1600, 380, 1630, 1200, fill=(220, 40, 50), out=None)
        for k in range(9): c.line([(1580, 380 + k * 102), (1650, 380 + k * 102)], (220, 40, 50), 6)
    return layer(f)

@scene(133, snow=0.0)
def s_day30(t, lt, d, fi):
    sun = t > T(138) - 0.1
    cam = path(lt, d, (-0.2, 0.1, 1.0), (0.2, -0.1, 1.06))
    fr = compose([(L_sky("sunny" if sun else "overcast", sun=sun), 6), (_roofs(), 1.3)], cam)
    if sun: glow(fr, 1500, 200, 500, (255, 236, 160), 0.5 * clamp((t - T(138)) / 1))
    if t > T(139) - 0.1:
        for k in range(5):
            x = 300 + k * 450; j = abs(math.sin(t * 6 + k)) * 40
            spr = hero("happy", (0, 0), False, "up") if k == 2 else (dave("happy", False, "up") if k == 3 else kid(k + 40, "happy", "up"))
            put_at(fr, cam, spr, x, 900 - j, 1.3, 0.45)
    if t > T(140) - 0.1:
        x = 1200 + 700 * math.cos((t - T(140)) * 1.2); y = 1150 + 60 * math.sin((t - T(140)) * 1.2)
        put_at(fr, cam, snowmobile(False), x, y, 1.3, 0.7, flip=math.sin((t - T(140)) * 1.2) > 0)
    if t > T(141) - 0.1:
        a = (t - T(141)) * 6; put_at(fr, cam, dog("run", 0.5 + 0.5 * math.sin(t * 14)), 600 + 150 * math.cos(a), 1250 + 40 * math.sin(a), 1.3, 0.5, flip=math.sin(a) > 0)
    if t > T(142) - 0.1: tag(fr, "IT'S OVER!", 960, 130, 70, t - T(142), (60, 160, 90))
    return fr
@lru_cache(None)
def _roofs():
    def f(c):
        c.rect(-10, 900, LW + 10, LH, fill=SNOW, out=None)
        for k, x in enumerate(range(100, LW, 460)):
            c.poly([(x, 920), (x + 200, 760), (x + 400, 920)], fill=[(90, 70, 110), (120, 60, 60), (70, 90, 120)][k % 3], w=6)
            c.poly([(x - 10, 925), (x + 200, 750), (x + 410, 925), (x + 380, 940), (x + 200, 790), (x + 20, 940)], fill=SNOW, out=None)
        snow_bank(c, 1000, amp=40, seed=71)
    return layer(f)

@scene(143, snow=0.0)
def s_flood(t, lt, d, fi):
    cam = path(lt, d, (0, 0, 1.05), (0, 0.1, 1.1))
    fr = compose([(L_sky("overcast"), 6), (L_street(1000, 1, 0.1, 27), 2.6)], cam)
    lvl = clamp((t - T(146)) / 3) if t > T(146) else 0.1
    dd = ImageDraw.Draw(fr, "RGBA")
    wy = lerp(1000, 760, lvl)
    for k in range(4):
        y = wy + k * 30
        pts = [(x, y + 10 * math.sin(x * 0.01 + t * 2 + k)) for x in range(0, W + 40, 40)] + [(W, H), (0, H)]
        dd.polygon(pts, fill=(80, 130, 190, 150 if k else 200))
    put_at(fr, cam, hero("worried", (0, 0), blink_at(t), "down", True), 1200, 1300, 1.1, 0.6)
    if t > T(148) - 0.1: stamp(fr, "FLOOD", 960, 250, t - T(148), 140, (40, 110, 200))
    return fr

@scene(149, snow=0.0)
def s_together(t, lt, d, fi):
    spring = t > T(153) - 0.1
    cam = path(lt, d, (-0.2, 0, 1.0), (0.2, 0, 1.06))
    fr = compose([(L_sky("spring" if spring else "sunny"), 6), (L_street(1000, 0, 0.1, 28), 2.6), (_grass(spring), 1.4)], cam)
    if not spring:
        put_at(fr, cam, hero("happy", (0, 0), blink_at(t), "push"), 800, 1250, 1.4, 0.6)
        put_at(fr, cam, dave("happy", False, "push"), 1150, 1250, 1.4, 0.6)
        if t > T(152) - 0.1: put_at(fr, cam, patterson("happy", blink_at(t), "box"), 1600, 1250, 1.4, 0.6); tag(fr, "COOKIES!", 1600, 360, 60, t - T(152), (200, 120, 60))
    else:
        for k in range(4): put_at(fr, cam, kid(k + 50, "happy", "up"), 600 + k * 300, 1250, 1.4, 0.45)
        tag(fr, "WHEN WILL IT SNOW AGAIN?", 960, 130, 56, t - T(153), (30, 110, 200))
    return fr
@lru_cache(None)
def _grass(spring):
    return layer(lambda c: (c.rect(-10, 1150, LW + 10, LH, fill=(110, 180, 90) if spring else (150, 160, 120), out=None)))

@scene(154, snow=0.15, wind=0.1)
def s_flake(t, lt, d, fi):
    if t > T(156) - 0.1:
        cam = path(t - T(156), 1.5, (0, 0, 1.0), (0, 0, 1.05))
        fr = compose([(L_sky("spring"), 6), (L_street(1000, 0, 0.1, 29), 2.6), (_grass(True), 1.4)], cam)
        put_at(fr, cam, hero("happy", (0, 0), blink_at(t)), 1200, 1300, 1.4, 0.75)
        put_at(fr, cam, _shovel(), 900, 1300, 1.4, 0.7); put_at(fr, cam, _shovel(), 1500, 1300, 1.4, 0.7)
        tag(fr, "BUY A SECOND SHOVEL", 960, 130, 64, t - T(156) - 0.4, (220, 60, 60))
        return fr
    fr = Image.new("RGB", (W, H)); fr.paste(vgrad(W, H, (60, 80, 140), (170, 190, 230)))
    glow(fr, 960, 540, 600, (255, 255, 255), 0.25)
    k = ss(lt / 3.0)
    put(fr, _bigflake(), 960, lerp(200, 560, k) + 300, 0.35, lt * 10)
    c = K(900, 560); c.ell(80, 260, 300, 470, fill=(38, 170, 158), w=8); c.rect(220, 120, 760, 540, fill=(38, 170, 158), r=200, w=8)
    c.rect(200, 470, 780, 560, fill=(250, 250, 250), r=30, w=8)
    put(fr, c.done(), 960, 1150, 1.0)
    return fr

@scene(157, snow=0.4, wind=0.2)
def s_end(t, lt, d, fi):
    fr = compose([(L_sky("dusk", stars=True), 6), (L_street(1100, 4, 0.7, 30), 3), (L_ground(1150, True, 30), 2)], Cam(0, 0, 1.0))
    fr = Image.blend(fr, Image.new("RGB", (W, H), (10, 12, 30)), 0.45)
    text(fr, "WHAT WOULD YOU DO ON DAY 10?", 960, 260, 84, (255, 255, 255), lt)
    text(fr, "Tell me in the comments", 960, 380, 52, (200, 220, 255), lt - 0.5, 6, black=False)
    if t > VEND + 0.3:
        dd = ImageDraw.Draw(fr)
        for x in (560, 1360): dd.rounded_rectangle([x - 330, 470, x + 330, 840], 24, outline=(255, 255, 255), width=4)
        text(fr, "DAY ZERO TALES", 960, 960, 64, (255, 150, 60), t - VEND - 0.3)
    put(fr, hero("happy", (0, 0), blink_at(t), "wave"), 1760, 1080, 0.42)
    return fr

SC.sort(key=lambda s: s[0])
