// src/controllers/ProductController.js
const ProductService = require("../services/ProductService");

const ProductController = {
  // GET /api/productos?search=...&categoriaId=...&marcaId=...
  async list(req, res) {
    try {
      const { search, categoriaId, marcaId } = req.query;
      const products = await ProductService.listProducts({
        search,
        categoriaId,
        marcaId,
      });
      res.json({ ok: true, products });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Error al obtener productos" });
    }
  },

  // GET /api/productos/:id
  async getOne(req, res) {
    try {
      const id = Number(req.params.id);
      const product = await ProductService.getProduct(id);
      if (!product) {
        return res.status(404).json({ ok: false, error: "Producto no encontrado" });
      }
      res.json({ ok: true, product });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Error al obtener el producto" });
    }
  },

  // POST /api/productos
  async create(req, res) {
    try {
      const result = await ProductService.createProduct(req.body);
      if (!result.ok) {
        return res.status(400).json({ ok: false, errors: result.errors });
      }
      res.status(201).json({ ok: true, product: result.product });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Error al crear el producto" });
    }
  },

  // PUT /api/productos/:id
  async update(req, res) {
    try {
      const id = Number(req.params.id);
      const result = await ProductService.updateProduct(id, req.body);

      if (!result.ok) {
        const status = result.errors?.includes("Producto no encontrado.")
          ? 404
          : 400;
        return res.status(status).json({ ok: false, errors: result.errors });
      }

      res.json({ ok: true, product: result.product });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Error al actualizar el producto" });
    }
  },

  // DELETE /api/productos/:id
  async remove(req, res) {
    try {
      const id = Number(req.params.id);
      const result = await ProductService.deleteProduct(id);

      if (!result.ok) {
        return res.status(400).json({ ok: false, errors: result.errors });
      }

      res.json({ ok: true, message: "Producto eliminado correctamente" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Error al eliminar el producto" });
    }
  },
};

module.exports = ProductController;
