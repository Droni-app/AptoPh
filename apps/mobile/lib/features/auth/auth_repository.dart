import '../../core/api/api_client.dart';
import '../../core/config.dart';
import 'models.dart';

/// The authentication endpoints (docs/authentication.md)
class AuthRepository {
  AuthRepository(this.api);

  final ApiClient api;

  Future<AuthSession> login(String email, String password) async {
    final data = await api.post<Map<String, dynamic>>(
      '/auth/login',
      body: {'email': email, 'password': password, 'device': AppConfig.device},
      auth: false,
      tenant: false,
    );
    return AuthSession.fromJson(data);
  }

  /// The ID token of the Google SDK → an AptoPH session
  Future<AuthSession> loginWithGoogle(String idToken) async {
    final data = await api.post<Map<String, dynamic>>(
      '/auth/google/token',
      body: {'idToken': idToken, 'device': AppConfig.device},
      auth: false,
      tenant: false,
    );
    return AuthSession.fromJson(data['session'] as Map<String, dynamic>);
  }

  /// `{ google, googleClientId }`: whether the API accepts Google, and the web
  /// client the SDK uses as `serverClientId`
  Future<({bool enabled, String? clientId})> googleProvider() async {
    final data = await api.get<Map<String, dynamic>>(
      '/auth/providers',
      auth: false,
      tenant: false,
    );
    return (
      enabled: data['google'] == true,
      clientId: data['googleClientId'] as String?,
    );
  }

  /// Always succeeds: the API does not say whether the email has an account
  Future<void> forgotPassword(String email) => api.post<dynamic>(
    '/auth/password/forgot',
    body: {'email': email, 'app': 'web'},
    auth: false,
    tenant: false,
  );

  Future<UserProfile> profile() async => UserProfile.fromJson(
    await api.get<Map<String, dynamic>>('/account/profile', tenant: false),
  );

  Future<List<TenantSummary>> tenants() async {
    final data = await api.get<List<dynamic>>(
      '/account/tenants',
      tenant: false,
    );
    return [
      for (final item in data)
        TenantSummary.fromJson(item as Map<String, dynamic>),
    ];
  }

  /// Revokes the token on the API (best effort)
  Future<void> logout() async {
    try {
      await api.post<dynamic>('/auth/logout', tenant: false);
    } catch (_) {}
  }
}
