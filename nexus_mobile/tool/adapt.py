"""Small, reviewable adaptations of the pinned client, never of NEXUS servers."""

import json
import plistlib
from pathlib import Path
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit

from upstream import MOBILE, ROOT


def replace_required(path, before, after):
    text = path.read_text()
    if before not in text:
        raise RuntimeError(f"Upstream drift: expected integration point missing in {path.name}")
    path.write_text(text.replace(before, after))


def apply_client_changes(source):
    for directory in ("lib", "test", "dart_sdk/lib", "dart_sdk/test"):
        for path in (source / directory).rglob("*.dart"):
            text = path.read_text()
            updated = text.replace("/.well-known/fluxer", "/.well-known/nexus")
            if updated != text:
                path.write_text(updated)

    main = source / "lib/main.dart"
    replace_required(
        main,
        "import 'dart:ui';",
        "import 'dart:ui';\nimport 'package:fluxer_app/core/build/nexus_configuration.dart';",
    )
    replace_required(
        main,
        "Future<void> main(List<String> args) async {",
        """Future<void> main(List<String> args) async {
  final Widget? configurationError = nexusConfigurationError();
  if (configurationError != null) {
    WidgetsFlutterBinding.ensureInitialized();
    runApp(configurationError);
    return;
  }""",
    )
    snapshot = source / "lib/core/instance/instance_config_snapshot.dart"
    replace_required(snapshot, "'premium_product_name': 'Plutonium'", "'premium_product_name': 'NEXUS Premium'")
    replace_required(
        snapshot,
        """  static const Set<String> _officialApiPublicHosts = <String>{
    'fluxer.com',
    'canary.fluxer.com',
  };""",
        "  static const Set<String> _officialApiPublicHosts = <String>{};",
    )
    replace_required(
        snapshot,
        "if (wellKnown?.features.selfHosted ?? false) {",
        "if (defaultUrl.isEmpty || (wellKnown?.features.selfHosted ?? false)) {",
    )

    # Do not rename Dart classes/package imports or legacy database preferences.
    # Translate display strings via the source ARBs, then regenerate l10n.
    for path in (source / "lib/l10n").glob("*.arb"):
        data = json.loads(path.read_text())
        for key, value in data.items():
            if not key.startswith("@") and isinstance(value, str):
                data[key] = value.replace("Fluxer", "NEXUS").replace("Plutonium", "NEXUS Premium")
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    app = source / "lib/app.dart"
    text = app.read_text()
    app.write_text(text.replace("'Fluxer'", "'NEXUS'"))
    navigation = source / "lib/features/settings/presentation/user_settings_nav.dart"
    replace_required(navigation, "'https://fluxer.gg/fluxer-labs'", "String.fromEnvironment('NEXUS_COMMUNITY_INVITE')")
    replace_required(navigation, "'https://feedback.fluxer.com'", "String.fromEnvironment('NEXUS_FEEDBACK_URL')")
    settings = source / "lib/features/settings/presentation/user_settings_modal.dart"
    replace_required(
        settings,
        "await handleInviteLinkTap(context, kFluxerLabsInviteUrl);",
        """if (kFluxerLabsInviteUrl.isEmpty) {
      await handleExternalLinkTap(context, kFluxerLabsInviteUrl);
      return;
    }
    await handleInviteLinkTap(context, kFluxerLabsInviteUrl);""",
    )
    external = source / "lib/shared/external_links/external_link_handler.dart"
    replace_required(
        external,
        "  if (isInviteLink(url)) {",
        """  if (url.trim().isEmpty) {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('NEXUS'),
        content: const Text(
          'هذا الرابط غير مضبوط لهذه النسخة.\\n'
          'This destination has not been configured by the NEXUS operator.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
    return;
  }
  if (isInviteLink(url)) {""",
    )
    # Apply remaining display defaults after the guarded upstream edits above.
    # Changing them first would invalidate those exact upstream anchors.
    for directory in ("lib", "dart_sdk/lib"):
        for path in (source / directory).rglob("*.dart"):
            text = path.read_text()
            updated = text.replace("'Fluxer'", "'NEXUS'").replace("'Plutonium'", "'NEXUS Premium'")
            if updated != text:
                path.write_text(updated)


def apply_ios_changes(source, bundle_id, origin):
    ios = source / "ios"
    for path in ios.rglob("*"):
        if path.suffix not in {".swift", ".plist", ".entitlements", ".pbxproj", ".xcconfig", ".xcstrings"}:
            continue
        text = path.read_text()
        text = text.replace("com.fluxer", bundle_id)
        text = re.sub(r"DEVELOPMENT_TEAM = [^;]*;", 'DEVELOPMENT_TEAM = "";', text)
        text = re.sub(r"PROVISIONING_PROFILE_SPECIFIER = [^;]*;", 'PROVISIONING_PROFILE_SPECIFIER = "";', text)
        # Keep Swift symbols and Xcode source-file references unchanged. A
        # blanket rename here would leave pbxproj pointing at missing files.
        text = text.replace('"Fluxer Canary"', '"NEXUS"').replace('"Fluxer"', '"NEXUS"')
        text = text.replace('"Share to Fluxer"', '"Share to NEXUS"')
        text = re.sub(
            r'(INFOPLIST_KEY_CFBundleDisplayName\s*=\s*)"?Fluxer([^;]*);',
            lambda match: match[1] + '"NEXUS' + match[2].rstrip('"') + '";',
            text,
        )
        path.write_text(text)
    # Channel names are an internal protocol: update both native and Dart ends.
    for path in (source / "lib").rglob("*.dart"):
        text = path.read_text()
        if "com.fluxer" in text:
            path.write_text(text.replace("com.fluxer", bundle_id))
    host = urlsplit(origin).hostname
    for path in ios.rglob("*.entitlements"):
        data = plistlib.loads(path.read_bytes())
        if "com.apple.developer.associated-domains" in data:
            # These are requested capabilities, not proof that AASA is deployed.
            data["com.apple.developer.associated-domains"] = [
                f"applinks:{host}", f"webcredentials:{host}"
            ]
        if "keychain-access-groups" in data:
            data["keychain-access-groups"] = [
                f"$(AppIdentifierPrefix){bundle_id}",
                f"$(AppIdentifierPrefix){bundle_id}.canary",
            ]
        path.write_bytes(plistlib.dumps(data, sort_keys=False))
    info = ios / "Runner/Info.plist"
    data = plistlib.loads(info.read_bytes())
    data["CFBundleName"] = "NEXUS"
    for key, value in data.items():
        if isinstance(value, str) and key.startswith("NS") and key.endswith("UsageDescription"):
            data[key] = value.replace("Fluxer", "NEXUS")
    for entry in data.get("CFBundleURLTypes", []):
        entry["CFBundleURLSchemes"] = [
            "nexus" if value in ("fluxer", "fluxer-canary") else value
            for value in entry.get("CFBundleURLSchemes", [])
        ]
    info.write_bytes(plistlib.dumps(data, sort_keys=False))
    # Share-extension URL scheme and its Dart receiver must agree.
    for path in list(ios.rglob("*.swift")) + list((source / "lib").rglob("*.dart")):
        text = path.read_text()
        updated = text.replace("fluxer://", "nexus://")
        updated = updated.replace("scheme == 'fluxer'", "scheme == 'nexus'")
        updated = updated.replace("scheme == 'fluxer-canary'", "scheme == 'nexus'")
        if updated != text:
            path.write_text(updated)
    # Do not ship someone else's store metadata or release automation.
    shutil.rmtree(source / ".github", ignore_errors=True)
    shutil.rmtree(source / "fastlane", ignore_errors=True)


def apply_android_changes(source, bundle_id):
    for root in (source / "android", source / "packages"):
        for path in root.rglob("*"):
            if path.name == "google-services.json":
                path.unlink()
                continue
            if path.suffix not in {".kt", ".java", ".xml", ".kts", ".gradle", ".yaml", ".dart"}:
                continue
            text = path.read_text()
            updated = text.replace("com.fluxer", bundle_id)
            if path.name == "strings.xml":
                updated = updated.replace("Fluxer", "NEXUS")
            if path.name in ("build.gradle", "build.gradle.kts"):
                updated = updated.replace('"Fluxer', '"NEXUS')
            if updated != text:
                path.write_text(updated)
        # Flutter's plugin loader requires the Kotlin/Java directory to match
        # androidPackage, even though the Kotlin compiler itself is permissive.
        for path in sorted(root.glob("**/src/*/kotlin/com/fluxer"), reverse=True):
            target = path.parent.parent.joinpath(*bundle_id.split("."))
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(path), str(target))
        for path in sorted(root.glob("**/src/*/java/com/fluxer"), reverse=True):
            target = path.parent.parent.joinpath(*bundle_id.split("."))
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(path), str(target))


def apply_icons(source):
    """Retain icon slots/variant choices; replace inherited marks with our N."""
    logo = ROOT / "nexus_app/src/media/images/nexus-brand-icon.svg"
    vector = ROOT / "nexus_app/src/media/images/nexus-brand-icon-monochrome.svg"
    images = source / "assets/images"
    for name in ("fluxer-logo-monochrome.svg", "fluxer-symbol.svg"):
        shutil.copyfile(vector, images / name)
    shutil.copyfile(logo, images / "nexus-brand-icon.svg")
    # Flutter SVG cannot render <text>; outline the verified, licensed NEXUS
    # font glyphs rather than shipping an invisible text-only SVG.
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    with TTFont(ROOT / "packages/fonts/files/NEXUSSans/NEXUSSans-Bold.woff2") as font:
        glyphs = font.getGlyphSet()
        cmap = font.getBestCmap()
        advance = 0
        outlines = []
        for character in "NEXUS":
            name = cmap[ord(character)]
            pen = SVGPathPen(glyphs)
            glyphs[name].draw(pen)
            outlines.append(f'<path transform="translate({advance} 0)" d="{pen.getCommands()}"/>')
            advance += font["hmtx"][name][0]
        ascent = font["hhea"].ascent
        height = ascent - font["hhea"].descent
        wordmark = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {advance} {height}">'
            f'<g fill="white" transform="translate(0 {ascent}) scale(1 -1)">'
            + "".join(outlines) + "</g></svg>\n"
        )
    for name in ("fluxer-logo-text.svg", "fluxer-logo-wordmark-monochrome.svg"):
        (images / name).write_text(wordmark)
    for path in (source / "ios/Runner").glob("*.icon/Assets/*.svg"):
        shutil.copyfile(vector, path)
    # Adaptive/monochrome Android icons use vectors instead of the raster slots.
    # Replace only app-brand foregrounds, never functional quick-action icons.
    svg = ET.parse(logo).getroot()
    mark = svg.find("{http://www.w3.org/2000/svg}path")
    if mark is None:
        raise RuntimeError("Verified NEXUS icon is missing its mark geometry")
    android = "http://schemas.android.com/apk/res/android"
    ET.register_namespace("android", android)
    attributes = {
        "width": "108dp", "height": "108dp",
        "viewportWidth": "512", "viewportHeight": "512",
    }
    foreground = ET.Element("vector", {f"{{{android}}}{k}": v for k, v in attributes.items()})
    attributes = {
        "pathData": mark.attrib["d"], "fillColor": "#00000000",
        "strokeColor": mark.attrib["stroke"], "strokeWidth": mark.attrib["stroke-width"],
        "strokeLineCap": "round", "strokeLineJoin": "round",
    }
    ET.SubElement(foreground, "path", {f"{{{android}}}{k}": v for k, v in attributes.items()})
    for path in (source / "android/app/src/main/res/drawable").glob("*.xml"):
        if path.name in ("ic_launcher_foreground.xml", "ic_launcher_monochrome.xml") or (
            path.name.startswith("fluxer_icon_") and path.name.endswith("_foreground.xml")
        ):
            ET.ElementTree(foreground).write(path, encoding="utf-8", xml_declaration=True)
    command = shutil.which("magick")
    if not command:
        raise RuntimeError("ImageMagick is required to render verified NEXUS native icons")
    candidates = [images / "app_icon.png"]
    candidates += list((source / "ios").glob("**/*.appiconset/*.png"))
    candidates += list((source / "ios").glob("**/LaunchImage.imageset/*.png"))
    candidates += list((source / "android/app/src").glob("**/mipmap*/*.png"))
    candidates += list((source / "android/app/src").glob("**/mipmap*/*.webp"))
    candidates += list((images / "app_icon_previews").glob("**/*.png"))
    candidates += list((images / "app_icon_previews").glob("**/*.webp"))
    for path in candidates:
        if not path.exists():
            continue
        dimensions = subprocess.check_output(
            [command, "identify", "-format", "%wx%h", str(path)], text=True
        )
        subprocess.run(
            [command, "-background", "#4F46E5", str(logo), "-resize", dimensions,
             "-alpha", "remove", str(path)], check=True, capture_output=True
        )


def apply_overlays(source):
    for path in (MOBILE / "overlays").rglob("*"):
        if path.is_file():
            target = source / path.relative_to(MOBILE / "overlays")
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target)
