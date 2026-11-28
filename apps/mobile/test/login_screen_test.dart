import 'package:aptoph_mobile/core/session_store.dart';
import 'package:aptoph_mobile/features/auth/auth_controller.dart';
import 'package:aptoph_mobile/main.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// No Keychain/Keystore in widget tests: nothing stored
class _EmptyStore extends SessionStore {
  @override
  Future<StoredSession?> read() async => null;

  @override
  Future<String?> readTenant() async => null;

  @override
  Future<void> clear() async {}
}

void main() {
  testWidgets('without a stored session the login opens and validates', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [sessionStoreProvider.overrideWithValue(_EmptyStore())],
        child: const AptoPHApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Hola de nuevo'), findsOneWidget);
    // The test API is not reachable: no Google button
    expect(find.text('Continuar con Google'), findsNothing);

    await tester.tap(find.text('Iniciar sesión'));
    await tester.pump();
    expect(find.text('Escribe tu correo'), findsOneWidget);
    expect(find.text('Escribe tu contraseña'), findsOneWidget);

    await tester.tap(find.text('¿Olvidaste tu contraseña?'));
    await tester.pumpAndSettle();
    expect(find.text('Recupera tu contraseña'), findsOneWidget);
  });
}
