require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PUERTO = process.env.PORT || process.env.PUERTO || 3000;

const URL_USUARIOS = process.env.URL_USUARIOS || 'http://localhost:8080';
const URL_PRODUCTOS = process.env.URL_PRODUCTOS || 'http://localhost:3001';
const URL_COMPRAS = process.env.URL_COMPRAS || 'http://localhost:3002';

app.use(cors());

// El gateway SOLO enruta: no toca el header Authorization ni el body,
// simplemente reenvia la peticion completa al microservicio que corresponda.

// /api/usuarios/*  -> ms-usuarios (Spring Boot, 8080) - mismo path
app.use(
  '/api/usuarios',
  createProxyMiddleware({
    target: URL_USUARIOS,
    changeOrigin: true,
    pathRewrite: (path) => path === '/' ? '/api/usuarios' : `/api/usuarios${path}`,
  })
);

// /api/productos/* -> ms-productos (Node, 3001) - se le quita el prefijo /api
app.use(
  '/api/productos',
  createProxyMiddleware({
    target: URL_PRODUCTOS,
    changeOrigin: true,
    pathRewrite: (path) => `/productos${path}`,
  })
);

// /api/compras/*   -> ms-compras (Node, 3002) - se le quita el prefijo /api
app.use(
  '/api/compras',
  createProxyMiddleware({
    target: URL_COMPRAS,
    changeOrigin: true,
    pathRewrite: (path) => `/compras${path}`,
  })
);

app.get('/', (req, res) => {
  res.json({
    mensaje: 'API Gateway activo',
    rutas: ['/api/usuarios/*', '/api/productos/*', '/api/compras/*'],
  });
});

app.listen(PUERTO, () => {
  console.log(`API Gateway escuchando en http://localhost:${PUERTO}`);
});
