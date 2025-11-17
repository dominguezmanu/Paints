const AuthService = require("../services/AuthService");

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "No autenticado" });
  }

  const token = authHeader.split(" ")[1];
  const result = AuthService.verifyToken(token);

  if (!result.ok) {
    return res.status(401).json({ ok: false, error: result.message });
  }

  req.user = result.user; // { id, username, nombre, rolNombre, permisos, ... }
  next();
}

function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "No autenticado" });
    }

    const rolActual = req.user.rolNombre || req.user.rol;

    if (!rolesPermitidos.includes(rolActual)) {
      return res
        .status(403)
        .json({ ok: false, error: "No tienes permiso para esta acción" });
    }

    next();
  };
}

module.exports = { authRequired, requireRole };
