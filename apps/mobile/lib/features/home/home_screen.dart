import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/theme.dart';
import '../auth/auth_controller.dart';

/// The modules of the residents' portal, with the illustrated icons of
/// branding/icons. They open as each phase arrives (docs/mobile.md).
const _modules = [
  ('Estado de cuenta', 'estado-de-cuenta'),
  ('Reportar pago', 'pagos'),
  ('Reservas', 'reservas'),
  ('Visitas', 'visitantes'),
  ('Paquetes', 'paquetes'),
  ('Comunicados', 'comunicados'),
  ('PQRS', 'pqrs'),
  ('Parqueaderos', 'parqueadero'),
  ('Encuestas', 'asambleas'),
  ('Documentos', 'documentos'),
  ('Mi unidad', 'unidades'),
  ('Notificaciones', 'notificaciones'),
];

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(authControllerProvider);
    if (state is! SignedIn) return const SizedBox.shrink();
    final controller = ref.read(authControllerProvider.notifier);
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Image.asset(
          dark ? 'assets/images/logo-white.png' : 'assets/images/logo.png',
          height: 26,
          semanticLabel: 'AptoPH',
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Más opciones',
            icon: CircleAvatar(
              radius: 17,
              backgroundColor: Brand.mint.withValues(alpha: 0.2),
              child: Text(
                state.user.initials,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: dark ? Brand.mint : Brand.mintText,
                ),
              ),
            ),
            onSelected: (value) {
              if (value == 'tenant') controller.selectTenant(null);
              if (value == 'logout') controller.logout();
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                enabled: false,
                child: Text(state.user.email, style: theme.textTheme.bodySmall),
              ),
              if (state.tenants.length > 1)
                const PopupMenuItem(
                  value: 'tenant',
                  child: Text('Cambiar de conjunto'),
                ),
              const PopupMenuItem(
                value: 'logout',
                child: Text('Cerrar sesión'),
              ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Text(
            'Hola, ${state.user.fullName.split(' ').first}',
            style: theme.textTheme.headlineSmall,
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(
                Icons.apartment,
                size: 18,
                color: dark ? Colors.white70 : Brand.slate,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  state.tenant?.name ?? '',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: dark ? Colors.white70 : Brand.slate,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Row(
              children: [
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 8, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Bienvenido a la app de tu conjunto',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontFamily: 'PlusJakartaSans',
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Estamos habilitando cada sección. Mientras tanto, '
                          'todo está disponible en el portal web.',
                          style: theme.textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ),
                ExcludeSemantics(
                  child: Image.asset(
                    'assets/images/bienvenida.webp',
                    width: 120,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text('Tu conjunto', style: theme.textTheme.titleLarge),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.92,
            children: [
              for (final (label, icon) in _modules)
                _ModuleTile(label: label, icon: icon),
            ],
          ),
        ],
      ),
    );
  }
}

class _ModuleTile extends StatelessWidget {
  const _ModuleTile({required this.label, required this.icon});

  final String label;
  final String icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(content: Text('$label llega pronto a la app.')),
          ),
        child: Stack(
          children: [
            Center(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Image.asset(
                      'assets/images/icons/$icon.png',
                      width: 48,
                      height: 48,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      label,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Brand.coral.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Pronto',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFFB5431F),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
