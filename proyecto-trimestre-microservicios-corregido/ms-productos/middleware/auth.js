const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'miClaveSecretaSuperSegura';

// Este microservicio NO llama a ms-usuarios para confirmar el token.
// Como comparte la misma JWT_SECRET, puede verificar la firma por su cuenta.
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token JWT ausente' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload; // { id, rol, sub: email, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token JWT inválido o expirado' });
  }
}

module.exports = { verificarToken };
