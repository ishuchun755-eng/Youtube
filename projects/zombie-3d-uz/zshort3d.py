import sys, json, subprocess, math
from PIL import Image, ImageDraw, ImageFont
D = '/root/shorts/zombie3d'
SENT = json.load(open(f'{D}/web/timeline.json'))['S']
PRE = 2.5
S = lambda i: SENT[i]['start']; E = lambda i: SENT[i]['end']
SW, SH, fps = 1080, 1920, 30
SEGS = [(S(2) - 0.15, E(8) + 0.35), (S(35) - 0.1, E(44) + 0.45)]
TAIL = 1.6
outdur = sum(b - a for a, b in SEGS) + TAIL
OUT = (20, 10, 14)
_fc = {}
def font(s, black=True):
    k = (s, black)
    if k not in _fc: _fc[k] = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Black.otf' if black else '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf', s)
    return _fc[k]
clamp = lambda x: max(0.0, min(1.0, x))
def back(x, s=1.7): x -= 1; return 1 + x * x * ((s + 1) * x + s)
def src_time(ot):
    acc = 0
    for a, b in SEGS:
        if ot < acc + (b - a): return a + (ot - acc), False
        acc += b - a
    return SEGS[-1][1] - 0.01, True
def frame(st):
    fi = int(round((st + PRE) * fps)); return Image.open(f'{D}/clean/f{fi:05d}.jpg').convert('RGB')
BG = Image.new('RGB', (SW, SH)); _d = ImageDraw.Draw(BG)
for y in range(SH): _d.line([(0, y), (SW, y)], fill=(int(30 + 40 * y / SH), int(6 + 8 * y / SH), int(8 + 10 * y / SH)))
TITLE = [("30 KUN", (255, 255, 255)), ("ZOMBILAR ICHIDA", (255, 60, 50))]
CF = font(66, False)
def vcaps(cv, t):
    cur = None
    for s in SENT:
        if s['start'] - 0.05 <= t <= s['end'] + 0.25: cur = s
    if not cur: return
    words = cur['text'].replace('"', '').split(); a, b = cur['start'], cur['end']
    tot = sum(len(w) + 1 for w in words); acc = 0; st = []
    for w in words: st.append(a + (b - a) * acc / tot); acc += len(w) + 1
    d = ImageDraw.Draw(cv); lines, ln = [], []
    for i, w in enumerate(words):
        if ln and d.textlength(' '.join(words[j] for j in ln + [i]), font=CF) > 960: lines.append(ln); ln = [i]
        else: ln.append(i)
    lines.append(ln)
    y0 = 1500 - (len(lines) - 1) * 84
    for li, ln in enumerate(lines):
        ws = [d.textlength(words[i] + ' ', font=CF) for i in ln]; x = SW / 2 - sum(ws) / 2
        for i, wd in zip(ln, ws):
            act = st[i] <= t < (st[i + 1] if i + 1 < len(words) else b + 0.25)
            d.text((x, y0 + li * 84), words[i], font=CF, fill=(255, 214, 40) if act else (255, 255, 255), stroke_width=8, stroke_fill=(0, 0, 0)); x += wd
def wrapc(d, text, f, maxw):
    ws = text.split(); lines = [[]]
    for w in ws:
        if lines[-1] and d.textlength(' '.join(lines[-1] + [w]), font=f) > maxw: lines.append([w])
        else: lines[-1].append(w)
    return [' '.join(l) for l in lines]
def vframe(ofi):
    ot = ofi / fps; st, tail = src_time(ot)
    fr = frame(st); cv = BG.copy()
    if S(41) - 0.1 <= st < S(43) - 0.1:
        crop = fr.resize((1080, 608), Image.LANCZOS); cv.paste(crop, (0, 640))
    else:
        x0 = 528; crop = fr.crop((x0, 0, x0 + 864, 1080)).resize((1080, 1350), Image.LANCZOS); cv.paste(crop, (0, 300))
    d = ImageDraw.Draw(cv)
    for k, (line, col) in enumerate(TITLE):
        q = back(clamp((ot - k * 0.12) / 0.3), 1.8)
        d.text((SW / 2, 95 + k * 105), line, font=font(max(1, int((104 if k == 0 else 92) * q))), fill=col, anchor='mm', stroke_width=9, stroke_fill=OUT)
    if st >= S(35) - 0.1:
        d.rounded_rectangle([36, 330, 316, 412], 40, fill=(200, 30, 40), outline=OUT, width=5)
        d.text((176, 371), '7-KUN', font=font(50), fill=(255, 255, 255), anchor='mm')
    if not tail: vcaps(cv, st)
    # persistent bottom banner, start to end
    pulse = 1 + 0.03 * math.sin(ot * 6)
    bx0, by0, bx1, by1 = 30, 1652, SW - 30, 1880
    d.rounded_rectangle([bx0, by0, bx1, by1], 44, fill=(205, 25, 35), outline=(255, 255, 255), width=6)
    f1 = font(int(54 * pulse)); f2 = font(int(46 * pulse), False)
    d.text((SW / 2, by0 + 66), "TO'LIQ VIDEO KANALIMIZDA!", font=f1, fill=(255, 255, 255), anchor='mm', stroke_width=4, stroke_fill=OUT)
    d.text((SW / 2, by0 + 150), "OBUNA BO'LING — KIRIB KO'RING 👆".replace(' 👆', ''), font=f2, fill=(255, 225, 60), anchor='mm', stroke_width=4, stroke_fill=OUT)
    return cv
if __name__ == '__main__':
    if sys.argv[1] == 'stills':
        for i, tt in enumerate(sys.argv[2].split(',')): vframe(int(float(tt) * fps)).save(f'{D}/short_s{i}.jpg', quality=85)
        sys.exit()
    NF = int(outdur * fps)
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{SW}x{SH}', '-r', str(fps), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', f'{D}/short_raw.mp4'], stdin=subprocess.PIPE)
    for i in range(NF): ff.stdin.write(vframe(i).tobytes())
    ff.stdin.close(); ff.wait()
    print('done', round(outdur, 2), json.dumps(SEGS))
