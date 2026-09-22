const Database = require('better-sqlite3');

const db = new Database('compras.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS compras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_email TEXT NOT NULL,
    producto_id INTEGER NOT NULL,
    producto_nombre TEXT NOT NULL,
    precio_unitario REAL NOT NULL,
    cantidad INTEGER NOT NULL,
    total REAL NOT NULL,
    fecha TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;
