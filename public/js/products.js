// public/js/products.js
(function () {
  const Products = {};

  let allProducts = []; // cache local de productos

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  // Saca el array de productos de la respuesta de la API sin asumir nombres
  function getArrayFromResponse(res) {
    if (!res) return [];

    const d = res.data;

    // data es directamente un array
    if (Array.isArray(d)) return d;

    // data.data es un array
    if (d && Array.isArray(d.data)) return d.data;

    // data es objeto: buscamos alguna propiedad que sea array (ej. data.productos)
    if (d && typeof d === "object") {
      for (const key of Object.keys(d)) {
        if (Array.isArray(d[key])) {
          return d[key];
        }
      }
    }

    // fallback
    if (Array.isArray(res.productos)) return res.productos;
    if (Array.isArray(res.items)) return res.items;

    return [];
  }

  // Helpers para nombres de categoría/marca robustos
  function getCategoriaNombre(p) {
    return (
      p.categoria_nombre ||
      p.categoria ||
      p.categoriaName ||
      p.category_name ||
      p.category ||
      ""
    );
  }

  function getMarcaNombre(p) {
    return (
      p.marca_nombre ||
      p.marca ||
      p.brand_name ||
      p.brand ||
      ""
    );
  }

  // Construye los combos a partir de los productos cargados
  function buildFilterCombos() {
    const catSelect = document.getElementById("filter-categoria");
    const marcaSelect = document.getElementById("filter-marca");
    if (!catSelect || !marcaSelect) return;

    const categoriasSet = new Set();
    const marcasSet = new Set();

    allProducts.forEach((p) => {
      const c = getCategoriaNombre(p);
      const m = getMarcaNombre(p);
      if (c) categoriasSet.add(c);
      if (m) marcasSet.add(m);
    });

    // Categorías
    catSelect.innerHTML = '<option value="">Todas</option>';
    Array.from(categoriasSet)
      .sort()
      .forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        catSelect.appendChild(opt);
      });

    // Marcas
    marcaSelect.innerHTML = '<option value="">Todas</option>';
    Array.from(marcasSet)
      .sort()
      .forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        marcaSelect.appendChild(opt);
      });
  }

  // Renderiza la tabla aplicando filtros en el navegador
  function renderProductsList() {
    const tbody = document.getElementById("products-table-body");
    const countEl = document.getElementById("products-count");
    const msgEl = document.getElementById("products-message");
    if (!tbody) return;

    const search = (document.getElementById("filter-search")?.value || "")
      .toLowerCase()
      .trim();
    const catFilter = document.getElementById("filter-categoria")?.value || "";
    const marcaFilter = document.getElementById("filter-marca")?.value || "";

    let filtered = allProducts.slice();

    filtered = filtered.filter((p) => {
      const nombre = (p.nombre || "").toLowerCase();
      const desc =
        (p.descripcion || p.descripcion_larga || p.description || "").toLowerCase();
      const categoria = getCategoriaNombre(p);
      const marca = getMarcaNombre(p);

      if (search && !(nombre + " " + desc).includes(search)) return false;
      if (catFilter && categoria !== catFilter) return false;
      if (marcaFilter && marca !== marcaFilter) return false;

      return true;
    });

    setText(
      countEl,
      `${filtered.length} producto${filtered.length === 1 ? "" : "s"}`
    );

    if (filtered.length === 0) {
      tbody.innerHTML = "";
      setText(msgEl, "No se encontraron productos con los filtros actuales.");
      return;
    }

    setText(msgEl, "");
    tbody.innerHTML = "";

    filtered.forEach((p) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = p.id;

      const tdNombre = document.createElement("td");
      tdNombre.textContent = p.nombre;

      const tdMarca = document.createElement("td");
      tdMarca.textContent = getMarcaNombre(p);

      const tdCategoria = document.createElement("td");
      tdCategoria.textContent = getCategoriaNombre(p);

      const tdColor = document.createElement("td");
      tdColor.textContent = p.color_nombre || p.color || "";

      const tdMedida = document.createElement("td");
      tdMedida.textContent = p.medida_nombre || p.medida || "";

      const tdPrecioMenor = document.createElement("td");
      tdPrecioMenor.textContent =
        p.precio_menor != null ? `Q ${Number(p.precio_menor).toFixed(2)}` : "";

      const tdPrecioMayor = document.createElement("td");
      tdPrecioMayor.textContent =
        p.precio_mayor != null ? `Q ${Number(p.precio_mayor).toFixed(2)}` : "";

      const tdDesc = document.createElement("td");
      tdDesc.textContent =
        p.descuento_porcentaje != null
          ? `${Number(p.descuento_porcentaje).toFixed(2)} %`
          : "";

      tr.appendChild(tdId);
      tr.appendChild(tdNombre);
      tr.appendChild(tdMarca);
      tr.appendChild(tdCategoria);
      tr.appendChild(tdColor);
      tr.appendChild(tdMedida);
      tr.appendChild(tdPrecioMenor);
      tr.appendChild(tdPrecioMayor);
      tr.appendChild(tdDesc);

      tbody.appendChild(tr);
    });
  }

  // Carga TODOS los productos una vez desde la API
  async function fetchAllProducts() {
    const msgEl = document.getElementById("products-message");
    try {
      setText(msgEl, "Cargando productos...");
      const res = await App.apiFetch("/api/productos");
      console.log("Productos (todos) res:", res);
      if (!res.ok) {
        setText(msgEl, "No se pudieron obtener los productos.");
        allProducts = [];
        return;
      }
      allProducts = getArrayFromResponse(res);
    } catch (err) {
      console.error("Error obteniendo productos:", err);
      allProducts = [];
      setText(msgEl, "Error al cargar productos. Revisa la consola o la API.");
    }
  }

  Products.initProductsView = function () {
    const form = document.getElementById("products-filter-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        renderProductsList();
      });
    }

    const catSelect = document.getElementById("filter-categoria");
    const marcaSelect = document.getElementById("filter-marca");
    if (catSelect) catSelect.addEventListener("change", renderProductsList);
    if (marcaSelect) marcaSelect.addEventListener("change", renderProductsList);

    const searchInput = document.getElementById("filter-search");
    if (searchInput) {
      searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") return;
        // si quieres búsqueda en vivo, podrías llamar aquí a renderProductsList()
      });
    }

    // Flujo: obtener productos -> armar combos -> dibujar tabla
    fetchAllProducts()
      .then(() => {
        buildFilterCombos();
        renderProductsList();
      })
      .catch((err) => {
        console.error("Error inicializando vista de productos:", err);
        renderProductsList();
      });
  };

  window.Products = Products;
})();
