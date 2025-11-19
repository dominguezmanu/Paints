// controllers/reportController.js

// IMPORTANTE: ajusta este require al mismo módulo que usas en los demás controllers.
// Ejemplos usuales:
//   const db = require("../db");
//   const db = require("../config/db");
//   const db = require("../database");
const db = require("../config/db");

// ---------------------------------------------------------
// 1) Productos con menos ventas (unidades) en un rango de fechas
//    Usa tablas: factura, detalle_factura, producto
// ---------------------------------------------------------
function getLowSalesProducts(req, res) {
  const { from, to, limit } = req.query;
  const lim = Number(limit) || 10;

  let where = "WHERE f.estado = 'vigente'";
  const params = [];

  if (from) {
    where += " AND DATE(f.fecha) >= ?";
    params.push(from);
  }
  if (to) {
    where += " AND DATE(f.fecha) <= ?";
    params.push(to);
  }

  const sql = `
    SELECT
      p.id             AS producto_id,
      p.nombre         AS producto,
      SUM(df.cantidad) AS total_unidades,
      SUM(df.subtotal) AS total_monto
    FROM detalle_factura df
    INNER JOIN factura  f ON f.id = df.factura_id
    INNER JOIN producto p ON p.id = df.producto_id
    ${where}
    GROUP BY p.id, p.nombre
    HAVING total_unidades > 0
    ORDER BY total_unidades ASC, total_monto ASC
    LIMIT ?
  `;

  params.push(lim);

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Error en getLowSalesProducts:", err);
      return res.status(500).json({
        ok: false,
        message: "Error al obtener productos con menos ventas",
      });
    }

    return res.json({
      ok: true,
      data: {
        productos: rows, // [{ producto_id, producto, total_unidades, total_monto }, ...]
      },
    });
  });
}

// ---------------------------------------------------------
// 2) Productos con poco o sin stock (< min) por sucursal
//    Usa tablas: inventario, sucursal, producto
// ---------------------------------------------------------
function getLowStockProducts(req, res) {
  const min = Number(req.query.min) || 5;

  const sql = `
    SELECT
      s.id         AS sucursal_id,
      s.nombre     AS sucursal,
      p.id         AS producto_id,
      p.nombre     AS producto,
      i.existencia AS existencia
    FROM inventario i
    INNER JOIN sucursal s ON s.id = i.sucursal_id
    INNER JOIN producto p ON p.id = i.producto_id
    WHERE i.existencia < ?
    ORDER BY i.existencia ASC, s.nombre, p.nombre
  `;

  db.query(sql, [min], (err, rows) => {
    if (err) {
      console.error("Error en getLowStockProducts:", err);
      return res.status(500).json({
        ok: false,
        message: "Error al obtener productos con poco o sin stock",
      });
    }

    return res.json({
      ok: true,
      data: {
        items: rows, // [{ sucursal_id, sucursal, producto_id, producto, existencia }, ...]
      },
    });
  });
}

module.exports = {
  getLowSalesProducts,
  getLowStockProducts,
};
