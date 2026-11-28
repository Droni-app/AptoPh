# AptoPH Mobile (Flutter)

App para residentes y propietarios: los mismos módulos del portal web (`apps/web`) con
notificaciones push. Plan de trabajo, arquitectura y configuración de Google, Firebase, Apple y
Google Play en [docs/mobile.md](../../docs/mobile.md).

No forma parte del workspace de pnpm ni de Turborepo: se gestiona con `flutter` y `dart`.

```bash
cd apps/mobile
flutter pub get
flutter run                          # API local: http://10.0.2.2:3333 (Android) · http://localhost:3333 (iOS)
flutter run --dart-define=API_URL=https://api.aptoph.com
flutter analyze && flutter test
```

Variables de compilación (`--dart-define`):

| Variable | Para qué |
| --- | --- |
| `API_URL` | API de AptoPH (por defecto, la local) |
| `GOOGLE_IOS_CLIENT_ID` | Cliente OAuth de iOS (Google Cloud); en Android no hace falta |
| `RESIDENTS_URL` | Portal web, para los enlaces de los correos (por defecto `https://web.aptoph.com`) |

En un teléfono físico, la API debe escuchar en la red (`HOST=0.0.0.0` en `apps/api/.env`) y la app
debe apuntar a la IP del computador: `--dart-define=API_URL=http://192.168.x.x:3333`.

Identificador de la app: `co.aptoph.app` (Android `applicationId` e iOS bundle id).
