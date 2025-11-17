const express = require("express");
const HomeController = require("../controllers/HomeController");
const AuthController = require("../controllers/AuthController");
const DashboardController = require("../controllers/DashboardController");
const ProductController = require("../controllers/ProductController");
const CatalogController = require("../controllers/CatalogController");
const InvoiceController = require("../controllers/InvoiceController");
const ClientController = require("../controllers/ClientController");
const { authRequired, requireRole } = require("../middlewares/authMiddleware");
const pool = require('../config/db'); // o '../config/db', lo que ya tengas

const router = express.Router();

// Estado
router.get("/status", HomeController.status);

// Auth
router.post("/auth/login", AuthController.login);
router.get("/auth/me", authRequired, AuthController.me);

// Admin: ver usuarios
router.get(
  "/admin/users",
  authRequired,
  requireRole("Admin"),
  HomeController.listUsers
);

// Dashboards por rol
router.get(
  "/dashboard/admin",
  authRequired,
  requireRole("Admin"),
  DashboardController.admin
);
router.get(
  "/dashboard/cajero",
  authRequired,
  requireRole("Cajero", "Admin"),
  DashboardController.cajero
);
router.get(
  "/dashboard/digitador",
  authRequired,
  requireRole("Digitador", "Admin"),
  DashboardController.digitador
);
router.get(
  "/dashboard/comprador",
  authRequired,
  requireRole("Comprador", "Admin"),
  DashboardController.comprador
);

// ---------- PRODUCTOS ----------

// Listar productos (todos los roles autenticados)
router.get("/productos", authRequired, ProductController.list);

// Obtener un producto
router.get("/productos/:id", authRequired, ProductController.getOne);

// Crear producto (Admin y Digitador)
router.post(
  "/productos",
  authRequired,
  requireRole("Admin", "Digitador"),
  ProductController.create
);

// Actualizar producto
router.put(
  "/productos/:id",
  authRequired,
  requireRole("Admin", "Digitador"),
  ProductController.update
);

// Eliminar producto
router.delete(
  "/productos/:id",
  authRequired,
  requireRole("Admin", "Digitador"),
  ProductController.remove
);

// Listar facturas (Admin ve todas, otros solo las suyas)
router.get("/facturas", authRequired, InvoiceController.list);

// Ver una factura específica
router.get("/facturas/:id", authRequired, InvoiceController.getOne);

// Crear factura (solo Admin y Cajero)
router.post(
  "/facturas",
  authRequired,
  requireRole("Admin", "Cajero"),
  InvoiceController.create
);

// Anular factura (DELETE lógico: cambia estado a 'anulada')
router.delete(
  "/facturas/:id",
  authRequired,
  requireRole("Admin", "Cajero"),
  InvoiceController.cancel
);

// ---------- CATÁLOGOS (para combos) ----------

router.get("/catalogos/categorias", authRequired, CatalogController.categorias);
router.get("/catalogos/colores", authRequired, CatalogController.colores);
router.get("/catalogos/medidas", authRequired, CatalogController.medidas);
router.get("/catalogos/marcas", authRequired, CatalogController.marcas);
router.get("/catalogos/clientes", authRequired, CatalogController.clientes);
router.get("/catalogos/sucursales", authRequired, CatalogController.sucursales);
router.get(
  "/catalogos/tipos-pago",
  authRequired,
  CatalogController.tiposPago
);


// CLIENTES
router.get(
  "/clientes/buscar-por-nit",
  authRequired,
  ClientController.searchByNit
);

// ================== INVENTARIO: CATÁLOGOS BÁSICOS ==================

// GET /api/sucursales
router.get('/sucursales', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, direccion, ubicacionGPS FROM sucursal ORDER BY nombre'
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('Error obteniendo sucursales:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/proveedores', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, contacto FROM proveedor ORDER BY nombre'
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('Error obteniendo proveedores:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
router.get('/tipos-movimiento', (req, res) => {
  const tipos = [
    { id: 1, nombre: 'Ingreso por compra' },
    { id: 2, nombre: 'Ajuste positivo' },
    { id: 3, nombre: 'Ajuste negativo' },
  ];
  res.json({ ok: true, data: tipos });
});


// ================== INVENTARIO: REGISTRO DE MOVIMIENTOS ==================
// POST /api/inventario/movimientos
router.post('/inventario/movimientos', async (req, res) => {
  const {
    sucursal_id,
    tipo_movimiento_id,
    proveedor_id,
    fecha,
    comentario,
    items,
  } = req.body || {};

  if (!sucursal_id || !tipo_movimiento_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'Datos incompletos: sucursal, tipo de movimiento e items son obligatorios.',
    });
  }

  try {
    const tipo = Number(tipo_movimiento_id);

    for (const item of items) {
      const prodField = item.producto;
      const cantidad = Number(item.cantidad || 0);

      if (!prodField || !cantidad || cantidad <= 0) continue;

      // 1) Resolver producto_id (ID numérico o nombre)
      let productoId = null;

      if (/^\d+$/.test(String(prodField))) {
        productoId = Number(prodField);
      } else {
        const [prodRows] = await pool.query(
          'SELECT id FROM producto WHERE nombre = ? LIMIT 1',
          [String(prodField)]
        );
        if (!prodRows.length) continue;
        productoId = prodRows[0].id;
      }

      // 2) Delta de existencia
      let delta = Math.abs(cantidad);
      if (tipo === 3) delta = -delta;

      // 3) Actualizar inventario
      const [invRows] = await pool.query(
        'SELECT id, existencia FROM inventario WHERE producto_id = ? AND sucursal_id = ?',
        [productoId, sucursal_id]
      );

      if (!invRows.length) {
        if (delta > 0) {
          await pool.query(
            'INSERT INTO inventario (producto_id, sucursal_id, existencia) VALUES (?,?,?)',
            [productoId, sucursal_id, delta]
          );
        }
      } else {
        const inv = invRows[0];
        let nuevaExistencia = inv.existencia + delta;
        if (nuevaExistencia < 0) nuevaExistencia = 0;

        await pool.query(
          'UPDATE inventario SET existencia = ? WHERE id = ?',
          [nuevaExistencia, inv.id]
        );
      }

      // 4) Registrar en lote si es ingreso por compra
      if (tipo === 1) {
        const fechaIngreso = fecha || new Date();
        await pool.query(
          'INSERT INTO lote (producto_id, proveedor_id, fecha_ingreso, stock) VALUES (?,?,?,?)',
          [productoId, proveedor_id || null, fechaIngreso, cantidad]
        );
      }
    }

    res.json({
      ok: true,
      message: 'Movimiento de inventario registrado correctamente.',
    });
  } catch (err) {
    console.error('Error registrando movimiento de inventario:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

// GET /api/inventario/movimientos?limit=10
router.get('/inventario/movimientos', async (req, res) => {
  const limit = Number(req.query.limit || 10) || 10;

  try {
    const sql = `
      SELECT
        l.id,
        l.fecha_ingreso AS fecha,
        NULL AS sucursal_nombre,
        'Ingreso por compra' AS tipo_nombre,
        prov.nombre AS proveedor_nombre,
        (l.stock * IFNULL(p.precio_mayor, 0)) AS total,
        NULL AS usuario_nombre
      FROM lote l
      INNER JOIN proveedor prov ON prov.id = l.proveedor_id
      INNER JOIN producto p ON p.id = l.producto_id
      ORDER BY l.fecha_ingreso DESC, l.id DESC
      LIMIT ?;
    `;
    const [rows] = await pool.query(sql, [limit]);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('Error obteniendo movimientos de inventario:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

// ================== INVENTARIO: CONSULTA DE EXISTENCIAS ==================
// GET /api/inventario/existencias?search=&sucursal_id=
router.get('/inventario/existencias', async (req, res) => {
  const search = (req.query.search || '').trim();
  const sucursalId = req.query.sucursal_id || '';

  try {
    let sql = `
      SELECT
        inv.id,
        inv.producto_id,
        p.nombre          AS producto_nombre,
        s.id              AS sucursal_id,
        s.nombre          AS sucursal_nombre,
        inv.existencia
      FROM inventario inv
      INNER JOIN producto p ON p.id = inv.producto_id
      INNER JOIN sucursal s ON s.id = inv.sucursal_id
      WHERE 1 = 1
    `;
    const params = [];

    if (sucursalId) {
      sql += ' AND s.id = ?';
      params.push(sucursalId);
    }

    if (search) {
      sql += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like);
    }

    sql += ' ORDER BY p.nombre, s.nombre';

    const [rows] = await pool.query(sql, params);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('Error obteniendo existencias de inventario:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});



// ================== REPORTES DE VENTAS ==================

// GET /api/reportes/ventas/resumen?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/reportes/ventas/resumen', async (req, res) => {
  const from = (req.query.from || '').trim();
  const to   = (req.query.to   || '').trim();

  try {
    let sql = `
      SELECT
        COUNT(*)                          AS facturas,
        COALESCE(SUM(subtotal), 0)        AS subtotal,
        COALESCE(SUM(total_descuento), 0) AS total_descuento,
        COALESCE(SUM(total_factura), 0)   AS total_facturado
      FROM factura
      WHERE estado = 'vigente'
    `;
    const params = [];

    if (from) {
      sql += ' AND DATE(fecha) >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND DATE(fecha) <= ?';
      params.push(to);
    }

    const [rows] = await pool.query(sql, params);
    const row = rows[0] || {
      facturas: 0,
      subtotal: 0,
      total_descuento: 0,
      total_facturado: 0,
    };

    const promedio =
      row.facturas > 0 ? Number(row.total_facturado) / Number(row.facturas) : 0;

    res.json({
      ok: true,
      data: {
        facturas: row.facturas,
        subtotal: Number(row.subtotal),
        total_descuento: Number(row.total_descuento),
        total_facturado: Number(row.total_facturado),
        promedio_factura: promedio,
      },
    });
  } catch (err) {
    console.error('Error en resumen de ventas:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/reportes/ventas/top-productos?from=&to=&limit=5
router.get('/reportes/ventas/top-productos', async (req, res) => {
  const from = (req.query.from || '').trim();
  const to   = (req.query.to   || '').trim();
  const limit = Number(req.query.limit || 5) || 5;

  try {
    let sql = `
      SELECT
        p.id,
        p.nombre,
        SUM(df.cantidad)             AS unidades,
        COALESCE(SUM(df.subtotal),0) AS total
      FROM detalle_factura df
      INNER JOIN factura f   ON f.id = df.factura_id
      INNER JOIN producto p  ON p.id = df.producto_id
      WHERE f.estado = 'vigente'
    `;
    const params = [];

    if (from) {
      sql += ' AND DATE(f.fecha) >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND DATE(f.fecha) <= ?';
      params.push(to);
    }

    sql += `
      GROUP BY p.id, p.nombre
      ORDER BY total DESC
      LIMIT ?
    `;
    params.push(limit);

    const [rows] = await pool.query(sql, params);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('Error en top productos:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/reportes/ventas/por-dia?from=&to=
router.get('/reportes/ventas/por-dia', async (req, res) => {
  const from = (req.query.from || '').trim();
  const to   = (req.query.to   || '').trim();

  try {
    let sql = `
      SELECT
        DATE(fecha)                         AS fecha,
        COUNT(*)                            AS facturas,
        COALESCE(SUM(total_factura), 0)     AS total
      FROM factura
      WHERE estado = 'vigente'
    `;
    const params = [];

    if (from) {
      sql += ' AND DATE(fecha) >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND DATE(fecha) <= ?';
      params.push(to);
    }

    sql += `
      GROUP BY DATE(fecha)
      ORDER BY fecha
    `;

    const [rows] = await pool.query(sql, params);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('Error en ventas por día:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ================== COTIZACIONES (Comprador) ==================
// POST /api/cotizaciones
// body: { nit?, nombre?, direccion?, correo?, cliente_id?, items:[{ producto_id, cantidad, precio_unitario? }] }

router.post('/cotizaciones', async (req, res) => {
  const {
    nit,
    nombre,
    direccion,
    correo,
    cliente_id,
    items,
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'La cotización debe tener al menos un ítem.',
    });
  }

  try {
    // 1) Resolver cliente_id
    let clienteId = cliente_id || null;

    if (!clienteId && nit) {
      // Buscar por NIT
      const [rows] = await pool.query(
        'SELECT id FROM cliente WHERE nit = ? LIMIT 1',
        [nit]
      );
      if (rows.length) {
        clienteId = rows[0].id;
      }
    }

    if (!clienteId) {
      // Crear cliente rápido
      const nombreBase = (nombre || 'Cliente cotización').trim();
      const partes = nombreBase.split(' ');
      const nombres = partes[0] || nombreBase;
      const apellidos = partes.slice(1).join(' ') || '-';

      const [ins] = await pool.query(
        `INSERT INTO cliente (nombres, apellidos, correo, direccion, nit)
         VALUES (?,?,?,?,?)`,
        [nombres, apellidos, correo || null, direccion || null, nit || null]
      );
      clienteId = ins.insertId;
    }

    // 2) Crear cabecera de cotización
    const [cotIns] = await pool.query(
      `INSERT INTO cotizacion (cliente_id, fecha)
       VALUES (?, NOW())`,
      [clienteId]
    );

    const cotizacionId = cotIns.insertId;

    // 3) Insertar detalle
    let total = 0;

    for (const item of items) {
      const productoId = Number(item.producto_id || 0);
      const cantidad = Number(item.cantidad || 0);
      let precioUnit = item.precio_unitario != null
        ? Number(item.precio_unitario)
        : null;

      if (!productoId || cantidad <= 0) continue;

      // Si no viene precio, usamos el precio_mayor del producto
      if (precioUnit == null || isNaN(precioUnit)) {
        const [pRows] = await pool.query(
          'SELECT precio_mayor FROM producto WHERE id = ? LIMIT 1',
          [productoId]
        );
        if (!pRows.length) continue;
        precioUnit = Number(pRows[0].precio_mayor || 0);
      }

      const subtotal = cantidad * precioUnit;
      total += subtotal;

      await pool.query(
        `INSERT INTO detalle_cotizacion
         (cotizacion_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES (?,?,?,?,?)`,
        [cotizacionId, productoId, cantidad, precioUnit, subtotal]
      );
    }

    res.json({
      ok: true,
      data: {
        cotizacion_id: cotizacionId,
        cliente_id: clienteId,
        total,
      },
    });
  } catch (err) {
    console.error('Error guardando cotización:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

// GET /api/cotizaciones?cliente_id=&nit=&limit=
router.get('/cotizaciones', async (req, res) => {
  const { cliente_id, nit } = req.query;
  const limit = Number(req.query.limit || 10) || 10;

  try {
    let sql = `
      SELECT
        c.id,
        c.fecha,
        cli.nombres,
        cli.apellidos,
        cli.nit,
        (SELECT COALESCE(SUM(dc.subtotal),0)
           FROM detalle_cotizacion dc
          WHERE dc.cotizacion_id = c.id) AS total
      FROM cotizacion c
      INNER JOIN cliente cli ON cli.id = c.cliente_id
      WHERE 1 = 1
    `;
    const params = [];

    if (cliente_id) {
      sql += ' AND c.cliente_id = ?';
      params.push(cliente_id);
    }

    if (nit) {
      sql += ' AND cli.nit = ?';
      params.push(nit);
    }

    sql += ' ORDER BY c.fecha DESC, c.id DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query(sql, params);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('Error listando cotizaciones:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});


module.exports = router;
