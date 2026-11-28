import 'package:material_ui/material_ui.dart';

/// Colors of branding/tokens.css
abstract final class Brand {
  static const navy = Color(0xFF1E3A5F);
  static const navyDark = Color(0xFF102038);
  static const mint = Color(0xFF3CC8A8);
  static const mintText = Color(0xFF187A66);
  static const coral = Color(0xFFF06A43);
  static const cream = Color(0xFFFAF7F2);
  static const sand = Color(0xFFF1ECE3);
  static const slate = Color(0xFF4A607A);
  static const danger = Color(0xFFD64545);
}

ThemeData appTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: Brand.navy,
    brightness: brightness,
    primary: dark ? const Color(0xFFA9C9E8) : Brand.navy,
    secondary: dark ? Brand.mint : Brand.mintText,
    tertiary: Brand.coral,
    error: Brand.danger,
    surface: dark ? const Color(0xFF0E1A2C) : Brand.cream,
  );
  const radius = BorderRadius.all(Radius.circular(12));
  // Inter for the text, Plus Jakarta Sans for titles (branding/README.md)
  final base = ThemeData(brightness: brightness, fontFamily: 'Inter').textTheme;
  TextStyle? display(TextStyle? style, FontWeight weight) => style?.copyWith(
    fontFamily: 'PlusJakartaSans',
    fontWeight: weight,
    letterSpacing: -0.3,
  );
  final ink = dark ? Colors.white : Brand.navyDark;
  final textTheme = base
      .copyWith(
        displaySmall: display(base.displaySmall, FontWeight.w800),
        headlineLarge: display(base.headlineLarge, FontWeight.w800),
        headlineMedium: display(base.headlineMedium, FontWeight.w800),
        headlineSmall: display(base.headlineSmall, FontWeight.w700),
        titleLarge: display(base.titleLarge, FontWeight.w700),
        titleMedium: base.titleMedium?.copyWith(fontWeight: FontWeight.w600),
      )
      .apply(bodyColor: ink, displayColor: ink);
  return ThemeData(
    colorScheme: scheme,
    fontFamily: 'Inter',
    textTheme: textTheme,
    scaffoldBackgroundColor: scheme.surface,
    appBarTheme: AppBarTheme(
      backgroundColor: scheme.surface,
      foregroundColor: dark ? Colors.white : Brand.navy,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: textTheme.titleLarge?.copyWith(
        color: dark ? Colors.white : Brand.navy,
        fontSize: 20,
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: dark ? Colors.white.withValues(alpha: 0.05) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.all(Radius.circular(20)),
        side: BorderSide(
          color: dark
              ? Colors.white.withValues(alpha: 0.08)
              : const Color(0x141E3A5F),
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? Colors.white.withValues(alpha: 0.05) : Colors.white,
      border: const OutlineInputBorder(borderRadius: radius),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        textStyle: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        foregroundColor: dark ? Colors.white : Brand.navy,
        side: BorderSide(
          color: dark ? Colors.white24 : const Color(0x331E3A5F),
        ),
        textStyle: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
  );
}
