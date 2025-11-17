// src/services/AuthService.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/UserModel");

function mapUserRowToPayload(row) {
  return {
    id: row.id,
    username: row.username,
    nombre: row.empleado_nombre || row.username,
    empleadoId: row.empleado_id,
    rolId: row.rol_id,
    rolNombre: row.rol_nombre, // "Admin", "Cajero", "Digitador", "Comprador"
    permisos: {
      manipularProductos: !!row.manipular_productos,
      manipularFacturas: !!row.manipular_facturas,
      generarReportes: !!row.generar_reportes,
    },
  };
}

const AuthService = {
  async login(username, password) {
    const userRow = await UserModel.findByUsername(username);

    if (!userRow) {
      return { ok: false, message: "Usuario o contraseña incorrectos" };
    }

    // IMPORTANTE: esto asume que 'password' en BD está hasheado con bcrypt
    const esValida = await bcrypt.compare(password, userRow.password);
    if (!esValida) {
      return { ok: false, message: "Usuario o contraseña incorrectos" };
    }

    const payload = mapUserRowToPayload(userRow);

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "jwt_default_secret",
      { expiresIn: "8h" }
    );

    return {
      ok: true,
      token,
      user: payload,
    };
  },

  verifyToken(token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "jwt_default_secret"
      );
      return { ok: true, user: decoded };
    } catch (err) {
      return { ok: false, message: "Token inválido o expirado" };
    }
  },
};

module.exports = AuthService;
