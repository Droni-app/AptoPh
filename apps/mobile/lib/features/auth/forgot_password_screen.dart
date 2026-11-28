import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/api/api_exception.dart';
import 'auth_controller.dart';
import 'widgets.dart';

/// Sends the link to choose a new password (it opens in the residents' portal)
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  bool _loading = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).forgotPassword(_email.text.trim());
      setState(() => _sent = true);
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_sent) {
      return AuthScaffold(
        showBack: true,
        title: 'Revisa tu correo',
        subtitle:
            'Si ${_email.text.trim()} tiene una cuenta en AptoPH, te enviamos un enlace '
            'para crear una contraseña nueva. Vence en una hora.',
        children: [
          FilledButton(
            onPressed: () => Navigator.of(context).maybePop(),
            child: const Text('Volver a iniciar sesión'),
          ),
        ],
      );
    }
    return AuthScaffold(
      showBack: true,
      title: 'Recupera tu contraseña',
      subtitle: 'Te enviamos un enlace a tu correo para crear una nueva.',
      children: [
        if (_error != null) ErrorBanner(_error!),
        Form(
          key: _form,
          child: TextFormField(
            controller: _email,
            enabled: !_loading,
            autofocus: true,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            onFieldSubmitted: (_) => _submit(),
            decoration: const InputDecoration(labelText: 'Correo electrónico'),
            validator: (value) => value == null || !value.contains('@')
                ? 'Escribe tu correo'
                : null,
          ),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _loading ? null : _submit,
          child: _loading
              ? const SizedBox.square(
                  dimension: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.5),
                )
              : const Text('Enviar enlace'),
        ),
      ],
    );
  }
}
