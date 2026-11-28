import 'package:google_sign_in/google_sign_in.dart';

import '../../core/config.dart';

/// The person closed the Google sheet: not an error to show
class GoogleSignInCanceled implements Exception {}

/// Native "Sign in with Google" (Credential Manager on Android, Google SDK on
/// iOS). Returns the ID token that the API verifies.
class GoogleAuth {
  bool _initialized = false;

  Future<String> idToken({required String serverClientId}) async {
    final google = GoogleSignIn.instance;
    if (!_initialized) {
      await google.initialize(
        clientId: AppConfig.googleIosClientId.isEmpty
            ? null
            : AppConfig.googleIosClientId,
        serverClientId: serverClientId,
      );
      _initialized = true;
    }
    try {
      final account = await google.authenticate();
      final token = account.authentication.idToken;
      if (token == null) throw StateError('Google did not return an ID token');
      return token;
    } on GoogleSignInException catch (error) {
      if (error.code == GoogleSignInExceptionCode.canceled ||
          error.code == GoogleSignInExceptionCode.interrupted) {
        throw GoogleSignInCanceled();
      }
      rethrow;
    }
  }

  /// Next time Google asks which account to use
  Future<void> signOut() async {
    if (!_initialized) return;
    try {
      await GoogleSignIn.instance.signOut();
    } catch (_) {}
  }
}
