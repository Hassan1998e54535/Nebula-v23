"""Convert existing NEXUS fonts; do not download substitute brand typography."""

import shutil

from upstream import ROOT


def prepare_fonts(source):
    try:
        from fontTools.ttLib import TTFont
    except ImportError as error:
        raise RuntimeError("Install nexus_mobile/requirements.txt for licensed font conversion") from error
    source_fonts = ROOT / "packages/fonts"
    assets = source / "assets/fonts/nexus"
    assets.mkdir(parents=True, exist_ok=True)
    entries = []
    families = (("NEXUSSans", "NEXUS Sans"), ("NEXUSMono", "NEXUS Mono"),
                ("NEXUSSansArabic", "NEXUS Arabic"))
    weights = (("Regular", 400), ("Medium", 500), ("SemiBold", 600), ("Bold", 700))
    for directory, family in families:
        entries.append(f"    - family: {family}\n      fonts:\n")
        for face, weight in weights:
            for italic in (False, True):
                suffix = "Italic" if italic else ""
                name = "Italic" if face == "Regular" and italic else face + suffix
                path = source_fonts / f"files/{directory}/{directory}-{name}.woff2"
                if not path.exists():
                    continue
                output = assets / f"{directory}-{name}.ttf"
                with TTFont(path) as font:
                    font.flavor = None
                    font.save(output)
                entries.append(f"        - asset: assets/fonts/nexus/{output.name}\n          weight: {weight}\n")
                if italic:
                    entries.append("          style: italic\n")
    pubspec = source / "pubspec.yaml"
    content = pubspec.read_text()
    if "  fonts:\n" not in content:
        raise RuntimeError("Upstream font registration anchor changed")
    content = content.replace("  fonts:\n", "  fonts:\n" + "".join(entries), 1)
    pubspec.write_text(content)
    for name in ("LICENSE-IBM-PLEX.txt", "NOTICE.md"):
        shutil.copyfile(source_fonts / name, source / f"assets/licenses/NEXUS-fonts-{name}")
    # Applies to existing type styles, not to user-selected family preferences.
    text_theme = source / "lib/core/theme/fluxer_text_theme.dart"
    text_theme.write_text(text_theme.read_text().replace(
        "fontFamily: FluxerFonts.sans,",
        "fontFamily: FluxerFonts.sans,\n        fontFamilyFallback: const ['NEXUS Arabic'],",
    ))
