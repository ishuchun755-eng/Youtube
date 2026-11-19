import sys, math, random, subprocess, json
sys.path.insert(0, "/root/shorts/trucks")
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from lib import font, person, K, ss, eout, back, clamp, lerp, OUT, glow

W, H, FPS = 1080, 1920, 30
DUR = 29.0
NF = int(DUR * FPS)
YEL, RED, GRN, WHT = (255, 214, 40), (235, 40, 50), (40, 200, 90), (255, 255, 255)

# timeline (s)
T_ATT, T_CHINA, T_100, T_CAR, T_QUAL, T_SALE, T_END, T_ADDR, T_LATE = 0.0, 1.81, 4.41, 8.54, 13.99, 16.89, 18.55, 20.66, 24.13
WORDS = [(8.54, "kostyum", "SPORT KOSTYUMLAR"), (9.57, "xudi", "XUDILAR"), (10.21, "kurtka", "KURTKALAR"),
         (10.82, "kross", "KROSSOVKALAR"), (11.61, "butsa", "FUTBOL BUTSALARI"), (12.66, "all", "HAMMASI BIR JOYDA!")]

def load(name, zoom=1.12):
    im = Image.open(f"cut/{name}.png").convert("RGB")
    w, h = im.size; cw, ch = w / zoom, h / zoom
    return im.crop((int((w - cw) / 2), int((h - ch) / 2), int((w + cw) / 2), int((h + ch) / 2)))
P = {n: load(n) for n in ("kostyum", "xudi", "kurtka", "kross1", "kross2", "butsa1", "butsa2")}
ALL = list(P.keys())

_cards = {}
def card(name, w, h, border=10):
    key = (name, w, h)
    if key in _cards: return _cards[key]
    im = P[name]; iw, ih = im.size
    s = max(w / iw, h / ih)
    im = im.resize((int(iw * s) + 1, int(ih * s) + 1), Image.LANCZOS)
    im = im.crop(((im.width - w) // 2, (im.height - h) // 2, (im.width - w) // 2 + w, (im.height - h) // 2 + h))
    out = Image.new("RGBA", (w + border * 2 + 30, h + border * 2 + 30), (0, 0, 0, 0))
    sh = Image.new("L", out.size, 0); ImageDraw.Draw(sh).rounded_rectangle([22, 26, w + border * 2 + 22, h + border * 2 + 26], 40, fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    out.paste((0, 0, 0, 255), (0, 0), sh)
    d = ImageDraw.Draw(out)
    d.rounded_rectangle([0, 0, w + border * 2, h + border * 2], 40, fill=WHT)
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w, h], 32, fill=255)
    out.paste(im, (border, border), m)
    _cards[key] = out
    return out

def put(fr, im, cx, cy, sc=1.0, rot=0.0):
    if sc <= 0.01: return
    if sc != 1: im = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.BILINEAR)
    if rot: im = im.rotate(rot, Image.BICUBIC, expand=True)
    fr.paste(im, (int(cx - im.width / 2), int(cy - im.height / 2)), im)

def pop(t, d=0.3): return back(t / d, 2.0) if t > 0 else 0

def txt(fr, s, x, y, size, fill=WHT, t=1.0, stroke=10, anchor="mm", rot=0, slam=False):
    if t <= 0: return
    q = pop(t, 0.28)
    if slam: q = 2.2 - 1.2 * back(t / 0.25, 2.0)
    sz = max(1, int(size * q))
    if rot == 0:
        ImageDraw.Draw(fr).text((x, y), s, font=font(sz, True), fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=OUT)
        return
    f = font(sz, True); d0 = ImageDraw.Draw(Image.new("L", (1, 1)))
    tw = int(d0.textlength(s, font=f)) + stroke * 2 + 20
    lay = Image.new("RGBA", (tw, int(sz * 1.5) + stroke * 2), (0, 0, 0, 0))
    ImageDraw.Draw(lay).text((tw / 2, lay.height / 2), s, font=f, fill=fill, anchor="mm", stroke_width=stroke, stroke_fill=OUT)
    put(fr, lay, x, y, 1.0, rot)

def pill(fr, s, x, y, size, bg=RED, fg=WHT, t=1.0, rot=0):
    if t <= 0: return
    q = pop(t, 0.3)
    f = font(int(size), True); d0 = ImageDraw.Draw(Image.new("L", (1, 1)))
    tw = d0.textlength(s, font=f)
    lay = Image.new("RGBA", (int(tw + size * 1.4), int(size * 1.9)), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle([0, 0, lay.width - 1, lay.height - 1], int(size * .5), fill=bg, outline=OUT, width=8)
    d.text((lay.width / 2, lay.height / 2), s, font=f, fill=fg, anchor="mm")
    put(fr, lay, x, y, q, rot)

# ---------------- backgrounds
def bg(t, c1=(10, 30, 110), c2=(20, 110, 255), stripes=True):
    a = np.linspace(0, 1, H)[:, None, None]
    arr = np.array(c1, float) * (1 - a) + np.array(c2, float) * a
    fr = Image.fromarray(np.repeat(arr, W, 1).astype(np.uint8))
    if stripes:
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        off = (t * 220) % 240
        for i in range(-12, 14):
            x = i * 240 + off
            d.polygon([(x, 0), (x + 110, 0), (x + 110 - 900, H), (x - 900, H)], fill=(255, 255, 255, 18))
        fr.paste(lay, (0, 0), lay)
    return fr

def burst(fr, t, col=(255, 255, 255), a=40, n=18, cx=W / 2, cy=H / 2):
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for i in range(n):
        ang = i * 2 * math.pi / n + t * 0.4
        d.polygon([(cx, cy), (cx + 1800 * math.cos(ang), cy + 1800 * math.sin(ang)), (cx + 1800 * math.cos(ang + 0.12), cy + 1800 * math.sin(ang + 0.12))], fill=col + (a,))
    fr.paste(lay, (0, 0), lay)

def confetti(fr, t, n=60, seed=1, chars=None):
    d = ImageDraw.Draw(fr); rnd = random.Random(seed)
    for i in range(n):
        x = (rnd.uniform(0, W) + 40 * math.sin(t * 2 + i)) % W
        y = (rnd.uniform(-200, H) + t * rnd.uniform(250, 500)) % (H + 200) - 100
        col = rnd.choice([YEL, RED, WHT, GRN])
        if chars:
            d.text((x, y), chars, font=font(int(rnd.uniform(40, 90)), True), fill=col, anchor="mm", stroke_width=4, stroke_fill=OUT)
        else:
            s = rnd.uniform(8, 18); a = t * 4 + i
            d.polygon([(x + s * math.cos(a), y + s * math.sin(a)), (x + s * math.cos(a + 2), y + s * math.sin(a + 2)), (x + s * math.cos(a + 4), y + s * math.sin(a + 4))], fill=col)

def plane(fr, x, y, s=1.0, rot=0):
    c = K(420, 260)
    c.poly([(20, 130), (330, 110), (400, 130), (330, 150), (20, 145)], fill=WHT)
    c.poly([(170, 125), (250, 20), (290, 20), (250, 125)], fill=(220, 225, 235))
    c.poly([(170, 140), (250, 240), (290, 240), (250, 140)], fill=(220, 225, 235))
    c.poly([(30, 130), (60, 70), (90, 70), (80, 130)], fill=(220, 40, 50))
    for x0 in range(120, 320, 36): c.ell(x0, 120, x0 + 16, 134, fill=(90, 160, 230), out=None)
    put(fr, c.done(), x, y, s, rot)

def pin(fr, x, y, s=1.0):
    c = K(300, 420)
    c.ell(20, 20, 280, 280, fill=RED, w=10)
    c.poly([(40, 200), (260, 200), (150, 400)], fill=RED, w=10)
    c.ell(40, 40, 260, 260, fill=RED, out=None)
    c.ell(95, 95, 205, 205, fill=WHT, w=8)
    put(fr, c.done(), x, y, s)

# ---------------- sections
def s_att(t, lt):
    fr = bg(t, (120, 0, 10), (240, 30, 40))
    burst(fr, t, a=35)
    if int(t * 8) % 2 == 0: glow(fr, W / 2, 700, 600, (255, 230, 120), 0.35)
    put(fr, person("hero", "shock", (0, 0), False, pose="up", sweat=True), W / 2, 1420 - 0, 1.25 * pop(lt, 0.3) or 0.01)
    txt(fr, "KOSONSOY!", W / 2, 300, 120, YEL, lt)
    txt(fr, "DIQQAT!", W / 2, 1600, 210, WHT, lt - 0.75, slam=True)
    return fr

def s_china(t, lt):
    fr = bg(t)
    p = ss(lt / 1.6)
    d = ImageDraw.Draw(fr)
    x0, x1, y = 170, 910, 780
    for k in range(20):
        if k / 20 < p: d.ellipse([lerp(x0, x1, k / 20) - 10, y + 60 * math.sin(k / 20 * math.pi) * -1 - 10, lerp(x0, x1, k / 20) + 10, y - 60 * math.sin(k / 20 * math.pi) + 10], fill=WHT)
    plane(fr, lerp(x0, x1, p), y - 60 * math.sin(p * math.pi) - 40, 0.75, -10 * math.cos(p * math.pi))
    pill(fr, "XITOY", 230, 980, 64, RED, WHT, lt)
    pill(fr, "KOSONSOY", 820, 980, 64, YEL, OUT, lt - 0.7)
    txt(fr, "TO'G'RIDAN-", W / 2, 360, 120, WHT, lt)
    txt(fr, "TO'G'RI!", W / 2, 500, 150, YEL, lt - 0.2)
    if t > 3.1:
        pill(fr, "VOSITACHISIZ!", W / 2, 1350, 100, GRN, WHT, t - 3.1, rot=-6)
    for i, n in enumerate(("xudi", "kross2", "butsa2")):
        if t > 3.4 + i * 0.15:
            put(fr, card(n, 260, 260), 210 + i * 330, 1660, pop(t - 3.4 - i * 0.15), [-8, 4, -3][i])
    return fr

def s_100(t, lt):
    fr = bg(t)
    burst(fr, t, a=22, cy=820)
    n = int(100 * eout(lt / 1.6))
    for i, nm in enumerate(ALL):
        ang = i / len(ALL) * 2 * math.pi + lt * 0.7
        r = 430
        cx, cy = W / 2 + r * math.cos(ang), 820 + r * 0.9 * math.sin(ang)
        put(fr, card(nm, 230, 230), cx, cy, pop(lt - 0.15 * i) * 0.95, 8 * math.sin(lt * 2 + i))
    txt(fr, f"{n}{'+' if n >= 100 else ''}", W / 2, 800, 300, YEL, lt, stroke=14)
    txt(fr, "XIL KIYIM", W / 2, 1000, 90, WHT, lt - 0.4)
    txt(fr, "VA POYABZAL", W / 2, 1100, 90, WHT, lt - 0.6)
    if t > 6.9:
        pill(fr, "HAMYONBOP NARXLAR", W / 2, 1520, 76, RED, WHT, t - 6.9, rot=-4)
    return fr

def s_car(t, lt):
    fr = bg(t, (8, 20, 80), (10, 90, 230))
    cur = None
    for i, (ts, key, lab) in enumerate(WORDS):
        if t >= ts - 0.05: cur = (i, ts, key, lab)
    i, ts, key, lab = cur
    l2 = t - ts + 0.05
    if key == "all":
        for j, nm in enumerate(ALL):
            col, row = j % 2, j // 2
            if j == 6: col = 0.5
            x = 290 + col * 500; y = 360 + row * 380
            put(fr, card(nm, 400, 320), x, y, pop(l2 - j * 0.06) * 0.98, [-3, 3, 2, -2, 3, -3, 0][j])
        txt(fr, "HAMMASI", W / 2, 1720, 120, YEL, l2 - 0.2)
        txt(fr, "BIR JOYDA!", W / 2, 1840, 100, WHT, l2 - 0.35)
        return fr
    burst(fr, t, a=20, cy=860)
    slide = 1 - eout(l2 / 0.3)
    if key in ("kross", "butsa"):
        a, b = (("kross1", "kross2") if key == "kross" else ("butsa1", "butsa2"))
        put(fr, card(a, 860, 560), W / 2 + slide * 1200, 600, 1.0, -2)
        put(fr, card(b, 860, 560), W / 2 - slide * 1200, 1230, 1.0 if l2 > 0.15 else 0.01, 2)
    else:
        cw, hh = (480, 1380) if key == "kostyum" else (820, 1100)
        put(fr, card(key, cw, hh), W / 2 + slide * 1200, 880 + 10 * math.sin(lt * 3), 1.0, 2 * math.sin(lt * 2))
    pill(fr, lab, W / 2, 1700, 82, YEL, OUT, l2 - 0.05)
    pill(fr, "AKSIYA", 860, 200, 60, RED, WHT, l2 - 0.15, rot=12)
    return fr

def s_qual(t, lt):
    fr = bg(t)
    txt(fr, "SIFATI ZO'R", W / 2, 260, 130, WHT, lt)
    if lt > 0.3:
        d = ImageDraw.Draw(fr); q = clamp((lt - 0.3) / 0.3)
        d.line([(W / 2 - 60, 400), (W / 2 - 60 + 50 * q, 400 + 50 * q)], fill=GRN, width=26)
        if q >= 1: d.line([(W / 2 - 10, 450), (W / 2 + 90 * clamp((lt - .6) / .2), 450 - 110 * clamp((lt - .6) / .2))], fill=GRN, width=26)
    tb = 15.0
    d = ImageDraw.Draw(fr)
    for k, (lab, sub, col, x) in enumerate((("BOZORDA", "QIMMAT", (120, 120, 140), 280), ("BIZDA", "ARZON", GRN, 800))):
        tt = t - tb - k * 0.5
        if tt <= -0.3: continue
        q = pop(tt + 0.3)
        d.rounded_rectangle([x - 230 * q, 640, x + 230 * q, 1300], 40, fill=(255, 255, 255), outline=OUT, width=8)
        if q > .8:
            d.text((x, 730), lab, font=font(64, True), fill=OUT, anchor="mm")
            put(fr, card("kross2" if k else "kross1", 360, 300, 6), x, 960, 1.0)
            d.text((x, 1200), sub, font=font(76, True), fill=col if k else RED, anchor="mm")
        if k == 0 and t > tb + 0.6:
            qq = clamp((t - tb - 0.6) / 0.25)
            d.line([(x - 200, 680), (lerp(x - 200, x + 200, qq), lerp(680, 1260, qq))], fill=RED, width=22)
            d.line([(x + 200, 680), (lerp(x + 200, x - 200, qq), lerp(680, 1260, qq))], fill=RED, width=22)
    if t > 16.0:
        txt(fr, "ANCHA ARZON!", W / 2, 1520, 130, YEL, t - 16.0, slam=True)
    return fr

def s_sale(t, lt):
    fr = bg(t, (140, 0, 20), (255, 60, 40))
    burst(fr, t, (255, 230, 120), 40)
    confetti(fr, t, 40, 3, "%")
    for i, nm in enumerate(("kostyum", "kurtka", "kross1", "butsa2")):
        put(fr, card(nm, 300, 300), [190, 890, 190, 890][i], [420, 420, 1500, 1500][i] + 15 * math.sin(t * 3 + i), pop(lt - i * 0.08), [-10, 10, 8, -8][i])
    txt(fr, "KATTA", W / 2, 840, 200, WHT, lt, slam=True)
    txt(fr, "AKSIYA!", W / 2, 1060, 230, YEL, lt - 0.25, slam=True, stroke=14)
    return fr

def s_end(t, lt):
    flash = int(t * 6) % 2 == 0
    fr = bg(t, (60, 0, 0), (200, 0, 20) if flash else (150, 0, 15), stripes=False)
    d = ImageDraw.Draw(fr)
    cx, cy, r = W / 2, 760, 300
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHT, outline=OUT, width=14)
    for k in range(12):
        a = k / 12 * 2 * math.pi
        d.line([(cx + (r - 40) * math.cos(a), cy + (r - 40) * math.sin(a)), (cx + (r - 15) * math.cos(a), cy + (r - 15) * math.sin(a))], fill=OUT, width=10)
    a = -math.pi / 2 + lt * 6
    d.line([(cx, cy), (cx + 230 * math.cos(a), cy + 230 * math.sin(a))], fill=RED, width=16)
    d.line([(cx, cy), (cx + 150 * math.cos(a / 12 - 1), cy + 150 * math.sin(a / 12 - 1))], fill=OUT, width=20)
    d.ellipse([cx - 26, cy - 26, cx + 26, cy + 26], fill=OUT)
    sh = 8 * math.sin(t * 40) if lt > 0.2 else 0
    txt(fr, "TEZ ORADA", W / 2 + sh, 1250, 140, WHT, lt - 0.1)
    txt(fr, "TUGAYDI!", W / 2 - sh, 1410, 170, YEL, lt - 0.3, stroke=14)
    return fr

def s_addr(t, lt):
    fr = bg(t, (10, 40, 140), (40, 140, 255))
    d = ImageDraw.Draw(fr)
    d.rounded_rectangle([60, 700, 1020, 1520], 50, fill=WHT, outline=OUT, width=10)
    for i in range(6): d.line([(100 + i * 160, 740), (60 + i * 200, 1480)], fill=(220, 230, 240), width=24)
    d.line([(80, 1180), (1000, 1080)], fill=(250, 200, 60), width=60)
    dy = -900 * (1 - eout(lt / 0.45))
    pin(fr, W / 2, 900 + dy, 0.75)
    txt(fr, "MANZIL:", W / 2, 360, 110, YEL, lt)
    txt(fr, "KOSONSOY TUMANI", W / 2, 500, 80, WHT, lt - 0.3, stroke=8)
    tx = 22.0
    pill(fr, "XUMXONA KO'CHASI", W / 2, 1650, 74, YEL, OUT, t - tx)
    pill(fr, "YO'L BO'YIDA", W / 2, 1800, 70, RED, WHT, t - tx - 0.9)
    return fr

def s_late(t, lt):
    fr = bg(t)
    txt(fr, "KECH QOLMANG!", W / 2, 260, 104, YEL, lt, slam=True)
    d = ImageDraw.Draw(fr)
    sizes = ["S", "M", "L", "XL", "XXL"]
    for i, s in enumerate(sizes):
        x = 140 + i * 200; y = 560
        q = pop(lt - 0.2 - i * 0.08)
        if q <= 0: continue
        d.rounded_rectangle([x - 80 * q, y - 80 * q, x + 80 * q, y + 80 * q], 24, fill=WHT, outline=OUT, width=7)
        d.text((x, y), s, font=font(int(64 * q) + 1, True), fill=OUT, anchor="mm")
        if i in (1, 2) and lt > 1.3 + (i - 1) * 0.3:
            stamp_t = lt - 1.3 - (i - 1) * 0.3
            txt(fr, "X", x, y, 160, RED, stamp_t, stroke=6)
    # end card
    d.rounded_rectangle([60, 860, 1020, 1580], 50, fill=(255, 255, 255), outline=OUT, width=10)
    pin(fr, 190, 1030, 0.42)
    d.text((300, 980), "Kosonsoy tumani", font=font(60, True), fill=OUT, anchor="lm")
    d.text((300, 1070), "Xumxona ko'chasi", font=font(60, True), fill=OUT, anchor="lm")
    d.text((300, 1160), "yo'l bo'yida", font=font(60, True), fill=OUT, anchor="lm")
    d.rounded_rectangle([110, 1280, 970, 1520], 40, fill=RED)
    d.text((W / 2, 1360), "XITOYDAN TO'G'RIDAN-TO'G'RI", font=font(50, True), fill=WHT, anchor="mm")
    d.text((W / 2, 1450), "100+ XIL • KATTA AKSIYA", font=font(54, True), fill=YEL, anchor="mm")
    if t > 26.6:
        pill(fr, "HOZIROQ KELING!", W / 2, 1760, 84 + 4 * math.sin(t * 8), GRN, WHT, t - 26.6)
    confetti(fr, t, 30, 9)
    return fr

SECS = [(T_ATT, s_att), (T_CHINA, s_china), (T_100, s_100), (T_CAR, s_car), (T_QUAL, s_qual), (T_SALE, s_sale), (T_END, s_end), (T_ADDR, s_addr), (T_LATE, s_late)]

def frame(fi):
    t = fi / FPS
    st, fn = SECS[0]
    for s in SECS:
        if t >= s[0] - 0.05: st, fn = s
    lt = t - st
    fr = fn(t, lt)
    if 0 <= lt < 0.1 and st > 0:
        fr = Image.blend(fr, Image.new("RGB", (W, H), (255, 255, 255)), 0.6 * (1 - lt / 0.1))
    return fr

if __name__ == "__main__":
    if sys.argv[1] == "stills":
        import os; os.makedirs("stills", exist_ok=True)
        for i, tt in enumerate(sys.argv[2].split(",")): frame(int(float(tt) * FPS)).save(f"stills/{i:02d}.jpg", quality=85)
        sys.exit()
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "video.mp4"], stdin=subprocess.PIPE)
    for fi in range(NF):
        ff.stdin.write(frame(fi).tobytes())
    ff.stdin.close(); ff.wait(); print("done")
