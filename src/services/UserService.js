const UserModel = require("../models/UserModel");

function mapRow(row) {
  return {
    id: row.id,
    username: row.username,
    empleadoId: row.empleado_id,
    empleadoNombre: row.empleado_nombre,
    codEmpleado: row.cod_empleado,
    rolId: row.rol_id,
    rolNombre: row.rol_nombre,
    permisos: {
      manipularProductos: !!row.manipular_productos,
      manipularFacturas: !!row.manipular_facturas,
      generarReportes: !!row.generar_reportes,
    },
  };
}

const UserService = {
  async listUsers() {
    const rows = await UserModel.getAll();
    return rows.map(mapRow);
  },
};

module.exports = UserService;
