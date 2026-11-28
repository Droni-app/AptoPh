import 'dart:io' show Platform;

/// Build-time configuration (`--dart-define`), see docs/mobile.md.
abstract final class AppConfig {
  /// The AptoPH API. Defaults to the local API: the Android emulator reaches
  /// the computer at 10.0.2.2, the iOS simulator at localhost.
  static String get apiUrl {
    const value = String.fromEnvironment('API_URL');
    if (value.isNotEmpty) return value;
    return Platform.isAndroid
        ? 'http://10.0.2.2:3333'
        : 'http://localhost:3333';
  }

  /// iOS OAuth client of Google Cloud (Android does not need one in code).
  static const googleIosClientId = String.fromEnvironment(
    'GOOGLE_IOS_CLIENT_ID',
  );

  /// Label of the session in "Mi perfil › Sesiones abiertas"
  static const device = 'App móvil';

  /// The residents' portal: password reset and invitation links open there
  static const residentsUrl = String.fromEnvironment(
    'RESIDENTS_URL',
    defaultValue: 'https://web.aptoph.com',
  );
}
