import 'package:dio/dio.dart';

import '../config.dart';
import 'api_exception.dart';

/// HTTP client of the AptoPH API: adds the access token and the active
/// conjunto (`X-Tenant-Id`) and reports an expired session.
class ApiClient {
  ApiClient({Dio? dio, String? baseUrl})
    : dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: '${baseUrl ?? AppConfig.apiUrl}/api/v1',
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 30),
              headers: {'Accept': 'application/json'},
            ),
          ) {
    this.dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = this.token;
          if (token != null && options.extra['auth'] != false) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          final tenantId = this.tenantId;
          if (tenantId != null && options.extra['tenant'] != false) {
            options.headers['X-Tenant-Id'] = tenantId;
          }
          handler.next(options);
        },
        onError: (error, handler) {
          if (error.response?.statusCode == 401 &&
              error.requestOptions.extra['auth'] != false) {
            onUnauthorized?.call();
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio dio;

  /// Set by the session: sent on every request
  String? token;
  String? tenantId;

  /// The token expired or was revoked: the app goes back to the login
  void Function()? onUnauthorized;

  /// `{ data: … }` of a GET
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? query,
    bool auth = true,
    bool tenant = true,
  }) => _send(
    () => dio.get<dynamic>(
      path,
      queryParameters: query,
      options: Options(extra: {'auth': auth, 'tenant': tenant}),
    ),
  );

  Future<T> post<T>(
    String path, {
    Object? body,
    bool auth = true,
    bool tenant = true,
  }) => _send(
    () => dio.post<dynamic>(
      path,
      data: body,
      options: Options(extra: {'auth': auth, 'tenant': tenant}),
    ),
  );

  Future<T> _send<T>(Future<Response<dynamic>> Function() request) async {
    try {
      final response = await request();
      final body = response.data;
      if (body is Map && body.containsKey('data')) return body['data'] as T;
      return body as T;
    } catch (error) {
      throw ApiException.from(error);
    }
  }
}
