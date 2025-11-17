const pool = require("../config/db");

const InvoiceModel = {
  // Listado de facturas con join a cliente y sucursal
  async list({ estado }) {
    let sql = `
      SELECT
        f.id,
        f.fecha,
        f.subtotal,
        f.total_descuento,
        f.total_factura,
        f.estado,
        c.nombres  AS cliente_nombres,
        c.apellidos AS cliente_apellidos,
        s.nombre    AS sucursal_nombre
      FROM factura f
      JOIN cliente c   ON f.cliente_id  = c.id
      JOIN sucursal s  ON f.sucursal_id = s.id
      WHERE 1 = 1
    `;
    const params = [];

    if (estado) {
      sql += " AND f.estado = ?";
      params.push(estado);
    }

    sql += " ORDER BY f.fecha DESC LIMIT 50";

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  // Opcional: para ver una factura específica (no lo usamos en el front aún)
  async findById(id) {
    const [rows] = await pool.query(
      `
      SELECT
        f.*,
        c.nombres  AS cliente_nombres,
        c.apellidos AS cliente_apellidos,
        s.nombre    AS sucursal_nombre
      FROM factura f
      JOIN cliente c   ON f.cliente_id  = c.id
      JOIN sucursal s  ON f.sucursal_id = s.id
      WHERE f.id = ?
      `,
      [id]
    );
    if (!rows.length) return null;

    // Cargar detalle
    const [detRows] = await pool.query(
      `
      SELECT
        df.id,
        df.producto_id,
        p.nombre       AS producto_nombre,
        df.cantidad,
        df.precio_unitario,
        df.descuento_aplicado,
        df.subtotal
      FROM detalle_factura df
      JOIN producto p ON df.producto_id = p.id
      WHERE df.factura_id = ?
      `,
      [id]
    );

    return {
      ...rows[0],
      detalles: detRows,
    };
  },

  
  // Creación de factura + detalle + actualización de inventario (transacción)
   async createInvoice({
    cliente_id,
    usuario_id,
    sucursal_id,
    correlativo,
    letra_serie,
    items,
    pagos,
  }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1) Insertar factura "vacía"
      const [facturaRes] = await conn.query(
        `
        INSERT INTO factura (
          cliente_id,
          usuario_id,
          sucursal_id,
          correlativo,
          letra_serie,
          subtotal,
          total_descuento,
          total_factura
        )
        VALUES (?, ?, ?, ?, ?, 0.00, 0.00, 0.00)
        `,
        [cliente_id, usuario_id, sucursal_id, correlativo, letra_serie]
      );

      const facturaId = facturaRes.insertId;

      let subtotalGlobal = 0;
      let totalDescuentoGlobal = 0;

      // 2) Insertar detalle y actualizar inventario
      for (const item of items) {
        const producto_id = Number(item.producto_id);
        const cantidad = Number(item.cantidad);
        const precio_unitario = Number(item.precio_unitario);
        const descuento_aplicado = Number(item.descuento_aplicado || 0);

        if (!producto_id || cantidad <= 0 || precio_unitario < 0) {
          const err = new Error("Datos de item inválidos.");
          err.isBusiness = true;
          throw err;
        }

        const bruto = cantidad * precio_unitario;
        const subtotal = bruto - descuento_aplicado;

        subtotalGlobal += bruto;
        totalDescuentoGlobal += descuento_aplicado;

        // Verificar inventario
        const [invRows] = await conn.query(
          `
          SELECT id, existencia
          FROM inventario
          WHERE producto_id = ? AND sucursal_id = ?
          FOR UPDATE
          `,
          [producto_id, sucursal_id]
        );

        if (!invRows.length) {
          const err = new Error(
            `No existe inventario configurado para el producto ${producto_id} en esta sucursal.`
          );
          err.isBusiness = true;
          throw err;
        }

        const inv = invRows[0];
        if (inv.existencia < cantidad) {
          const err = new Error(
            `Stock insuficiente para el producto ${producto_id}. Existencia actual: ${inv.existencia}, cantidad solicitada: ${cantidad}.`
          );
          err.isBusiness = true;
          throw err;
        }

        // Insertar detalle
        await conn.query(
          `
          INSERT INTO detalle_factura (
            factura_id,
            producto_id,
            cantidad,
            precio_unitario,
            descuento_aplicado,
            subtotal
          )
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            facturaId,
            producto_id,
            cantidad,
            precio_unitario,
            descuento_aplicado,
            subtotal,
          ]
        );

        // Actualizar inventario
        await conn.query(
          `
          UPDATE inventario
          SET existencia = existencia - ?
          WHERE id = ?
          `,
          [cantidad, inv.id]
        );
      }

      const totalFactura = subtotalGlobal - totalDescuentoGlobal;

      // 3) Validar y registrar pagos
      if (!Array.isArray(pagos) || pagos.length === 0) {
        const err = new Error("Debe registrar al menos un pago.");
        err.isBusiness = true;
        throw err;
      }

      let totalPagos = 0;

      for (const pago of pagos) {
        const tipo_pago_id = Number(pago.tipo_pago_id);
        const monto = Number(pago.monto);
        const tarjeta_id =
          pago.tarjeta_id !== undefined && pago.tarjeta_id !== null
            ? Number(pago.tarjeta_id)
            : null;
        const referencia = pago.referencia || null;

        if (!tipo_pago_id || monto <= 0) {
          const err = new Error("Datos de pago inválidos.");
          err.isBusiness = true;
          throw err;
        }

        totalPagos += monto;

        await conn.query(
          `
          INSERT INTO pago_factura (
            factura_id,
            tipo_pago_id,
            monto,
            tarjeta_id,
            referencia
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [facturaId, tipo_pago_id, monto, tarjeta_id, referencia]
        );
      }

      const diff = Math.round((totalFactura - totalPagos) * 100) / 100;
      if (diff !== 0) {
        const err = new Error(
          "El total de pagos no coincide con el total de la factura."
        );
        err.isBusiness = true;
        throw err;
      }

      // 4) Actualizar totales de la factura
      await conn.query(
        `
        UPDATE factura
        SET subtotal = ?, total_descuento = ?, total_factura = ?
        WHERE id = ?
        `,
        [subtotalGlobal, totalDescuentoGlobal, totalFactura, facturaId]
      );

      await conn.commit();
      conn.release();

      return {
        id: facturaId,
        cliente_id,
        usuario_id,
        sucursal_id,
        correlativo,
        letra_serie,
        subtotal: subtotalGlobal,
        total_descuento: totalDescuentoGlobal,
        total_factura: totalFactura,
        estado: "vigente",
      };
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  },
  
    async cancelInvoice(id) {
    const [result] = await pool.query(
      `
      UPDATE factura
      SET estado = 'anulada'
      WHERE id = ? AND estado <> 'anulada'
      `,
      [id]
    );

    // result.affectedRows indica si realmente se actualizó algo
    return result.affectedRows;
  },
  
};


module.exports = InvoiceModel;
