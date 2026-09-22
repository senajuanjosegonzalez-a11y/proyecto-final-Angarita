# Tienda — Arquitectura de Microservicios

Proyecto trimestre: 4 servicios independientes que se comunican por HTTP,
comparten un JWT firmado con la misma llave secreta, y quedan detrás de un
API Gateway. Incluye frontend web.

## Servicios

| Servicio | Tecnología | Puerto | Responsabilidad |
|---|---|---|---|
| ms-usuarios | Spring Boot + SQLite | 8080 | Registro, login, genera y valida JWT |
| ms-productos | Node.js + Express + SQLite | 3001 | Catálogo, verifica JWT por su cuenta |
| ms-compras | Node.js + Express + SQLite | 3002 | Registra compras, verifica JWT, consulta stock a productos |
| api-gateway | Node.js + Express | 3000 | Único punto de entrada, solo enruta |
| frontend | HTML + JS puro | — (ábrelo en el navegador) | Consume todo a través del gateway |

## 1. Requisitos

- Java 17+ y Maven (o usa tu IDE: IntelliJ / Spring Tool Suite)
- Node.js 18+

## 2. Configurar la llave compartida

Los tres servicios que verifican JWT deben usar **la misma** `JWT_SECRET`.

- `ms-usuarios`: se configura en `src/main/resources/application.properties`
  (variable `jwt.secret`, o exporta `JWT_SECRET` como variable de entorno).
- `ms-productos` y `ms-compras`: copia `.env.example` a `.env` en cada uno
  y pon la misma clave.

```
JWT_SECRET=miClaveSecretaSuperSegura
```

Cámbienla por una propia antes de sustentar (no dejen la de ejemplo), y no
la suban a GitHub — por eso está en `.gitignore`.

## 3. Levantar todo con un solo comando (recomendado)

Desde la carpeta raíz del proyecto (donde está este README):

```bash
npm install        # instala "concurrently", el orquestador
npm run setup       # instala cada microservicio Node y crea los .env
npm run dev          # levanta los 4 servicios a la vez, con logs de colores
```

`npm run dev` deja las 4 terminales fundidas en una sola, cada línea con el
color y el nombre del servicio que la generó (GATEWAY, USUARIOS, PRODUCTOS,
COMPRAS). `Ctrl+C` los apaga a todos.

Requisito: tener Java 17+ y Maven en el PATH (`mvn -v` debe funcionar) y
Node.js 18+. La primera vez que arranca `ms-usuarios`, Maven descarga sus
propias dependencias — puede tardar un poco más esa vez.

### Alternativa: cada servicio en su propia terminal

Útil si quieres ver los logs de uno solo, o depurar un servicio a la vez.

```bash
# 1) Usuarios (Spring Boot)
cd ms-usuarios
mvn spring-boot:run

# 2) Productos
cd ms-productos
npm install
cp .env.example .env
npm start

# 3) Compras
cd ms-compras
npm install
cp .env.example .env
npm start

# 4) Gateway
cd api-gateway
npm install
cp .env.example .env
npm start
```

Todo el tráfico del cliente pasa por el gateway: `http://localhost:3000`.

## 4. Frontend

Abre `frontend/index.html` directamente en el navegador (doble clic, o con
la extensión "Live Server" de VS Code). Se conecta al gateway en
`http://localhost:3000`.

Flujo: registrarse → iniciar sesión (guarda el JWT en memoria) → ver la
lista de usuarios registrados → ver catálogo → comprar → ver historial de
compras. La lista de usuarios existe justamente para comprobar en pantalla
que el registro sí quedó guardado en la base de datos.

## 5. Ver la base de datos con la extensión SQLite Viewer

Cada microservicio crea su propio archivo `.db` con SQLite apenas arranca
por primera vez (no hay que crear nada a mano):

| Servicio | Archivo | Se crea al arrancar |
|---|---|---|
| ms-usuarios | `ms-usuarios/usuarios.db` | `mvn spring-boot:run` |
| ms-productos | `ms-productos/productos.db` | `npm start` |
| ms-compras | `ms-compras/compras.db` | `npm start` |

En VS Code, con la extensión **SQLite Viewer** instalada: abre la carpeta
del proyecto en el explorador, haz clic en cualquiera de esos `.db` y se
abre una vista de tabla — ahí puedes ver en vivo las filas que se van
creando (por ejemplo, cada usuario que registres desde el frontend).
Si arrancas los servicios y no ves el archivo, revisa que estés mirando
dentro de la carpeta del microservicio correspondiente, no en la raíz.

## 6. Probar en Postman

Importa `postman_coleccion.json`. El paso "Login" guarda automáticamente
el token en la variable de colección `token`, y los siguientes pasos ya
lo usan en el header `Authorization: Bearer {{token}}`.

Para RapidAPI Client (la extensión que reemplazó a Insomnia) el flujo es
el mismo: login primero, copiar el `token` de la respuesta, pegarlo como
`Authorization: Bearer <token>` en las siguientes peticiones.

## 7. Qué mostrar en la sustentación

**Seguridad**
- El password nunca se guarda en texto plano (BCrypt en ms-usuarios).
- El JWT va firmado con HMAC y una llave secreta compartida solo entre
  los 3 servicios backend — el gateway y el frontend nunca la conocen.
- Cada microservicio valida el token *por su cuenta* (no le pregunta a
  ms-usuarios si es válido); por eso deben compartir la misma llave.
- Endpoints internos (`/internal/...` en productos) no llevan JWT de
  cliente porque son comunicación servicio-a-servicio, no de un usuario.

**Arquitectura**
- Cada microservicio tiene su propia base SQLite (nadie comparte tablas).
- El gateway es una capa de enrutamiento pura: no valida tokens ni aplica
  lógica de negocio, solo reenvía la petición.

**Comunicación**
- Cliente → Gateway → microservicio (siempre por HTTP/REST).
- ms-compras → ms-productos (comunicación interna directa, sin gateway)
  para leer el precio y descontar stock al comprar.

## 8. Diagrama

Ver `diagrama.md` (Mermaid) — se puede pegar en GitHub, Notion, o
exportar como imagen para la diapositiva.
