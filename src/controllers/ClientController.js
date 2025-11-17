const pool = require("../config/db");

const ClientController = {
  async searchByNit(req, res) {
    try {
      const nit = (req.query.nit || "").trim();

      if (!nit) {
        return res
          .status(400)
          .json({ ok: false, error: "El NIT es requerido para la búsqueda." });
      }

      const [rows] = await pool.query(
        `
        SELECT
          id,
          nombres,
          apellidos,
          correo,
          direccion,
          nit
        FROM cliente
        WHERE nit = ?
        LIMIT 1
        `,
        [nit]
      );

      if (!rows.length) {
        return res.json({ ok: true, cliente: null });
      }

      return res.json({ ok: true, cliente: rows[0] });
    } catch (err) {
      console.error("Error buscando cliente por NIT:", err);
      res
        .status(500)
        .json({ ok: false, error: "Error al buscar cliente por NIT." });
    }
  },
};

module.exports = ClientController;
