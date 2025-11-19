// public/js/quotes.js
(function () {
  const Quotes = {};
  let allProducts = [];
  let cart = [];
  let lastCotizacionId = null;

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function formatMoney(q) {
    return "Q " + Number(q || 0).toFixed(2);
  }

  function findProductMatches(term) {
    const t = term.toLowerCase();
    if (!t || t.length < 2) return [];
    return allProducts
      .filter((p) => {
        const name = (p.nombre || "").toLowerCase();
        const idStr = String(p.id || "");
        return name.includes(t) || idStr.includes(t);
      })
      .slice(0, 10);
  }

  function renderSearchResults(term) {
    const box = document.getElementById("q-search-results");
    if (!box) return;
    box.innerHTML = "";

    const matches = findProductMatches(term);
    if (matches.length === 0) {
      if (term && term.length >= 2) {
        const div = document.createElement("div");
        div.className = "dropdown-item disabled";
        div.textContent = "Sin resultados";
        box.appendChild(div);
      }
      return;
    }

    matches.forEach((p) => {
      const div = document.createElement("div");
      div.className = "dropdown-item";
      const precio = p.precio_mayor != null ? Number(p.precio_mayor) : 0;
      div.textContent = `[#${p.id}] ${p.nombre} · ${formatMoney(precio)}`;
      div.addEventListener("click", () => {
        addToCart(p);
        document.getElementById("q-search-product").value = "";
        box.innerHTML = "";
      });
      box.appendChild(div);
    });
  }

  function addToCart(prod) {
    const existing = cart.find((i) => i.id === prod.id);
    if (existing) {
      existing.cantidad += 1;
    } else {
      const precio =
        prod.precio_mayor != null ? Number(prod.precio_mayor) : 0;
      cart.push({
        id: prod.id,
        nombre: prod.nombre,
        precio_unitario: precio,
        cantidad: 1,
      });
    }
    renderCart();
  }

  function updateCartSummary() {
    const summaryEl = document.getElementById("q-cart-summary");
    const totalEl = document.getElementById("q-cart-total");

    let items = 0;
    let total = 0;

    cart.forEach((i) => {
      items += i.cantidad;
      total += i.cantidad * i.precio_unitario;
    });

    setText(
      summaryEl,
      `${items} ítem${items === 1 ? "" : "s"} · ${formatMoney(total)}`
    );
    setText(totalEl, formatMoney(total));
  }

  function renderCart() {
    const tbody = document.getElementById("q-cart-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!cart.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.style.textAlign = "center";
      td.style.fontSize = "0.9rem";
      td.textContent = "No hay productos en el carrito.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      updateCartSummary();
      return;
    }

    cart.forEach((item, idx) => {
      const tr = document.createElement("tr");

      const tdProd = document.createElement("td");
      tdProd.textContent = item.nombre;

      const tdPrecio = document.createElement("td");
      tdPrecio.textContent = formatMoney(item.precio_unitario);

      const tdCant = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.value = item.cantidad;
      input.className = "input";
      input.style.width = "80px";
      input.addEventListener("change", () => {
        const val = Number(input.value || 0);
        item.cantidad = val > 0 ? val : 1;
        renderCart();
      });
      tdCant.appendChild(input);

      const tdSub = document.createElement("td");
      tdSub.textContent = formatMoney(
        item.cantidad * item.precio_unitario
      );

      const tdAcc = document.createElement("td");
      const btnDel = document.createElement("button");
      btnDel.className = "btn btn-secondary";
      btnDel.textContent = "Quitar";
      btnDel.addEventListener("click", () => {
        cart.splice(idx, 1);
        renderCart();
      });
      tdAcc.appendChild(btnDel);

      tr.appendChild(tdProd);
      tr.appendChild(tdPrecio);
      tr.appendChild(tdCant);
      tr.appendChild(tdSub);
      tr.appendChild(tdAcc);

      tbody.appendChild(tr);
    });

    updateCartSummary();
  }

  async function loadProducts() {
    try {
      const res = await App.apiFetch("/api/productos");
      console.log("Quotes - productos:", res);
      const d = res.data;
      let arr = [];

      if (Array.isArray(d)) arr = d;
      else if (d && Array.isArray(d.data)) arr = d.data;
      else if (d && typeof d === "object") {
        for (const k of Object.keys(d)) {
          if (Array.isArray(d[k])) {
            arr = d[k];
            break;
          }
        }
      }

      allProducts = arr;
    } catch (err) {
      console.error("Error cargando productos para cotizaciones:", err);
      allProducts = [];
    }
  }

  async function saveQuote() {
  const msgEl = document.getElementById("q-message");
  const btnPdf = document.getElementById("q-btn-pdf");
  setText(msgEl, "");
  if (btnPdf) {
    btnPdf.disabled = true;
  }
  lastCotizacionId = null;

  if (!cart.length) {
    setText(msgEl, "El carrito está vacío.");
    return;
  }

  const nit = document.getElementById("q-nit")?.value.trim() || null;
  const nombre =
    document.getElementById("q-nombre")?.value.trim() || null;
  const direccion =
    document.getElementById("q-direccion")?.value.trim() || null;
  const correo =
    document.getElementById("q-correo")?.value.trim() || null;

  const payload = {
    nit,
    nombre,
    direccion,
    correo,
    items: cart.map((i) => ({
      producto_id: i.id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
    })),
  };

  try {
    setText(msgEl, "Guardando cotización...");
    const res = await App.apiFetch("/api/cotizaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("Quotes - guardar res:", res);

    if (!res.ok) {
      setText(
        msgEl,
        "No se pudo guardar la cotización: " + (res.error || "Error desconocido.")
      );
      return;
    }

    // Desempaquetar la respuesta: puede venir como {ok, data:{...}}
    let info = res.data;
    if (info && typeof info === "object" && "data" in info) {
      info = info.data;
    }

    const id = info?.cotizacion_id;
    const total = info?.total || 0;
    lastCotizacionId = id;

    setText(
      msgEl,
      `Cotización #${id} guardada correctamente. Total: ${formatMoney(
        total
      )}`
    );

    if (btnPdf && id) {
      btnPdf.disabled = false;
    }

    // Limpiar carrito
    cart = [];
    renderCart();
  } catch (err) {
    console.error("Error guardando cotización:", err);
    setText(
      msgEl,
      "Error al guardar la cotización. Revisa la consola o la API."
    );
  }
}

  function setupPdfButton() {
    const btnPdf = document.getElementById("q-btn-pdf");
    if (!btnPdf) return;

    btnPdf.addEventListener("click", (e) => {
      e.preventDefault();
      if (!lastCotizacionId) return;
      const url = `/api/cotizaciones/${lastCotizacionId}/pdf`;
      const fileName = `cotizacion-${lastCotizacionId}.pdf`;
      if (window.App && typeof App.downloadPdf === "function") {
        App.downloadPdf(url, fileName);
      } else {
        window.open(url, "_blank");
      }
    });
  }

  Quotes.initQuotesView = function () {
    cart = [];
    lastCotizacionId = null;
    renderCart();

    loadProducts();

    const searchInput = document.getElementById("q-search-product");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        renderSearchResults(e.target.value || "");
      });
    }

    const btnSave = document.getElementById("q-btn-save");
    if (btnSave) {
      btnSave.addEventListener("click", (e) => {
        e.preventDefault();
        saveQuote();
      });
    }

    setupPdfButton();
  };

  window.Quotes = Quotes;
})();
