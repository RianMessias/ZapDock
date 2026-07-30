from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "icons"
CANVAS = 1024


def scaled(points):
    return tuple(int(value * CANVAS / 128) for value in points)


def build_master():
    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle(
        scaled((7, 7, 121, 121)),
        radius=scaled((18,))[0],
        fill=(10, 14, 12, 255),
    )

    bubble_mask = Image.new("L", (CANVAS, CANVAS), 0)
    bubble_draw = ImageDraw.Draw(bubble_mask)
    bubble_draw.ellipse(scaled((21, 25, 107, 100)), fill=255)
    bubble_draw.polygon(
        [
            scaled((34, 82)),
            scaled((28.5, 110)),
            scaled((52, 96)),
        ],
        fill=255,
    )

    gradient_axis = Image.linear_gradient("L").resize((CANVAS, CANVAS))
    gradient_axis = gradient_axis.rotate(-38, resample=Image.Resampling.BICUBIC)
    mint = Image.new("RGBA", (CANVAS, CANVAS), (69, 241, 151, 255))
    emerald = Image.new("RGBA", (CANVAS, CANVAS), (10, 184, 99, 255))
    gradient = Image.composite(emerald, mint, gradient_axis)
    image.alpha_composite(
        Image.composite(
            gradient,
            Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0)),
            bubble_mask,
        )
    )

    draw = ImageDraw.Draw(image)
    dark = (7, 17, 12, 255)
    stroke = scaled((9,))[0]
    draw.line(
        [scaled((43, 50)), scaled((80, 50))],
        fill=dark,
        width=stroke,
    )
    draw.line(
        [scaled((77, 52)), scaled((47, 79))],
        fill=dark,
        width=stroke,
    )
    draw.line(
        [scaled((43, 79)), scaled((81, 79))],
        fill=dark,
        width=stroke,
    )
    draw.rounded_rectangle(
        scaled((87, 46, 94, 83)),
        radius=scaled((3,))[0],
        fill=dark,
    )

    return image


def main():
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    master = build_master()

    for size in (16, 32, 48, 128):
        icon = master.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(ICON_DIR / f"icon-{size}.png", optimize=True)

    print("Ícones PNG gerados.")


if __name__ == "__main__":
    main()
