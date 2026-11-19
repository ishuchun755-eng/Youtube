import sys, os, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scenes import *
from PIL import ImageChops

DAYS = [(3, "DAY 0", 0), (12, "DAY 1", 1), (22, "DAY 2", 2), (32, "DAY 3", 3), (43, "DAY 4", 4), (49, "DAY 5", 5), (66, "DAY 7", 7), (73, "DAY 8", 8),
        (83, "DAY 10", 10), (93, "DAY 12", 12), (100, "DAY 14", 14), (110, "DAY 17", 17), (117, "DAY 20", 20), (125, "DAY 25", 25), (133, "DAY 30", 30)]
DT = [(T(i), lab, ft) for i, lab, ft in DAYS]

def hud(fr, t):
    cur = None
    for ts, lab, ft in DT:
        if t >= ts: cur = (ts, lab, ft)
    if not cur or t > VEND: return
    ts, lab, ft = cur; lt = t - ts
    d = ImageDraw.Draw(fr)
    if lab != "DAY 0" and lt < 1.1:
        a = 1 - clamp((lt - 0.85) / 0.25)
        ov = Image.new("RGBA", (W, H), (10, 20, 50, int(100 * a))); fr.paste(ov, (0, 0), ov)
        q = back(lt / 0.3, 2.0); s = max(0.2, 2.0 - q)
        d.text((W / 2, H / 2 - 40), lab, font=font(int(240 * s), True), fill=(255, 255, 255), anchor="mm", stroke_width=14, stroke_fill=OUT)
        return
    q = back(clamp((lt - (1.1 if lab != "DAY 0" else 0)) / 0.3), 1.8)
    if q <= 0: return
    tw = d.textlength(lab, font=font(46, True))
    d.rounded_rectangle([40, 36, 40 + (tw + 110) * q, 116], 40, fill=(30, 110, 200), outline=OUT, width=5)
    if q > .8:
        d.text((80, 76), "❄", font=font(40, False), fill=(255, 255, 255), anchor="mm")
        d.text((120, 76), lab, font=font(46, True), fill=(255, 255, 255), anchor="lm")
    # snow meter
    shown = ft if t < T(143) else max(0, ft * (1 - clamp((t - T(146)) / 4)))
    mx, my0, my1 = 1840, 150, 650
    d.rounded_rectangle([mx - 34, my0 - 10, mx + 34, my1 + 10], 30, fill=(20, 30, 60), outline=OUT, width=4)
    hfrac = clamp(shown / 30)
    d.rounded_rectangle([mx - 22, my1 - (my1 - my0) * hfrac, mx + 22, my1], 20, fill=(240, 246, 255))
    d.text((mx, my1 + 52), f"{shown:.0f} FT" if shown >= 1 else "<1 FT", font=font(36, True), fill=(255, 255, 255), anchor="mm", stroke_width=5, stroke_fill=OUT)

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
    lines.append(ln)
    y0 = 1010 - (len(lines) - 1) * 58
    for li, ln in enumerate(lines):
        ws = [d.textlength(words[i] + " ", font=CF) for i in ln]; x = W / 2 - sum(ws) / 2
        for i, wd in zip(ln, ws):
            act = st[i] <= t < (st[i + 1] if i + 1 < len(words) else b + 0.25)
            d.text((x, y0 + li * 58), words[i], font=CF, fill=(255, 214, 40) if act else (255, 255, 255), stroke_width=6, stroke_fill=(0, 0, 0)); x += wd

yy, xx = np.mgrid[0:H, 0:W]
_r = np.sqrt(((xx - W / 2) / (W * .62)) ** 2 + ((yy - H / 2) / (H * .62)) ** 2)
VIG = Image.fromarray(((1 - .45 * np.clip(_r - .45, 0, 1) ** 1.5) * 255).astype(np.uint8)).convert("RGB")

def frame(fi):
    t = fi / FPS
    cur = SC[0]; idx = 0
    for i, s in enumerate(SC):
        if t >= s[0]: cur, idx = s, i
    st, fn, snow_i, wind, inter = cur
    nxt = SC[idx + 1][0] if idx + 1 < len(SC) else DUR
    lt, d = t - st, nxt - st
    fr = fn(t, lt, d, fi)
    if fr.mode != "RGB": fr = fr.convert("RGB")
    if snow_i > 0 and not inter: snowfall(fr, t, snow_i, wind, seed=idx)
    if lt < 0.12 and idx > 0: fr = Image.blend(fr, Image.new("RGB", (W, H), (255, 255, 255)), 0.5 * (1 - lt / 0.12))
    fr = ImageChops.multiply(fr, VIG)
    hud(fr, t)
    if t < VEND + 0.3: captions(fr, t)
    if t > DUR - 0.8: fr = Image.blend(fr, Image.new("RGB", (W, H)), clamp((t - DUR + 0.8) / 0.8))
    return fr

if __name__ == "__main__":
    if sys.argv[1] == "stills":
        os.makedirs("stills", exist_ok=True)
        for i, tt in enumerate(sys.argv[2].split(",")): frame(int(float(tt) * FPS)).save(f"stills/{i:03d}.jpg", quality=85)
        sys.exit()
    a, b, out = int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    NF = int(DUR * FPS)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for fi in range(a, min(b, NF)):
        ff.stdin.write(frame(fi).tobytes())
        if fi % 300 == 0: print(out, fi, flush=True)
    ff.stdin.close(); ff.wait(); print("done", out, flush=True)
