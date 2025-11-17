// src/services/InvoiceService.js
const pool = require("../config/db");
const InvoiceModel = require("../models/InvoiceModel");

function validateInvoicePayload(data) {
  const errors = [];

  if (!data.cliente_id || isNaN(Number(data.cliente_id))) {
    errors.push("El cliente es obligatorio.");
  }
  if (!data.sucursal_id || isNaN(Number(data.sucursal_id))) {
    errors.push("La sucursal es obligatoria.");
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push("Debe agregar al menos un producto en la factura.");
  } else {
    data.items.forEach((item, idx) => {
      if (!item.producto_id || isNaN(Number(item.producto_id))) {
        errors.push(`Item #${idx + 1}: producto inválido.`);
      }
      if (!item.cantidad || isNaN(Number(item.cantidad)) || item.cantidad <= 0) {
        errors.push(`Item #${idx + 1}: cantidad debe ser mayor a 0.`);
      }
      if (
        item.precio_unitario === undefined ||
        item.precio_unitario === null ||
        isNaN(Number(item.precio_unitario)) ||
        Number(item.precio_unitario) < 0
      ) {
        errors.push(`Item #${idx + 1}: precio unitario inválido.`);
      }
      if (
        item.descuento_aplicado !== undefined &&
        item.descuento_aplicado !== null
      ) {
        const d = Number(item.descuento_aplicado);
        if (isNaN(d) || d < 0) {
          errors.push(`Item #${idx + 1}: descuento inválido.`);
        }
      }
    });
  }

  return errors;
}

function calcularTotales(items) {
  let subtotal = 0;
  let totalDescuento = 0;

  const itemsCalculados = items.map((itemRaw) => {
    const cantidad = Number(itemRaw.cantidad);
    const precio_unitario = Number(itemRaw.precio_unitario);
    const descuento_aplicado =
      itemRaw.descuento_aplicado !== undefined &&
      itemRaw.descuento_aplicado !== null &&
      itemRaw.descuento_aplicado !== ""
        ? Number(itemRaw.descuento_aplicado)
        : 0;

    const bruto = cantidad * precio_unitario;
    const subtotalItem = bruto - descuento_aplicado;

    subtotal += bruto;
    totalDescuento += descuento_aplicado;

    return {
      producto_id: Number(itemRaw.producto_id),
      cantidad,
      precio_unitario,
      descuento_aplicado,
      subtotal: subtotalItem,
    };
  });

  const totalFactura = subtotal - totalDescuento;

  return {
    itemsCalculados,
    subtotal,
    totalDescuento,
    totalFactura,
  };
}

const InvoiceService = {
  async listInvoicesForUser(user, filters = {}) {
    const { estado, clienteId, sucursalId } = filters;

    const isAdmin = user.rolNombre === "Admin";

    const rows = await InvoiceModel.list({
      estado: estado || null,
      clienteId: clienteId || null,
      sucursalId: sucursalId || null,
      onlyMine: !isAdmin, // si NO es admin, solo las suyas
      usuarioId: user.id,
      rolNombre: user.rolNombre,
    });

    return rows;
  },

  async getInvoiceById(user, id) {
    const factura = await InvoiceModel.getById(id);
    if (!factura) return null;

    // Si no es Admin, solo puede ver sus propias facturas
    if (user.rolNombre !== "Admin" && factura.usuario_id !== user.id) {
      return null;
    }

    return factura;
  },

  async createInvoice(user, data) {
    const errors = validateInvoicePayload(data);
    if (errors.length > 0) {
      return { ok: false, errors };
    }

    const { itemsCalculados, subtotal, totalDescuento, totalFactura } =
      calcularTotales(data.items);

    const conn = await pool.getConnection();
    try{
      await conn.beginTransaction();

      const facturaId = await InvoiceModel.insertFactura(conn, {
        cliente_id: Number(data.cliente_id),
        usuario_id: user.id,
        sucursal_id: Number(data.sucursal_id),
        fecha: new Date(),
        correlativo: data.correlativo || null,
        letra_serie: data.letra_serie || null,
        subtotal,
        total_descuento: totalDescuento,
        total_factura: totalFactura,
      });

      // Detalles + actualización inventario
      for (const item of itemsCalculados) {
        await InvoiceModel.insertDetalle(conn, facturaId, item);

        // Disminuir inventario de la sucursal
        const affected = await InvoiceModel.updateInventarioOnSale(
          conn,
          Number(data.sucursal_id),
          item.producto_id,
          item.cantidad
        );

        if (affected === 0) {
          // No había inventario registrado para ese producto+sucursal
          // Puedes elegir si esto debe ser error duro o solo advertencia.
          // Aquí lo tratamos como error para mantener integridad.
          throw new Error(
            `No hay inventario registrado para el producto ${item.producto_id} en la sucursal ${data.sucursal_id}`
          );
        }
      }

      await conn.commit();

      const facturaCompleta = await InvoiceModel.getById(facturaId);

      return { ok: true, factura: facturaCompleta };
    } catch (err) {
      await conn.rollback();
      console.error("Error al crear factura:", err.message);
      return { ok: false, errors: [err.message || "Error al crear factura."] };
    } finally {
      conn.release();
    }
  },

  async cancelInvoice(user, id) {
    const factura = await InvoiceModel.getById(id);
    if (!factura) {
      return { ok: false, errors: ["Factura no encontrada."] };
    }

    if (factura.estado !== "vigente") {
      return { ok: false, errors: ["Solo se pueden anular facturas vigentes."] };
    }

    // Regla sencilla: Admin puede anular cualquiera, Cajero solo sus propias.
    if (user.rolNombre !== "Admin" && factura.usuario_id !== user.id) {
      return {
        ok: false,
        errors: ["No tienes permisos para anular esta factura."],
      };
    }

    const success = await InvoiceModel.markAsAnulada(id);
    if (!success) {
      return { ok: false, errors: ["No se pudo anular la factura."] };
    }

    return { ok: true };
  },
};

module.exports = InvoiceService;
