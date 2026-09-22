// Copia .env.example -> .env en cada microservicio de Node, solo si el
// .env todavia no existe (para no pisar una llave que ya hayas cambiado).
const fs = require('fs');
const path = require('path');

const servicios = ['api-gateway', 'ms-productos', 'ms-compras'];

for (const servicio of servicios) {
  const carpeta = path.join(__dirname, '..', servicio);
  const origen = path.join(carpeta, '.env.example');
  const destino = path.join(carpeta, '.env');

  if (!fs.existsSync(origen)) {
    console.log(`(omitido) ${servicio}: no tiene .env.example`);
    continue;
  }

  if (fs.existsSync(destino)) {
    console.log(`(omitido) ${servicio}: .env ya existe`);
    continue;
  }

  fs.copyFileSync(origen, destino);
  console.log(`✔ ${servicio}: .env creado a partir de .env.example`);
}

console.log('\nListo. Si vas a cambiar JWT_SECRET, edita el .env de cada');
console.log('servicio Node y application.properties en ms-usuarios con la MISMA clave.');
