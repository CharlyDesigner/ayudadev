# Cuentas de usuario en AyudaDev: diseño

Estado: implementado y probado en local (sin publicar). Las cuentas son una mejora opcional: el sitio sigue funcionando igual sin cuenta y sin JavaScript. Lo que hoy vive en el navegador (progreso y favoritos) se queda ahí; la cuenta solo lo respalda y lo lleva a otros dispositivos.

## Qué se construye

- Registro e inicio de sesión con correo y contraseña.
- Inicio de sesión con GitHub (OAuth).
- Verificación de correo y recuperación de contraseña con enlace de un solo uso, como el doble opt-in del boletín.
- Doble factor opcional con app de autenticación (TOTP: Google Authenticator, Authy, 1Password, etc.) y códigos de respaldo.
- Sincronización de progreso y favoritos, sin perder lo que la persona ya tenga en su navegador.
- Exportar y borrar la cuenta desde la propia página.

## Decisiones técnicas

| Tema | Decisión | Por qué |
| --- | --- | --- |
| Dónde viven los usuarios | **SQLite** en `~/ayudadev-data/cuentas.sqlite` (fuera del web root; respaldo en `api/_data/`, denegado por `.htaccess`). Acceso con PDO. | El hosting ya tiene `pdo_sqlite` en la mayoría de los cPanel, no hay que crear base de datos ni usuarios, tiene transacciones (el JSONL del boletín no sirve para sesiones y sincronización concurrentes) y se puede probar sin servidor. MySQL de cPanel es la alternativa: pide crear base y usuario a mano. |
| Hash de contraseñas | `password_hash` con **argon2id** si el PHP del servidor lo trae; si no, **bcrypt costo 12**. La contraseña pasa antes por HMAC-SHA256 con una clave del servidor (pimienta), para que un volcado de la base sola no sirva y para saltar el límite de 72 bytes de bcrypt. `password_needs_rehash` migra hashes viejos al entrar. | Es lo recomendado por OWASP; el algoritmo queda guardado en el propio hash. |
| Contraseñas aceptadas | De 10 a 200 caracteres, sin reglas de composición. Se rechazan las muy comunes (lista corta embebida) y las que contienen el correo. | NIST 800-63B: longitud sobre complejidad. |
| Sesiones | Cookie `__Host-ayudadev_sesion`: aleatoria de 32 bytes, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, sin `Domain`. En la base se guarda solo su SHA-256. Se renueva al entrar, caduca por inactividad y tiene tope absoluto. Cambiar la contraseña cierra todas las demás sesiones. | Si la base se filtra, no sirve para secuestrar sesiones. |
| CSRF | Todas las acciones que cambian algo son `POST` con `Content-Type: application/json`, comprobación de `Origin` (`ad_is_same_origin`) y un token CSRF por sesión en cabecera. | Defensa en capas además de `SameSite`. |
| Registro | Doble opt-in **antes** de crear la cuenta: se pide solo el correo, llega un enlace de un solo uso (24 h) y ahí la persona elige su contraseña. No existen cuentas sin verificar. | Evita cuentas pre-secuestradas y basura en la base. Mismo patrón que el boletín. |
| Recuperación | Enlace de un solo uso (1 h) que lleva a una página donde se escribe la contraseña nueva. La respuesta es idéntica exista o no el correo (sin enumeración). No salta el doble factor. | El enlace no cambia nada con un simple GET (los escáneres de correo lo abren). |
| Tokens de correo | 32 bytes aleatorios; en la base solo el SHA-256; un solo uso. | Igual que las sesiones. |
| GitHub OAuth | Flujo web con `state` y PKCE (S256). Alcances `read:user` y `user:email`. Solo se acepta un correo **primario y verificado** de GitHub. No se guarda el token de acceso. Si ya existe una cuenta con ese correo verificado, se vincula; si no, se crea. | Un correo verificado por GitHub prueba control del buzón. |
| TOTP | RFC 6238: SHA-1, 6 dígitos, 30 s, tolerancia de un paso. El secreto se guarda cifrado (AES-256-GCM, clave derivada del secreto del servidor). Cada código se acepta una sola vez. Activar pide contraseña y un código de prueba. | Compatible con todas las apps. |
| Códigos de respaldo | 10 códigos aleatorios que se muestran **una sola vez**; se guarda su hash; cada uno sirve una vez. | Para perder el teléfono sin perder la cuenta. |
| Límites de intentos | Por IP, por correo y por cuenta, con `ad_rate_limited` (el mismo limitador del boletín). El inicio de sesión tarda lo mismo exista o no el correo. Fallos y cambios de seguridad quedan en un registro sin datos personales. | Frena fuerza bruta y enumeración. |
| Avisos de seguridad | Correo cuando se activa o desactiva el doble factor, se cambia la contraseña o se vincula GitHub. | Que la persona se entere si no fue ella. |
| API | `public/api/cuenta.php` (acciones por JSON) y `cuenta-github.php` (inicio y retorno de OAuth), más `_cuentas.php` y `_totp.php` (bibliotecas privadas; `.htaccess` bloquea todo `api/_*.php`). Los enlaces de los correos apuntan a páginas del sitio (`/cuenta/registro/?t=`, `/cuenta/clave/?t=`), no a PHP. | Superficie pequeña y fácil de endurecer. |
| Front | Páginas estáticas `/cuenta/`, `/cuenta/registro/`, `/cuenta/clave/` (noindex) y `src/scripts/cuenta.ts`. Sin cuenta o sin respaldo del servidor, todo queda oculto y el sitio funciona igual. | Mejora progresiva. |

## Qué se guarda y cómo se borra

| Dato | Para qué | Cómo se borra |
| --- | --- | --- |
| Correo, nombre opcional, fecha de alta | Identificar la cuenta | Al borrar la cuenta |
| Hash de la contraseña (si tiene) | Iniciar sesión | Al borrar la cuenta |
| Identificador y usuario de GitHub (si vinculó) | Iniciar sesión con GitHub | Al desvincular o borrar la cuenta |
| Secreto TOTP cifrado y hashes de códigos de respaldo | Doble factor | Al desactivarlo o borrar la cuenta |
| Hash de sesión, hash de IP y de navegador, fechas | Mantener la sesión y detectar accesos raros | Al salir, al caducar o al borrar la cuenta |
| Progreso y favoritos (lista de identificadores) | Sincronizar entre dispositivos | Al borrar la cuenta |
| Registro de eventos de seguridad (`.cuentas-eventos.jsonl`: tipo, fecha, hash de IP, id interno; sin correo) | Detectar abusos | Se rota solo al pasar de unos 512 KB; puedes borrarlo a mano |

- **Borrar cuenta:** formulario en `/cuenta/` que pide escribir BORRAR y confirmar con la contraseña (si no tiene, con un código del doble factor; si tampoco, escribiendo su correo). Elimina todo lo anterior en una transacción y manda un correo de aviso. La suscripción al boletín es independiente y se gestiona con su propio enlace de baja.
- **Exportar:** botón que descarga un JSON con todo lo que tenemos de la persona.
- **Solicitudes pendientes de registro** que nadie confirma se eliminan al caducar.

## Aviso de privacidad que hay que actualizar

`src/pages/privacidad.astro` hoy dice que no hay cookies de seguimiento y que favoritos y tema "nunca llegan a nuestro servidor". Con cuentas hay que:

1. Añadir el apartado de **cuentas** a "Qué datos recogemos" y "Para qué los usamos" (tabla de arriba).
2. Decir que se usa **una cookie de sesión** estrictamente necesaria, solo si la persona inicia sesión.
3. Aclarar que favoritos y progreso **solo** llegan al servidor si la persona tiene cuenta e inicia sesión.
4. Mencionar GitHub como proveedor de inicio de sesión (recibimos id, usuario y correo verificado; no pedimos acceso a repositorios).
5. Explicar cómo exportar y borrar la cuenta (derechos ARCO), y actualizar la fecha.

Esa edición ya está hecha en `src/pages/privacidad.astro` (fecha 14 de octubre de 2026). Léela antes de publicar: es texto legal y tuyo es el criterio final.

## Lo que tiene que hacer Carlos (pasos manuales)

1. **Confirmar el almacenamiento** (SQLite o MySQL; ver preguntas abajo).
2. **Crear la OAuth App de GitHub** en github.com, Settings, Developer settings, OAuth Apps, New OAuth App:
   - Application name: `AyudaDev`
   - Homepage URL: `https://dev.carlosnavarro.site`
   - Authorization callback URL: `https://dev.carlosnavarro.site/api/cuenta-github.php`
   - Después genera un *client secret* (se muestra una sola vez).
3. **Guardar los secretos en el servidor, nunca en el repositorio.** Crea el archivo `~/ayudadev-data/.cuentas.json` desde el Administrador de archivos de cPanel (permisos 600) con este formato:

   ```json
   { "github": { "client_id": "...", "client_secret": "..." } }
   ```

   Sin ese archivo el botón de GitHub se oculta y el resto de las cuentas funciona. La clave interna para pimienta, cifrado y firmas (`~/ayudadev-data/.cuentas-clave`) se genera sola la primera vez; respáldala junto con `cuentas.sqlite`, porque sin ella no se pueden abrir los secretos TOTP ni validar contraseñas.
4. En cPanel, MultiPHP Extensions, confirma que `pdo_sqlite` y `openssl` estén activos para el subdominio (suelen venir activos).
5. Revisar y aprobar el texto del aviso de privacidad.
6. Cuando pidas publicar: `verify` en verde, `deploy.yml` en modo `prueba`, luego `publicar`. Después prueba en vivo el checklist de abajo.

## Checklist en vivo (después de publicar)

- [ ] `GET /api/_cuentas.php`, `/api/_totp.php` y `/api/cuenta-github.php` por POST responden 403.
- [ ] `GET /api/cuenta.php?a=estado` responde `{"disponible":true,...}`.
- [ ] Registro con tu correo: llega el enlace, eliges contraseña y quedas dentro.
- [ ] Marcar un paso como completado en otro navegador con la misma cuenta lo refleja.
- [ ] Activar doble factor con tu app, salir y entrar con código; probar un código de respaldo.
- [ ] Entrar con GitHub.
- [ ] Recuperar contraseña desde el enlace del correo.
- [ ] Exportar y borrar una cuenta de prueba.

## Decisiones tomadas (con Carlos)

1. **Almacenamiento:** SQLite en `~/ayudadev-data/cuentas.sqlite`.
2. **Doble factor y GitHub:** si la cuenta tiene TOTP, también se pide al entrar con GitHub.
3. **Autenticador y códigos de respaldo perdidos:** sin recuperación automática. La persona escribe a `contacto@markhouseoficial.com` y se resuelve a mano (para quitar el doble factor a mano: abre `cuentas.sqlite` desde un cliente SQLite y pon `totp_activo = 0`, `totp_secreto = NULL` en esa fila de `usuarios`, y borra sus filas de `respaldo`; verifica antes que quien escribe controla el correo de la cuenta).
4. **Al cerrar sesión:** se quitan de ese navegador el progreso y los favoritos, pero solo si la última sincronización salió bien. Siguen en la cuenta.

## Cómo se probó

- `npm run verify` en verde (tipos, 8 archivos de pruebas de Vitest incluida `tests/cuenta.test.ts`, build y revisión del sitio estático).
- La API PHP se prueba con PHP 8.3 en WebAssembly, instalado fuera del repo:

  ```bash
  mkdir ~/php-wasm-pruebas && cd ~/php-wasm-pruebas && npm init -y && npm i @php-wasm/node @php-wasm/universal
  PHP_WASM_DIR=~/php-wasm-pruebas npm run probar:cuentas
  ```

  Son 137 comprobaciones: vectores de RFC 6238, registro, verificación, tokens de un solo uso, contraseñas, sesiones y cookies, CSRF y origen, límites de intentos, recuperación, doble factor con repetición de códigos y códigos de respaldo, sincronización con tope, exportar y borrar en cascada, y el flujo completo de GitHub con respuestas simuladas.
- La interfaz se probó en el navegador contra esa misma API: registro, creación de contraseña, unión de progreso local con la cuenta, sincronización de altas y bajas, segundo dispositivo, doble factor con QR, entrada con código de respaldo y cierre de sesión, a 320 px y en tema claro.
- **No probado:** el envío real de correo (`mail()` de cPanel), el intercambio real con GitHub, `argon2id` (el PHP de pruebas no lo trae y usa bcrypt; en el servidor se usa argon2id si existe) y el escaneo real del QR con una app.

## Fuera de alcance por ahora

Inicio de sesión con Google u otros proveedores, claves de acceso (passkeys), cambio de correo, lista de sesiones activas con cierre individual, avisos de inicio de sesión desde un dispositivo nuevo, y enganchar el registro de eventos al panel de administración (queda un punto único `ad_cuenta_evento()` para hacerlo).
