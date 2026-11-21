import json, math, sys, os, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
D0 = '/root/shorts/btc'
SENT = json.load(open(f'{D0}/sentences.json'))
S = lambda i: SENT[i]['start']; E = lambda i: SENT[i]['end']
W, H, fps, SS = 1080, 1920, 30, 2
VDUR = 34.86; DUR = VDUR + 1.3; NF = int(DUR * fps)
INK = (52, 26, 64)
_fc = {}
def F(s, w='Black'):
    k = (s, w)
    if k not in _fc: _fc[k] = ImageFont.truetype(f'/usr/share/fonts/opentype/inter/Inter-{w}.otf', max(1, int(s * SS)))
    return _fc[k]
_em = {}
def emoji(ch, size):
    k = (ch, size)
    if k not in _em:
        f = ImageFont.truetype('/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf', 109)
        im = Image.new('RGBA', (140, 140)); ImageDraw.Draw(im).text((70, 70), ch, font=f, embedded_color=True, anchor='mm')
        im = im.crop(im.getbbox()); r = size * SS / max(im.size)
        _em[k] = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
    return _em[k]
clamp = lambda x: max(0.0, min(1.0, x))
def ease(x): x = clamp(x); return x * x * (3 - 2 * x)
def eout(x): x = clamp(x); return 1 - (1 - x) ** 3
def back(x, s=1.8):
    x = clamp(x) - 1; return 1 + x * x * ((s + 1) * x + s)
lerp = lambda a, b, k: a + (b - a) * k
def mixc(a, b, k): return tuple(int(lerp(a[i], b[i], k)) for i in range(3))

class C:
    """drawing helper in 1080x1920 coordinates on an SS-scaled canvas"""
    def __init__(s, im): s.im = im; s.d = ImageDraw.Draw(im)
    def p(s, *v): return [x * SS for x in v]
    def rect(s, x0, y0, x1, y1, fill, r=0, ol=INK, w=6):
        if r: s.d.rounded_rectangle(s.p(x0, y0, x1, y1), int(r * SS), fill=fill, outline=ol, width=int(w * SS) if ol else 0)
        else: s.d.rectangle(s.p(x0, y0, x1, y1), fill=fill, outline=ol, width=int(w * SS) if ol else 0)
    def ell(s, cx, cy, rx, ry, fill, ol=INK, w=6):
        s.d.ellipse(s.p(cx - rx, cy - ry, cx + rx, cy + ry), fill=fill, outline=ol, width=int(w * SS) if ol else 0)
    def poly(s, pts, fill, ol=INK, w=6):
        q = [(x * SS, y * SS) for x, y in pts]; s.d.polygon(q, fill=fill, outline=ol, width=int(w * SS) if ol else 0)
    def line(s, pts, fill=INK, w=6):
        s.d.line([(x * SS, y * SS) for x, y in pts], fill=fill, width=int(w * SS), joint='curve')
    def arc(s, cx, cy, rx, ry, a0, a1, fill=INK, w=6):
        s.d.arc(s.p(cx - rx, cy - ry, cx + rx, cy + ry), a0, a1, fill=fill, width=int(w * SS))
    def text(s, x, y, t, size, fill=(255, 255, 255), wt='Black', anchor='mm', stroke=0, sf=INK):
        s.d.text((x * SS, y * SS), t, font=F(size, wt), fill=fill, anchor=anchor, stroke_width=int(stroke * SS), stroke_fill=sf)
    def tlen(s, t, size, wt='Black'): return s.d.textlength(t, font=F(size, wt)) / SS
    def emo(s, ch, x, y, size, rot=0):
        im = emoji(ch, size)
        if rot: im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
        s.im.alpha_composite(im, (int(x * SS - im.width / 2), int(y * SS - im.height / 2))) if s.im.mode == 'RGBA' else s.im.paste(im, (int(x * SS - im.width / 2), int(y * SS - im.height / 2)), im)

# ---------------- character ----------------
SKIN = (238, 190, 150); HAIR = (40, 28, 30); HOOD = (60, 140, 220)
def hero(c, cx, cy, s, t, expr='neutral', look=(0, 0), arms='down', shake=0, sweat=0, phone=False):
    """cx,cy = feet centre; s = scale (1 => ~700px tall)"""
    bob = math.sin(t * 2.4) * 4 * s
    sx = math.sin(t * 50) * shake * 6 * s
    cx += sx; cy += bob
    # body
    bw, bh = 170 * s, 260 * s
    by = cy - 120 * s
    c.rect(cx - bw * 0.6, by - 10 * s, cx - 15 * s, cy, (40, 46, 70), r=30 * s)  # legs
    c.rect(cx + 15 * s, by - 10 * s, cx + bw * 0.6, cy, (40, 46, 70), r=30 * s)
    c.rect(cx - bw, by - bh, cx + bw, by + 30 * s, HOOD, r=90 * s)
    c.line([(cx - 40 * s, by - bh + 40 * s), (cx - 30 * s, by - bh + 120 * s)], (240, 240, 250), 6 * s)
    c.line([(cx + 40 * s, by - bh + 40 * s), (cx + 30 * s, by - bh + 120 * s)], (240, 240, 250), 6 * s)
    # arms
    sh_y = by - bh + 70 * s
    if arms == 'phone':
        for side in (-1, 1):
            c.line([(cx + side * bw * 0.9, sh_y), (cx + side * 120 * s, by - 90 * s), (cx + side * 40 * s, by - 150 * s)], INK, 62 * s)
            c.line([(cx + side * bw * 0.9, sh_y), (cx + side * 120 * s, by - 90 * s), (cx + side * 40 * s, by - 150 * s)], HOOD, 48 * s)
        if phone:
            c.rect(cx - 55 * s, by - 290 * s, cx + 55 * s, by - 110 * s, (30, 30, 40), r=16 * s, w=5 * s)
            c.rect(cx - 45 * s, by - 280 * s, cx + 45 * s, by - 125 * s, (120, 200, 255), r=10 * s, ol=None)
        for side in (-1, 1): c.ell(cx + side * 45 * s, by - 160 * s, 28 * s, 28 * s, SKIN, w=5 * s)
    elif arms == 'up':
        for side in (-1, 1):
            k = math.sin(t * 9 + side) * 10 * s
            c.line([(cx + side * bw * 0.9, sh_y), (cx + side * 230 * s, sh_y - 150 * s + k)], INK, 62 * s)
            c.line([(cx + side * bw * 0.9, sh_y), (cx + side * 230 * s, sh_y - 150 * s + k)], HOOD, 48 * s)
            c.ell(cx + side * 235 * s, sh_y - 160 * s + k, 32 * s, 32 * s, SKIN, w=5 * s)
    elif arms == 'cheeks':
        for side in (-1, 1):
            c.line([(cx + side * bw * 0.9, sh_y), (cx + side * 200 * s, sh_y - 60 * s), (cx + side * 120 * s, sh_y - 200 * s)], INK, 62 * s)
            c.line([(cx + side * bw * 0.9, sh_y), (cx + side * 200 * s, sh_y - 60 * s), (cx + side * 120 * s, sh_y - 200 * s)], HOOD, 48 * s)
    else:
        for side in (-1, 1):
            c.line([(cx + side * bw * 0.9, sh_y), (cx + side * bw * 1.05, by - 20 * s)], INK, 62 * s)
            c.line([(cx + side * bw * 0.9, sh_y), (cx + side * bw * 1.05, by - 20 * s)], HOOD, 48 * s)
            c.ell(cx + side * bw * 1.05, by - 10 * s, 30 * s, 30 * s, SKIN, w=5 * s)
    # head
    hx, hy = cx + look[0] * 8 * s, by - bh - 150 * s
    hr = 175 * s
    c.ell(hx, hy, hr, hr * 1.05, SKIN, w=7 * s)
    c.poly([(hx - hr * 0.98, hy - 20 * s), (hx - hr * 0.8, hy - hr * 0.8), (hx - 20 * s, hy - hr * 1.15), (hx + hr * 0.7, hy - hr * 0.95), (hx + hr * 1.0, hy - 30 * s), (hx + hr * 0.6, hy - hr * 0.55), (hx, hy - hr * 0.7), (hx - hr * 0.6, hy - hr * 0.5)], HAIR, w=6 * s)
    if arms == 'cheeks':
        for side in (-1, 1): c.ell(hx + side * hr * 0.85, hy + 50 * s, 34 * s, 40 * s, SKIN, w=5 * s)
    # face
    ex = 62 * s; ey = hy + 5 * s
    big = {'shock': 1.5, 'scared': 1.35, 'greedy': 1.2}.get(expr, 1.0)
    blink = (t * 1.0) % 3.7 < 0.12 and expr not in ('shock',)
    for side in (-1, 1):
        x = hx + side * ex
        if blink: c.line([(x - 26 * s, ey), (x + 26 * s, ey)], INK, 7 * s)
        else:
            c.ell(x, ey, 34 * s * big, 40 * s * big, (255, 255, 255), w=6 * s)
            pr = 14 * s * (0.75 if expr in ('shock', 'scared') else 1)
            c.ell(x + look[0] * 10 * s, ey + look[1] * 10 * s + 4 * s, pr, pr, INK, ol=None)
            if expr == 'greedy':
                c.text(x + look[0] * 8 * s, ey + 4 * s, '$', 44 * s, (40, 170, 70), stroke=3 * s, sf=(255, 255, 255))
        # brows
        if expr in ('scared', 'worried'): c.line([(x - side * 30 * s, ey - 62 * s * big), (x + side * 25 * s, ey - 52 * s * big - 14 * s)], INK, 8 * s)
        elif expr == 'shock': c.line([(x - 28 * s, ey - 78 * s), (x + 28 * s, ey - 82 * s)], INK, 8 * s)
        elif expr == 'happy' or expr == 'greedy': c.arc(x, ey - 55 * s, 28 * s, 14 * s, 200, 340, INK, 8 * s)
        else: c.line([(x - 26 * s, ey - 56 * s), (x + 26 * s, ey - 58 * s)], INK, 8 * s)
    my = hy + 95 * s
    if expr == 'shock': c.ell(hx, my + 10 * s, 30 * s, 42 * s, (120, 30, 40), w=6 * s)
    elif expr == 'scared':
        pts = [(hx - 50 * s + i * 12.5 * s, my + (8 if i % 2 else -8) * s) for i in range(9)]; c.line(pts, INK, 7 * s)
    elif expr in ('happy', 'greedy'):
        c.d.chord(c.p(hx - 60 * s, my - 40 * s, hx + 60 * s, my + 40 * s), 0, 180, fill=(120, 30, 40), outline=INK, width=int(6 * s * SS))
    elif expr == 'worried': c.arc(hx, my + 20 * s, 34 * s, 16 * s, 200, 340, INK, 7 * s)
    else: c.arc(hx, my - 10 * s, 30 * s, 14 * s, 20, 160, INK, 7 * s)
    c.ell(hx - 110 * s, hy + 60 * s, 22 * s, 12 * s, (245, 150, 140), ol=None) if expr in ('happy', 'greedy') else None
    if sweat:
        for i in range(int(sweat)):
            k = ((t * 1.3 + i * 0.37) % 1)
            x = hx + (1 if i % 2 else -1) * (hr * 0.9 + 10 * s); y = hy - 60 * s + k * 160 * s
            c.poly([(x, y - 22 * s), (x - 13 * s, y + 4 * s), (x, y + 16 * s), (x + 13 * s, y + 4 * s)], (130, 200, 255), w=4 * s)
    return hx, hy

# ---------------- phone ----------------
def phone(c, cx, cy, pw, ph, t, scr, rot=0, hands=True, shake=0):
    """scr(cs, w, h) draws screen content on an RGB screen image (in 1x units via its own C)"""
    sw, sh = int(pw * 0.9), int(ph * 0.9)
    lay = Image.new('RGBA', ((pw + 260) * SS, (ph + 200) * SS), (0, 0, 0, 0)); lc = C(lay)
    ox, oy = 130, 100
    lc.rect(ox, oy, ox + pw, oy + ph, (28, 28, 36), r=70, w=8)
    scrim = Image.new('RGB', (sw * SS, sh * SS), (245, 246, 250)); sc = C(scrim); scr(sc, sw, sh, t)
    m = Image.new('L', scrim.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, scrim.width, scrim.height], 50 * SS, fill=255)
    lay.paste(scrim, (int((ox + (pw - sw) / 2) * SS), int((oy + (ph - sh) / 2) * SS)), m)
    lc.rect(ox + pw / 2 - 60, oy + (ph - sh) / 2 + 12, ox + pw / 2 + 60, oy + (ph - sh) / 2 + 40, (20, 20, 26), r=14, ol=None)
    if hands:
        for side in (-1, 1):
            hx = ox + (pw / 2) + side * (pw / 2 + 10)
            lc.ell(hx, oy + ph * 0.72, 75, 120, SKIN, w=7)
            for k in range(3): lc.ell(hx - side * 40, oy + ph * 0.45 + k * 70, 48, 30, SKIN, w=6)
    if shake: rot += math.sin(t * 45) * 2.5 * shake; cx += math.sin(t * 61) * 10 * shake; cy += math.cos(t * 53) * 8 * shake
    if rot: lay = lay.rotate(rot, resample=Image.BICUBIC, expand=False)
    c.im.paste(lay, (int((cx - pw / 2 - ox) * SS), int((cy - ph / 2 - oy) * SS)), lay)

TG = (42, 158, 230)
def status_bar(sc, w, dark=False):
    col = (255, 255, 255) if dark else (30, 30, 40)
    sc.text(60, 40, '21:47', 26, col, 'Bold')
    sc.text(w - 70, 40, '4G ▮▮▮', 22, col, 'Bold')

# ---------------- backgrounds ----------------
def grad(top, bot):
    im = Image.new('RGB', (W * SS, H * SS)); d = ImageDraw.Draw(im)
    for y in range(0, H * SS, 4):
        d.rectangle([0, y, W * SS, y + 4], fill=mixc(top, bot, y / (H * SS)))
    return im
BG = {}
def bg(name):
    if name in BG: return BG[name].copy()
    if name == 'street':
        im = grad((40, 50, 110), (240, 130, 110)); c = C(im)
        random.seed(3)
        for i in range(40): c.ell(random.uniform(0, W), random.uniform(0, 600), 3, 3, (255, 255, 220), ol=None)
        for x, h_, col in [(-40, 900, (70, 60, 120)), (230, 760, (90, 70, 140)), (560, 980, (60, 55, 110)), (850, 820, (85, 65, 130))]:
            c.rect(x, 1380 - h_, x + 300, 1400, col, w=5)
            for wy in range(int(1380 - h_ + 60), 1300, 110):
                for wx in range(x + 40, x + 280, 85):
                    c.rect(wx, wy, wx + 45, wy + 60, (255, 220, 120) if (wx + wy) % 3 else (60, 60, 100), w=3)
        c.rect(-10, 1400, W + 10, H + 10, (90, 90, 110), w=0, ol=None)
        c.rect(-10, 1400, W + 10, 1440, (150, 150, 165), ol=None)
    elif name == 'room':
        im = grad((70, 60, 110), (40, 34, 70)); c = C(im)
        c.rect(640, 260, 1000, 700, (30, 30, 70), w=8)
        c.ell(880, 360, 50, 50, (250, 250, 220), ol=None)
        c.line([(820, 260), (820, 700)], INK, 8); c.line([(640, 480), (1000, 480)], INK, 8)
        c.rect(-10, 1450, W + 10, H + 10, (110, 80, 70), ol=None)
        c.rect(60, 1150, 520, 1460, (150, 100, 80), r=20)
        c.ell(230, 1100, 50, 60, (255, 230, 150), ol=None); c.rect(215, 1150, 245, 1160, INK, ol=None)
    elif name == 'gold':
        im = grad((255, 200, 70), (255, 120, 40))
    elif name == 'dream':
        im = grad((150, 220, 255), (255, 210, 240))
    elif name == 'dark':
        im = grad((30, 8, 16), (8, 4, 10))
    elif name == 'tg':
        im = grad((210, 230, 245), (180, 205, 230))
    BG[name] = im
    return im.copy()

def rays(c, cx, cy, t, col, n=16, alpha=1.0):
    lay = Image.new('RGBA', c.im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for i in range(n):
        a = t * 0.4 + i * 2 * math.pi / n
        p = [(cx * SS, cy * SS), ((cx + 2000 * math.cos(a)) * SS, (cy + 2000 * math.sin(a)) * SS), ((cx + 2000 * math.cos(a + 0.12)) * SS, (cy + 2000 * math.sin(a + 0.12)) * SS)]
        d.polygon(p, fill=col + (int(90 * alpha),))
    c.im.paste(lay, (0, 0), lay)

def btc_coin(c, x, y, r, rot=0):
    sq = abs(math.cos(rot))
    c.ell(x, y, r * max(0.12, sq), r, (247, 147, 26), w=max(3, r * 0.08))
    if sq > 0.4: c.text(x, y + 2, '₿', r * 1.1 * sq, (255, 255, 255), stroke=r * 0.05)

# ---------------- captions ----------------
CAPY = 1555
def caption(c, t):
    cur = None
    for s in SENT:
        if s['start'] - 0.05 <= t <= s['end'] + 0.2: cur = s
    if not cur: return
    words = cur['text'].replace('"', '').split(); a, b = cur['start'], cur['end']
    tot = sum(len(w) + 1 for w in words); acc = 0; st = []
    for w_ in words: st.append(a + (b - a) * acc / tot); acc += len(w_) + 1
    lines, ln = [], []
    for i, w_ in enumerate(words):
        if ln and c.tlen(' '.join(words[j] for j in ln + [i]), 70) > 940: lines.append(ln); ln = [i]
        else: ln.append(i)
    lines.append(ln)
    y0 = CAPY - (len(lines) - 1) * 44
    for li, ln in enumerate(lines):
        ws = [c.tlen(words[i] + ' ', 70) for i in ln]; x = W / 2 - sum(ws) / 2
        for i, wd in zip(ln, ws):
            act = st[i] <= t < (st[i + 1] if i + 1 < len(words) else b + 0.2)
            sc = 1.0
            c.text(x + (wd - c.tlen(' ', 70)) / 2, y0 + li * 88, words[i], 70 * sc, (255, 220, 40) if act else (255, 255, 255), stroke=9, sf=(0, 0, 0)); x += wd

# ---------------- screens ----------------
def scr_reg(sc, w, h, t):
    status_bar(sc, w)
    sc.rect(0, 70, w, 190, TG, ol=None); sc.text(w / 2, 130, "Ro'yxatdan o'tish", 40, (255, 255, 255), 'ExtraBold')
    sc.ell(w / 2, 330, 90, 90, TG, ol=None); sc.text(w / 2, 330, '✈', 90, (255, 255, 255), 'Bold') if False else sc.emo('💬', w / 2, 330, 100)
    sc.text(w / 2, 480, 'Telefon raqamingiz', 34, (60, 60, 70), 'Bold')
    sc.rect(50, 530, w - 50, 620, (255, 255, 255), r=20, ol=(200, 200, 210), w=3)
    sc.text(w / 2, 575, '+998 9• ••• •• 17', 40, (30, 30, 40), 'ExtraBold')
    sc.text(w / 2, 690, 'SMS kod', 30, (90, 90, 100), 'Bold')
    k = clamp((t - S(1)) / 1.1); n = int(k * 5)
    for i in range(5):
        x = w / 2 - 200 + i * 100
        sc.rect(x - 40, 730, x + 40, 830, (255, 255, 255), r=16, ol=TG if i == n else (200, 200, 210), w=4)
        if i < n: sc.text(x, 780, '47219'[i], 54, (30, 30, 40))
    if k >= 1:
        q = back((t - S(1) - 1.1) / 0.3)
        sc.ell(w / 2, 960, 70 * q, 70 * q, (60, 190, 90), ol=None); sc.text(w / 2, 962, '✓', 80 * q, (255, 255, 255), 'Bold')

CHATS = [('Akmal aka', 'Pulni qachon qaytarasan?', (230, 120, 90)), ('Kripto Hamyon', 'Sizning balansingiz...', (247, 147, 26)), ('Noma\'lum', 'Javob ber!!!', (90, 90, 100)), ('Bank', 'Kod: 4821', (80, 160, 120)), ('Diyora', 'Qayerdasan?', (200, 110, 200))]
def scr_chats(sc, w, h, t):
    status_bar(sc, w, True)
    sc.rect(0, 0, w, 190, TG, ol=None); sc.text(w / 2, 130, 'Chatlar', 40, (255, 255, 255), 'ExtraBold')
    for i, (nm, msg, col) in enumerate(CHATS):
        q = eout((t - S(2) - 0.15 * i) / 0.3)
        if q <= 0: continue
        y = 260 + i * 150; x = (1 - q) * w
        sc.rect(x + 10, y - 60, x + w - 10, y + 70, (255, 255, 255) if i != 1 else (255, 244, 220), r=20, ol=None)
        sc.ell(x + 85, y, 52, 52, col, ol=None); sc.text(x + 85, y, nm[0], 46, (255, 255, 255))
        sc.text(x + 160, y - 22, nm, 32, (30, 30, 40), 'ExtraBold', anchor='lm'); sc.text(x + 160, y + 26, msg, 26, (110, 110, 120), 'Bold', anchor='lm')
        badge = [3, 1, 9, 0, 2][i]
        if badge: sc.ell(x + w - 70, y, 26, 26, TG, ol=None); sc.text(x + w - 70, y + 1, str(badge), 26, (255, 255, 255), 'Bold')

def scr_wallet(sc, w, h, t):
    sc.im.paste(Image.new('RGB', sc.im.size, (22, 24, 40)), (0, 0)); status_bar(sc, w, True)
    sc.text(w / 2, 150, 'KRIPTO HAMYON', 38, (247, 147, 26))
    if t < S(4) - 0.05:
        for i in range(8):
            a = t * 8 + i * math.pi / 4; al = (i / 8)
            sc.ell(w / 2 + 70 * math.cos(a), 520 + 70 * math.sin(a), 14, 14, mixc((22, 24, 40), (247, 147, 26), al), ol=None)
        sc.text(w / 2, 680, 'Yuklanmoqda...', 32, (180, 180, 200), 'Bold')
    else:
        k = t - S(4) + 0.05
        btc_coin(sc, w / 2, 430, 120, k * 6 if k < 0.8 else 0)
        q = back(k / 0.35)
        sc.text(w / 2, 650, 'Balans', 34, (180, 180, 200), 'Bold')
        val = min(10.0, 10.0 * eout(k / 0.6))
        sc.text(w / 2, 760, f'{val:.2f} BTC', 96 * max(0.01, q), (255, 255, 255))
        if t > S(6): sc.text(w / 2, 870, f'≈ ${int(600000 * eout((t - S(6) - 1.0) / 1.2)):,}'.replace(',', ' '), 54, (80, 220, 120))
        for i, nm in enumerate(['Yuborish', 'Qabul', 'Almashish']):
            x = w / 2 + (i - 1) * 200; sc.ell(x, 1060, 55, 55, (50, 54, 80), ol=None); sc.text(x, 1150, nm, 24, (200, 200, 220), 'Bold')
            sc.text(x, 1060, ['↑', '↓', '⇄'][i], 50, (247, 147, 26), 'Bold')

MSGS = [(10, 'Salom.'), (11, 'Raqamni yangi oldingizmi?'), (12, 'Muhim gapim bor.'), (13, 'Men sizni taniyman...'), (14, 'Va uyingizni ham bilaman.')]
ADDR = ["Sardor Karimov,", "Yangiobod mahallasi,", "Gulzor ko'chasi, 17-uy.", "Ko'k darvoza."]
def scr_chat(sc, w, h, t):
    red = clamp((t - S(13)) / 3.0)
    sc.im.paste(Image.new('RGB', sc.im.size, mixc((200, 222, 238), (70, 20, 30), red * 0.85)), (0, 0))
    status_bar(sc, w, True)
    sc.rect(0, 0, w, 190, mixc(TG, (40, 40, 50), red), ol=None)
    sc.ell(110, 130, 44, 44, (30, 30, 36), ol=(255, 255, 255), w=3); sc.text(110, 132, '?', 48, (255, 255, 255))
    sc.text(175, 112, "Noma'lum", 36, (255, 255, 255), 'ExtraBold', anchor='lm')
    typing = any(S(i) - 0.45 < t < S(i) for i, _ in MSGS) or (S(15) - 0.1 < t < S(16))
    sc.text(175, 155, 'yozmoqda...' if typing else 'onlayn', 24, (200, 230, 255), 'Bold', anchor='lm')
    items = [(S(i), m, False) for i, m in MSGS] + [(S(16), None, True)]
    shown = [it for it in items if t >= it[0] - 0.02]
    # layout from bottom
    hs = []
    for st, m, addr in shown: hs.append(320 if addr else 110)
    y = h - 60 - (110 if typing else 0)
    pos = []
    for (st, m, addr), hh in zip(reversed(shown), reversed(hs)):
        pos.append((y - hh, st, m, addr, hh)); y -= hh + 22
    for y0, st, m, addr, hh in pos:
        q = back((t - st) / 0.25)
        x0 = 30; bw_ = (sc.tlen(m, 44, 'Bold') + 70) if m else w - 80
        sc.d.rounded_rectangle(sc.p(x0, y0 + hh * (1 - q), x0 + bw_ * q, y0 + hh), 30 * SS, fill=(255, 255, 255) if not addr else (255, 235, 235), outline=(200, 40, 50) if addr else None, width=6 * SS if addr else 0)
        if q > 0.9:
            if m: sc.text(x0 + 35, y0 + hh / 2, m, 44, (30, 30, 40), 'Bold', anchor='lm')
            else:
                sc.emo('📍', x0 + 55, y0 + 60, 50)
                for k, ln in enumerate(ADDR): sc.text(x0 + 100 if k == 0 else x0 + 35, y0 + 60 + k * 66, ln, 40, (150, 10, 20) if k else (30, 30, 40), 'ExtraBold', anchor='lm')
    if typing:
        sc.rect(30, h - 150, 190, h - 60, (255, 255, 255), r=40, ol=None)
        for i in range(3): sc.ell(75 + i * 35, h - 105 - 10 * max(0, math.sin(t * 10 - i)), 11, 11, (150, 150, 160), ol=None)

# ---------------- shots ----------------
def frame(fi):
    t = fi / fps
    if t < S(1) - 0.1: im = shot_kiosk(t)
    elif t < S(2) - 0.1: im = shot_phone(t, scr_reg, 'room')
    elif t < S(3) - 0.1: im = shot_prev(t)
    elif t < S(5) - 0.1: im = shot_phone(t, scr_wallet, 'dark', zoom=(t > S(4) - 0.05))
    elif t < S(6) - 0.1: im = shot_shake(t)
    elif t < S(8) - 0.1: im = shot_money(t)
    elif t < S(9) - 0.1: im = shot_dream(t)
    elif t < S(10) - 0.1: im = shot_ding(t)
    elif t < S(17) - 0.1: im = shot_chat(t)
    elif t < S(19) - 0.1: im = shot_choice(t)
    else: im = shot_end(t)
    c = C(im)
    caption(c, t)
    # flash on cuts
    for cut in [S(4) - 0.05, S(10) - 0.1, S(16)]:
        if 0 <= t - cut < 0.2:
            a = 1 - (t - cut) / 0.2; im = Image.blend(im, Image.new('RGB', im.size, (255, 255, 255) if cut != S(16) else (255, 40, 40)), a * 0.7)
    out = im.resize((W, H), Image.LANCZOS)
    return out

def shot_kiosk(t):
    im = bg('street'); c = C(im)
    z = 1 + t * 0.03
    # kiosk
    kx, ky = 720, 1420
    c.rect(kx - 230, ky - 620, kx + 260, ky, (250, 205, 40), r=30, w=8)
    c.rect(kx - 260, ky - 700, kx + 290, ky - 600, (240, 80, 60), r=20, w=8)
    c.text(kx + 15, ky - 650, "TO'LOV SHOXOBCHASI", 40, (255, 255, 255), stroke=4)
    c.rect(kx - 180, ky - 540, kx + 210, ky - 330, (180, 230, 255), r=16, w=6)
    c.ell(kx + 15, ky - 440, 60, 70, SKIN, w=6); c.rect(kx - 40, ky - 380, kx + 70, ky - 330, (200, 60, 60), r=10, w=5)
    c.ell(kx - 5, ky - 450, 8, 8, INK, ol=None); c.ell(kx + 35, ky - 450, 8, 8, INK, ol=None); c.arc(kx + 15, ky - 420, 20, 10, 20, 160, INK, 5)
    c.rect(kx - 200, ky - 330, kx + 230, ky - 290, (200, 150, 30), w=6)
    hero(c, 250, 1480, 0.72, t, 'happy', look=(1, 0), arms='down')
    # SIM card pops
    k = back((t - 0.9) / 0.4)
    if k > 0:
        sx, sy = 300, 640 - 30 * math.sin(t * 3)
        c.poly([(sx - 120 * k, sy - 80 * k), (sx + 90 * k, sy - 80 * k), (sx + 120 * k, sy - 50 * k), (sx + 120 * k, sy + 80 * k), (sx - 120 * k, sy + 80 * k)], (250, 250, 255), w=7)
        c.rect(sx - 80 * k, sy - 35 * k, sx - 10 * k, sy + 35 * k, (240, 200, 90), r=8, w=4)
        if k > 0.9: c.text(sx + 55, sy + 10, 'SIM', 34, INK)
        c.text(sx, sy + 150, '+998 9• ••• •• 17', 44 * max(0.05, k), (255, 255, 255), stroke=6)
    return im

def shot_phone(t, scr, bgname, zoom=False):
    im = bg(bgname); c = C(im)
    if bgname == 'dark':
        if zoom: rays(c, 540, 700, t, (247, 147, 26), alpha=clamp((t - S(4)) / 0.3))
    k = ease((t - 3.3) / 2) if scr is scr_reg else 0
    pw, ph = 720, 1300
    s = 1.0 + 0.03 * math.sin(t) + (0.06 if zoom else 0)
    phone(c, 540, 760, int(pw * s), int(ph * s), t, scr, rot=math.sin(t * 0.8) * 1.5)
    if scr is scr_wallet and zoom and t > S(4) + 0.2:
        for i in range(10):
            a = i * 0.63 + 0.5; r = 380 + 120 * ((t * 0.7 + i * 0.13) % 1)
            btc_coin(c, 540 + r * math.cos(a), 760 + r * math.sin(a) * 1.3, 40, t * 4 + i)
    return im

def shot_prev(t):
    im = bg('room'); c = C(im)
    lt = t - S(2)
    phone(c, 640, 760, 600, 1080, t, scr_chats, rot=-4)
    # ghost of previous owner behind
    a = clamp(lt / 0.8)
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); lc = C(lay)
    gx, gy = 200, 900 + math.sin(t * 2) * 15
    lc.ell(gx, gy - 260, 120, 130, (20, 20, 30, int(200 * a)), ol=None)
    lc.rect(gx - 140, gy - 150, gx + 140, gy + 250, (20, 20, 30, int(200 * a)), r=80, ol=None)
    lc.text(gx, gy - 260, '?', 130, (255, 255, 255, int(255 * a)))
    im.paste(lay, (0, 0), lay)
    c.text(230, 1260, 'OLDINGI EGASI', 40, (255, 255, 255), stroke=6) if a > 0.5 else None
    return im

def shot_shake(t):
    im = bg('gold'); c = C(im)
    rays(c, 540, 760, t, (255, 255, 200))
    phone(c, 540, 820, 700, 1250, t, scr_wallet, shake=1.0)
    for i in range(6):
        k = (t * 1.5 + i * 0.17) % 1
        c.poly([(120 + i * 170, 200 + k * 400), (100 + i * 170, 240 + k * 400), (120 + i * 170, 260 + k * 400), (140 + i * 170, 240 + k * 400)], (130, 200, 255), w=4)
    return im

def shot_money(t):
    im = bg('gold'); c = C(im)
    rays(c, 540, 700, t, (255, 250, 210))
    if t < S(7) - 0.1:
        lt = t - S(6)
        btc_coin(c, 300, 600, 150, 0)
        c.text(540, 600, '=', 120, (255, 255, 255), stroke=8)
        q = back(lt / 0.4)
        c.text(800, 600, '$60 000', 110 * max(0.05, q), (255, 255, 255), stroke=10, sf=(30, 110, 50))
        q2 = back((lt - 1.0) / 0.3)
        if q2 > 0: c.text(540, 860, '× 10', 150 * max(0.05, q2), (255, 255, 255), stroke=10)
        hero(c, 540, 1500, 0.55, t, 'shock', look=(0, -1), arms='cheeks')
    else:
        lt = t - S(7)
        random.seed(7)
        for i in range(26):
            x = random.uniform(40, 1040); sp = random.uniform(300, 600); ph_ = random.uniform(0, 3)
            y = -100 + ((lt + ph_) * sp) % 1600; r_ = math.sin(lt * 3 + i) * 30
            lay = Image.new('RGBA', (200 * SS, 110 * SS), (0, 0, 0, 0)); lc = C(lay)
            lc.rect(10, 10, 190, 100, (120, 200, 120), r=8, w=4); lc.ell(100, 55, 26, 26, (90, 170, 90), w=3); lc.text(100, 56, '$', 34, (40, 110, 40))
            lay = lay.rotate(r_, expand=True, resample=Image.BICUBIC); im.paste(lay, (int(x * SS - lay.width / 2), int(y * SS - lay.height / 2)), lay)
        q = back(lt / 0.35, 2.2)
        c.text(540, 640, '$600 000', 190 * max(0.05, q), (255, 255, 255), stroke=14, sf=(30, 110, 50))
        hero(c, 540, 1520, 0.6, t, 'greedy', arms='up')
    return im

def shot_dream(t):
    im = bg('room'); c = C(im)
    lt = t - S(8)
    hero(c, 540, 1560, 0.62, t, 'greedy', look=(0, -1), arms='phone', phone=True)
    # dream cloud
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); lc = C(lay)
    q = back(lt / 0.4)
    for cx, cy, r in [(540, 560, 420), (250, 520, 230), (830, 520, 230), (380, 360, 230), (700, 360, 230), (540, 760, 260)]:
        lc.ell(cx, cy, r * q, r * q * 0.8, (255, 255, 255, 235), ol=INK, w=7)
    for i, (x, y, r) in enumerate([(560, 980, 40), (600, 1060, 26)]):
        lc.ell(x, y, r * q, r * q, (255, 255, 255, 235), ol=INK, w=6)
    im.paste(lay, (0, 0), lay)
    items = [(S(8), '💸', "QARZLAR ✓"), (S(8) + 1.0, '🏠', 'UY'), (S(8) + 1.75, '🚗', 'MASHINA')]
    for i, (st, e, lab) in enumerate(items):
        k = back((t - st) / 0.3)
        if k <= 0: continue
        x = 280 + i * 260; y = 520 + (40 if i == 1 else 0)
        c.emo(e, x, y, int(170 * k))
        c.text(x, y + 140, lab, 40 * max(0.05, k), (40, 160, 70) if i == 0 else INK, stroke=0)
    return im

def shot_ding(t):
    im = bg('room'); c = C(im)
    lt = t - S(9)
    hero(c, 540, 1560, 0.62, t, 'worried' if lt > 0.4 else 'greedy', look=(0, -1), arms='phone', phone=True)
    # dream bubble popping
    if lt < 0.3:
        k = 1 - lt / 0.3
        for i in range(10):
            a = i * 0.63; r = 300 + 200 * (1 - k)
            c.ell(540 + r * math.cos(a), 560 + r * math.sin(a) * 0.6, 40 * k, 40 * k, (255, 255, 255), w=4)
    # notification banner
    q = eout((lt - 0.15) / 0.35)
    y = -200 + 420 * q
    c.rect(60, y, 1020, y + 170, (250, 250, 252), r=40, w=6)
    c.ell(150, y + 85, 50, 50, (30, 30, 36), ol=None); c.text(150, y + 87, '?', 50, (255, 255, 255))
    c.text(230, y + 55, "Noma'lum", 38, INK, 'ExtraBold', anchor='lm'); c.text(230, y + 115, 'Salom. Raqamni yangi oldingizmi?', 30, (90, 90, 100), 'Bold', anchor='lm')
    for i in range(3):
        k = ((lt * 2 + i * 0.33) % 1)
        c.arc(540, 820, 80 + 160 * k, 80 + 160 * k, 200, 340, (255, 255, 255), 6 * (1 - k) + 1)
    return im

def shot_chat(t):
    red = clamp((t - S(13)) / 3.0)
    im = bg('tg') if red < 0.01 else Image.blend(bg('tg'), bg('dark'), red)
    c = C(im)
    if t > S(16): rays(c, 540, 800, t, (255, 40, 40), alpha=0.5)
    s = 1 + 0.08 * ease((t - S(10)) / (S(17) - S(10)))
    sh = 0.6 if t > S(16) else 0
    phone(c, 540, 790, int(760 * s), int(1340 * s), t, scr_chat, shake=sh)
    return im

def shot_choice(t):
    im = bg('dark'); c = C(im)
    lt = t - S(17)
    hero(c, 540, 1500, 0.6, t, 'scared', look=(math.sin(t * 3), 0), arms='phone', phone=True, sweat=3)
    q1 = back((lt - 0.2) / 0.35); q2 = back((lt - 0.5) / 0.35)
    pulse = 1 + 0.04 * math.sin(t * 8)
    if q1 > 0:
        c.rect(60, 330 - 20, 60 + 440 * q1, 330 + 200, (215, 40, 50), r=40, w=8)
        if q1 > 0.9: c.emo('🚫', 280, 390, 90); c.text(280, 480, 'BLOKLASH', 50 * pulse, (255, 255, 255))
    if q2 > 0:
        c.rect(580, 310, 580 + 440 * q2, 530, (40, 160, 230), r=40, w=8)
        if q2 > 0.9: c.emo('💬', 800, 390, 90); c.text(800, 480, 'JAVOB YOZISH', 46 * pulse, (255, 255, 255))
    c.text(540, 640, 'SIZ NIMA QILARDINGIZ?', 64, (255, 220, 40), stroke=8) if lt > 0.1 else None
    return im

def shot_end(t):
    im = bg('dark'); c = C(im)
    lt = t - S(19)
    rays(c, 540, 700, t, (200, 40, 50), alpha=0.6)
    q = back(lt / 0.35)
    c.emo('👇', 540, 420, int(170 * max(0.05, q)))
    c.text(540, 600, 'IZOHDA YOZING!', 90 * max(0.05, q), (255, 255, 255), stroke=10)
    q2 = back((t - S(20)) / 0.35)
    if q2 > 0:
        c.rect(540 - 420 * q2, 720, 540 + 420 * q2, 880, (255, 210, 40), r=40, w=8)
        if q2 > 0.9: c.text(540, 800, '2-QISM TEZ ORADA', 66, INK)
    q3 = back((t - S(20) - 1.1) / 0.35)
    if q3 > 0:
        pressed = t > S(20) + 1.9
        col = (120, 120, 130) if pressed else (220, 30, 40)
        c.rect(540 - 330 * q3, 960, 540 + 330 * q3, 1110, col, r=75, w=8)
        if q3 > 0.9: c.text(540, 1035, "OBUNA BO'LING" if not pressed else "OBUNA ✓", 60, (255, 255, 255))
        hk = clamp((t - S(20) - 1.4) / 0.5)
        if hk > 0: c.emo('👆', 760 - 120 * ease(hk), 1220 - 90 * ease(hk) + (8 if pressed else 0), 140)
        if pressed: c.emo('🔔', 540 + 360, 1035 + math.sin(t * 20) * 6, 90, rot=math.sin(t * 25) * 20)
    return im

def render_range(a, b, out):
    for fi in range(a, b):
        p = f'{out}/f{fi:05d}.jpg'
        if os.environ.get('RESUME') and os.path.exists(p): continue
        frame(fi).save(p, quality=92)

if __name__ == '__main__':
    if sys.argv[1] == 'stills':
        os.makedirs(f'{D0}/stills', exist_ok=True)
        ts = [float(x) for x in sys.argv[2].split(',')]
        ims = [frame(int(x * fps)).resize((270, 480)) for x in ts]
        cols = 8; rows = (len(ims) + cols - 1) // cols
        sh = Image.new('RGB', (cols * 270, rows * 480), (0, 0, 0))
        for i, im in enumerate(ims): sh.paste(im, ((i % cols) * 270, (i // cols) * 480))
        sh.save(f'{D0}/stills/sheet.jpg', quality=85)
    elif sys.argv[1] == 'one':
        frame(int(float(sys.argv[2]) * fps)).save(f'{D0}/stills/one.jpg', quality=90)
    elif sys.argv[1] == 'render':
        from multiprocessing import Pool
        os.makedirs(f'{D0}/frames', exist_ok=True)
        n = 4; ch = [(i * NF // 32, (i + 1) * NF // 32, f'{D0}/frames') for i in range(32)]
        with Pool(n) as p: p.starmap(render_range, ch)
        print('done', NF)
