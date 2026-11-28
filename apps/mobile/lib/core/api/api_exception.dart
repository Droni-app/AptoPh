import 'package:dio/dio.dart';

/// An API error with the message to show (the API already writes it in Spanish).
class ApiException implements Exception {
  ApiException(this.message, {this.status, this.fields = const {}});

  final String message;
  final int? status;

  /// Field → message of a 422 validation error
  final Map<String, String> fields;

  bool get isUnauthorized => status == 401;

  factory ApiException.from(Object error) {
    if (error is ApiException) return error;
    if (error is! DioException) {
      return ApiException('Ocurrió un error inesperado. Inténtalo de nuevo.');
    }
    final response = error.response;
    if (response == null) {
      return ApiException(
        'No pudimos conectarnos con AptoPH. Revisa tu conexión a internet.',
      );
    }
    final fields = <String, String>{};
    String? message;
    final body = response.data;
    if (body is Map && body['errors'] is List) {
      for (final item in body['errors'] as List) {
        if (item is! Map) continue;
        final text = item['message']?.toString();
        message ??= text;
        final field = item['field']?.toString();
        if (field != null && text != null) {
          fields.putIfAbsent(field, () => text);
        }
      }
    } else if (body is Map && body['message'] is String) {
      message = body['message'] as String;
    }
    return ApiException(
      message ?? _fallback(response.statusCode),
      status: response.statusCode,
      fields: fields,
    );
  }

  static String _fallback(int? status) => switch (status) {
    401 => 'Tu sesión terminó. Vuelve a iniciar sesión.',
    403 => 'No tienes permiso para hacer esto.',
    404 => 'No encontramos lo que buscas.',
    429 => 'Demasiados intentos. Espera unos minutos.',
    final code? when code >= 500 =>
      'AptoPH no está disponible en este momento. Inténtalo más tarde.',
    _ => 'Ocurrió un error inesperado. Inténtalo de nuevo.',
  };

  @override
  String toString() => message;
}
