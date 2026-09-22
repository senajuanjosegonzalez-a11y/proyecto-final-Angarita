require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./database');
const { verificarToken } = require('./middleware/auth');

const app = express();
const PUERTO = process.env.PORT || process.env.PUERTO || 3002;
const URL_PRODUCTOS = process.env.URL_PRODUCTOS || 'http://localhost:3001';

app.use(cors());
app.use(express.json());

// POST /comprar -> aqui pasan las 3 cosas que hay que sustentar:
//   1) se verifica el JWT del comprador (middleware)
//   2) se consulta a ms-productos para precio/nombre y se descuenta stock (comunicacion entre microservicios)
//   3) se registra la compra en la base de datos propia de este servicio
app.post('/compras', verificarToken, async (req, res) => {
  const { producto_id, cantidad } = req.body;

  if (!producto_id || !cantidad || cantidad <= 0) {
    return res.status(400).json({ error: 'producto_id y cantidad (> 0) son obligatorios' });
  }

  try {
    // 1) Comunicacion interna con ms-productos (sin pasar por el gateway)
    const { data: producto } = await axios.get(
  `${URL_PRODUCTOS}/internal/productos/${producto_id}`,
  {
    headers: {
      Authorization: `Bearer ${req.token}`
    }
  }
  );


    // 3) Se registra la compra en la base de ms-compras
    const total = producto.precio * cantidad;
    const resultado = db
      .prepare(
        `INSERT INTO compras (usuario_email, producto_id, producto_nombre, precio_unitario, cantidad, total)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(req.usuario.sub, producto_id, producto.nombre, producto.precio, cantidad, total);

    const compra = db.prepare('SELECT * FROM compras WHERE id = ?').get(resultado.lastInsertRowid);
    res.status(201).json(compra);
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'El producto no existe' });
    }
    if (err.response?.status === 409) {
      return res.status(409).json({ error: 'Stock insuficiente' });
    }
    console.error(err.message);
    res.status(502).json({ error: 'No se pudo comunicar con ms-productos' });
  }
});

// GET /comprar -> historial de compras del usuario autenticado
app.get('/compras', verificarToken, (req, res) => {
  const compras = db
    .prepare('SELECT * FROM compras WHERE usuario_email = ? ORDER BY fecha DESC')
    .all(req.usuario.sub);
  res.json(compras);
});

app.listen(PUERTO, () => {
  console.log(`ms-compras escuchando en http://localhost:${PUERTO}`);
});
