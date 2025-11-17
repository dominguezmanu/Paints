// public/js/inventoryView.js
(function () {
  const Stock = {};

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  async function loadSucursales() {
    const select = document.getElementById("stock-filter-sucursal");
    if (!select) return;

    try {
      const res = await App.apiFetch("/api/sucursales");
      console.log("Stock - sucursales res:", res);
      const d = res.data;
      const rows = Array.isArray(d) ? d : (d && d.data) || [];

      select.innerHTML = '<option value="">Todas</option>';

      rows.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.nombre;
        select.appendChild(opt);
      });
    } catch (err) {
      console.error("Error cargando sucursales para stock:", err);
    }
  }

  async function loadStock() {
    const tbody = document.getElementById("stock-table-body");
    const countEl = document.getElementById("stock-count");
    const msgEl = document.getElementById("stock-message");
    if (!tbody) return;

    const search =
      (document.getElementById("stock-filter-search")?.value || "").trim();
    const sucursalId =
      document.getElementById("stock-filter-sucursal")?.value || "";

    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (sucursalId) params.append("sucursal_id", sucursalId);

    let url = "/api/inventario/existencias";
    const q = params.toString();
    if (q) url += "?" + q;

    setText(msgEl, "Cargando existencias...");
    tbody.innerHTML = "";

    try {
      const res = await App.apiFetch(url);
      console.log("Stock - existencias res:", res);

      const d = res.data;
      const rows = Array.isArray(d) ? d : (d && d.data) || [];

      if (!res.ok) {
        setText(msgEl, "No se pudieron obtener las existencias.");
        setText(countEl, "0 registros");
        return;
      }

      setText(
        countEl,
        `${rows.length} registro${rows.length === 1 ? "" : "s"}`
      );

      if (!rows.length) {
        setText(msgEl, "No se encontraron existencias con los filtros actuales.");
        tbody.innerHTML = "";
        return;
      }

      setText(msgEl, "");
      tbody.innerHTML = "";

      rows.forEach((r) => {
        const tr = document.createElement("tr");

        const tdProd = document.createElement("td");
        tdProd.textContent = r.producto_nombre || "";

        const tdSuc = document.createElement("td");
        tdSuc.textContent = r.sucursal_nombre || "";

        const tdExist = document.createElement("td");
        tdExist.textContent = r.existencia != null ? r.existencia : "";

        tr.appendChild(tdProd);
        tr.appendChild(tdSuc);
        tr.appendChild(tdExist);

        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Error cargando existencias:", err);
      setText(
        msgEl,
        "Error al cargar existencias. Revisa la consola o la API."
      );
      setText(countEl, "0 registros");
    }
  }

  Stock.initStockView = function () {
    const form = document.getElementById("stock-filter-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        loadStock();
      });
    }

    loadSucursales().then(loadStock).catch(loadStock);
  };

  window.Stock = Stock;
})();
