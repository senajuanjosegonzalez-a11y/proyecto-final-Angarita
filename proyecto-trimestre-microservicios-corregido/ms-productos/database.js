const Database = require('better-sqlite3');

const db = new Database('productos.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0
  )
`);

// Datos de arranque, solo si la tabla esta vacia
const totalFilas = db.prepare('SELECT COUNT(*) AS total FROM productos').get().total;

if (totalFilas === 0) {
  const insertar = db.prepare(
    'INSERT INTO productos (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)'
  );
  insertar.run('Teclado mecanico', 'Switches rojos, retroiluminado', 145000, 20);
  insertar.run('Mouse inalambrico', '2.4GHz, sensor optico', 68000, 35);
  insertar.run('Monitor 24 pulgadas', 'Full HD, 75Hz', 520000, 12);
  console.log('Productos de ejemplo insertados');
}

module.exports = db;
