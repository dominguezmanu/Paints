// public/js/invoiceSearch.js
(function () {
  const InvoiceSearch = {};
  let selectedId = null;

  // ===== Helpers básicos =====
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

  // Extrae un array de filas desde la respuesta de la API
  function extractRowsFromData(d) {
    if (Array.isArray(d)) return d;
    if (!d || typeof d !== "object") return [];

    // Caso típico: { ok:true, data:[...] }
    if (Array.isArray(d.data)) return d.data;

    // Otros posibles: { facturas:[...] }, { rows:[...] }, etc.
    for (const key of Object.keys(d)) {
      if (Array.isArray(d[key])) {
        return d[key];
      }
    }
    return [];
  }

  // Extrae {cabecera, items, pagos} sin importar cómo venga anidado
  function extractFacturaData(d) {
    if (!d || typeof d !== "object") return null;

    // Directo: { cabecera, items, pagos }
    if (d.cabecera) return d;

    // Típico backend: { ok:true, data:{ cabecera, ... } }
    if (d.data && d.data.cabecera) return d.data;

    // Por si alguien envolvió aún más
    for (const key of Object.keys(d)) {
      const val = d[key];
      if (val && typeof val === "object" && val.cabecera) {
        return val;
      }
      if (val && typeof val === "object" && val.data && val.data.cabecera) {
        return val.data;
      }
    }
    return null;
  }

  // ===== LISTA DE FACTURAS =====
  async function loadList() {
    const idStr = document.getElementById("inv-id")?.value.trim() || "";
    const correlativo =
      document.getElementById("inv-correlativo")?.value.trim() || "";
    const nit = document.getElementById("inv-nit")?.value.trim() || "";
    const fromStr = document.getElementById("inv-from")?.value || "";
    const toStr = document.getElementById("inv-to")?.value || "";
    const tbody = document.getElementById("inv-table-body");
    const countEl = document.getElementById("inv-count");

    if (!tbody) return;

    tbody.innerHTML =
      "<tr><td colspan='8' style='text-align:center;'>Cargando...</td></tr>";
    setText(countEl, "0 facturas");

    // Rango de fechas en JS (para no depender de cómo MySQL interpreta el formato)
    let fromDate = null;
    let toDate = null;
    if (fromStr) {
      fromDate = new Date(fromStr + "T00:00:00");
    }
    if (toStr) {
      toDate = new Date(toStr + "T23:59:59");
    }

    // Siempre pedimos hasta 200 y filtramos por fecha en frontend
    const params = new URLSearchParams();
    params.append("limit", "200");
    if (idStr) params.append("id", idStr); // si viene ID, el backend ya limitará
    if (correlativo) params.append("correlativo", correlativo);
    if (nit) params.append("nit", nit);

    let url = "/api/facturas";
    const q = params.toString();
    if (q) url += "?" + q;

    try {
      const res = await App.apiFetch(url);
      console.log("InvoiceSearch - Lista (raw):", res);

      const rawRows = extractRowsFromData(res.data);

      // Filtro adicional por fechas en el frontend
      let rows = rawRows;
      if (fromDate || toDate) {
        rows = rawRows.filter((f) => {
          const d = new Date(f.fecha);
          if (isNaN(d.getTime())) return true; // si no se puede parsear, mejor lo mostramos

          if (fromDate && d < fromDate) return false;
          if (toDate && d > toDate) return false;
          return true;
        });
      }

      setText(
        countEl,
        `${rows.length} factura${rows.length === 1 ? "" : "s"}`
      );

      if (!rows.length) {
        tbody.innerHTML =
          "<tr><td colspan='8' style='text-align:center;font-size:0.9rem;'>No hay facturas para los filtros actuales.</td></tr>";
        return;
      }

      tbody.innerHTML = "";

      rows.forEach((f) => {
        const tr = document.createElement("tr");

        const tdId = document.createElement("td");
        tdId.textContent = f.id;

        const tdFecha = document.createElement("td");
        tdFecha.textContent = formatDateStr(f.fecha);

        const tdCor = document.createElement("td");
        const corTexto = f.correlativo
          ? `${f.letra_serie || ""}-${f.correlativo}`
          : "-";
        tdCor.textContent = corTexto;

        const tdCli = document.createElement("td");
        const nombre =
          ((f.nombres || "") + " " + (f.apellidos || "")).trim() ||
          "(Sin nombre)";
        tdCli.textContent = nombre;

        const tdNit = document.createElement("td");
        tdNit.textContent = f.nit || "CF";

        const tdTotal = document.createElement("td");
        tdTotal.textContent = formatMoney(f.total_factura);

        const tdEstado = document.createElement("td");
        tdEstado.textContent = f.estado || "";

        const tdAcc = document.createElement("td");
        const btnVer = document.createElement("button");
        btnVer.className = "btn btn-primary";
        btnVer.textContent = "Ver detalle";
        btnVer.addEventListener("click", () => {
          loadDetail(f.id);
        });
        tdAcc.appendChild(btnVer);

        tr.appendChild(tdId);
        tr.appendChild(tdFecha);
        tr.appendChild(tdCor);
        tr.appendChild(tdCli);
        tr.appendChild(tdNit);
        tr.appendChild(tdTotal);
        tr.appendChild(tdEstado);
        tr.appendChild(tdAcc);

        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Error cargando lista de facturas:", err);
      tbody.innerHTML =
        "<tr><td colspan='8' style='text-align:center;font-size:0.9rem;'>Error al cargar facturas.</td></tr>";
    }
  }

  // ===== DETALLE DE FACTURA =====
     // Desempaqueta hasta encontrar { cabecera, items, pagos }
  function unwrapFactura(obj) {
    let x = obj;

    // Intentamos como máximo 4 niveles por seguridad
    for (let i = 0; i < 4; i++) {
      if (!x || typeof x !== "object") return null;

      // Si ya tiene forma de factura, la usamos
      if (x.cabecera || x.items || x.pagos) {
        return x;
      }

      // Caso típico: { ok:true, data:{...} }
      if (x.data) {
        x = x.data;
        continue;
      }

      break;
    }
    return null;
  }

    async function loadDetail(id) {
    const body = document.getElementById("inv-detail-body");
    const payBody = document.getElementById("inv-payments-body");
    const header = document.getElementById("inv-detail-header");
    const subEl = document.getElementById("inv-total-sub");
    const descEl = document.getElementById("inv-total-desc");
    const factEl = document.getElementById("inv-total-fact");
    const btnPdf = document.getElementById("inv-btn-pdf");

    if (!body || !payBody) return;

    body.innerHTML =
      "<tr><td colspan='5' style='text-align:center;'>Cargando detalle...</td></tr>";
    payBody.innerHTML =
      "<tr><td colspan='3' style='text-align:center;'>Cargando pagos...</td></tr>";
    setText(subEl, "Q 0.00");
    setText(descEl, "Q 0.00");
    setText(factEl, "Q 0.00");
    selectedId = null;
    if (btnPdf) btnPdf.disabled = true;

    try {
      const res = await App.apiFetch(`/api/facturas/${id}`);
      console.log("InvoiceSearch - detalle (raw):", res);

      // JSON real viene en res.data
      const json = res && res.data ? res.data : {};
      const cabecera = json.cabecera || null;
      const items = Array.isArray(json.items) ? json.items : [];
      const pagos = Array.isArray(json.pagos) ? json.pagos : [];

      if (!cabecera) {
        body.innerHTML =
          "<tr><td colspan='5' style='text-align:center;font-size:0.9rem;'>No se encontró la factura.</td></tr>";
        payBody.innerHTML =
          "<tr><td colspan='3' style='text-align:center;font-size:0.9rem;'>Sin datos.</td></tr>";
        console.log("InvoiceSearch - detalle JSON:", json);
        return;
      }

      const nombreCli =
        `${cabecera.nombres || ""} ${cabecera.apellidos || ""}`.trim();
      const suc = cabecera.sucursal_nombre || "";
      const usuario = cabecera.usuario_username || "";
      const corTexto = cabecera.correlativo
        ? `${cabecera.letra_serie || ""}-${cabecera.correlativo}`
        : "(sin correlativo)";

      const headerText = `Factura #${cabecera.id} · ${corTexto} · Cliente: ${
        nombreCli || "(Sin nombre)"
      } · NIT: ${cabecera.nit || "CF"} · Sucursal: ${
        suc || "-"
      } · Usuario: ${usuario || ""} · Fecha: ${formatDateStr(
        cabecera.fecha
      )}`;

      setText(header, headerText);

      // ----- productos -----
      if (!items.length) {
        body.innerHTML =
          "<tr><td colspan='5' style='text-align:center;font-size:0.9rem;'>Esta factura no tiene detalle.</td></tr>";
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

          const tdDesc = document.createElement("td");
          tdDesc.textContent = formatMoney(it.descuento_aplicado || 0);

          const tdSub = document.createElement("td");
          tdSub.textContent = formatMoney(it.subtotal);

          tr.appendChild(tdProd);
          tr.appendChild(tdCant);
          tr.appendChild(tdPrecio);
          tr.appendChild(tdDesc);
          tr.appendChild(tdSub);

          body.appendChild(tr);
        });
      }

      // ----- pagos -----
      if (!pagos.length) {
        payBody.innerHTML =
          "<tr><td colspan='3' style='text-align:center;font-size:0.9rem;'>Sin pagos registrados.</td></tr>";
      } else {
        payBody.innerHTML = "";
        pagos.forEach((p) => {
          const tr = document.createElement("tr");

          const tdTipo = document.createElement("td");
          tdTipo.textContent = p.tipo_pago || "";

          const tdMonto = document.createElement("td");
          tdMonto.textContent = formatMoney(p.monto);

          const tdRef = document.createElement("td");
          tdRef.textContent = p.referencia || "";

          tr.appendChild(tdTipo);
          tr.appendChild(tdMonto);
          tr.appendChild(tdRef);

          payBody.appendChild(tr);
        });
      }

      setText(subEl, formatMoney(cabecera.subtotal || 0));
      setText(descEl, formatMoney(cabecera.total_descuento || 0));
      setText(factEl, formatMoney(cabecera.total_factura || 0));

      selectedId = cabecera.id;
      if (btnPdf && selectedId) btnPdf.disabled = false;
    } catch (err) {
      console.error("Error cargando detalle de factura:", err);
      body.innerHTML =
        "<tr><td colspan='5' style='text-align:center;font-size:0.9rem;'>Error al cargar detalle.</td></tr>";
      payBody.innerHTML =
        "<tr><td colspan='3' style='text-align:center;font-size:0.9rem;'>Error al cargar pagos.</td></tr>";
    }
  }




  // ===== Botón PDF =====
  function setupPdfButton() {
    const btn = document.getElementById("inv-btn-pdf");
    if (!btn) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!selectedId) return;
      const url = `/api/facturas/${selectedId}/pdf`;
      const fileName = `factura-${selectedId}.pdf`;
      if (window.App && typeof App.downloadPdf === "function") {
        App.downloadPdf(url, fileName);
      } else {
        window.open(url, "_blank");
      }
    });
  }

  // ===== Inicializar vista =====
  InvoiceSearch.initInvoiceSearchView = function () {
    selectedId = null;

    // Rango por defecto: últimos 30 días
    const toInput = document.getElementById("inv-to");
    const fromInput = document.getElementById("inv-from");
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    const from = new Date();
    from.setDate(today.getDate() - 29);
    const fromStr = from.toISOString().slice(0, 10);
    if (toInput && !toInput.value) toInput.value = toStr;
    if (fromInput && !fromInput.value) fromInput.value = fromStr;

    const form = document.getElementById("inv-filter-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        loadList();
      });
    }

    setupPdfButton();
    loadList();
  };

  window.InvoiceSearch = InvoiceSearch;
})();
