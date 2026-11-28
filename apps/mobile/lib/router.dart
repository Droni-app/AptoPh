import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import 'core/theme.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/forgot_password_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/select_tenant_screen.dart';
import 'features/home/home_screen.dart';

const _publicPaths = {'/login', '/recuperar-contrasena'};

/// Where the person can be with each session state
String? redirectFor(AuthState auth, String location) {
  return switch (auth) {
    AuthLoading() || AuthOffline() => location == '/splash' ? null : '/splash',
    SignedOut() => _publicPaths.contains(location) ? null : '/login',
    SignedIn(tenantId: null) => location == '/conjuntos' ? null : '/conjuntos',
    SignedIn() =>
      _publicPaths.contains(location) ||
              location == '/splash' ||
              location == '/conjuntos'
          ? '/'
          : null,
  };
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier(0);
  ref.listen(authControllerProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) =>
        redirectFor(ref.read(authControllerProvider), state.matchedLocation),
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(
        path: '/recuperar-contrasena',
        builder: (_, _) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/conjuntos',
        builder: (_, _) => const SelectTenantScreen(),
      ),
      GoRoute(path: '/', builder: (_, _) => const HomeScreen()),
    ],
  );
});

/// The illustrated splash (branding/splash) while the stored session is
/// checked, or when there is no connection
class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(authControllerProvider);
    return Scaffold(
      backgroundColor: Brand.cream,
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/images/splash.webp',
            fit: BoxFit.cover,
            alignment: Alignment.topCenter,
            semanticLabel: 'AptoPH. Tu conjunto, más cerca',
          ),
          SafeArea(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: state is AuthOffline
                    ? Card(
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.cloud_off,
                                size: 36,
                                color: Brand.navy,
                              ),
                              const SizedBox(height: 12),
                              Text(state.message, textAlign: TextAlign.center),
                              const SizedBox(height: 16),
                              FilledButton(
                                onPressed: ref
                                    .read(authControllerProvider.notifier)
                                    .retry,
                                child: const Text('Reintentar'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : const SizedBox.square(
                        dimension: 28,
                        child: CircularProgressIndicator(
                          strokeWidth: 3,
                          color: Colors.white,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
