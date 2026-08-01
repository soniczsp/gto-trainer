# -*- coding: utf-8 -*-
"""生成 PWA 图标：扑克桌绿底 + 金色 ♠。"""
import os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_DIR = os.path.join(BASE, "icons")
os.makedirs(ICON_DIR, exist_ok=True)

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\seguisym.ttf",   # Segoe UI Symbol
    r"C:\Windows\Fonts\seguisb.ttf",    # Segoe UI Semibold
    r"C:\Windows\Fonts\arialbd.ttf",
]


def make_icon(size, path):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 圆角方块背景：深绿
    r = int(size * 0.16)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=(20, 83, 45, 255))

    # 内圈金色描边
    margin = int(size * 0.07)
    d.rounded_rectangle([margin, margin, size - 1 - margin, size - 1 - margin],
                        radius=int(r * 0.7), outline=(212, 175, 55, 255), width=max(2, int(size * 0.02)))

    # 中央 ♠
    font = None
    for f in FONT_CANDIDATES:
        try:
            font = ImageFont.truetype(f, int(size * 0.52))
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    text = "\u2660"  # ♠
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    d.text((x, y), text, font=font, fill=(240, 212, 121, 255))

    img.save(path, "PNG")
    print("saved %s (%dx%d)" % (path, size, size))


if __name__ == "__main__":
    make_icon(512, os.path.join(ICON_DIR, "icon-512.png"))
    make_icon(192, os.path.join(ICON_DIR, "icon-192.png"))
