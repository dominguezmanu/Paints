// src/controllers/InvoiceController.js
const InvoiceModel = require("../models/InvoiceModel");

const InvoiceController = {
  async list(req, res) {
    try {
      const estado = req.query.estado || null;
      const facturas = await InvoiceModel.list({ estado });
      res.json({ ok: true, facturas });
    } catch (err) {
      console.error("Error listando facturas:", err);
      res
        .status(500)
        .json({ ok: false, error: "Error al obtener el listado de facturas." });
    }
  },

  async getOne(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res
          .status(400)
          .json({ ok: false, error: "ID de factura inválido." });
      }

      const factura = await InvoiceModel.findById(id);
      if (!factura) {
        return res
          .status(404)
          .json({ ok: false, error: "Factura no encontrada." });
      }

      res.json({ ok: true, factura });
    } catch (err) {
      console.error("Error obteniendo factura:", err);
      res
        .status(500)
        .json({ ok: false, error: "Error al obtener la factura." });
    }
  },

  async create(req, res) {
    try {
      const {
        cliente_id,
        sucursal_id,
        correlativo,
        letra_serie,
        items,
        pagos,
      } = req.body || {};

      const errors = [];
      if (!cliente_id) errors.push("cliente_id es obligatorio.");
      if (!sucursal_id) errors.push("sucursal_id es obligatorio.");

      if (!Array.isArray(items) || items.length === 0) {
        errors.push("Debe enviar al menos un item en la factura.");
      }

      if (!Array.isArray(pagos) || pagos.length === 0) {
        errors.push("Debe registrar al menos un pago.");
      }

      if (errors.length) {
        return res.status(400).json({ ok: false, errors });
      }

      const usuario_id = req.user && req.user.id;
      if (!usuario_id) {
        return res
          .status(401)
          .json({ ok: false, error: "Usuario no autenticado." });
      }

      const factura = await InvoiceModel.createInvoice({
        cliente_id: Number(cliente_id),
        usuario_id: Number(usuario_id),
        sucursal_id: Number(sucursal_id),
        correlativo: correlativo || null,
        letra_serie: letra_serie || null,
        items,
        pagos,
      });

      res.status(201).json({ ok: true, factura });
    } catch (err) {
      console.error("Error creando factura:", err);

      if (err.isBusiness) {
        return res.status(400).json({ ok: false, error: err.message });
      }

      res
        .status(500)
        .json({ ok: false, error: "Error interno al crear la factura." });
    }
  },
  async cancel(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res
          .status(400)
          .json({ ok: false, error: "ID de factura inválido." });
      }

      const affected = await InvoiceModel.cancelInvoice(id);
      if (!affected) {
        return res
          .status(404)
          .json({ ok: false, error: "Factura no encontrada o ya anulada." });
      }

      res.json({ ok: true, message: "Factura anulada correctamente." });
    } catch (err) {
      console.error("Error anulando factura:", err);
      res
        .status(500)
        .json({ ok: false, error: "Error interno al anular la factura." });
    }
  },
  async create(req, res) {
    try {
      const {
        cliente_id,
        nuevo_cliente,
        sucursal_id,
        correlativo,
        letra_serie,
        items,
        pagos,
      } = req.body || {};

      const errors = [];

      if (!cliente_id && !nuevo_cliente) {
        errors.push(
          "Debes seleccionar un cliente existente o enviar los datos de un nuevo cliente."
        );
      }

      if (!sucursal_id) {
        errors.push("sucursal_id es obligatorio.");
      }

      if (!Array.isArray(items) || items.length === 0) {
        errors.push("Debe enviar al menos un item en la factura.");
      }

      if (!Array.isArray(pagos) || pagos.length === 0) {
        errors.push("Debe registrar al menos un pago.");
      }

      if (errors.length) {
        return res.status(400).json({ ok: false, errors });
      }

      const usuario_id = req.user && req.user.id;
      if (!usuario_id) {
        return res
          .status(401)
          .json({ ok: false, error: "Usuario no autenticado." });
      }

      let finalClienteId = cliente_id ? Number(cliente_id) : null;

      // Si no viene cliente_id, crear/buscar cliente nuevo
      if (!finalClienteId) {
        const {
          nombres,
          apellidos,
          nit,
          correo,
          direccion,
        } = nuevo_cliente || {};

        if (!nombres || !apellidos) {
          return res.status(400).json({
            ok: false,
            error:
              "Para crear un nuevo cliente se requieren nombres y apellidos.",
          });
        }

        // Si viene NIT, intentar reutilizar cliente existente
        if (nit) {
          const [rows] = await pool.query(
            `
            SELECT id
            FROM cliente
            WHERE nit = ?
            LIMIT 1
            `,
            [nit]
          );
          if (rows.length) {
            finalClienteId = rows[0].id;
          }
        }

        // Si no se encontró cliente por NIT, insertarlo
        if (!finalClienteId) {
          const [result] = await pool.query(
            `
            INSERT INTO cliente (nombres, apellidos, correo, direccion, nit)
            VALUES (?, ?, ?, ?, ?)
            `,
            [nombres, apellidos, correo || null, direccion || null, nit || null]
          );
          finalClienteId = result.insertId;
        }
      }

      const factura = await InvoiceModel.createInvoice({
        cliente_id: Number(finalClienteId),
        usuario_id: Number(usuario_id),
        sucursal_id: Number(sucursal_id),
        correlativo: correlativo || null,
        letra_serie: letra_serie || null,
        items,
        pagos,
      });

      res.status(201).json({ ok: true, factura });
    } catch (err) {
      console.error("Error creando factura:", err);

      if (err.isBusiness) {
        return res.status(400).json({ ok: false, error: err.message });
      }

      res
        .status(500)
        .json({ ok: false, error: "Error interno al crear la factura." });
    }
  },
};

module.exports = InvoiceController;
