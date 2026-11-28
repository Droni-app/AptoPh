import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/session_store.dart';
import 'auth_repository.dart';
import 'google_auth.dart';
import 'models.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
final sessionStoreProvider = Provider<SessionStore>((ref) => SessionStore());
final googleAuthProvider = Provider<GoogleAuth>((ref) => GoogleAuth());
final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(apiClientProvider)),
);

/// Whether the API offers "Continuar con Google" (hidden when it does not, or offline)
final googleAvailableProvider = FutureProvider<bool>((ref) async {
  try {
    final provider = await ref.read(authRepositoryProvider).googleProvider();
    return provider.enabled && provider.clientId != null;
  } catch (_) {
    return false;
  }
});

final authControllerProvider = NotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

sealed class AuthState {
  const AuthState();
}

/// Reading the stored session when the app opens
class AuthLoading extends AuthState {
  const AuthLoading();
}

/// The stored session could not be checked (no connection): retry, keep it
class AuthOffline extends AuthState {
  const AuthOffline(this.message);

  final String message;
}

class SignedOut extends AuthState {
  const SignedOut({this.message});

  /// Why the person is back at the login (e.g. the session expired)
  final String? message;
}

class SignedIn extends AuthState {
  const SignedIn({required this.user, required this.tenants, this.tenantId});

  final UserProfile user;

  /// Conjuntos where the person is a resident or owner
  final List<TenantSummary> tenants;
  final String? tenantId;

  TenantSummary? get tenant {
    for (final tenant in tenants) {
      if (tenant.id == tenantId) return tenant;
    }
    return null;
  }

  SignedIn copyWith({String? tenantId}) =>
      SignedIn(user: user, tenants: tenants, tenantId: tenantId);
}

/// The session of the app: the token in secure storage, the profile and the
/// active conjunto.
class AuthController extends Notifier<AuthState> {
  /// The illustrated splash stays at least this long on a cold start (zero in tests)
  static Duration minimumSplash = const Duration(milliseconds: 1400);

  ApiClient get _api => ref.read(apiClientProvider);
  SessionStore get _store => ref.read(sessionStoreProvider);
  AuthRepository get _repository => ref.read(authRepositoryProvider);

  @override
  AuthState build() {
    _api.onUnauthorized = () {
      if (state is SignedIn) {
        _signOutLocally('Tu sesión terminó. Vuelve a iniciar sesión.');
      }
    };
    Future.microtask(_restore);
    return const AuthLoading();
  }

  Future<void> _restore() async {
    final splash = Future<void>.delayed(minimumSplash);
    final next = await _restoredState();
    await splash;
    state = next;
  }

  Future<AuthState> _restoredState() async {
    final stored = await _store.read();
    if (stored == null) return const SignedOut();
    _api.token = stored.token;
    try {
      return await _load(
        await _repository.profile(),
        await _store.readTenant(),
      );
    } on ApiException catch (error) {
      if (error.isUnauthorized) {
        await _signOutLocally();
        return const SignedOut();
      }
      // Offline or the API is down: keep the session and let the person retry
      return AuthOffline(error.message);
    }
  }

  Future<void> retry() async {
    state = const AuthLoading();
    state = await _restoredState();
  }

  Future<void> login(String email, String password) =>
      _start(_repository.login(email, password));

  /// Throws [GoogleSignInCanceled] when the person closes the Google sheet
  Future<void> loginWithGoogle() async {
    final provider = await _repository.googleProvider();
    if (!provider.enabled || provider.clientId == null) {
      throw ApiException('El inicio de sesión con Google no está disponible.');
    }
    final idToken = await ref
        .read(googleAuthProvider)
        .idToken(serverClientId: provider.clientId!);
    await _start(_repository.loginWithGoogle(idToken));
  }

  Future<void> _start(Future<AuthSession> request) async {
    final session = await request;
    _api.token = session.token;
    await _store.save(
      StoredSession(token: session.token, expiresAt: session.expiresAt),
    );
    state = await _load(session.user, await _store.readTenant());
  }

  /// The conjuntos; with only one it is selected right away
  Future<SignedIn> _load(UserProfile user, String? storedTenant) async {
    final tenants = (await _repository.tenants())
        .where((t) => t.isResident)
        .toList();
    var tenantId = tenants.any((t) => t.id == storedTenant)
        ? storedTenant
        : null;
    if (tenantId == null && tenants.length == 1) tenantId = tenants.single.id;
    _api.tenantId = tenantId;
    await _store.saveTenant(tenantId);
    return SignedIn(user: user, tenants: tenants, tenantId: tenantId);
  }

  Future<void> selectTenant(String? id) async {
    final current = state;
    if (current is! SignedIn) return;
    _api.tenantId = id;
    await _store.saveTenant(id);
    state = current.copyWith(tenantId: id);
  }

  /// Reloads the conjuntos (an invitation was accepted meanwhile)
  Future<void> refresh() async {
    final current = state;
    if (current is! SignedIn) return;
    state = await _load(await _repository.profile(), current.tenantId);
  }

  Future<void> logout() async {
    await _repository.logout();
    await ref.read(googleAuthProvider).signOut();
    await _signOutLocally();
  }

  Future<void> _signOutLocally([String? message]) async {
    _api.token = null;
    _api.tenantId = null;
    await _store.clear();
    state = SignedOut(message: message);
  }
}
