import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:fluxer_app/core/theme/color_utils.dart';

class FluxerBrandLogo extends StatelessWidget {
  const FluxerBrandLogo({
    required this.size,
    this.backgroundColor,
    this.symbolColor,
    super.key,
  });

  final double size;
  final Color? backgroundColor;
  final Color? symbolColor;

  static const Color _nexusIndigo = Color(0xFF4F46E5);

  static const String _verifiedNexusIcon = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <circle cx="256" cy="256" r="256" fill="#4F46E5"/>
  <path d="M160 352V160L352 352V160" fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round" stroke-width="48"/>
</svg>
''';

  String _svgColor(Color color) {
    final int rgb = color.toARGB32() & 0x00FFFFFF;
    return '#${rgb.toRadixString(16).padLeft(6, '0').toUpperCase()}';
  }

  @override
  Widget build(BuildContext context) {
    final Color fill = backgroundColor ?? _nexusIndigo;
    final Color mark =
        symbolColor ?? ColorUtils.bestContrastColor(fill.toARGB32());
    final String svg = _verifiedNexusIcon
        .replaceFirst('#4F46E5', _svgColor(fill))
        .replaceFirst('#FFFFFF', _svgColor(mark))
        .replaceFirst(
          'fill="${_svgColor(fill)}"',
          'fill="${_svgColor(fill)}" fill-opacity="${fill.a}"',
        )
        .replaceFirst(
          'stroke="${_svgColor(mark)}"',
          'stroke="${_svgColor(mark)}" stroke-opacity="${mark.a}"',
        );

    return ExcludeSemantics(
      child: SvgPicture.string(svg, width: size, height: size),
    );
  }
}
