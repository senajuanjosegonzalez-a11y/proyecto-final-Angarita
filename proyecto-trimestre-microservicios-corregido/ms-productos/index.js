require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');
const { verificarToken } = require('./middleware/auth');

const app = express();
const PUERTO = process.env.PORT || process.env.PUERTO || 3001;

app.use(cors());
app.use(express.json());

// GET /productos -> lista el catalogo (requiere JWT)
app.get('/productos', verificarToken, (req, res) => {
  const productos = db.prepare('SELECT * FROM productos').all();
  res.json(productos);
});

// GET /productos/:id -> detalle de un producto (requiere JWT)
app.get('/productos/:id', verificarToken, (req, res) => {
  const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(req.params.id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

// POST /productos -> crea un producto nuevo (requiere JWT)
app.post('/productos', verificarToken, (req, res) => {
  const { nombre, descripcion, precio, stock } = req.body;

  if (!nombre || precio == null) {
    return res.status(400).json({ error: 'nombre y precio son obligatorios' });
  }

  const resultado = db
    .prepare('INSERT INTO productos (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)')
    .run(nombre, descripcion || '', precio, stock || 0);

  const nuevo = db.prepare('SELECT * FROM productos WHERE id = ?').get(resultado.lastInsertRowid);
  res.status(201).json(nuevo);
});

// -----------------------------------------------------------------
// Endpoint INTERNO: lo usa ms-compras para leer/descontar stock.
// No pasa por el gateway y no exige JWT de cliente porque es
// comunicacion servicio-a-servicio dentro de la red interna.
// -----------------------------------------------------------------
app.get('/internal/productos/:id', verificarToken, (req, res) => {
  const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(req.params.id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

app.patch('/internal/productos/:id/descontar-stock', verificarToken, (req, res) => {
  const { cantidad } = req.body;
  const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(req.params.id);

  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  if (producto.stock < cantidad) {
    return res.status(409).json({ error: 'Stock insuficiente' });
  }

  db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?').run(cantidad, req.params.id);
  res.json({ ok: true, stockRestante: producto.stock - cantidad });
});

app.listen(PUERTO, () => {
  console.log(`ms-productos escuchando en http://localhost:${PUERTO}`);
});
