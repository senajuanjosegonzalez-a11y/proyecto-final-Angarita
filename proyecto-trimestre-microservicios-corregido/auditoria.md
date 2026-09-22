# Auditoría Técnica y de Seguridad

## 1. Información general

- **Fecha de primera auditoría:** 2026-09-21.
- **Fecha de segunda auditoría:** 2026-09-22.
- **Estado observado:** solo se observó Java escuchando en `localhost:8080`;
   no se observaron servicios activos en `3000`, `3001` ni `3002`.
- **Alcance:** código real, configuración, endpoints, routing, autenticación,
   autorización, persistencia, comunicación interna, flujo de compras,
   validaciones, errores, CORS, frontend, dependencias y pruebas visibles.
- **Regla de esta fase:** no se modificó código, no se actualizaron
   dependencias y no se ejecutaron correcciones automáticas.
- **Arquitectura analizada:** `frontend`, `api-gateway`, `ms-usuarios`,
   `ms-productos` y `ms-compras`, conservando Spring Boot para usuarios y
   Node.js para gateway, productos y compras.

Fecha de revision: 2026-09-21

## 2. Auditoría inicial

El contenido que sigue corresponde a la primera auditoría y se conserva como
antecedente histórico. Sus hallazgos se contrastan y consolidan más adelante
con la segunda auditoría; ningún hallazgo inicial se marca como resuelto.

---

## Alcance

Auditoria estatica y comprobacion local de procesos, puertos, configuracion,
endpoints, autenticacion, persistencia y flujo de compras. No se modifico
ningun archivo fuente del proyecto. Este informe es el unico archivo generado.

## Estado de los servidores

- `ms-usuarios`: proceso Java activo en `http://localhost:8080`.
- `api-gateway`: no se observo activo en `http://localhost:3000`.
- `ms-productos`: no se observo activo en `http://localhost:3001`.
- `ms-compras`: no se observo activo en `http://localhost:3002`.
- `frontend`: no tiene servidor propio; `frontend/index.html:160` consume el
  gateway en `http://localhost:3000`.

El puerto de usuarios esta definido en
`ms-usuarios/src/main/resources/application.properties:1`. La orden
`npm run dev` termino con codigo `1`, por lo que el proyecto no estaba
funcionando completo durante la revision.

## Hallazgos y errores

### 1. Dependencias Node ausentes

**Severidad: critica para el arranque.**

No existen `node_modules` dentro de `api-gateway`, `ms-productos` ni
`ms-compras`; solo existe el directorio raiz. Cada servicio declara sus
dependencias en su propio `package.json`, por lo que puede fallar con modulos
no encontrados y no llegar a escuchar en su puerto.

Archivos relacionados: `package.json:8-9`, `api-gateway/package.json`,
`ms-productos/package.json` y `ms-compras/package.json`.

**Recomendacion:** instalar las dependencias de cada servicio y verificar los
puertos antes de probar el frontend.

### 2. Secreto JWT predecible

**Severidad: critica de seguridad.**

El valor `miClaveSecretaSuperSegura` se usa como fallback en:

- `ms-usuarios/src/main/resources/application.properties:11`.
- `ms-productos/middleware/auth.js:3`.
- `ms-compras/middleware/auth.js:3`.
- `ms-productos/.env.example:2` y `ms-compras/.env.example:2`.

Si no se configura `JWT_SECRET`, una persona que conozca el repositorio puede
crear tokens validos y suplantar usuarios.

**Recomendacion:** usar una clave aleatoria de al menos 32 bytes, inyectarla
por variables de entorno o un gestor de secretos y rotarla antes de desplegar.

### 3. Endpoints internos sin autenticacion

**Severidad: alta.**

En `ms-productos/index.js`:

- Linea 47: `GET /internal/productos/:id` no usa `verificarToken`.
- Linea 53: `PATCH /internal/productos/:id/descontar-stock` no usa
  `verificarToken`.

Cualquier cliente que alcance el puerto 3001 puede consultar productos o
descontar inventario.

**Recomendacion:** aislar el puerto 3001 en una red privada y proteger la
comunicacion servicio-a-servicio con credenciales internas o un token interno
separado del JWT de usuario.

### 4. Flujo de compra no atomico

**Severidad: alta para la integridad de datos.**

En `ms-compras/index.js:28-43` se consulta el producto, se descuenta el stock
y despues se registra la compra. Si el registro falla, el stock queda reducido
sin una compra guardada.

En `ms-productos/index.js:55-62` la lectura y actualizacion del stock son
operaciones separadas. Dos compras simultaneas pueden validar el mismo stock.

**Recomendacion:** usar un decremento atomico con condicion `stock >= cantidad`,
comprobar las filas afectadas y usar reserva, confirmacion o compensacion si
falla el registro de la compra.

### 5. Autorizacion insuficiente por rol

**Severidad: alta.**

- `ms-productos/index.js:27`: cualquier usuario con JWT valido puede crear
  productos.
- `UsuarioController.java:105-132`: cualquier usuario autenticado puede
  listar todos los usuarios.
- `JwtService.java:38-39`: el rol se incluye en el token, pero no se usa para
  autorizar esas operaciones.

**Recomendacion:** permitir crear productos y listar usuarios solo al rol
administrador; los usuarios normales deben consultar su perfil y sus compras.

### 6. Validacion insuficiente de numeros

**Severidad: media.**

- `ms-productos/index.js:30-36` no valida que precio y stock sean numericos,
  finitos, enteros y no negativos.
- `ms-compras/index.js:22-24` no exige que `cantidad` sea un entero finito.
- `ms-productos/index.js:54-62` no valida estrictamente la cantidad.

**Recomendacion:** validar tipo, rango, enteros y valores positivos en el
backend, sin confiar en los controles HTML.

### 7. CORS abierto

**Severidad: media.**

`api-gateway/index.js:13`, `ms-productos/index.js:10` y
`ms-compras/index.js:12` llaman `cors()` sin restringir origenes.

**Recomendacion:** restringir CORS al origen real del frontend y dejar el
gateway como unico punto publico.

### 8. Spring Boot fuera de soporte OSS

**Severidad: media de mantenimiento.**

`ms-usuarios/pom.xml` usa Spring Boot `3.3.4`. El diagnostico del proyecto
indica que la rama `3.3.x` termino su soporte OSS el 2025-06-30.

**Recomendacion:** actualizar a una version soportada despues de ejecutar
pruebas de compatibilidad e integracion.

## Endpoints identificados

### Gateway - `http://localhost:3000`

Definidos en `api-gateway/index.js:19-54`:

- `GET /`
- `POST /api/usuarios/registrar`
- `POST /api/usuarios/login`
- `GET /api/usuarios/perfil`
- `GET /api/usuarios`
- `GET /api/usuarios/validar`
- `GET /api/productos`
- `GET /api/productos/:id`
- `POST /api/productos`
- `POST /api/compras`
- `GET /api/compras`

### Usuarios - `http://localhost:8080`

Definidos en `UsuarioController.java:23-148`:

- `POST /api/usuarios/registrar`, linea 37.
- `POST /api/usuarios/login`, linea 56.
- `GET /api/usuarios/perfil`, linea 76.
- `GET /api/usuarios`, linea 105.
- `GET /api/usuarios/validar`, linea 137.

### Productos - `http://localhost:3001`

Definidos en `ms-productos/index.js:14-64`:

- `GET /productos`, linea 14. Requiere JWT.
- `GET /productos/:id`, linea 20. Requiere JWT.
- `POST /productos`, linea 27. Requiere JWT.
- `GET /internal/productos/:id`, linea 47. No requiere JWT.
- `PATCH /internal/productos/:id/descontar-stock`, linea 53. No requiere JWT.

### Compras - `http://localhost:3002`

Definidos en `ms-compras/index.js:19-64`:

- `POST /compras`, linea 19. Requiere JWT.
- `GET /compras`, linea 60. Requiere JWT.

## Flujo de contraseña y hash

1. El cliente envia `contrasena` en `RegistroRequest.java`.
2. `UsuarioController.java:44` ejecuta
   `encoder.encode(req.getContrasena())`.
3. `UsuarioController.java:45` construye `Usuario` con el hash.
4. `UsuarioController.java:46` guarda con `usuarioRepository.save(nuevo)`.
5. El campo almacenado es `contrasenaHash`, definido en `Usuario.java:23-25`.
6. La base SQLite es `usuarios.db`, configurada en
   `application.properties:4`.
7. En login, `UsuarioController.java:60` usa `encoder.matches(...)` para
   comparar la contrasena recibida con el hash.

El algoritmo es BCrypt. No se observa almacenamiento de la contrasena en
texto plano ni devolucion del hash en las respuestas.

## Creacion, almacenamiento y validacion del token

### Creacion

- `UsuarioController.java:66` llama a `jwtService.generarToken(...)` despues
  de validar las credenciales.
- `JwtService.java:32-43` construye el JWT.
- Incluye `sub=email`, `id`, `rol`, fecha de emision y expiracion.
- La expiracion es de 8 horas, definida en `application.properties:12`.
- La firma HMAC usa la clave de `JwtService.java:22-29`.

### Almacenamiento

- `UsuarioController.java:68-72` devuelve el token como `token`.
- `frontend/index.html:161` lo guarda en memoria.
- `postman_coleccion.json` lo guarda temporalmente en la variable de coleccion
  `token`.
- El JWT no se guarda en SQLite.

### Validacion

- `JwtService.java:46-51` valida tokens en Java.
- `ms-productos/middleware/auth.js:17` valida firma y expiracion.
- `ms-compras/middleware/auth.js:17` valida firma y expiracion.
- El payload queda en `req.usuario` en la linea 18 de ambos middlewares.

## Inconsistencias encontradas

1. El gateway conserva `/api/usuarios`, pero elimina el prefijo para productos
   y compras mediante `pathRewrite` en `api-gateway/index.js:28-44`.
2. La documentacion indica que todo trafico pasa por el gateway, pero los
   endpoints internos de productos son accesibles directamente por 3001.
3. Los tres servicios comparten la misma clave JWT; una fuga compromete todo el
   sistema.
4. El frontend pierde la sesion al recargar porque el token solo vive en
   memoria. Es una decision funcional que debe documentarse.
5. Se comprueba que el token sea valido, pero no siempre que el usuario tenga
   el rol adecuado.
6. SQLite es adecuado para una practica local, pero requiere otra estrategia
   para concurrencia y despliegue productivo.

## Recomendacion general

Mantener la arquitectura actual, pero corregir primero el arranque, despues la
seguridad y finalmente la consistencia de las compras. No es necesario rehacer
todo el proyecto.

## Paso a paso para solucionar los errores

### Paso 1: preparar el entorno

Comprobar Node.js, Java 17 o superior y Maven:

```powershell
node --version
npm --version
java --version
mvn --version
```

### Paso 2: instalar dependencias Node

Desde la raiz del proyecto:

```powershell
npm install
npm install --prefix api-gateway
npm install --prefix ms-productos
npm install --prefix ms-compras
```

Tambien puede usarse el script existente:

```powershell
npm run setup
```

Confirmar que existan `node_modules` en los tres servicios Node.

### Paso 3: configurar variables de entorno

Crear los `.env` a partir de los ejemplos si el setup no los creo. Configurar
los puertos 3000, 3001 y 3002, las URLs internas y el mismo `JWT_SECRET` en
los cuatro servicios.

Usar una clave aleatoria, no `miClaveSecretaSuperSegura`, y no subir los `.env`
al repositorio.

### Paso 4: arrancar cada servicio por separado

Usar terminales separadas para localizar errores:

```powershell
mvn -f ms-usuarios/pom.xml spring-boot:run
npm start --prefix ms-productos
npm start --prefix ms-compras
npm start --prefix api-gateway
```

Comprobar los puertos:

```powershell
Test-NetConnection localhost -Port 8080
Test-NetConnection localhost -Port 3001
Test-NetConnection localhost -Port 3002
Test-NetConnection localhost -Port 3000
```

Cuando funcionen por separado, usar `npm run dev` desde la raiz.

### Paso 5: proteger endpoints internos

Mantener `GET /internal/productos/:id` y
`PATCH /internal/productos/:id/descontar-stock` en una red privada, bloquear
el acceso publico al puerto 3001 y agregar autenticacion de servicio a
servicio.

### Paso 6: corregir el inventario

Implementar un decremento atomico que actualice solo cuando `stock >= cantidad`,
compruebe las filas afectadas y devuelva conflicto cuando no haya stock.
Agregar compensacion o reserva si falla el registro de la compra.

### Paso 7: aplicar autorizacion por roles

Comprobar el claim `rol` antes de permitir crear productos, listar usuarios u
otras operaciones administrativas. Los usuarios normales deben acceder solo a
su perfil y sus compras.

### Paso 8: fortalecer validaciones

Validar en backend email, contrasena, precio positivo y finito, stock entero no
negativo, cantidad entera positiva e identificadores validos. No confiar en
los controles HTML.

### Paso 9: restringir CORS

Permitir solo el origen real del frontend. Mantener el gateway como punto
publico y evitar CORS abierto en los microservicios.

### Paso 10: actualizar Spring Boot

Planificar el cambio desde Spring Boot `3.3.4` a una version soportada,
actualizar dependencias y ejecutar pruebas antes de usar la nueva version.

### Paso 11: probar el flujo completo

1. Registrar con `POST /api/usuarios/registrar`.
2. Iniciar sesion con `POST /api/usuarios/login` y guardar el JWT.
3. Consultar perfil con `GET /api/usuarios/perfil` y Bearer token.
4. Consultar catalogo con `GET /api/productos` y Bearer token.
5. Comprar con `POST /api/compras`.
6. Consultar historial con `GET /api/compras`.
7. Probar producto inexistente y stock insuficiente.
8. Probar rutas protegidas sin token y con token invalido.
9. Probar que un usuario normal no ejecute operaciones administrativas.

### Paso 12: validacion final

Confirmar que:

- Los puertos 3000, 3001, 3002 y 8080 estan activos.
- El frontend llega al gateway.
- El JWT se firma y valida con una clave segura comun.
- La contrasena solo se almacena como BCrypt.
- Los endpoints internos no son publicos.
- El stock nunca queda negativo.
- No se guarda una compra si no se confirma el descuento.
- Los logs no imprimen contrasenas, secretos ni tokens completos.

## Conclusion

El bloqueo inmediato es operativo: faltan las dependencias locales de los
servicios Node y por eso no aparecen activos los puertos 3000, 3001 y 3002.
Los riesgos posteriores mas importantes son el secreto JWT predecible, los
endpoints internos sin proteccion, la autorizacion insuficiente y el stock no
atomico.

La solucion mas favorable es corregir primero el arranque, despues asegurar
claves y endpoints, aplicar autorizacion por rol y hacer consistente el
inventario. No se requiere rehacer completamente la arquitectura.

---

## 3. Segunda auditoría técnica profunda

### 3.1 Resultado de la comprobación actual

La segunda revisión confirmó que el archivo de primera auditoría describe
correctamente los problemas principales. También encontró precisiones nuevas:

- El fallback `miClaveSecretaSuperSegura` tiene aproximadamente 25 bytes. En
   Java, `Keys.hmacShaKeyFor` puede rechazarlo por ser demasiado corto para una
   clave HMAC segura. Esto debe verificarse ejecutando el flujo con el fallback;
   no se afirma aquí que el error se haya producido en esta revisión.
- No existen autenticación ni autorización servicio-a-servicio; el código solo
   confía en que las rutas internas estén dentro de la red.
- Las llamadas Axios de compras no tienen timeout.
- No existe idempotencia para reintentos de compra.
- El frontend inserta datos recibidos de la API mediante `innerHTML`, lo que
   hace aplicable el riesgo de XSS almacenado si se introduce contenido HTML en
   productos o usuarios.
- La documentación afirma que `.gitignore` protege secretos, pero no se
   observó un `.gitignore` en la raíz del proyecto; solo existe uno dentro de
   `.github/modernize/java-upgrade`.
- Las rutas SQLite son relativas al directorio de trabajo, por lo que la
   ubicación física documentada de las bases no queda garantizada al iniciar
   desde otra carpeta.
- El lockfile visible es el de la raíz; no se observaron lockfiles propios en
   los tres servicios Node.

### 3.2 Gateway

El Gateway en `api-gateway/index.js`:

- escucha en el puerto `3000` por defecto, línea 7;
- apunta a usuarios `8080`, productos `3001` y compras `3002`, líneas 9-11;
- conserva `/api/usuarios` hacia Spring Boot, líneas 19-25;
- reescribe `/api/productos` hacia `/productos`, líneas 28-35;
- reescribe `/api/compras` hacia `/compras`, líneas 38-45;
- no valida JWT, no autoriza roles y no modifica `Authorization`, según el
   comportamiento implementado en el archivo;
- aplica CORS abierto en la línea 13;
- no declara timeout, política de errores upstream ni respuesta uniforme para
   servicios caídos.

El Gateway debe ser el único punto público. Las rutas `/internal/*` no deben
publicarse a través de él.

### 3.3 Comunicación interna

`ms-compras` llama directamente a `ms-productos` en:

- `GET ${URL_PRODUCTOS}/internal/productos/:id`,
   `ms-compras/index.js:28`;
- `PATCH ${URL_PRODUCTOS}/internal/productos/:id/descontar-stock`,
   `ms-compras/index.js:31-34`.

Intercambia `producto_id` y `cantidad`; recibe nombre, precio y datos del
producto. La llamada no envía ninguna credencial interna. Si productos no
responde o queda colgado, Axios no tiene timeout y la petición puede quedar
abierta. Si devuelve 404 o 409, compras traduce esos estados; otros errores se
responden como 502, incluso si el error posterior es local de SQLite.

La comunicación directa servicio-a-servicio es arquitectónicamente válida y no
debe obligarse a pasar por el Gateway. Debe protegerse con red privada y una
credencial interna distinta del JWT del usuario.

### 3.4 JWT, autenticación y autorización

El JWT se crea en `UsuarioController.java:66` mediante
`JwtService.generarToken`. `JwtService.java:32-43` incluye `sub`, `id`, `rol`,
`iat` y `exp`; expira en ocho horas por `application.properties:12`.

Java firma y valida con HMAC en `JwtService.java:28-50`. Productos y compras
validan firma y expiración en sus middlewares, líneas 17. El frontend mantiene
el token en memoria y Postman lo guarda en una variable de colección.

Limitaciones confirmadas:

- secreto conocido y fallback inseguro;
- posible clave demasiado corta para JJWT;
- no se fija explícitamente una política común de algoritmo, issuer o
   audience;
- no existe revocación server-side ni invalidación real al cerrar sesión;
- un JWT válido se trata como autorización suficiente en productos y usuarios;
- `/api/usuarios/validar` usa `replace("Bearer ", "")` sin validar
   estrictamente el esquema;
- no se observaron tokens completos impresos en logs, pero tampoco existe una
   política central de redacción.

El JWT identifica al usuario. La llamada interna debe usar una credencial de
servicio independiente, por ejemplo un secreto interno rotado, y no confiar
solo en la existencia de `Authorization`.

### 3.5 Persistencia

La regla Database per Service está presente lógicamente:

- `usuarios.db` pertenece a `ms-usuarios` y contiene la entidad `usuarios`;
- `productos.db` pertenece a `ms-productos` y contiene `productos`;
- `compras.db` pertenece a `ms-compras` y contiene `compras`.

No se encontró código donde un microservicio abra directamente la base de otro.
`ms-compras` accede a la información de productos mediante HTTP, que es el
comportamiento correcto.

Riesgo operativo: `new Database('productos.db')`,
`new Database('compras.db')` y `jdbc:sqlite:usuarios.db` usan rutas relativas.
La propiedad de datos está separada, pero el archivo puede crearse en el
directorio actual del proceso y no necesariamente junto al código del servicio.

### 3.6 Flujo de compras y consistencia

Flujo actual:

```text
Cliente -> Gateway -> ms-compras -> ms-productos interno -> productos.db
                                                         |
                                                         v
                                                   compras.db
```

Problemas comprobados:

- lectura y actualización del stock separadas;
- riesgo de sobreventa si dos solicitudes observan `stock = 1`;
- el descuento puede tener éxito antes de que falle el INSERT de compra;
- no hay reserva, confirmación ni compensación;
- no hay idempotency key para reintentos;
- no hay timeout de Axios;
- el precio se obtiene en una operación y el stock se modifica en otra.

La estrategia recomendada para este proyecto es una reserva de stock con
descuento atómico, estado de compra y compensación. Como mínimo debe existir
un decremento condicional atómico y un mecanismo para liberar o compensar si
la compra no se confirma. No se debe compartir la base entre servicios para
resolver este problema.

### 3.7 Validaciones

Java valida campos obligatorios, email y contraseña mínima mediante Bean
Validation en `RegistroRequest.java` y `LoginRequest.java`.

Node no valida suficientemente:

- precio numérico, finito y positivo;
- stock entero y no negativo;
- cantidad entera, finita y positiva;
- IDs válidos;
- longitud máxima de nombres y descripciones;
- `NaN`, `Infinity`, `null` y tipos inesperados.

El frontend no es una frontera de seguridad. La validación debe existir en cada
backend.

### 3.8 Errores y observabilidad

Java responde validaciones con `{ "errores": { ... } }`, mientras Node usa
`{ "error": "..." }`. No existe contrato común con código, mensaje, detalles o
identificador de solicitud.

El Gateway no define una respuesta uniforme para timeout, conexión rechazada,
servicio caído o respuesta inválida. Compras puede responder 502 por fallos
que no son necesariamente de comunicación con productos.

No se observaron stack traces enviados directamente al cliente. Sí se observa
`console.error(err.message)` en compras, sin una política de correlación o
redacción central.

### 3.9 CORS y frontend

CORS está abierto en Gateway, productos y compras. El navegador solo necesita
acceso al Gateway; los servicios internos no deberían aceptar solicitudes
directas desde el navegador.

El frontend usa `innerHTML` para pintar nombres, emails, descripciones y datos
de compras. Como los datos pueden proceder de entradas almacenadas, el riesgo
de XSS almacenado es aplicable. Este hallazgo es nuevo respecto de la primera
auditoría.

### 3.10 Dependencias y pruebas

Los servicios Node usan rangos `^` y no tienen lockfiles propios visibles. El
proyecto documenta Node 18+, Java 17+ y Spring Boot `3.3.4`. La fecha exacta
de soporte de Spring Boot no puede demostrarse solo con el workspace y debe
verificarse externamente antes de actualizar.

Solo se observa `spring-boot-starter-test` en Maven y una colección Postman
centrada en el flujo feliz más una petición sin token. No se observaron tests
Java, Node, integración, concurrencia o carga.

## 4. Hallazgos consolidados

Los siguientes hallazgos consolidan la primera y la segunda auditoría. Los
confirmados no están resueltos: “CONFIRMADO” indica que el código actual los
demuestra, no que hayan sido corregidos.

| ID | Servicio | Archivo/Componente | Hallazgo | Severidad | Estado | Recomendación |
|---|---|---|---|---|---|---|
| AUD-001 | Gateway/Node | `package.json`, `*/package.json` | Dependencias locales Node ausentes y arranque incompleto | CRÍTICA | CONFIRMADO | Instalar por servicio, generar lockfiles y validar arranque |
| AUD-002 | Todos | Configuración JWT y `.env.example` | Secreto JWT conocido, fallback inseguro y posiblemente corto para JJWT | CRÍTICA | CONFIRMADO | Exigir secreto aleatorio de mínimo 32 bytes |
| AUD-003 | Productos/Compras | `ms-productos/index.js:47-63`, `ms-compras/index.js:28-34` | API interna sin autenticación servicio-a-servicio | CRÍTICA | CONFIRMADO | Red privada y credencial interna independiente |
| AUD-004 | Productos | `ms-productos/index.js:55-62` | Descuento de stock no atómico | CRÍTICA | CONFIRMADO | UPDATE condicional y comprobación de filas afectadas |
| AUD-005 | Compras | `ms-compras/index.js:28-46` | Compra sin reserva, compensación ni idempotencia | CRÍTICA | CONFIRMADO | Reserva/confirmación, compensación e idempotency key |
| AUD-006 | Usuarios/Productos | Controladores y rutas | JWT válido concede operaciones administrativas | ALTA | CONFIRMADO | Autorización explícita por rol |
| AUD-007 | Productos/Compras | Rutas Node | Validación insuficiente de números, IDs y rangos | ALTA | CONFIRMADO | Esquemas backend estrictos |
| AUD-008 | Compras | `ms-compras/index.js:28-34` | Llamadas internas sin timeout | ALTA | CONFIRMADO | Timeout, errores 503 y reintentos seguros |
| AUD-009 | Todos | Puertos y Gateway | Microservicios expuestos directamente | ALTA | CONFIRMADO | Gateway único público y red privada |
| AUD-010 | Frontend | `frontend/index.html` | Datos externos insertados con `innerHTML`, riesgo XSS | ALTA | CONFIRMADO | `textContent`, escape y validación backend |
| AUD-011 | Repositorio | `.gitignore`, `.env`, SQLite | No se observó `.gitignore` raíz para secretos y artefactos | ALTA | CONFIRMADO | Excluir `.env`, bases, `node_modules` y `target` |
| AUD-012 | Gateway/Node | `index.js` | CORS abierto | MEDIA | CONFIRMADO | CORS explícito solo en Gateway |
| AUD-013 | Todos | SQLite/configuración | Rutas de base relativas al directorio de trabajo | MEDIA | CONFIRMADO | Ruta configurable y estable por servicio |
| AUD-014 | Todos | Controladores/proxy | Formatos de error inconsistentes y 502 demasiado amplio | MEDIA | CONFIRMADO | Contrato común y mapeo consistente |
| AUD-015 | Usuarios | `UsuarioController.java:137-148` | `/validar` no valida estrictamente Bearer | MEDIA | CONFIRMADO | Validar esquema o limitar a servicio interno |
| AUD-016 | Todos | `package.json`, POM | Rangos sin lockfiles propios y versión Spring antigua | BAJA/MEDIA | PENDIENTE DE IMPLEMENTACIÓN | Actualizar después de pruebas y auditoría de CVEs |
| AUD-017 | Todos | Tests/Postman | Cobertura insuficiente de seguridad, concurrencia e integración | MEDIA | CONFIRMADO | Añadir pruebas unitarias e integración |
| AUD-018 | Todos | Logs | No existe política central de redacción/correlación | BAJA/MEDIA | PENDIENTE DE IMPLEMENTACIÓN | Request ID y prohibición de secretos en logs |

No se marcó ningún hallazgo como `RESUELTO`.

## 5. Arquitectura actual real

```text
Frontend
      |
      v
API Gateway :3000
      |------------------|------------------|
      v                  v                  v
ms-usuarios :8080  ms-productos :3001  ms-compras :3002
Spring Boot         Node.js             Node.js
usuarios.db         productos.db        compras.db
                                     ^                  |
                                     |                  |
                                     +-- API interna --+
```

El frontend usa el Gateway. `ms-compras` se comunica directamente con
`ms-productos` para consultar datos y descontar stock; esta comunicación no
pasa por el Gateway y no debe pasar obligatoriamente por él.

La arquitectura objetivo debe conservar esta separación, pero con Gateway
público, puertos internos restringidos y autenticación servicio-a-servicio.

## 6. Seguridad

### JWT

- Se genera en `ms-usuarios`.
- Se firma con HMAC.
- Contiene email, id, rol, emisión y expiración.
- Se valida localmente en productos y compras.
- El secreto compartido es actualmente predecible y tiene fallback.
- No existe revocación server-side.

### Secretos

Los secretos deben estar en variables de entorno o un gestor de secretos. Los
`.env.example` no deben contener una clave que pueda utilizarse para firmar
tokens reales. No se generaron secretos durante esta auditoría.

### Roles

El claim `rol` existe, pero no se aplica. ADMIN debe poder administrar
productos y consultar usuarios; el usuario normal debe consultar su perfil,
catálogo y sus compras, sin recibir permisos administrativos automáticamente.

### Servicio a servicio

Debe distinguirse del JWT del usuario mediante una credencial interna rotada,
red privada y, en un despliegue mayor, mTLS o identidad administrada.

### Endpoints internos y puertos

`/internal/*` no debe exponerse al navegador ni al Gateway público. Los puertos
3001 y 3002 deben quedar restringidos a la red de servicios.

### CORS y XSS

CORS debe concentrarse en el Gateway con origen explícito. El frontend debe
renderizar valores externos como texto, no como HTML interpretado.

### Manejo de errores

Debe definirse una respuesta uniforme con status, código, mensaje y detalles
seguros, sin stack traces, secretos ni mensajes internos innecesarios.

## 7. Bases de datos

| Base | Propietario | Tablas/entidades observadas | Acceso correcto |
|---|---|---|---|
| `usuarios.db` | `ms-usuarios` | `usuarios` | Solo JPA/controlador de usuarios |
| `productos.db` | `ms-productos` | `productos` | Solo `better-sqlite3` de productos |
| `compras.db` | `ms-compras` | `compras` | Solo `better-sqlite3` de compras |

No se encontró acceso directo de un microservicio a la base de otro. Compras
obtiene información de productos por API HTTP. Los datos de nombre y precio
guardados en compras funcionan como snapshot histórico.

La separación debe mantenerse como Database per Service. Las rutas deben
volverse configurables y estables para que el directorio desde el cual se
inicia el proceso no cambie la ubicación de la base.

## 8. Flujo de compras

Flujo actual:

```text
Cliente
   -> Gateway
   -> ms-compras
   -> ms-productos /internal/productos/:id
   -> ms-productos /internal/.../descontar-stock
   -> compras.db
```

Problemas:

- falta atomicidad entre `productos.db` y `compras.db`;
- falta idempotencia ante reintentos;
- falta reserva, confirmación y compensación;
- existe riesgo de sobreventa con stock concurrente;
- falta timeout de comunicación;
- un fallo de compras después del descuento deja inventario inconsistente.

Estrategia recomendada: descuento atómico en productos, reserva identificable,
compra con estado, confirmación posterior y liberación compensatoria ante
fallo. Esta estrategia conserva la independencia de bases.

## 9. Plan de implementación

### Fase 1 — Arranque y reproducibilidad

- **Archivos:** `package.json` y manifiestos Node.
- **Cambios:** instalar dependencias por servicio y crear lockfiles propios.
- **Riesgos:** incompatibilidad nativa de `better-sqlite3`.
- **Pruebas:** arranque individual y conjunto.
- **Aceptación:** puertos `3000`, `3001`, `3002` y `8080` activos.

### Fase 2 — Persistencia aislada

- **Archivos:** bases Node y `application.properties`.
- **Cambios:** rutas estables y configurables, conservando una base por servicio.
- **Riesgos:** pérdida o duplicación de datos locales.
- **Pruebas:** registro, producto y compra.
- **Aceptación:** ningún servicio abre la base de otro.

### Fase 3 — Secretos

- **Archivos:** `.env.example`, `application.properties`, middlewares y script.
- **Cambios:** secreto obligatorio, largo y fuera del repositorio.
- **Riesgos:** servicios que no arrancan sin configuración.
- **Pruebas:** secreto ausente, corto y válido.
- **Aceptación:** no existe fallback inseguro.

### Fase 4 — Autenticación y autorización

- **Archivos:** `JwtService`, `UsuarioController` y middlewares Node.
- **Cambios:** algoritmo permitido, claims de contexto y roles efectivos.
- **Riesgos:** cambios en el comportamiento esperado del frontend.
- **Pruebas:** ADMIN, cliente, sin token, expirado y firma inválida.
- **Aceptación:** token válido sin permiso recibe `403`.

### Fase 5 — Seguridad interna

- **Archivos:** `ms-compras/index.js`, `ms-productos/index.js` y configuración.
- **Cambios:** credencial de servicio, red privada y rutas fuera del Gateway.
- **Riesgos:** configuración desigual entre servicios.
- **Pruebas:** token interno ausente, incorrecto y correcto.
- **Aceptación:** solo `ms-compras` puede ejecutar operaciones internas.

### Fase 6 — Inventario y consistencia

- **Archivos:** rutas y bases de productos/compras.
- **Cambios:** decremento atómico, reserva, estados e idempotencia.
- **Riesgos:** compatibilidad con compras existentes.
- **Pruebas:** stock uno, concurrencia, fallo posterior y reintentos.
- **Aceptación:** no se vende más stock del disponible.

### Fase 7 — Validaciones y errores

- **Archivos:** controladores Java, rutas Node, manejador de errores y Gateway.
- **Cambios:** esquemas estrictos y contrato de error común.
- **Riesgos:** cambios en respuestas de Postman/frontend.
- **Pruebas:** payload inválido, JSON corrupto, 404, 409, 502 y 503.
- **Aceptación:** errores estructurados sin información sensible.

### Fase 8 — CORS y frontend

- **Archivos:** Gateway, servicios Node y `frontend/index.html`.
- **Cambios:** origen explícito y renderizado seguro.
- **Riesgos:** incompatibilidad al abrir el HTML mediante `file://`.
- **Pruebas:** origen permitido/no permitido y payload XSS.
- **Aceptación:** datos del catálogo no se interpretan como HTML.

### Fase 9 — Pruebas de integración

- **Archivos:** tests posteriores, todavía no existentes.
- **Cambios:** pruebas desde el Gateway y llamadas internas.
- **Riesgos:** dependencia del entorno y de SQLite.
- **Pruebas:** registro, login, roles, compras, fallos de red y concurrencia.
- **Aceptación:** flujo completo automatizado y reproducible.

### Fase 10 — Actualización de dependencias

- **Archivos:** `pom.xml`, manifiestos y lockfiles.
- **Cambios:** actualizar únicamente después de estabilizar el sistema.
- **Riesgos:** incompatibilidades Spring, Express, JWT y módulos nativos.
- **Pruebas:** build, tests, integración y auditoría de CVEs.
- **Aceptación:** ninguna vulnerabilidad crítica pendiente sin justificación.

## 10. Estado de implementación

> Las correcciones todavía NO han sido implementadas.

Por ahora todos los hallazgos correspondientes permanecen abiertos o
pendientes de implementación. En particular, ningún hallazgo de la matriz está
marcado como `RESUELTO`.

## 11. Próximo paso

La siguiente acción será preparar y revisar el plan técnico de la **Fase 1 —
Arranque y reproducibilidad** antes de modificar código.

No se debe iniciar ninguna modificación hasta contar con autorización explícita.