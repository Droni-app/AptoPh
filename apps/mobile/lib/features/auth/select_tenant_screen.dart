import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import 'auth_controller.dart';
import 'widgets.dart';

/// Which conjunto to enter (only when the person lives in more than one)
class SelectTenantScreen extends ConsumerWidget {
  const SelectTenantScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(authControllerProvider);
    if (state is! SignedIn) return const SizedBox.shrink();
    final controller = ref.read(authControllerProvider.notifier);

    if (state.tenants.isEmpty) {
      return AuthScaffold(
        title: 'Aún no tienes un conjunto',
        subtitle:
            'Tu cuenta no está vinculada como residente o propietario en ningún conjunto. '
            'Pide a la administración que te invite con ${state.user.email}.',
        children: [
          FilledButton(
            onPressed: controller.refresh,
            child: const Text('Volver a revisar'),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: controller.logout,
            child: const Text('Cerrar sesión'),
          ),
        ],
      );
    }

    return AuthScaffold(
      title: 'Elige tu conjunto',
      subtitle: 'Puedes cambiarlo después desde tu perfil.',
      children: [
        for (final tenant in state.tenants)
          Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 6,
              ),
              leading: const CircleAvatar(child: Icon(Icons.apartment)),
              title: Text(
                tenant.name,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              subtitle: tenant.city == null ? null : Text(tenant.city!),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => controller.selectTenant(tenant.id),
            ),
          ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: controller.logout,
          child: const Text('Cerrar sesión'),
        ),
      ],
    );
  }
}
