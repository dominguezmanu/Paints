// public/js/reportsSales.js
(function () {
  const ReportsSales = {};

  function formatMoney(q) {
    return "Q " + Number(q || 0).toFixed(2);
  }

  function setTextById(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setDateDefaults() {
    const fromInput = document.getElementById("rep-from");
    const toInput = document.getElementById("rep-to");

    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);

    const from = new Date();
    from.setDate(today.getDate() - 29);
    const fromStr = from.toISOString().slice(0, 10);

    if (fromInput && !fromInput.value) fromInput.value = fromStr;
    if (toInput && !toInput.value) toInput.value = toStr;
  }

  async function loadReports() {
    const fromInput = document.getElementById("rep-from");
    const toInput = document.getElementById("rep-to");
    const rangeText = document.getElementById("rep-sales-range-text");

    const from = fromInput?.value || "";
    const to = toInput?.value || "";

    if (rangeText) {
      rangeText.textContent = `Rango: ${from || "-"} a ${to || "-"}`;
    }

    const totalBody = document.getElementById("rep-total-tbody");
    const topMontoBody = document.getElementById("rep-top-monto-body");
    const topCantBody = document.getElementById("rep-top-cantidad-body");

    // Limpieza inicial
    if (totalBody) {
      totalBody.innerHTML =
        '<tr><td colspan="3" style="text-align:center;font-size:0.9rem;">Cargando...</td></tr>';
    }
    if (topMontoBody) {
      topMontoBody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;font-size:0.9rem;">Cargando...</td></tr>';
    }
    if (topCantBody) {
      topCantBody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;font-size:0.9rem;">Cargando...</td></tr>';
    }

    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);

    try {
      // 1) Resumen total + tipo de pago
      const totalRes = await App.apiFetch(
        "/api/reportes/ventas/total?" + params.toString()
      );
      console.log("ReportsSales - total:", totalRes);

      const totalData = totalRes.data?.data || totalRes.data || {};
      const totalFact = Number(totalData.total_facturado || 0);
      const porTipo = Array.isArray(totalData.por_tipo)
        ? totalData.por_tipo
        : [];

      // Por ahora solo llenamos el "Total facturado"
      setTextById("rep-total-facturado", formatMoney(totalFact));
      // Estos los dejaremos en 0 hasta que ampliemos el endpoint:
      // rep-total-subtotal, rep-total-descuento, rep-total-facturas, rep-total-promedio

      if (!totalBody) {
        console.warn(
          "No se encontró rep-total-tbody en el DOM, se omite tabla de tipos de pago."
        );
      } else if (!porTipo.length) {
        totalBody.innerHTML =
          '<tr><td colspan="3" style="text-align:center;font-size:0.9rem;">Sin datos para el rango seleccionado.</td></tr>';
      } else {
        totalBody.innerHTML = "";
        porTipo.forEach((row) => {
          const tr = document.createElement("tr");

          const tdTipo = document.createElement("td");
          tdTipo.textContent = row.tipo || "";

          const tdMonto = document.createElement("td");
          tdMonto.textContent = formatMoney(row.monto);

          const tdPct = document.createElement("td");
          const pct =
            totalFact > 0
              ? ((Number(row.monto || 0) * 100) / totalFact).toFixed(1)
              : "0.0";
          tdPct.textContent = pct + " %";

          tr.appendChild(tdTipo);
          tr.appendChild(tdMonto);
          tr.appendChild(tdPct);
          totalBody.appendChild(tr);
        });
      }

      // 2) Top productos por dinero
      const topMontoRes = await App.apiFetch(
        "/api/reportes/ventas/top-productos-monto?" +
          params.toString() +
          "&limit=10"
      );
      console.log("ReportsSales - top monto:", topMontoRes);

      const topMontoData = topMontoRes.data?.data || topMontoRes.data || {};
      const topMontoList = Array.isArray(topMontoData.productos)
        ? topMontoData.productos
        : [];

      if (!topMontoBody) {
        console.warn("No se encontró rep-top-monto-body en el DOM.");
      } else if (!topMontoList.length) {
        topMontoBody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;font-size:0.9rem;">Sin datos para el rango seleccionado.</td></tr>';
      } else {
        topMontoBody.innerHTML = "";
        topMontoList.forEach((p, idx) => {
          const tr = document.createElement("tr");

          const tdRank = document.createElement("td");
          tdRank.textContent = idx + 1;

          const tdProd = document.createElement("td");
          tdProd.textContent = p.producto || "";

          const tdUni = document.createElement("td");
          tdUni.textContent = p.total_unidades || 0;

          const tdTotal = document.createElement("td");
          tdTotal.textContent = formatMoney(p.total_monto);

          tr.appendChild(tdRank);
          tr.appendChild(tdProd);
          tr.appendChild(tdUni);
          tr.appendChild(tdTotal);
          topMontoBody.appendChild(tr);
        });
      }

      // 3) Top productos por cantidad
      const topCantRes = await App.apiFetch(
        "/api/reportes/ventas/top-productos-cantidad?" +
          params.toString() +
          "&limit=10"
      );
      console.log("ReportsSales - top cantidad:", topCantRes);

      const topCantData = topCantRes.data?.data || topCantRes.data || {};
      const topCantList = Array.isArray(topCantData.productos)
        ? topCantData.productos
        : [];

      if (!topCantBody) {
        console.warn("No se encontró rep-top-cantidad-body en el DOM.");
      } else if (!topCantList.length) {
        topCantBody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;font-size:0.9rem;">Sin datos para el rango seleccionado.</td></tr>';
      } else {
        topCantBody.innerHTML = "";
        topCantList.forEach((p, idx) => {
          const tr = document.createElement("tr");

          const tdRank = document.createElement("td");
          tdRank.textContent = idx + 1;

          const tdProd = document.createElement("td");
          tdProd.textContent = p.producto || "";

          const tdUni = document.createElement("td");
          tdUni.textContent = p.total_unidades || 0;

          const tdTotal = document.createElement("td");
          tdTotal.textContent = formatMoney(p.total_monto);

          tr.appendChild(tdRank);
          tr.appendChild(tdProd);
          tr.appendChild(tdUni);
          tr.appendChild(tdTotal);
          topCantBody.appendChild(tr);
        });
      }
    } catch (err) {
      console.error("Error cargando reportes de ventas:", err);
      if (totalBody) {
        totalBody.innerHTML =
          '<tr><td colspan="3" style="text-align:center;font-size:0.9rem;">Error al cargar el resumen.</td></tr>';
      }
      if (topMontoBody) {
        topMontoBody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;font-size:0.9rem;">Error al cargar el top por monto.</td></tr>';
      }
      if (topCantBody) {
        topCantBody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;font-size:0.9rem;">Error al cargar el top por cantidad.</td></tr>';
      }
    }
  }

  ReportsSales.initReportsSalesView = function () {
    setDateDefaults();

    const form = document.getElementById("rep-sales-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        loadReports();
      });
    }

    // Carga inicial
    loadReports();
  };

  window.ReportsSales = ReportsSales;
})();
