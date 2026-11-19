import sys
sys.path.insert(0, "/root/shorts/trucks")
import os, json
from PIL import Image
cwd = os.getcwd(); os.chdir("/root/shorts/trucks")
import importlib.util
_spec = importlib.util.spec_from_file_location('trucks_scenes', '/root/shorts/trucks/scenes.py')
TS = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(TS)
os.chdir(cwd)
from lib import person, put, W, H
import math
def store(t, lt, d, fi, t_empty, t_fight):
    fr = TS.bg_store().copy()
    am = {c[0]: 0.0 for c in TS.CATS}
    TS.draw_shelves(fr, am)
    fr = TS.push(fr, lt, d, 1.0, 1.06)
    if t > t_fight - 0.1:
        k = math.sin(t * 8) * 30
        put(fr, person("person", "annoyed", (1, 0), False, "push", False, 1, 0, (90, 150, 220)), 760 + k, 1120, 0.95)
        put(fr, person("person", "annoyed", (-1, 0), False, "push", False, 2, 4, (220, 90, 120)), 1160 + k, 1120, 0.95, flip=True)
        from PIL import ImageDraw
        d_ = ImageDraw.Draw(fr); d_.rounded_rectangle([900 + k, 620, 1020 + k, 760], 20, fill=(250, 250, 255), outline=(28, 20, 36), width=5)
        d_.text((960 + k, 690), "MALLOWS", fill=(200, 60, 120), anchor="mm")
    else:
        put(fr, person("hero", "shock", (0, -1), False, "down"), 1500, 1140, 0.95)
    return fr
