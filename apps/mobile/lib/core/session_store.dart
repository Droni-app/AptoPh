import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// The access token lives in the Keychain (iOS) or the Keystore (Android),
/// never in plain preferences.
class SessionStore {
  SessionStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _sessionKey = 'aptoph.session';
  static const _tenantKey = 'aptoph.tenant';

  Future<StoredSession?> read() async {
    try {
      final raw = await _storage.read(key: _sessionKey);
      if (raw == null) return null;
      final json = jsonDecode(raw) as Map<String, dynamic>;
      final session = StoredSession(
        token: json['token'] as String,
        expiresAt: json['expiresAt'] == null
            ? null
            : DateTime.parse(json['expiresAt'] as String),
      );
      return session.isExpired ? null : session;
    } catch (_) {
      return null;
    }
  }

  Future<void> save(StoredSession session) => _storage.write(
    key: _sessionKey,
    value: jsonEncode({
      'token': session.token,
      'expiresAt': session.expiresAt?.toIso8601String(),
    }),
  );

  Future<String?> readTenant() => _storage.read(key: _tenantKey);

  Future<void> saveTenant(String? id) => id == null
      ? _storage.delete(key: _tenantKey)
      : _storage.write(key: _tenantKey, value: id);

  Future<void> clear() async {
    await _storage.delete(key: _sessionKey);
    await _storage.delete(key: _tenantKey);
  }
}

class StoredSession {
  const StoredSession({required this.token, this.expiresAt});

  final String token;
  final DateTime? expiresAt;

  bool get isExpired =>
      expiresAt != null && expiresAt!.isBefore(DateTime.now());
}
