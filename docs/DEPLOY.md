# Cómo publicar AyudaDev en dev.carlosnavarro.site

El sitio es estático (Astro) más tres archivos PHP para el boletín. Se publica por FTPS desde GitHub Actions al hosting cPanel de InMotion. Nada se sube solo: tú lanzas el workflow y confirmas.

## 1. Preparar cPanel (una sola vez)

1. **Subdominio.** cPanel, Dominios, Crear un nuevo dominio: `dev.carlosnavarro.site`. Anota el *Document Root* (por ejemplo `/home/<usuario>/dev.carlosnavarro.site` o `/home/<usuario>/public_html/dev.carlosnavarro.site`).
2. **SSL.** cPanel, SSL/TLS Status: ejecuta AutoSSL para el subdominio y espera el candado.
3. **PHP.** cPanel, MultiPHP Manager: asigna PHP 8.1 o superior al subdominio (los endpoints usan `never`, `str_contains` y `random_bytes`).
4. **Cuenta FTP.** cPanel, Cuentas FTP: crea `deploy-ayudadev` con *Directory* exactamente igual al Document Root del subdominio. Guarda la contraseña en un gestor.
5. **Correo saliente.** cPanel, Cuentas de correo: crea `no-reply@carlosnavarro.site`. Luego en Email Deliverability revisa que SPF y DKIM de `carlosnavarro.site` estén en verde; si no, pulsa "Reparar".
6. **Respaldo.** Antes del primer `publicar`, descarga un respaldo de la carpeta desde el Administrador de archivos (estará casi vacía, pero es el hábito).

## 2. Preparar GitHub (una sola vez)

1. Crea el repositorio `CharlyDesigner/ayudadev` (público, sin README) en github.com.
2. En tu máquina, dentro de la carpeta del proyecto:

   ```bash
   git remote add origin https://github.com/CharlyDesigner/ayudadev.git
   git push -u origin main
   ```

3. Settings, Secrets and variables, Actions:
   - **Secrets:** `FTP_SERVER` (por ejemplo `ftp.carlosnavarro.site` o el host que te da cPanel), `FTP_USERNAME` (`deploy-ayudadev@carlosnavarro.site` o como lo muestre cPanel), `FTP_PASSWORD`.
   - **Variables:** `FTP_PORT` = `21`, `FTP_REMOTE_DIR` = `./` (si la cuenta FTP ya aterriza en el Document Root). `FTP_SENTINEL`: déjalo vacío si el Document Root tiene `cgi-bin/`; si no, sube un archivo vacío llamado `.ayudadev-root` a esa carpeta y pon `FTP_SENTINEL` = `.ayudadev-root`.
   - **Variables de apoyo:** `PUBLIC_STRIPE_PAYMENT_LINK` y `PUBLIC_GITHUB_SPONSORS` cuando los tengas (ver sección 4).
4. Settings, General, Features: activa Issues (las plantillas ya están en `.github/ISSUE_TEMPLATE`).

## 3. Publicar

1. Pestaña **Actions**, workflow **Publicar en dev.carlosnavarro.site**, botón *Run workflow*.
2. Primera vez: modo `prueba`. Revisa en el resumen que la carpeta destino sea la correcta y qué archivos subiría.
3. Si todo cuadra: vuelve a ejecutar con modo `publicar` y escribe `publicar` en la confirmación.
4. Abre https://dev.carlosnavarro.site y revisa el checklist de la sección 5.

El workflow `CI` corre solo en cada push: tipos, tests, build y revisión del sitio estático. Si está en rojo, no publiques.

## 4. Donaciones

- **Stripe.** Dashboard, Payment Links, crear enlace: producto "Donación a AyudaDev", precio "El cliente elige el importe", moneda MXN, sin envío. Copia la URL (`https://donate.stripe.com/...` o `https://buy.stripe.com/...`) a la variable `PUBLIC_GITHUB_SPONSORS`... no: a `PUBLIC_STRIPE_PAYMENT_LINK`. Vuelve a publicar.
- **GitHub Sponsors.** github.com/sponsors, únete con la cuenta CharlyDesigner, completa el perfil y, cuando esté aprobado, pon `https://github.com/sponsors/CharlyDesigner` en `PUBLIC_GITHUB_SPONSORS`. Vuelve a publicar.

Mientras las variables estén vacías, la página /apoya/ muestra `[PENDIENTE]` y el resto del sitio funciona igual.

## 5. Checklist después de publicar

- [ ] Portada, /biblioteca/, una guía, /ia/prompts/ y /404 cargan con HTTPS y sin errores en consola.
- [ ] Cambiar tema, favoritos y Ctrl + K funcionan.
- [ ] `https://dev.carlosnavarro.site/api/suscribir.php` por GET responde 403.
- [ ] `https://dev.carlosnavarro.site/api/_guard.php` responde 403.
- [ ] Suscribirte con tu correo desde /newsletter/: llega el correo de confirmación, el enlace confirma y aterriza en /newsletter/confirmado/.
- [ ] El cuarto intento de suscripción en 15 minutos desde la misma IP responde "demasiados intentos".
- [ ] En el servidor existe `~/ayudadev-data/.suscriptores.jsonl` (o `api/_data/.suscriptores.jsonl` como respaldo) y no se puede abrir por web.
- [ ] Google Search Console: añade la propiedad y envía `https://dev.carlosnavarro.site/sitemap-index.xml`.

## 6. Los suscriptores

Viven en `~/ayudadev-data/.suscriptores.jsonl`, una línea JSON por evento (`pendiente`, `confirmado`, `baja`). El último registro de cada correo es el vigente. Para exportarlos, descarga el archivo por el Administrador de archivos y filtra los `confirmado` sin `baja` posterior. Para enviar un boletín usa tu cliente de correo o un servicio con la lista exportada; incluye siempre el enlace de baja `https://dev.carlosnavarro.site/api/baja.php?e=<correo en base64url>&t=<hmac>` (el token se calcula con el secreto de `~/ayudadev-data/.secret`; hay un ejemplo en `_newsletter.php`, función `ad_token`).

## 7. Respaldo manual

Si GitHub no está disponible: `npm run build` y luego `.\scripts\Package-CPanel.ps1`. Sube el ZIP de `entregas/` al Document Root y extráelo ahí.

## 8. Panel de administración

Vive en `https://dev.carlosnavarro.site/api/panel/`. Es de solo lectura y muestra suscriptores con gráficas, fallos de correo, bloqueos por exceso de intentos y el uso del servidor MCP (solo qué herramienta se usó, nunca lo que se preguntó). Tiene doble candado: Directory Privacy de cPanel y una contraseña propia.

Configúralo una sola vez, en este orden:

1. **Publica el sitio** para que la carpeta `api/panel/` exista en el servidor.
2. **Primer candado.** cPanel, Privacidad de directorios: elige `dev.carlosnavarro.site/api/panel`, marca "Proteger este directorio con contraseña", ponle un nombre y crea un usuario. El despliegue nunca toca el `.htaccess` que cPanel crea ahí.
3. **Permiso de configuración.** En el Administrador de archivos de cPanel, con "Mostrar archivos ocultos" activado, entra a `ayudadev-data/` (en tu carpeta personal, no en la del sitio) y crea un archivo vacío llamado `.panel-activar`. Mientras ese archivo no exista y no haya contraseña, el panel responde 404.
4. **Segundo candado.** Abre `https://dev.carlosnavarro.site/api/panel/`, entra con el usuario del paso 2 y crea la contraseña del panel (mínimo 12 caracteres). Se guarda cifrada en `ayudadev-data/.panel-hash` y el archivo `.panel-activar` se borra solo.

Después de eso entras con las dos contraseñas. La sesión se cierra tras 30 minutos sin actividad. Si olvidas la contraseña del panel, borra `.panel-hash` y vuelve a crear `.panel-activar`.

Los registros del panel (`.mcp.jsonl`, `.bloqueos.jsonl`) no guardan IP ni texto de consultas y se archivan solos al pasar de 1 MB. Los bloquea `.htaccess` por ser archivos ocultos.

## 9. Cuentas de usuario (opcional)

Las cuentas son opcionales: sin esta configuración el sitio funciona igual y `/cuenta/` avisa que no están disponibles. El diseño, los datos que se guardan y los pasos de Carlos están en `docs/CUENTAS.md`. Resumen:

- Requieren `pdo_sqlite` y `openssl` en el PHP del subdominio (cPanel, MultiPHP Extensions). Los datos viven en `~/ayudadev-data/cuentas.sqlite`; respáldalo junto con `.cuentas-clave`.
- Para entrar con GitHub: crea la OAuth App (callback `https://dev.carlosnavarro.site/api/cuenta-github.php`) y guarda `client_id` y `client_secret` en `~/ayudadev-data/.cuentas.json`. Nunca en el repositorio.
- Pruebas de la API: `PHP_WASM_DIR=<carpeta> npm run probar:cuentas` (PHP en WebAssembly, ver `docs/CUENTAS.md`).

## Problemas conocidos

- **El correo de confirmación llega a spam.** Revisa SPF y DKIM en Email Deliverability y que el buzón `no-reply@carlosnavarro.site` exista.
- **El workflow dice que la carpeta destino no tiene cgi-bin.** Define `FTP_SENTINEL` como se explica arriba o corrige el Directory de la cuenta FTP.
- **PHP marca error 500.** Comprueba la versión de PHP del subdominio en MultiPHP Manager (8.1 o superior).
