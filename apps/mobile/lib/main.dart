import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import 'core/theme.dart';
import 'router.dart';

void main() {
  runApp(const ProviderScope(child: AptoPHApp()));
}

class AptoPHApp extends ConsumerWidget {
  const AptoPHApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'AptoPH',
      debugShowCheckedModeBanner: false,
      theme: appTheme(Brightness.light),
      darkTheme: appTheme(Brightness.dark),
      routerConfig: ref.watch(routerProvider),
    );
  }
}
