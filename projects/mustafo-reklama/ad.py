import math, os, sys, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
D0 = '/root/shorts/mustafo'
W, H, fps = 1080, 1920, 30
VDUR = 28.45; DUR = VDUR + 1.6; NF = int(DUR * fps)
GOLD = (214, 178, 94); GOLD2 = (246, 222, 160); CREAM = (250, 244, 232)
_fc = {}
def F(name, s):
    k = (name, s)
    if k not in _fc: _fc[k] = ImageFont.truetype(f'{D0}/fonts/{name}.ttf', max(1, int(s)))
    return _fc[k]
_em = {}
def emoji(ch, size):
    k = (ch, size)
    if k not in _em:
        f = ImageFont.truetype('/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf', 109)
        im = Image.new('RGBA', (140, 140)); ImageDraw.Draw(im).text((70, 70), ch, font=f, embedded_color=True, anchor='mm')
        im = im.crop(im.getbbox()); r = size / max(im.size)
        _em[k] = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
    return _em[k]
clamp = lambda x: max(0.0, min(1.0, x))
def ease(x): x = clamp(x); return x * x * (3 - 2 * x)
def eout(x): x = clamp(x); return 1 - (1 - x) ** 3
def eio(x): x = clamp(x); return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2

# ---------- images ----------
IM = [Image.open(f'{D0}/img/{i}.jpg').convert('RGB') for i in range(9)]
BAG, SHOES, HERMES, SOAP, PERF, CREAM_T, MODEL, JACKET, BED = range(9)
_cov = {}
def cover(i, scale=1.25):
    """image resized to cover W*scale x H*scale"""
    if i not in _cov:
        im = IM[i]; r = max(W * scale / im.width, H * scale / im.height)
        _cov[i] = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
    return _cov[i]
def kb(i, k, z0=1.0, z1=1.12, fx=0.5, fy=0.5, dx=0, dy=0):
    """Ken Burns: k 0..1 progress"""
    src = cover(i); z = z0 + (z1 - z0) * k
    cw, ch = W * 1.25 / z, H * 1.25 / z
    cw = min(cw, src.width); ch = min(ch, src.height)
    cx = src.width * fx + dx * k * src.width; cy = src.height * fy + dy * k * src.height
    x0 = max(0, min(src.width - cw, cx - cw / 2)); y0 = max(0, min(src.height - ch, cy - ch / 2))
    return src.resize((W, H), Image.BILINEAR, box=(x0, y0, x0 + cw, y0 + ch))
_blur = {}
def blurbg(i):
    if i not in _blur:
        b = cover(i).resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(40))
        _blur[i] = ImageEnhance.Brightness(b).enhance(0.45)
    return _blur[i]
_fit = {}
def framed(i, k, z0=1.0, z1=1.08):
    """non-vertical photo: blurred bg + framed photo"""
    bg = blurbg(i).copy()
    im = IM[i]
    if i not in _fit:
        r = 1000 / im.width
        _fit[i] = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
    f = _fit[i]; z = z0 + (z1 - z0) * k
    fw, fh = int(f.width * z * 0.98), int(f.height * z * 0.98)
    fi = f.resize((fw, fh), Image.BILINEAR)
    x, y = (W - fw) // 2, (H - fh) // 2 - 60
    sh = Image.new('L', (fw + 120, fh + 120), 0); ImageDraw.Draw(sh).rectangle([60, 60, fw + 60, fh + 60], fill=200)
    sh = sh.filter(ImageFilter.GaussianBlur(30))
    bg.paste((0, 0, 0), (x - 60, y - 40), sh)
    bg.paste(fi, (x, y))
    d = ImageDraw.Draw(bg); d.rectangle([x - 2, y - 2, x + fw + 1, y + fh + 1], outline=GOLD, width=3)
    return bg

# ---------- overlays ----------
def grad_bottom(im, h=760, a=235):
    g = Image.new('L', (1, h));
    for y in range(h): g.putpixel((0, y), int(a * (y / h) ** 1.6))
    g = g.resize((W, h)); im.paste((8, 6, 6), (0, H - h), g)
def grad_top(im, h=300, a=170):
    g = Image.new('L', (1, h))
    for y in range(h): g.putpixel((0, y), int(a * (1 - y / h) ** 1.6))
    g = g.resize((W, h)); im.paste((8, 6, 6), (0, 0), g)
def spaced(d, x, y, text, font, fill, track=0.18, anchor='m', alpha=255):
    s = font.size * track
    ws = [d.textlength(ch, font=font) for ch in text]; tw = sum(ws) + s * (len(text) - 1)
    cx = x - tw / 2 if anchor == 'm' else x
    for ch, w_ in zip(text, ws):
        d.text((cx, y), ch, font=font, fill=fill + (alpha,) if len(fill) == 3 else fill, anchor='lm'); cx += w_ + s
    return tw
def overlay_text(im, fn):
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); fn(ImageDraw.Draw(lay), lay); im.paste(lay, (0, 0), lay)
def label(im, lt, title, sub=None, y=1560):
    """luxury category label: gold line grows, title tracks in"""
    a = eout(lt / 0.45)
    def fn(d, lay):
        lw = 300 * a
        d.line([(W / 2 - lw, y - 95), (W / 2 + lw, y - 95)], fill=GOLD + (int(255 * a),), width=3)
        tr = 0.12 + 0.25 * (1 - a)
        fs = 86 if len(title) < 13 else 64
        spaced(d, W / 2, y, title, F('Outfit-Bold', fs), CREAM, track=tr, alpha=int(255 * a))
        if sub:
            b = eout((lt - 0.2) / 0.45)
            spaced(d, W / 2, y + 90, sub, F('Outfit-Regular', 38), GOLD2, track=0.2, alpha=int(255 * b))
    overlay_text(im, fn)
def watermark(im, t):
    a = clamp((t - 3.0) / 0.5) * (1 - clamp((t - 21.2) / 0.3))
    if a <= 0: return
    def fn(d, lay):
        spaced(d, W / 2, 120, 'MUSTAFO BREND', F('Italiana-Regular', 46), CREAM, track=0.3, alpha=int(230 * a))
        d.line([(W / 2 - 60, 160), (W / 2 + 60, 160)], fill=GOLD + (int(230 * a),), width=2)
    overlay_text(im, fn)
def sweep(im, lt, dur=0.9, strength=0.55):
    """diagonal light sweep"""
    k = lt / dur
    if not 0 <= k <= 1: return im
    x = -600 + (W + 1200) * eio(k)
    g = Image.new('L', (W, H), 0); d = ImageDraw.Draw(g)
    d.polygon([(x - 120, 0), (x + 120, 0), (x - 600 + 120, H), (x - 600 - 120, H)], fill=int(255 * strength))
    g = g.filter(ImageFilter.GaussianBlur(50))
    return Image.composite(Image.new('RGB', im.size, (255, 246, 225)), im, g)

def gold_text(d, x, y, text, font, alpha=255, anchor='mm'):
    d.text((x + 3, y + 4), text, font=font, fill=(0, 0, 0, int(alpha * 0.6)), anchor=anchor)
    d.text((x, y), text, font=font, fill=GOLD2 + (alpha,), anchor=anchor)

# ---------- shots ----------
def sh_intro(t):
    # fast luxurious flashes, then brand reveal
    seq = [PERF, BAG, JACKET, BED]
    if t < 1.0:
        i = min(3, int(t / 0.25)); lt = t - i * 0.25
        im = kb(seq[i], lt / 0.25 * 0.3 + 0.2, 1.15, 1.25) if seq[i] in (PERF, BAG) else framed(seq[i], lt / 0.25)
        overlay_text(im, lambda d, l: spaced(d, W / 2, H / 2, 'KOSONSOY', F('Outfit-Bold', 120), CREAM, track=0.25 + 0.1 * t, alpha=235))
        return im
    lt = t - 1.0
    im = Image.blend(blurbg(BED), blurbg(PERF), 0.5)
    im = ImageEnhance.Brightness(im).enhance(0.55)
    a = eout(lt / 0.6)
    def fn(d, lay):
        spaced(d, W / 2, 820, 'HAMMA NARSA', F('Outfit-Regular', 52), GOLD2, track=0.35, alpha=int(255 * a))
        spaced(d, W / 2, 890, 'BITTA DO\'KONDA', F('Outfit-Regular', 52), GOLD2, track=0.35, alpha=int(255 * a))
        b = eout((lt - 0.25) / 0.8)
        f = F('Italiana-Regular', int(150 + 20 * b))
        gold_text(d, W / 2, 1030, 'MUSTAFO', f, int(255 * b))
        spaced(d, W / 2, 1170, 'B R E N D', F('Outfit-Bold', 56), CREAM, track=0.5 * (1 - b) + 0.3, alpha=int(255 * b))
        lw = 260 * b; d.line([(W / 2 - lw, 1240), (W / 2 + lw, 1240)], fill=GOLD + (255,), width=3)
    overlay_text(im, fn)
    return sweep(im, lt - 0.6, 1.0, 0.35)

def sh_origin(t):
    lt = t - 3.0
    im = kb(SOAP, lt / 3.1, 1.05, 1.18, 0.5, 0.45)
    im = ImageEnhance.Brightness(im).enhance(0.42)
    items = [('🇹🇷', 'TURKIYA', 3.0), ('🇨🇳', 'XITOY', 3.75), ('🇦🇪', 'DUBAY', 4.35)]
    def fn(d, lay):
        spaced(d, W / 2, 560, 'MAHSULOTLAR', F('Outfit-Regular', 46), GOLD2, track=0.4, alpha=int(255 * eout(lt / 0.5)))
        for k, (fl, nm, st) in enumerate(items):
            a = eout((t - st) / 0.45); y = 760 + k * 230 + 50 * (1 - a)
            if a <= 0: continue
            e = emoji(fl, 110); lay.alpha_composite(e, (int(W / 2 - 330), int(y - e.height / 2)))
            spaced(d, W / 2 + 70, y, nm, F('Outfit-Bold', 100), CREAM, track=0.12, alpha=int(255 * a))
        b = eout((t - 5.0) / 0.5)
        d.text((W / 2, 1520), 'dan keltirilgan', font=F('Italiana-Regular', 70), fill=GOLD2 + (int(255 * b),), anchor='mm')
    overlay_text(im, fn)
    return im

def product(i, t0, t1, title, sub, mode='kb', **kw):
    def f(t):
        lt = t - t0; k = lt / (t1 - t0 + 0.4)
        im = kb(i, k, **kw) if mode == 'kb' else framed(i, k)
        grad_bottom(im); grad_top(im)
        label(im, lt - 0.05, title, sub)
        if lt < 1.0 and mode == 'kb': im = sweep(im, lt - 0.1, 0.8, 0.28)
        return im
    return f

def sh_grid(t):
    lt = t - 14.8
    im = Image.new('RGB', (W, H), (12, 10, 10))
    order = [PERF, BAG, CREAM_T, SHOES, MODEL, SOAP, JACKET, BED, HERMES]
    cw, ch = 340, 520; gx, gy = 30, 300
    for n, i in enumerate(order):
        a = eout((lt - n * 0.07) / 0.4)
        if a <= 0: continue
        r, c = divmod(n, 3)
        src = cover(i, 0.4)
        rr = max(cw / src.width, ch / src.height); tile = src.resize((int(src.width * rr) + 1, int(src.height * rr) + 1), Image.BILINEAR)
        tile = tile.crop(((tile.width - cw) // 2, (tile.height - ch) // 2, (tile.width - cw) // 2 + cw, (tile.height - ch) // 2 + ch))
        s = 0.85 + 0.15 * a; tw, th = int(cw * s), int(ch * s)
        tile = tile.resize((tw, th))
        x = gx + c * (cw + 15) + (cw - tw) // 2; y = gy + r * (ch + 15) + (ch - th) // 2 + int(40 * (1 - a))
        im.paste(tile, (x, y))
    zoom = 1 + 0.06 * lt
    im = im.resize((int(W * zoom), int(H * zoom)), Image.BILINEAR).crop((int((W * zoom - W) / 2), int((H * zoom - H) / 2), int((W * zoom - W) / 2) + W, int((H * zoom - H) / 2) + H))
    b = eout((lt - 0.4) / 0.5)
    shade = Image.new('L', (W, H), int(150 * b)); im.paste((10, 8, 8), (0, 0), shade)
    def fn(d, lay):
        f = F('Gloock-Regular', int(200 * (0.8 + 0.2 * b)))
        gold_text(d, W / 2, 860, '+ YUZLAB', f, int(255 * b))
        spaced(d, W / 2, 1020, 'BOSHQA MAHSULOTLAR', F('Outfit-Bold', 64), CREAM, track=0.15, alpha=int(255 * b))
    overlay_text(im, fn)
    return im

def sh_delivery(t):
    lt = t - 16.8
    im = kb(JACKET, lt / 2.8, 1.0, 1.1, 0.5, 0.5); im = im.filter(ImageFilter.GaussianBlur(14)); im = ImageEnhance.Brightness(im).enhance(0.35)
    def fn(d, lay):
        a = eout(lt / 0.5)
        e = emoji('📦', int(200 * (0.6 + 0.4 * a))); lay.alpha_composite(e, (int(W / 2 - e.width / 2), int(640 - e.height / 2 - 30 * math.sin(lt * 3))))
        gold_text(d, W / 2, 900, '12', F('Gloock-Regular', 260), int(255 * a))
        spaced(d, W / 2, 1060, 'VILOYATGA', F('Outfit-Bold', 92), CREAM, track=0.18, alpha=int(255 * a))
        b = eout((lt - 0.6) / 0.5)
        d.line([(W / 2 - 280 * b, 1150), (W / 2 + 280 * b, 1150)], fill=GOLD + (255,), width=3)
        spaced(d, W / 2, 1220, 'POCHTA ORQALI', F('Outfit-Regular', 54), GOLD2, track=0.25, alpha=int(255 * b))
        spaced(d, W / 2, 1295, 'YETKAZIB BERAMIZ', F('Outfit-Regular', 54), GOLD2, track=0.25, alpha=int(255 * b))
    overlay_text(im, fn)
    return im

def sh_pay(t):
    lt = t - 19.5
    im = kb(PERF, lt / 2.0, 1.1, 1.2, 0.5, 0.4); im = im.filter(ImageFilter.GaussianBlur(14)); im = ImageEnhance.Brightness(im).enhance(0.35)
    def fn(d, lay):
        spaced(d, W / 2, 620, "TO'LOV", F('Outfit-Regular', 56), GOLD2, track=0.4, alpha=int(255 * eout(lt / 0.4)))
        for k, (e_, nm, st) in enumerate([('💵', 'NAQD', 19.75), ('💳', 'KARTA', 20.4)]):
            a = eout((t - st) / 0.4); x = W / 2 + (k * 2 - 1) * 250 + (k * 2 - 1) * 60 * (1 - a)
            if a <= 0: continue
            d.rounded_rectangle([x - 210, 760, x + 210, 1180], 36, fill=(20, 16, 14, int(220 * a)), outline=GOLD + (int(255 * a),), width=3)
            e = emoji(e_, 150); lay.alpha_composite(e, (int(x - e.width / 2), int(900 - e.height / 2)))
            spaced(d, x, 1080, nm, F('Outfit-Bold', 70), CREAM, track=0.12, alpha=int(255 * a))
    overlay_text(im, fn)
    return im

def sh_end(t):
    lt = t - 21.4
    im = Image.blend(blurbg(BAG), blurbg(BED), 0.5 + 0.5 * math.sin(lt * 0.5) * 0)
    im = ImageEnhance.Brightness(im).enhance(0.38)
    def fn(d, lay):
        a = eout(lt / 0.7)
        gold_text(d, W / 2, 560, 'MUSTAFO', F('Italiana-Regular', 170), int(255 * a))
        spaced(d, W / 2, 705, 'B R E N D', F('Outfit-Bold', 60), CREAM, track=0.3, alpha=int(255 * a))
        d.line([(W / 2 - 260 * a, 780), (W / 2 + 260 * a, 780)], fill=GOLD + (255,), width=3)
        b = eout((t - 22.7) / 0.45)
        if b > 0:
            e = emoji('📍', 64); lay.alpha_composite(e, (int(W / 2 - 360), int(880 - e.height / 2)))
            spaced(d, W / 2 + 40, 880, 'KOSONSOY TUMANI', F('Outfit-Bold', 58), CREAM, track=0.12, alpha=int(255 * b))
        c = eout((t - 23.8) / 0.5)
        if c > 0:
            pul = 1 + 0.02 * math.sin(t * 5) * (t > 24.5)
            d.rounded_rectangle([90, 990, W - 90, 1190], 100, fill=GOLD + (int(255 * c),))
            d.text((W / 2 + 45, 1092), '+998 93 495 25 20', font=F('Outfit-Bold', int(76 * pul)), fill=(24, 16, 10, int(255 * c)), anchor='mm')
            e = emoji('📞', 70); lay.alpha_composite(e, (120, int(1092 - e.height / 2)))
        k = eout((t - 27.4) / 0.5)
        if k > 0: d.text((W / 2, 1330), 'Kutib qolamiz!', font=F('Italiana-Regular', 96), fill=GOLD2 + (int(255 * k),), anchor='mm')
        r = eout((t - 24.4) / 0.5)
        if r > 0:
            d.rounded_rectangle([110, 1640, W - 110, 1740], 20, fill=(150, 20, 24, int(225 * r)))
            d.text((W / 2, 1690), "Sotilgan tovarlar qaytarib olinmaydi!", font=F('Outfit-Bold', 40), fill=(255, 255, 255, int(255 * r)), anchor='mm')
            spaced(d, W / 2, 1520, 'NAQD  •  KARTA  •  12 VILOYATGA POCHTA', F('Outfit-Regular', 34), GOLD2, track=0.08, alpha=int(230 * r))
    overlay_text(im, fn)
    return sweep(im, lt - 0.3, 1.1, 0.3) if lt < 1.6 else im

SHOTS = [
    (0.0, sh_intro),
    (3.0, sh_origin),
    (6.15, product(BAG, 6.15, 7.4, 'SUMKALAR', 'zamonaviy dizayn', z0=1.05, z1=1.2, fy=0.4)),
    (7.4, product(SHOES, 7.4, 9.0, 'POYABZALLAR', 'issiq va qulay', z0=1.1, z1=1.22, fy=0.42)),
    (9.0, product(PERF, 9.0, 10.0, 'PARFYUMERIYA', 'xushbo\'y atirlar', z0=1.05, z1=1.18, fy=0.35)),
    (10.0, product(CREAM_T, 10.0, 10.5, 'KOSMETIKA', 'teri parvarishi', z0=1.05, z1=1.12, fy=0.4)),
    (10.5, product(SOAP, 10.5, 11.05, 'KOSMETIKA', 'teri parvarishi', z0=1.1, z1=1.16, fy=0.4)),
    (11.05, product(MODEL, 11.05, 12.25, 'AYOLLAR KIYIMLARI', 'yangi kolleksiya', mode='framed')),
    (12.25, product(JACKET, 12.25, 13.45, 'KURTKALAR', 'trenddagi modellar', mode='framed')),
    (13.45, product(BED, 13.45, 14.15, 'CHOYSHABLAR', 'uyingiz uchun', mode='framed')),
    (14.15, product(HERMES, 14.15, 14.8, 'CHOYSHABLAR', 'uyingiz uchun', mode='framed')),
    (14.8, sh_grid),
    (16.8, sh_delivery),
    (19.5, sh_pay),
    (21.4, sh_end),
]
XF = 0.18
def shot_at(t):
    idx = 0
    for n, (st, fn) in enumerate(SHOTS):
        if t >= st: idx = n
    return idx
VIG = None
def vignette():
    global VIG
    if VIG is None:
        y, x = np.mgrid[0:H, 0:W]; r = np.sqrt(((x - W / 2) / (W * 0.75)) ** 2 + ((y - H / 2) / (H * 0.7)) ** 2)
        VIG = Image.fromarray((np.clip(r - 0.55, 0, 1) * 300).clip(0, 160).astype(np.uint8))
    return VIG
def frame(fi):
    t = fi / fps
    n = shot_at(t); st, fn = SHOTS[n]
    im = fn(t)
    if n > 0 and t - st < XF:
        prev = SHOTS[n - 1][1](t)
        im = Image.blend(prev, im, ease((t - st) / XF))
    watermark(im, t)
    im.paste((0, 0, 0), (0, 0), vignette())
    # fade out
    if t > DUR - 0.6: im = Image.blend(im, Image.new('RGB', im.size), clamp((t - DUR + 0.6) / 0.6))
    if t < 0.15: im = Image.blend(Image.new('RGB', im.size, (255, 255, 255)), im, t / 0.15)
    return im

def render_range(a, b, out):
    for fi in range(a, b):
        p = f'{out}/f{fi:05d}.jpg'
        if os.environ.get('RESUME') and os.path.exists(p): continue
        frame(fi).save(p, quality=93)
if __name__ == '__main__':
    if sys.argv[1] == 'stills':
        ts = [float(x) for x in sys.argv[2].split(',')]
        ims = [frame(int(x * fps)).resize((270, 480)) for x in ts]
        cols = 8; rows = (len(ims) + cols - 1) // cols
        sh = Image.new('RGB', (cols * 270, rows * 480))
        for i, im in enumerate(ims): sh.paste(im, ((i % cols) * 270, (i // cols) * 480))
        sh.save(f'{D0}/sheet.jpg', quality=85)
    elif sys.argv[1] == 'one':
        frame(int(float(sys.argv[2]) * fps)).save(f'{D0}/one.jpg', quality=90)
    elif sys.argv[1] == 'render':
        from multiprocessing import Pool
        os.makedirs(f'{D0}/frames', exist_ok=True)
        ch = [(i * NF // 40, (i + 1) * NF // 40, f'{D0}/frames') for i in range(40)]
        with Pool(4) as p: p.starmap(render_range, ch)
        print('done', NF)
