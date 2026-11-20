import sys, os, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import zscenes as Z
from zscenes import *
from PIL import ImageChops
DAYS = [(11, "DAY 1", 100), (25, "DAY 3", 80), (35, "DAY 7", 60), (47, "DAY 10", 45), (56, "DAY 15", 30), (66, "DAY 21", 10), (78, "DAY 30", 0)]
DT = [(T(i), lab, fd) for i, lab, fd in DAYS]
NOHUD = bool(os.environ.get("NOHUD"))
def hud(fr, t):
    cur = None
    for ts, lab, fd in DT:
        if t >= ts: cur = (ts, lab, fd)
    if not cur or t > VEND: return
    ts, lab, fd = cur; lt = t - ts; d = ImageDraw.Draw(fr)
    if lt < 1.1:
        a = 1 - clamp((lt - 0.85) / 0.25)
        ov = Image.new("RGBA", (W, H), (30, 0, 0, int(110 * a))); fr.paste(ov, (0, 0), ov)
        s = max(0.2, 2.0 - back(lt / 0.3, 2.0))
        d.text((W / 2, H / 2 - 40), lab, font=font(int(240 * s), True), fill=(255, 255, 255), anchor="mm", stroke_width=14, stroke_fill=OUT); return
    q = back(clamp((lt - 1.1) / 0.3), 1.8)
    if q <= 0: return
    tw = d.textlength(lab, font=font(46, True))
    d.rounded_rectangle([40, 36, 40 + (tw + 70) * q, 116], 40, fill=(190, 30, 40), outline=OUT, width=5)
    if q > .8: d.text((75, 76), lab, font=font(46, True), fill=(255, 255, 255), anchor="lm")
    mx, my0, my1 = 1840, 150, 650
    d.rounded_rectangle([mx - 34, my0 - 10, mx + 34, my1 + 10], 30, fill=(30, 20, 30), outline=OUT, width=4)
    d.rounded_rectangle([mx - 22, my1 - (my1 - my0) * fd / 100, mx + 22, my1], 20, fill=(240, 180, 60) if fd > 25 else (230, 60, 60))
    d.text((mx, my1 + 46), f"FOOD {fd}%", font=font(30, True), fill=(255, 255, 255), anchor="mm", stroke_width=5, stroke_fill=OUT)
CF = font(46)
def captions(fr, t):
    cur = None
    for s in S:
        if s["start"] - 0.05 <= t <= s["end"] + 0.25: cur = s
    if not cur: return
    words = cur["text"].replace('"', "").split(); a, b = cur["start"], cur["end"]
    tot = sum(len(w) + 1 for w in words); acc = 0; st = []
    for w in words: st.append(a + (b - a) * acc / tot); acc += len(w) + 1
    d = ImageDraw.Draw(fr); lines, ln = [], []
    for i, w in enumerate(words):
        if ln and d.textlength(" ".join(words[j] for j in ln + [i]), font=CF) > 1500: lines.append(ln); ln = [i]
        else: ln.append(i)
    lines.append(ln); y0 = 1010 - (len(lines) - 1) * 58
    for li, ln in enumerate(lines):
        ws = [d.textlength(words[i] + " ", font=CF) for i in ln]; x = W / 2 - sum(ws) / 2
        for i, wd in zip(ln, ws):
            act = st[i] <= t < (st[i + 1] if i + 1 < len(words) else b + 0.25)
            d.text((x, y0 + li * 58), words[i], font=CF, fill=(255, 214, 40) if act else (255, 255, 255), stroke_width=6, stroke_fill=(0, 0, 0)); x += wd
yy, xx = np.mgrid[0:H, 0:W]
_r = np.sqrt(((xx - W / 2) / (W * .62)) ** 2 + ((yy - H / 2) / (H * .62)) ** 2)
VIG = Image.fromarray(((1 - .32 * np.clip(_r - .45, 0, 1) ** 1.4) * 255).astype(np.uint8)).convert("RGB")
def frame(fi):
    t = fi / FPS; cur = SC[0]; idx = 0
    for i, s in enumerate(SC):
        if t >= s[0]: cur, idx = s, i
    st, fn = cur; nxt = SC[idx + 1][0] if idx + 1 < len(SC) else DUR
    fr = fn(t, t - st, nxt - st, fi)
    if fr.mode != "RGB": fr = fr.convert("RGB")
    if t - st < 0.1 and idx > 0: fr = Image.blend(fr, Image.new("RGB", (W, H)), 0.7 * (1 - (t - st) / 0.1))
    fr = ImageChops.multiply(fr, VIG)
    if not NOHUD:
        hud(fr, t)
        if t < VEND + 0.3: captions(fr, t)
    if t > DUR - 0.8: fr = Image.blend(fr, Image.new("RGB", (W, H)), clamp((t - DUR + 0.8) / 0.8))
    return fr
if __name__ == "__main__":
    if sys.argv[1] == "stills":
        os.makedirs("stills", exist_ok=True)
        for i, tt in enumerate(sys.argv[2].split(",")): frame(int(float(tt) * FPS)).save(f"stills/{i:03d}.jpg", quality=85)
        sys.exit()
    a, b, out = int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]; NF = int(DUR * FPS)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for fi in range(a, min(b, NF)):
        ff.stdin.write(frame(fi).tobytes())
        if fi % 300 == 0: print(out, fi, flush=True)
    ff.stdin.close(); ff.wait(); print("done", out, flush=True)
