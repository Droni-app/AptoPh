import 'package:aptoph_mobile/features/auth/auth_controller.dart';
import 'package:aptoph_mobile/features/auth/models.dart';
import 'package:aptoph_mobile/router.dart';
import 'package:flutter_test/flutter_test.dart';

const _user = UserProfile(
  id: 'u1',
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  initials: 'AP',
);
const _tenants = [
  TenantSummary(id: 't1', name: 'Altos del Parque', roles: ['resident']),
  TenantSummary(id: 't2', name: 'Reservas del Bosque', roles: ['resident']),
];

void main() {
  test('while the session is checked everything waits on the splash', () {
    expect(redirectFor(const AuthLoading(), '/'), '/splash');
    expect(redirectFor(const AuthOffline('sin red'), '/login'), '/splash');
    expect(redirectFor(const AuthLoading(), '/splash'), isNull);
  });

  test('without a session only the login and the password recovery open', () {
    expect(redirectFor(const SignedOut(), '/'), '/login');
    expect(redirectFor(const SignedOut(), '/splash'), '/login');
    expect(redirectFor(const SignedOut(), '/login'), isNull);
    expect(redirectFor(const SignedOut(), '/recuperar-contrasena'), isNull);
  });

  test('signed in, the conjunto comes first', () {
    const choosing = SignedIn(user: _user, tenants: _tenants);
    expect(redirectFor(choosing, '/'), '/conjuntos');
    expect(redirectFor(choosing, '/conjuntos'), isNull);

    const inside = SignedIn(user: _user, tenants: _tenants, tenantId: 't1');
    expect(redirectFor(inside, '/login'), '/');
    expect(redirectFor(inside, '/conjuntos'), '/');
    expect(redirectFor(inside, '/'), isNull);
    expect(inside.tenant?.name, 'Altos del Parque');
  });
}
