const pool = require("../config/db");

const UserModel = {
  async getAll() {
    const [rows] = await pool.query(
      `
      SELECT 
        u.id,
        u.username,
        u.empleado_id,
        u.rol_id,
        e.nombre          AS empleado_nombre,
        e.cod_empleado    AS cod_empleado,
        r.nombre          AS rol_nombre,
        r.manipular_productos,
        r.manipular_facturas,
        r.generar_reportes
      FROM usuario u
      LEFT JOIN empleado e ON u.empleado_id = e.id
      LEFT JOIN rol r       ON u.rol_id = r.id
      `
    );
    return rows;
  },

  async findByUsername(username) {
    const [rows] = await pool.query(
      `
      SELECT 
        u.id,
        u.username,
        u.password,
        u.empleado_id,
        u.rol_id,
        e.nombre          AS empleado_nombre,
        e.cod_empleado    AS cod_empleado,
        r.nombre          AS rol_nombre,
        r.manipular_productos,
        r.manipular_facturas,
        r.generar_reportes
      FROM usuario u
      LEFT JOIN empleado e ON u.empleado_id = e.id
      LEFT JOIN rol r       ON u.rol_id = r.id
      WHERE u.username = ?
      LIMIT 1
      `,
      [username]
    );

    if (rows.length === 0) return null;
    return rows[0];
  },
};

module.exports = UserModel;
