# ApartaDock Mobile (Flutter)

App móvil para residentes. Aún sin generar: Flutter no estaba instalado cuando se creó el monorepo.

Para generarla (desde la raíz del repo):

```bash
flutter create --org co.apartadock --project-name apartadock_mobile --platforms android,ios apps/mobile
```

Notas:
- No forma parte del workspace de pnpm ni de Turborepo; se gestiona con `flutter`/`dart`.
- API local: `http://10.0.2.2:3333` desde el emulador de Android, `http://localhost:3333` desde el simulador de iOS.
