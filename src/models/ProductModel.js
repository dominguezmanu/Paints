const pool = require("../config/db");

const ProductModel = {
  async getAll({ search, categoriaId, marcaId } = {}) {
    let sql = `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.categoria_id,
        p.color_id,
        p.medida_id,
        p.marca_id,
        p.porcentaje_descuento,
        p.precio_menor,
        p.precio_mayor,
        p.duracion,
        p.cobertura,
        p.createdAt,
        p.updatedAt,
        c.descripcion AS categoria,
        col.descripcion AS color,
        m.descripcion AS medida,
        ma.nombre      AS marca
      FROM producto p
      LEFT JOIN categoria c ON p.categoria_id = c.id
      LEFT JOIN color col    ON p.color_id = col.id
      LEFT JOIN medida m     ON p.medida_id = m.id
      LEFT JOIN marca ma     ON p.marca_id = ma.id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      sql += " AND (p.nombre LIKE ? OR p.descripcion LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like);
    }

    if (categoriaId) {
      sql += " AND p.categoria_id = ?";
      params.push(categoriaId);
    }

    if (marcaId) {
      sql += " AND p.marca_id = ?";
      params.push(marcaId);
    }

    sql += " ORDER BY p.nombre ASC";

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async getById(id) {
    const [rows] = await pool.query(
      `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.categoria_id,
        p.color_id,
        p.medida_id,
        p.marca_id,
        p.porcentaje_descuento,
        p.precio_menor,
        p.precio_mayor,
        p.duracion,
        p.cobertura,
        p.createdAt,
        p.updatedAt,
        c.descripcion AS categoria,
        col.descripcion AS color,
        m.descripcion AS medida,
        ma.nombre      AS marca
      FROM producto p
      LEFT JOIN categoria c ON p.categoria_id = c.id
      LEFT JOIN color col    ON p.color_id = col.id
      LEFT JOIN medida m     ON p.medida_id = m.id
      LEFT JOIN marca ma     ON p.marca_id = ma.id
      WHERE p.id = ?
      LIMIT 1
      `,
      [id]
    );
    if (rows.length === 0) return null;
    return rows[0];
  },

  async create(data) {
    const {
      nombre,
      descripcion,
      categoria_id,
      color_id,
      medida_id,
      marca_id,
      porcentaje_descuento,
      precio_menor,
      precio_mayor,
      duracion,
      cobertura,
    } = data;

    const [result] = await pool.query(
      `
      INSERT INTO producto (
        nombre,
        descripcion,
        categoria_id,
        color_id,
        medida_id,
        marca_id,
        porcentaje_descuento,
        precio_menor,
        precio_mayor,
        duracion,
        cobertura
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nombre,
        descripcion || null,
        categoria_id || null,
        color_id || null,
        medida_id || null,
        marca_id,
        porcentaje_descuento != null ? porcentaje_descuento : 0.0,
        precio_menor != null ? precio_menor : null,
        precio_mayor != null ? precio_mayor : null,
        duracion != null ? duracion : null,
        cobertura != null ? cobertura : null,
      ]
    );

    return await this.getById(result.insertId);
  },

  async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) return null;

    const {
      nombre = existing.nombre,
      descripcion = existing.descripcion,
      categoria_id = existing.categoria_id,
      color_id = existing.color_id,
      medida_id = existing.medida_id,
      marca_id = existing.marca_id,
      porcentaje_descuento = existing.porcentaje_descuento,
      precio_menor = existing.precio_menor,
      precio_mayor = existing.precio_mayor,
      duracion = existing.duracion,
      cobertura = existing.cobertura,
    } = data;

    await pool.query(
      `
      UPDATE producto
      SET
        nombre = ?,
        descripcion = ?,
        categoria_id = ?,
        color_id = ?,
        medida_id = ?,
        marca_id = ?,
        porcentaje_descuento = ?,
        precio_menor = ?,
        precio_mayor = ?,
        duracion = ?,
        cobertura = ?
      WHERE id = ?
      `,
      [
        nombre,
        descripcion || null,
        categoria_id || null,
        color_id || null,
        medida_id || null,
        marca_id,
        porcentaje_descuento != null ? porcentaje_descuento : 0.0,
        precio_menor != null ? precio_menor : null,
        precio_mayor != null ? precio_mayor : null,
        duracion != null ? duracion : null,
        cobertura != null ? cobertura : null,
        id,
      ]
    );

    return await this.getById(id);
  },

  async remove(id) {
    const [result] = await pool.query("DELETE FROM producto WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  },
};

module.exports = ProductModel;
