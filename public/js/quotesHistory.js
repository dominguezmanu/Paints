// public/js/quotesHistory.js
(function () {
  const QuotesHistory = {};
  let selectedId = null;

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function formatMoney(q) {
    return "Q " + Number(q || 0).toFixed(2);
  }

  function formatDateStr(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleString();
  }

  async function loadList() {
    const nit = document.getElementById("qh-nit")?.value.trim() || "";
    const from = document.getElementById("qh-from")?.value || "";
    const to = document.getElementById("qh-to")?.value || "";
    const tbody = document.getElementById("qh-table-body");
    const countEl = document.getElementById("qh-count");

    if (!tbody) return;

    tbody.innerHTML =
      "<tr><td colspan='6' style='text-align:center;'>Cargando...</td></tr>";
    setText(countEl, "0 registros");

    const params = new URLSearchParams();
    params.append("limit", "50");
    if (nit) params.append("nit", nit);
    if (from) params.append("from", from);
    if (to) params.append("to", to);

    let url = "/api/cotizaciones";
    const q = params.toString();
    if (q) url += "?" + q;

    try {
      const res = await App.apiFetch(url);
      console.log("QuotesHistory - lista:", res);

      const d = res.data;
      const rows = Array.isArray(d) ? d : (d && d.data) || [];

      setText(
        countEl,
        `${rows.length} registro${rows.length === 1 ? "" : "s"}`
      );

      if (!rows.length) {
        tbody.innerHTML =
          "<tr><td colspan='6' style='text-align:center;font-size:0.9rem;'>No hay cotizaciones para los filtros actuales.</td></tr>";
        return;
      }

      tbody.innerHTML = "";

      rows.forEach((c) => {
        const tr = document.createElement("tr");

        const tdId = document.createElement("td");
        tdId.textContent = c.id;

        const tdFecha = document.createElement("td");
        tdFecha.textContent = formatDateStr(c.fecha);

        const tdCli = document.createElement("td");
        const nombre =
          ((c.nombres || "") + " " + (c.apellidos || "")).trim() ||
          "(Sin nombre)";
        tdCli.textContent = nombre;

        const tdNit = document.createElement("td");
        tdNit.textContent = c.nit || "CF";

        const tdTotal = document.createElement("td");
        tdTotal.textContent = formatMoney(c.total);

        const tdAcc = document.createElement("td");
        const btnVer = document.createElement("button");
        btnVer.className = "btn btn-primary";
        btnVer.textContent = "Ver detalle";
        btnVer.addEventListener("click", () => {
          loadDetail(c.id);
        });
        tdAcc.appendChild(btnVer);

        tr.appendChild(tdId);
        tr.appendChild(tdFecha);
        tr.appendChild(tdCli);
        tr.appendChild(tdNit);
        tr.appendChild(tdTotal);
        tr.appendChild(tdAcc);

        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Error cargando lista de cotizaciones:", err);
      tbody.innerHTML =
        "<tr><td colspan='6' style='text-align:center;font-size:0.9rem;'>Error al cargar cotizaciones.</td></tr>";
    }
  }

  async function loadDetail(id) {
    const body = document.getElementById("qh-detail-body");
    const header = document.getElementById("qh-detail-header");
    const totalEl = document.getElementById("qh-detail-total");
    const btnPdf = document.getElementById("qh-btn-pdf");

    if (!body) return;

    body.innerHTML =
      "<tr><td colspan='4' style='text-align:center;'>Cargando detalle...</td></tr>";
    setText(totalEl, "Q 0.00");
    selectedId = null;
    if (btnPdf) btnPdf.disabled = true;

    try {
      const res = await App.apiFetch(`/api/cotizaciones/${id}`);
      console.log("QuotesHistory - detalle:", res);

      const d = res.data;
      const data = d && d.data ? d.data : d; // por si viene envuelto
      if (!data || !data.cabecera) {
        body.innerHTML =
          "<tr><td colspan='4' style='text-align:center;font-size:0.9rem;'>No se encontró la cotización.</td></tr>";
        return;
      }

      const { cabecera, items } = data;

      const nombreCompleto =
        `${cabecera.nombres || ""} ${cabecera.apellidos || ""}`.trim();

      const linea = `Cotización #${cabecera.id} · Cliente: ${
        nombreCompleto || "(Sin nombre)"
      } · NIT: ${cabecera.nit || "CF"} · Fecha: ${formatDateStr(
        cabecera.fecha
      )}`;

      setText(header, linea);

      if (!items || !items.length) {
        body.innerHTML =
          "<tr><td colspan='4' style='text-align:center;font-size:0.9rem;'>Esta cotización no tiene items.</td></tr>";
        setText(totalEl, formatMoney(cabecera.total || 0));
      } else {
        body.innerHTML = "";
        items.forEach((it) => {
          const tr = document.createElement("tr");

          const tdProd = document.createElement("td");
          tdProd.textContent = it.producto_nombre || "";

          const tdCant = document.createElement("td");
          tdCant.textContent = it.cantidad;

          const tdPrecio = document.createElement("td");
          tdPrecio.textContent = formatMoney(it.precio_unitario);

          const tdSub = document.createElement("td");
          tdSub.textContent = formatMoney(it.subtotal);

          tr.appendChild(tdProd);
          tr.appendChild(tdCant);
          tr.appendChild(tdPrecio);
          tr.appendChild(tdSub);

          body.appendChild(tr);
        });

        setText(totalEl, formatMoney(cabecera.total || 0));
      }

      selectedId = cabecera.id;
      if (btnPdf && selectedId) btnPdf.disabled = false;
    } catch (err) {
      console.error("Error cargando detalle de cotización:", err);
      body.innerHTML =
        "<tr><td colspan='4' style='text-align:center;font-size:0.9rem;'>Error al cargar detalle.</td></tr>";
    }
  }

  function setupPdfButton() {
    const btnPdf = document.getElementById("qh-btn-pdf");
    if (!btnPdf) return;

    btnPdf.addEventListener("click", (e) => {
      e.preventDefault();
      if (!selectedId) return;
      const url = `/api/cotizaciones/${selectedId}/pdf`;
      const fileName = `cotizacion-${selectedId}.pdf`;
      if (window.App && typeof App.downloadPdf === "function") {
        App.downloadPdf(url, fileName);
      } else {
        window.open(url, "_blank");
      }
    });
  }

  QuotesHistory.initQuotesHistoryView = function () {
    selectedId = null;

    // Rango por defecto: últimos 30 días
    const toInput = document.getElementById("qh-to");
    const fromInput = document.getElementById("qh-from");
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    const from = new Date();
    from.setDate(today.getDate() - 29);
    const fromStr = from.toISOString().slice(0, 10);
    if (toInput && !toInput.value) toInput.value = toStr;
    if (fromInput && !fromInput.value) fromInput.value = fromStr;

    const form = document.getElementById("qh-filter-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        loadList();
      });
    }

    setupPdfButton();
    loadList();
  };

  window.QuotesHistory = QuotesHistory;
})();
