import sys, subprocess, os
from scenes import *
if __name__ == "__main__":
    if sys.argv[1] == "stills":
        ts = [float(x) for x in sys.argv[2].split(",")]
        os.makedirs("stills/s", exist_ok=True)
        for i, tt in enumerate(ts): frame(int(tt * FPS)).save(f"stills/s/{i:03d}.jpg", quality=85)
        sys.exit()
    a, b = int(sys.argv[2]), int(sys.argv[3])
    out = sys.argv[4]
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for fi in range(a, b):
        ff.stdin.write(frame(fi).tobytes())
        if fi % 300 == 0: print(f"{out} {fi}/{b}", flush=True)
    ff.stdin.close(); ff.wait(); print("done", out, flush=True)
