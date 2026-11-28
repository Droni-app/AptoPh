import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/api/api_exception.dart';
import 'auth_controller.dart';
import 'google_auth.dart';
import 'widgets.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  bool _googleLoading = false;
  bool _obscure = true;
  String? _error;
  Map<String, String> _fields = const {};

  @override
  void initState() {
    super.initState();
    final state = ref.read(authControllerProvider);
    if (state is SignedOut) _error = state.message;
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
      _fields = const {};
    });
    try {
      await ref
          .read(authControllerProvider.notifier)
          .login(_email.text.trim(), _password.text);
    } on ApiException catch (error) {
      setState(() {
        _fields = error.fields;
        _error = error.fields.isEmpty ? error.message : null;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _google() async {
    setState(() {
      _googleLoading = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).loginWithGoogle();
    } on GoogleSignInCanceled {
      // The person closed the Google sheet
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } catch (_) {
      setState(
        () => _error =
            'Google no pudo completar el inicio de sesión. Inténtalo de nuevo.',
      );
    } finally {
      if (mounted) setState(() => _googleLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final busy = _loading || _googleLoading;
    final theme = Theme.of(context);
    return AuthScaffold(
      title: 'Hola de nuevo',
      subtitle:
          'Entra a tu conjunto: estado de cuenta, reservas, visitas y más.',
      children: [
        if (_error != null) ErrorBanner(_error!),
        if (ref.watch(googleAvailableProvider).value ?? false) ...[
          OutlinedButton.icon(
            onPressed: busy ? null : _google,
            icon: _googleLoading
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Image.asset(
                    'assets/images/google.png',
                    width: 20,
                    height: 20,
                  ),
            label: const Text('Continuar con Google'),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Row(
              children: [
                const Expanded(child: Divider()),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    'o con tu correo',
                    style: theme.textTheme.bodySmall,
                  ),
                ),
                const Expanded(child: Divider()),
              ],
            ),
          ),
        ],
        Form(
          key: _form,
          child: AutofillGroup(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _email,
                  enabled: !busy,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [
                    AutofillHints.email,
                    AutofillHints.username,
                  ],
                  textInputAction: TextInputAction.next,
                  decoration: InputDecoration(
                    labelText: 'Correo electrónico',
                    errorText: _fields['email'],
                  ),
                  validator: (value) => value == null || !value.contains('@')
                      ? 'Escribe tu correo'
                      : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _password,
                  enabled: !busy,
                  obscureText: _obscure,
                  autofillHints: const [AutofillHints.password],
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _submit(),
                  decoration: InputDecoration(
                    labelText: 'Contraseña',
                    errorText: _fields['password'],
                    suffixIcon: IconButton(
                      tooltip: _obscure
                          ? 'Mostrar contraseña'
                          : 'Ocultar contraseña',
                      icon: Icon(
                        _obscure ? Icons.visibility : Icons.visibility_off,
                      ),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: (value) => value == null || value.isEmpty
                      ? 'Escribe tu contraseña'
                      : null,
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: busy
                        ? null
                        : () => context.push('/recuperar-contrasena'),
                    child: const Text('¿Olvidaste tu contraseña?'),
                  ),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: busy ? null : _submit,
                  child: _loading
                      ? const SizedBox.square(
                          dimension: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        )
                      : const Text('Iniciar sesión'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 28),
        Text(
          '¿Aún no tienes cuenta? La administración de tu conjunto te envía una '
          'invitación a tu correo.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium,
        ),
      ],
    );
  }
}
