"""Align script sentences to a voice file without ASR.
Speech time (pauses removed) is mapped proportionally to character count,
then each sentence boundary snaps to the nearest detected pause."""
import json, re, subprocess, sys

def pauses(audio, noise=-35, d=0.18):
    out = subprocess.run(["ffmpeg", "-i", audio, "-af", f"silencedetect=noise={noise}dB:d={d}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)]
    en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]
    return list(zip(st, en))

def duration(audio):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio],
                                capture_output=True, text=True).stdout)

def sentences(text):
    text = re.sub(r"\s+", " ", text.strip())
    parts = re.split(r'(?:(?<=[.!?])|(?<=[.!?]"))\s+(?=[A-Z"])', text)
    return [p for p in parts if p]

def align(audio, text, offset=0.0):
    P = pauses(audio, d=0.15); D = duration(audio)
    lead = P[0][1] if P and P[0][0] < 0.05 else 0.0
    tail = P[-1][0] if P and P[-1][1] > D - 0.05 else D
    inner = [(a, b) for a, b in P if a > lead + 0.05 and b < tail - 0.05]
    S = sentences(text)
    w = [len(s) for s in S]
    rate = (tail - lead - 0.45 * (len(S) - 1)) / sum(w)
    # nodes: 0 = lead, 1..len(inner) = pauses, last = tail
    nodes = [(lead, lead)] + inner + [(tail, tail)]
    N = len(nodes); INF = 1e18
    best = [[INF] * N for _ in range(len(S) + 1)]; back = [[-1] * N for _ in range(len(S) + 1)]
    best[0][0] = 0
    for i in range(1, len(S) + 1):
        exp = w[i - 1] * rate
        for j in range(1, N):
            if i == len(S) and j != N - 1: continue
            if i < len(S) and j == N - 1: continue
            e = nodes[j][0]
            inside = 0.0
            for k in range(j - 1, -1, -1):
                if best[i - 1][k] < INF:
                    s0 = nodes[k][1]
                    dur = e - s0
                    if dur > 0.15:
                        c = best[i - 1][k] + (dur - exp) ** 2 / max(exp, 0.6) + inside
                        if c < best[i][j]: best[i][j] = c; back[i][j] = k
                if k > 0:
                    pl = nodes[k][1] - nodes[k][0]
                    inside += 6 * pl * pl + 0.4 * pl
                if nodes[j][0] - nodes[k][1] > exp * 3 + 4: break
    j = N - 1; ends = []
    for i in range(len(S), 0, -1):
        ends.append(j); j = back[i][j]
    ends = ends[::-1]
    res, prev = [], 0
    for i, s in enumerate(S):
        st = nodes[prev][1]; en = nodes[ends[i]][0]
        res.append({"text": s, "start": round(st + offset, 3), "end": round(en + offset, 3)})
        prev = ends[i]
    return res, D

if __name__ == "__main__":
    out = []
    off = 0.0
    gap = 0.5
    for audio, txt in zip(sys.argv[1::2], sys.argv[2::2]):
        r, D = align(audio, open(txt).read(), off)
        out += r; off += D + gap
    json.dump(out, open("sentences.json", "w"), indent=1)
    for s in out: print(f'{s["start"]:7.2f} {s["end"]:7.2f}  {s["text"][:70]}')
