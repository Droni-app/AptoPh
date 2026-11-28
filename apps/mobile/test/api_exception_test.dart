import 'package:aptoph_mobile/core/api/api_exception.dart';
import 'package:aptoph_mobile/features/auth/models.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

DioException _error(int status, Object? body) {
  final options = RequestOptions(path: '/auth/login');
  return DioException(
    requestOptions: options,
    response: Response(requestOptions: options, statusCode: status, data: body),
  );
}

void main() {
  test('uses the message and the fields the API sends', () {
    final error = ApiException.from(
      _error(422, {
        'errors': [
          {
            'field': 'email',
            'message': 'El correo no es válido',
            'rule': 'email',
          },
        ],
      }),
    );
    expect(error.status, 422);
    expect(error.message, 'El correo no es válido');
    expect(error.fields, {'email': 'El correo no es válido'});
  });

  test(
    'falls back to a message by status, and explains a missing connection',
    () {
      expect(ApiException.from(_error(401, null)).isUnauthorized, isTrue);
      expect(
        ApiException.from(_error(503, '<html>')).message,
        contains('no está disponible'),
      );
      final offline = ApiException.from(
        DioException(
          requestOptions: RequestOptions(path: '/'),
          type: DioExceptionType.connectionError,
        ),
      );
      expect(offline.message, contains('conexión'));
    },
  );

  test('reads the session of the API', () {
    final session = AuthSession.fromJson({
      'token': 'oat_abc',
      'type': 'bearer',
      'expiresAt': '2026-12-28T10:00:00.000Z',
      'user': {
        'id': 'u1',
        'fullName': 'Ana Pérez',
        'email': 'ana@example.com',
        'initials': 'AP',
        'phone': null,
        'emailVerifiedAt': null,
      },
    });
    expect(session.token, 'oat_abc');
    expect(session.expiresAt, DateTime.utc(2026, 12, 28, 10));
    expect(session.user.fullName, 'Ana Pérez');
    expect(
      TenantSummary.fromJson({
        'id': 't1',
        'name': 'Conjunto',
        'city': null,
        'roles': ['council_member'],
      }).isResident,
      isFalse,
    );
  });
}
