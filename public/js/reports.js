// public/js/reports.js
(function () {
  const Reports = {};

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function formatMoney(q) {
    return "Q " + Number(q || 0).toFixed(2);
  }

  function getDateRange() {
    const from = document.getElementById("reports-from")?.value || "";
    const to = document.getElementById("reports-to")?.value || "";
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    return params.toString();
  }

  async function loadResumen() {
    const q = getDateRange();
    let url = "/api/reportes/ventas/resumen";
    if (q) url += "?" + q;

    try {
      const res = await App.apiFetch(url);
      console.log("Reports - resumen:", res);

      if (!res.ok || !res.data) return;

      const d = res.data;

      setText(
        document.getElementById("rep-total-facturado"),
        formatMoney(d.total_facturado)
      );
      setText(
        document.getElementById("rep-subtotal"),
        formatMoney(d.subtotal)
      );
      setText(
        document.getElementById("rep-descuento"),
        formatMoney(d.total_descuento)
      );
      setText(
        document.getElementById("rep-facturas"),
        String(d.facturas || 0)
      );
      setText(
        document.getElementById("rep-promedio"),
        "Promedio: " + formatMoney(d.promedio_factura)
      );
    } catch (err) {
      console.error("Error cargando resumen de reportes:", err);
    }
  }

  async function loadTopProductos() {
    const qBase = getDateRange();
    const params = new URLSearchParams(qBase);
    params.append("limit", "5");
    let url = "/api/reportes/ventas/top-productos?" + params.toString();

    const tbody = document.getElementById("rep-top-body");
    const countEl = document.getElementById("rep-top-count");
    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='3'>Cargando...</td></tr>";

    try {
      const res = await App.apiFetch(url);
      console.log("Reports - top productos:", res);

      const d = res.data;
      const rows = Array.isArray(d) ? d : (d && d.data) || [];

      setText(
        countEl,
        `${rows.length} producto${rows.length === 1 ? "" : "s"}`
      );

      if (!rows.length) {
        tbody.innerHTML =
          "<tr><td colspan='3'>No hay datos para el rango seleccionado.</td></tr>";
        return;
      }

      tbody.innerHTML = "";
      rows.forEach((r) => {
        const tr = document.createElement("tr");

        const tdNombre = document.createElement("td");
        tdNombre.textContent = r.nombre;

        const tdUnidades = document.createElement("td");
        tdUnidades.textContent = r.unidades;

        const tdTotal = document.createElement("td");
        tdTotal.textContent = formatMoney(r.total);

        tr.appendChild(tdNombre);
        tr.appendChild(tdUnidades);
        tr.appendChild(tdTotal);

        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Error cargando top productos:", err);
      tbody.innerHTML =
        "<tr><td colspan='3'>Error al cargar top productos.</td></tr>";
    }
  }

  async function loadVentasPorDia() {
    const q = getDateRange();
    let url = "/api/reportes/ventas/por-dia";
    if (q) url += "?" + q;

    const tbody = document.getElementById("rep-days-body");
    const msgEl = document.getElementById("rep-message");
    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='3'>Cargando...</td></tr>";
    setText(msgEl, "");

    try {
      const res = await App.apiFetch(url);
      console.log("Reports - ventas por día:", res);

      const d = res.data;
      const rows = Array.isArray(d) ? d : (d && d.data) || [];

      if (!rows.length) {
        tbody.innerHTML =
          "<tr><td colspan='3'>No hay ventas en el rango seleccionado.</td></tr>";
        setText(msgEl, "");
        return;
      }

      tbody.innerHTML = "";
      rows.forEach((r) => {
        const tr = document.createElement("tr");

        const tdFecha = document.createElement("td");
        tdFecha.textContent = r.fecha;

        const tdFact = document.createElement("td");
        tdFact.textContent = r.facturas;

        const tdTotal = document.createElement("td");
        tdTotal.textContent = formatMoney(r.total);

        tr.appendChild(tdFecha);
        tr.appendChild(tdFact);
        tr.appendChild(tdTotal);

        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Error cargando ventas por día:", err);
      tbody.innerHTML =
        "<tr><td colspan='3'>Error al cargar ventas por día.</td></tr>";
      setText(msgEl, "Error al cargar ventas por día.");
    }
  }

  Reports.initReportsView = function () {
    // Por defecto: últimos 30 días
    const toInput = document.getElementById("reports-to");
    const fromInput = document.getElementById("reports-from");
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    const from = new Date();
    from.setDate(today.getDate() - 29);
    const fromStr = from.toISOString().slice(0, 10);

    if (toInput && !toInput.value) toInput.value = toStr;
    if (fromInput && !fromInput.value) fromInput.value = fromStr;

    const form = document.getElementById("reports-filter-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        loadResumen();
        loadTopProductos();
        loadVentasPorDia();
      });
    }

    // Cargar todo al entrar
    loadResumen();
    loadTopProductos();
    loadVentasPorDia();
  };

  window.Reports = Reports;
})();
