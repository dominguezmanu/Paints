const pool = require("../config/db");

const CatalogController = {
  async categorias(req, res) {
    try {
      const [rows] = await pool.query(
        "SELECT id, descripcion FROM categoria ORDER BY descripcion"
      );
      res.json({ ok: true, categorias: rows });
    } catch (err) {
      console.error("Error catalogo categorias:", err);
      res
        .status(500)
        .json({ ok: false, error: "Error al obtener categorías." });
    }
  },

  async marcas(req, res) {
    try {
      const [rows] = await pool.query(
        "SELECT id, nombre FROM marca ORDER BY nombre"
      );
      res.json({ ok: true, marcas: rows });
    } catch (err) {
      console.error("Error catalogo marcas:", err);
      res.status(500).json({ ok: false, error: "Error al obtener marcas." });
    }
  },

  async colores(req, res) {
    try {
      const [rows] = await pool.query(
        "SELECT id, descripcion FROM color ORDER BY descripcion"
      );
      res.json({ ok: true, colores: rows });
    } catch (err) {
      console.error("Error catalogo colores:", err);
      res.status(500).json({ ok: false, error: "Error al obtener colores." });
    }
  },

  async medidas(req, res) {
    try {
      const [rows] = await pool.query(
        "SELECT id, descripcion FROM medida ORDER BY descripcion"
      );
      res.json({ ok: true, medidas: rows });
    } catch (err) {
      console.error("Error catalogo medidas:", err);
      res.status(500).json({ ok: false, error: "Error al obtener medidas." });
    }
  },

  // NUEVO: catálogo de clientes para facturación
  async clientes(req, res) {
    try {
      const [rows] = await pool.query(
        `
        SELECT
          id,
          nombres,
          apellidos,
          nit
        FROM cliente
        ORDER BY nombres, apellidos
        `
      );
      res.json({ ok: true, clientes: rows });
    } catch (err) {
      console.error("Error catalogo clientes:", err);
      res
        .status(500)
        .json({ ok: false, error: "Error al obtener clientes." });
    }
  },

  // NUEVO: catálogo de sucursales para facturación
  async sucursales(req, res) {
    try {
      const [rows] = await pool.query(
        `
        SELECT
          id,
          nombre
        FROM sucursal
        ORDER BY nombre
        `
      );
      res.json({ ok: true, sucursales: rows });
    } catch (err) {
      console.error("Error catalogo sucursales:", err);
      res
        .status(500)
        .json({ ok: false, error: "Error al obtener sucursales." });
    }
  },
  async tiposPago(req, res) {
    try {
      const [rows] = await pool.query(
        "SELECT id, descripcion FROM tipo_pago ORDER BY descripcion"
      );
      res.json({ ok: true, tiposPago: rows });
    } catch (err) {
      console.error("Error cargando tipos de pago:", err);
      res
        .status(500)
        .json({ ok: false, error: "Error al obtener tipos de pago." });
    }
  },
};

module.exports = CatalogController;
