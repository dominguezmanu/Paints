const DashboardController = {
  // GET /api/dashboard/admin
  async admin(req, res) {
    res.json({
      ok: true,
      rol: "Admin",
      message: "Dashboard Admin",
      widgets: {
        ventasHoy: 0,
        totalFacturasHoy: 0,
        productosActivos: 0,
        alertasInventario: 0,
      },
    });
  },

  async cajero(req, res) {
    res.json({
      ok: true,
      rol: "Cajero",
      message: "Dashboard Cajero",
      widgets: {
        ventasHoy: 0,
        facturasPendientes: 0,
      },
    });
  },

  async digitador(req, res) {
    res.json({
      ok: true,
      rol: "Digitador",
      message: "Dashboard Digitador",
      widgets: {
        entradasPendientes: 0,
        productosSinStock: 0,
      },
    });
  },

  async comprador(req, res) {
    res.json({
      ok: true,
      rol: "Comprador",
      message: "Dashboard Comprador",
      widgets: {
        cotizacionesActivas: 0,
        pedidosEnProceso: 0,
      },
    });
  },
};

module.exports = DashboardController;
