import os, sys, subprocess, json
os.environ['NOHUD'] = '1'
sys.path.insert(0, '/root/shorts/snow')
import render as R
from render import *
from PIL import Image, ImageDraw
SW, SH = 1080, 1920
SEGS = [(T(2) - 0.15, E(2) + 0.35), (T(83) - 0.1, E(92) + 0.4)]
TAIL = 1.6
fps = 30
outdur = sum(b - a for a, b in SEGS) + TAIL
def src_time(ot):
    acc = 0
    for a, b in SEGS:
        if ot < acc + (b - a): return a + (ot - acc), False
        acc += b - a
    return SEGS[-1][1] - 0.01, True
BG = Image.new('RGB', (SW, SH)); _d = ImageDraw.Draw(BG)
for y in range(SH): _d.line([(0, y), (SW, y)], fill=(int(12 + 20 * y / SH), int(18 + 30 * y / SH), int(46 + 50 * y / SH)))
TITLE = ["THE SNOW WAS", "TALLER THAN", "MY FRONT DOOR"]
CFv = font(64)
def vcaps(cv, t):
    cur = None
    for s in S:
        if s['start'] - 0.05 <= t <= s['end'] + 0.25: cur = s
    if not cur: return
    words = cur['text'].replace('"', '').split(); a, b = cur['start'], cur['end']
    tot = sum(len(w) + 1 for w in words); acc = 0; st = []
    for w in words: st.append(a + (b - a) * acc / tot); acc += len(w) + 1
    d = ImageDraw.Draw(cv); lines, ln = [], []
    for i, w in enumerate(words):
        if ln and d.textlength(' '.join(words[j] for j in ln + [i]), font=CFv) > 960: lines.append(ln); ln = [i]
        else: ln.append(i)
    lines.append(ln)
    y0 = 1590 - (len(lines) - 1) * 80
    for li, ln in enumerate(lines):
        ws = [d.textlength(words[i] + ' ', font=CFv) for i in ln]; x = SW / 2 - sum(ws) / 2
        for i, wd in zip(ln, ws):
            act = st[i] <= t < (st[i + 1] if i + 1 < len(words) else b + 0.25)
            d.text((x, y0 + li * 80), words[i], font=CFv, fill=(255, 214, 40) if act else (255, 255, 255), stroke_width=8, stroke_fill=(0, 0, 0)); x += wd
def vframe(ofi):
    ot = ofi / fps; st, tail = src_time(ot)
    fr = R.frame(int(st * fps))
    x0 = 528
    if T(84) - 0.1 <= st < T(86) - 0.1: x0 = 300
    elif T(86) - 0.1 <= st < T(87) - 0.1: x0 = 470
    elif st >= T(91) - 0.1: x0 = 1000
    crop = fr.crop((x0, 0, x0 + 864, 1080)).resize((1080, 1350), Image.LANCZOS)
    cv = BG.copy(); cv.paste(crop, (0, 330))
    d = ImageDraw.Draw(cv)
    for k, line in enumerate(TITLE):
        q = back(clamp((ot - k * 0.12) / 0.3), 1.8)
        d.text((SW / 2, 85 + k * 92), line, font=font(max(1, int(84 * q)), True), fill=(255, 255, 255) if k < 2 else (120, 200, 255), anchor='mm', stroke_width=9, stroke_fill=OUT)
    if st >= T(83) - 0.1:
        d.rounded_rectangle([40, 360, 300, 440], 40, fill=(30, 110, 200), outline=OUT, width=5)
        d.text((170, 400), 'DAY 10', font=font(48, True), fill=(255, 255, 255), anchor='mm')
    if not tail: vcaps(cv, st)
    if ot > outdur - 3.6:
        k = back(clamp((ot - outdur + 3.6) / 0.35), 1.8)
        d.rounded_rectangle([SW / 2 - 440 * k, 1700, SW / 2 + 440 * k, 1820], 60, fill=(220, 30, 40), outline=OUT, width=6)
        if k > 0.8: d.text((SW / 2, 1760), 'FULL VIDEO ON MY CHANNEL', font=font(52, True), fill=(255, 255, 255), anchor='mm')
    else:
        d.text((SW / 2, 1760), 'DAY ZERO TALES', font=font(46, True), fill=(255, 150, 60), anchor='mm', stroke_width=5, stroke_fill=OUT)
    return cv
if __name__ == '__main__':
    if sys.argv[1] == 'stills':
        for i, tt in enumerate(sys.argv[2].split(',')): vframe(int(float(tt) * fps)).save(f'short_s{i}.jpg', quality=85)
        sys.exit()
    NF = int(outdur * fps)
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{SW}x{SH}', '-r', str(fps), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', 'short_video.mp4'], stdin=subprocess.PIPE)
    for i in range(NF): ff.stdin.write(vframe(i).tobytes())
    ff.stdin.close(); ff.wait()
    print('done', round(outdur, 2), json.dumps(SEGS))
