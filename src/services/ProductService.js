// src/services/ProductService.js
const ProductModel = require("../models/ProductModel");

function validateProductPayload(data, { partial = false } = {}) {
  const errors = [];

  // nombre obligatorio en creación
  if (!partial || (partial && data.nombre !== undefined)) {
    if (!data.nombre || typeof data.nombre !== "string") {
      errors.push("El nombre del producto es obligatorio.");
    }
  }

  // marca_id obligatorio en creación
  if (!partial || (partial && data.marca_id !== undefined)) {
    if (!data.marca_id || isNaN(Number(data.marca_id))) {
      errors.push("La marca es obligatoria.");
    }
  }

  const numericFields = [
    "categoria_id",
    "color_id",
    "medida_id",
    "marca_id",
    "duracion",
  ];
  numericFields.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null) {
      if (isNaN(Number(data[field]))) {
        errors.push(`El campo ${field} debe ser numérico.`);
      }
    }
  });

  // porcentaje_descuento entre 0 y 100
  if (data.porcentaje_descuento !== undefined && data.porcentaje_descuento !== null) {
    const val = Number(data.porcentaje_descuento);
    if (isNaN(val) || val < 0 || val > 100) {
      errors.push("El porcentaje de descuento debe estar entre 0 y 100.");
    }
  }

  // precios >= 0
  ["precio_menor", "precio_mayor", "cobertura"].forEach((field) => {
    if (data[field] !== undefined && data[field] !== null) {
      const val = Number(data[field]);
      if (isNaN(val) || val < 0) {
        errors.push(`El campo ${field} debe ser un número mayor o igual a 0.`);
      }
    }
  });

  return errors;
}

const ProductService = {
  async listProducts({ search, categoriaId, marcaId } = {}) {
    return await ProductModel.getAll({ search, categoriaId, marcaId });
  },

  async getProduct(id) {
    return await ProductModel.getById(id);
  },

  async createProduct(data) {
    const errors = validateProductPayload(data, { partial: false });
    if (errors.length > 0) {
      return { ok: false, errors };
    }

    const created = await ProductModel.create(data);
    return { ok: true, product: created };
  },

  async updateProduct(id, data) {
    const errors = validateProductPayload(data, { partial: true });
    if (errors.length > 0) {
      return { ok: false, errors };
    }

    const updated = await ProductModel.update(id, data);
    if (!updated) {
      return { ok: false, errors: ["Producto no encontrado."] };
    }

    return { ok: true, product: updated };
  },

  async deleteProduct(id) {
    // Aquí podrías validar si el producto está en inventario o en facturas
    const success = await ProductModel.remove(id);
    if (!success) {
      return { ok: false, errors: ["Producto no encontrado o no se pudo eliminar."] };
    }
    return { ok: true };
  },
};

module.exports = ProductService;
