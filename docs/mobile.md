# App móvil (Flutter)

App de AptoPH para **residentes y propietarios** (rol `resident`), con los mismos módulos del
portal web y notificaciones push. Usa la misma API y los mismos access tokens: `device = "App
móvil"`, visible en "Mi perfil › Sesiones abiertas". El personal del conjunto sigue en el
backoffice.

- Código: `apps/mobile`. Identificador: **`co.aptoph.app`** (Android e iOS).
- Flutter 3.50 (Material en el paquete `material_ui`), Dart 3.14.
- Estado: `flutter_riverpod`. Navegación: `go_router`. HTTP: `dio`. Sesión:
  `flutter_secure_storage` (Keychain / Keystore). Google: `google_sign_in` 7 (Credential Manager en
  Android).

## Arquitectura

```
lib/
  main.dart, router.dart        App, tema y redirecciones según la sesión
  core/
    config.dart                 --dart-define (API_URL, GOOGLE_IOS_CLIENT_ID…)
    theme.dart                  Colores de branding/tokens.css
    session_store.dart          Token y conjunto activo en almacenamiento seguro
    api/api_client.dart         Bearer + X-Tenant-Id; un 401 cierra la sesión
    api/api_exception.dart      Mensajes de la API ({ errors: [{ field, message }] })
  features/<módulo>/            models, repository, controller (Riverpod), screens
```

Reglas:
- Los modelos siguen los contratos de `packages/shared` (mismos nombres de campos). Si un contrato
  cambia en la API, se cambia también aquí.
- Los textos de la interfaz van en español y los comentarios del código en inglés, como en el resto
  del monorepo.
- Cada pantalla con datos muestra sus estados de carga, vacío, error con "Reintentar" y sin conexión.
- Dinero: los valores llegan como texto (`"123450.00"`) y se formatean en pesos, sin `double` para
  cálculos.

## Plan de trabajo

| Fase | Contenido | Estado |
| --- | --- | --- |
| 0. Base | Proyecto, tema, cliente de la API, sesión segura, navegación, pruebas | ✅ |
| 0b. Marca | Ícono (adaptativo y temático en Android 13+), splash nativo claro y oscuro, splash ilustrado, fuentes Plus Jakarta Sans e Inter, encabezado ilustrado del login, íconos de módulos | ✅ |
| 1. Autenticación | Correo y contraseña, Google (Android e iOS), recuperar contraseña, elegir conjunto, cerrar sesión, sesión vencida, sin conexión | ✅ (falta probar Google en dispositivos con las credenciales) |
| 1b. Autenticación (resto) | Sign in with Apple (obligatorio en iOS si hay Google), enlaces profundos (invitación, restablecer contraseña, verificar correo) con App Links / Universal Links, aceptar invitación en la app, ícono y splash | ⬜ |
| 2. Inicio y navegación | Barra inferior (Inicio, Mi unidad, Comunicados, PQRS, Más), inicio con saldo y avisos (`ResidentHome`), cambiar de conjunto | ⬜ |
| 3. Mi unidad y pagos | Estado de cuenta, recibos, reportar pago con foto del comprobante, hogar, vehículos, mascotas | ⬜ |
| 4. Comunicados y push | Lista y detalle con adjuntos, campana de notificaciones, FCM (permiso, registro del token, abrir la pantalla del aviso), preferencias | ⬜ |
| 5. PQRS | Crear con fotos, seguimiento y comentarios | ⬜ |
| 6. Reservas | Zonas comunes, disponibilidad, cotización, pago o depósito, cancelación | ⬜ |
| 7. Portería y parqueaderos | Visitas (preautorizar), paquetes, parqueadero de visitantes, solicitudes y sorteo de parqueaderos | ⬜ |
| 8. Encuestas y documentos | Votar por unidad, resultados, documentos con visor de PDF | ⬜ |
| 9. Perfil | Datos, contraseña, sesiones abiertas, eliminar la cuenta (exigido por App Store y Google Play) | ⬜ |
| 10. Publicación | Entornos dev y prod, firma, CI (Codemagic o GitHub Actions con macOS), pruebas internas en Play y TestFlight, fichas de las tiendas, política de privacidad y formulario de seguridad de datos | ⬜ |

Las fases 2 a 9 siguen el orden del portal web (`apps/web/src/views`). Cada una reutiliza los
endpoints `resident_*` que ya existen.

## Marca

Todo sale de `branding/`:

- **Ícono:** `assets/branding/icon*.png`, a partir de `branding/app-icon`. El monocromo (ícono
  temático de Android 13+) se deriva del frente adaptativo. Para regenerarlo:
  `dart run flutter_launcher_icons`, configurado en `flutter_launcher_icons.yaml`.
- **Splash nativo:** símbolo sobre crema, o sobre azul profundo en modo oscuro (`splash-icon-dark.png`
  es el símbolo con el edificio en blanco). Para regenerarlo:
  `dart run flutter_native_splash:create`, configurado en `flutter_native_splash.yaml`. Después
  sigue el splash ilustrado (`assets/images/splash.webp`) mientras se revisa la sesión, al menos
  1,4 s.
- **Fuentes:** pesos estáticos de las fuentes variables (`assets/fonts`, licencia OFL): Inter
  para el texto y Plus Jakarta Sans para los títulos.
- **Imágenes:** `hero.webp` (encabezado del login), `bienvenida.webp`, `icons/*.png` (íconos de
  módulos a 128 px). Están en WebP para que el APK pese menos.

## Compilar para probar en un teléfono

```bash
cd apps/mobile
flutter build apk --release --dart-define=API_URL=https://api.aptoph.com
# build/app/outputs/flutter-apk/app-release.apk  (universal, ~53 MB)
flutter build apk --release --split-per-abi --dart-define=API_URL=https://api.aptoph.com
# app-arm64-v8a-release.apk (~18 MB) para casi todos los teléfonos actuales
```

Mientras no exista la llave de subida, el APK de release se firma con la llave de depuración de
este computador. Instalarlo requiere permitir "fuentes desconocidas", y Google con esa firma
funciona si el cliente OAuth de Android tiene su SHA-1.

## Autenticación

| Acción | Endpoint |
| --- | --- |
| Correo y contraseña | `POST /api/v1/auth/login` `{ email, password, device }` |
| Google | `GET /api/v1/auth/providers` → `{ google, googleClientId }`; el SDK devuelve un ID token y la app llama `POST /api/v1/auth/google/token` `{ idToken, device }` |
| Recuperar contraseña | `POST /api/v1/auth/password/forgot` `{ email, app: 'web' }`; el enlace abre el portal web hasta que existan los enlaces profundos (fase 1b) |
| Perfil y conjuntos | `GET /api/v1/account/profile`, `GET /api/v1/account/tenants` (solo los que tienen rol `resident`) |
| Cerrar sesión | `POST /api/v1/auth/logout` y `GoogleSignIn.signOut()` |

Google en el móvil no usa redirección. El SDK nativo entrega un **ID token** firmado por Google y la
API verifica la firma con las llaves públicas de Google (`oauth2/v3/certs`, en caché según
`Cache-Control`). Acepta como audiencia el cliente web (`GOOGLE_CLIENT_ID`, el `serverClientId`
del SDK) y el cliente de iOS (`GOOGLE_IOS_CLIENT_ID`). Una cuenta de Google sin cuenta en AptoPH
recibe un `400` que le pide la invitación: la app no registra conjuntos.

## Qué configurar

### 1. Google Cloud: clientes OAuth (para "Continuar con Google")

En el mismo proyecto del cliente web que ya usa la API (APIs y servicios › Credenciales › Crear
credenciales › ID de cliente de OAuth):

1. **Android** (uno por cada llave que firma la app):
   - Nombre del paquete: `co.aptoph.app`.
   - SHA-1 de la llave de depuración de este computador:
     `6E:B7:CD:47:CC:16:D9:A4:E0:19:6C:21:30:4B:55:8F:6D:4E:EA:6D`. Se obtiene con
     `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`.
   - Después, otro cliente con el SHA-1 de la **llave de subida** y otro con el de la **firma de
     Google Play** (Play Console › Configuración › Integridad de la app).
   - El cliente de Android no se pone en el código: Google lo reconoce por el paquete y el SHA-1.
     El código solo usa el ID del cliente web, que la API entrega en `/auth/providers`.
2. **iOS**: ID del paquete `co.aptoph.app`. Del cliente creado sale el *ID de cliente* y el
   *esquema de URL invertido* (`com.googleusercontent.apps.…`):
   - En la API: `GOOGLE_IOS_CLIENT_ID=<id>`.
   - En la app: `--dart-define=GOOGLE_IOS_CLIENT_ID=<id>` y, en `ios/Runner/Info.plist`, la entrada
     `CFBundleURLTypes › CFBundleURLSchemes` con el esquema invertido.
3. **Pantalla de consentimiento** (Google Auth Platform › Desarrollo de la marca): nombre AptoPH,
   logo, correo de soporte, dominio autorizado `aptoph.com`, enlaces a la política de privacidad y
   a los términos. Publícala en **producción**: en modo de prueba solo entran los usuarios de
   prueba. Los alcances `openid`, `email` y `profile` no requieren verificación de Google.

### 2. Firebase (notificaciones push)

La API ya envía push por FCM HTTP v1 (`docs/notifications.md`). Firebase no hace falta para el
inicio de sesión con Google.

1. En [console.firebase.google.com](https://console.firebase.google.com) › Agregar proyecto ›
   **elige el proyecto de Google Cloud existente**, para que los clientes OAuth y Firebase queden
   juntos.
2. Agrega la app **Android** `co.aptoph.app` con los SHA-1 y SHA-256 de depuración (SHA-256:
   `68:08:1D:AA:36:7B:7B:66:43:F5:EB:B0:96:D1:98:E0:A5:CF:DD:41:12:FF:AF:ED:E7:41:BB:23:FB:07:BD:F9`)
   y, después, los de la llave de subida y de Play.
3. Agrega la app **iOS** `co.aptoph.app`, con el Team ID de Apple y, cuando exista, el ID de App
   Store.
4. Genera los archivos de configuración desde `apps/mobile`:
   ```bash
   npm i -g firebase-tools && firebase login
   dart pub global activate flutterfire_cli
   flutterfire configure --project=<id-del-proyecto> --platforms=android,ios \
     --android-package-name=co.aptoph.app --ios-bundle-id=co.aptoph.app
   ```
   Crea `lib/firebase_options.dart`, `android/app/google-services.json` e
   `ios/Runner/GoogleService-Info.plist`. Estos archivos no son secretos y van en git.
5. **Cuenta de servicio para la API:** Configuración del proyecto › Cuentas de servicio › Generar
   nueva clave privada. Del JSON salen `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL` y `FCM_PRIVATE_KEY`
   (con `\n`). Van en `apps/api/.env` y, cifradas, en DigitalOcean. El JSON no va en git.
6. **Push en iOS:** en Apple Developer › Keys, crea una llave con *Apple Push Notifications service
   (APNs)* y descarga el `.p8`. En Firebase › Configuración del proyecto › Cloud Messaging › app de
   iOS, súbela con su Key ID y el Team ID.
7. Opcional: Crashlytics (errores en producción) y App Distribution (versiones de prueba sin
   tiendas).

### 3. Apple

- **Apple Developer Program** (USD 99 al año), a nombre de la empresa (requiere número D-U-N-S)
  para que la tienda muestre "AptoPH" como vendedor.
- **Identificador** `co.aptoph.app` con las capacidades *Push Notifications*, *Sign in with Apple*
  y *Associated Domains*.
- **Sign in with Apple:** la guía 4.8 de la App Store exige ofrecerlo en iOS cuando la app tiene
  inicio de sesión con Google. Está en la fase 1b. La API verificará el token de Apple con las
  llaves de `appleid.apple.com`.
- **Compilar para iOS requiere macOS con Xcode.** Desde Linux sirve un Mac o un CI con macOS
  (Codemagic o GitHub Actions). Android se compila aquí.
- En App Store Connect: el registro de la app, la política de privacidad, las etiquetas de
  privacidad y una cuenta de prueba para la revisión de Apple.

### 4. Google Play

- **Cuenta de desarrollador** (USD 25, un solo pago), de organización.
- **Llave de subida:**
  `keytool -genkey -v -keystore ~/aptoph-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`.
  Guárdala fuera del repositorio con `android/key.properties` (ignorado en git) y un respaldo
  seguro. Sus SHA-1 y SHA-256 van en Google Cloud y en Firebase.
- **Firma de apps de Google Play** activada. Su SHA-1 y SHA-256 también van en Google Cloud y en
  Firebase.
- Formulario de **seguridad de datos**, política de privacidad, enlace para **eliminar la cuenta**
  y pruebas cerradas antes de producción (para cuentas nuevas Google exige 12 testers durante 14
  días).

### 5. Dominios (enlaces profundos, fase 1b)

Para que los enlaces de invitación y de contraseña abran la app en vez del navegador, el portal
web servirá:

- `https://web.aptoph.com/.well-known/assetlinks.json`: paquete `co.aptoph.app` y SHA-256 de la
  firma de Play.
- `https://web.aptoph.com/.well-known/apple-app-site-association`: `<TeamID>.co.aptoph.app` y las
  rutas `/invitacion`, `/restablecer-contrasena` y `/verificar-correo`.

### Resumen de variables

| Dónde | Variable |
| --- | --- |
| API | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (ya están), `GOOGLE_IOS_CLIENT_ID`, `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` |
| App (`--dart-define`) | `API_URL`, `GOOGLE_IOS_CLIENT_ID` |
| App (archivos) | `google-services.json`, `GoogleService-Info.plist`, `firebase_options.dart`, esquema de URL invertido en `Info.plist` |
