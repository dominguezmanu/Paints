// public/js/sales.js

(function () {
  const SALES_TOKEN_KEY = "paints_token";

  let salesSucursales = [];
  let paymentTypes = [];

  function salesGetToken() {
    return localStorage.getItem(SALES_TOKEN_KEY);
  }

  function salesFormatMoney(n) {
    return Number(n || 0).toFixed(2);
  }

  // --------- BUSCAR PRODUCTOS POR API ---------

  function searchProducts(term) {
    const token = salesGetToken();
    if (!token) return Promise.resolve([]);

    const url = "/api/productos?search=" + encodeURIComponent(term);

    return fetch(url, {
      headers: { Authorization: "Bearer " + token },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) return [];
        return data.products || [];
      })
      .catch((err) => {
        console.error("Error buscando productos:", err);
        return [];
      });
  }

  // --------- CLIENTE POR NIT ---------

  function setupClienteNitSection() {
    const nitInput = document.getElementById("sales-cliente-nit");
    const searchBtn = document.getElementById("sales-cliente-search");
    const idInput = document.getElementById("sales-cliente-id");
    const nombresInput = document.getElementById("sales-cliente-nombres");
    const apellidosInput = document.getElementById("sales-cliente-apellidos");
    const correoInput = document.getElementById("sales-cliente-correo");
    const direccionInput = document.getElementById("sales-cliente-direccion");
    const msgEl = document.getElementById("sales-message");

    if (!nitInput || !searchBtn || !idInput) return;

    function limpiarCamposCliente(mantenerNit) {
      if (!mantenerNit) nitInput.value = "";
      idInput.value = "";
      if (nombresInput) nombresInput.value = "";
      if (apellidosInput) apellidosInput.value = "";
      if (correoInput) correoInput.value = "";
      if (direccionInput) direccionInput.value = "";
    }

    async function buscarPorNit() {
      const nit = (nitInput.value || "").trim();
      const token = salesGetToken();

      if (!nit) {
        limpiarCamposCliente(false);
        if (msgEl) {
          msgEl.textContent = "Ingresa un NIT para buscar al cliente.";
          msgEl.style.color = "#d93025";
        }
        return;
      }

      if (!token) {
        if (msgEl) {
          msgEl.textContent = "Debes iniciar sesión para buscar clientes.";
          msgEl.style.color = "#d93025";
        }
        return;
      }

      try {
        const res = await fetch(
          "/api/clientes/buscar-por-nit?nit=" + encodeURIComponent(nit),
          {
            headers: { Authorization: "Bearer " + token },
          }
        );
        const data = await res.json();

        if (data.ok && data.cliente) {
          const c = data.cliente;
          idInput.value = c.id;
          if (nombresInput) nombresInput.value = c.nombres || "";
          if (apellidosInput) apellidosInput.value = c.apellidos || "";
          if (correoInput) correoInput.value = c.correo || "";
          if (direccionInput) direccionInput.value = c.direccion || "";
          if (msgEl) {
            msgEl.textContent = "Cliente encontrado por NIT.";
            msgEl.style.color = "#0b8457";
          }
        } else {
          // No encontrado: preparar para nuevo cliente
          idInput.value = "";
          if (nombresInput) nombresInput.value = "";
          if (apellidosInput) apellidosInput.value = "";
          if (correoInput) correoInput.value = "";
          if (direccionInput) direccionInput.value = "";
          if (msgEl) {
            msgEl.textContent =
              "No se encontró cliente con ese NIT. Ingresa los datos para registrarlo.";
            msgEl.style.color = "#64748b";
          }
          if (nombresInput) nombresInput.focus();
        }
      } catch (err) {
        console.error("Error buscando cliente por NIT:", err);
        if (msgEl) {
          msgEl.textContent =
            "Error al buscar el cliente. Intenta nuevamente.";
          msgEl.style.color = "#d93025";
        }
      }
    }

    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      buscarPorNit();
    });

    nitInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        buscarPorNit();
      }
    });
  }

  // --------- CARGAS CATÁLOGOS: SUCURSAL / TIPOS DE PAGO ---------

  function loadSalesCatalogs() {
    const token = salesGetToken();
    if (!token) return;

    const sucursalSelect = document.getElementById("sales-sucursal");
    if (!sucursalSelect) return;

    Promise.all([
      fetch("/api/catalogos/sucursales", {
        headers: { Authorization: "Bearer " + token },
      }).then((r) => r.json()),
      fetch("/api/catalogos/tipos-pago", {
        headers: { Authorization: "Bearer " + token },
      }).then((r) => r.json()),
    ])
      .then(([sucursalesRes, tiposPagoRes]) => {
        // Sucursales
        if (sucursalesRes.ok) {
          salesSucursales = sucursalesRes.sucursales || [];
          sucursalSelect.innerHTML =
            '<option value="">Seleccione sucursal</option>';
          salesSucursales.forEach((s) => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.nombre;
            sucursalSelect.appendChild(opt);
          });
        }

        // Tipos de pago
        if (tiposPagoRes.ok) {
          paymentTypes = tiposPagoRes.tiposPago || [];
        }
      })
      .catch((err) => {
        console.error("Error cargando catálogos de ventas:", err);
      });
  }

  // --------- TOTALES FACTURA ---------

  function recalculateSalesRow(tr) {
    const qtyInput = tr.querySelector(".sales-qty");
    const priceInput = tr.querySelector(".sales-price");
    const discountInput = tr.querySelector(".sales-discount");
    const subtotalSpan = tr.querySelector(".sales-subtotal");

    const qty = Number(qtyInput?.value || 0);
    const price = Number(priceInput?.value || 0);
    const discount = Number(discountInput?.value || 0);

    const bruto = qty * price;
    const subtotal = bruto - discount;

    if (subtotalSpan) {
      subtotalSpan.textContent = salesFormatMoney(subtotal);
    }
  }

  function recalculateSalesTotals() {
    const rows = document.querySelectorAll("#sales-items-body tr");
    let subtotalBruto = 0;
    let totalDescuento = 0;

    rows.forEach((tr) => {
      const qty = Number(tr.querySelector(".sales-qty")?.value || 0);
      const price = Number(tr.querySelector(".sales-price")?.value || 0);
      const discount = Number(tr.querySelector(".sales-discount")?.value || 0);

      subtotalBruto += qty * price;
      totalDescuento += discount;
    });

    const totalFactura = subtotalBruto - totalDescuento;

    const subtotalEl = document.getElementById("sales-subtotal-general");
    const descuentoEl = document.getElementById("sales-descuento-general");
    const totalEl = document.getElementById("sales-total-general");

    if (subtotalEl) subtotalEl.textContent = salesFormatMoney(subtotalBruto);
    if (descuentoEl) descuentoEl.textContent = salesFormatMoney(totalDescuento);
    if (totalEl) totalEl.textContent = salesFormatMoney(totalFactura);

    recalculatePaymentsTotals(); // actualizar diferencia con pagos
  }

  // --------- FILAS DE PRODUCTO ---------

  function setupSearchForRow(tr) {
    const searchInput = tr.querySelector(".sales-product-search");
    const resultsBox = tr.querySelector(".sales-product-results");
    const hiddenId = tr.querySelector(".sales-product-id");
    const priceInput = tr.querySelector(".sales-price");

    if (!searchInput || !resultsBox || !hiddenId) return;

    let searchTimeout = null;

    function clearResults() {
      resultsBox.innerHTML = "";
      resultsBox.classList.add("hidden");
    }

    function renderResults(products) {
      if (!products.length) {
        resultsBox.innerHTML =
          '<div style="padding:0.3rem 0.4rem;font-size:0.8rem;color:#64748b;">Sin resultados</div>';
        resultsBox.classList.remove("hidden");
        return;
      }

      const html = products
        .slice(0, 10)
        .map(
          (p) => `
        <div class="sales-product-option"
             data-id="${p.id}"
             data-nombre="${p.nombre}"
             data-preciomenor="${p.precio_menor ?? ""}"
             data-preciomayor="${p.precio_mayor ?? ""}"
             style="padding:0.3rem 0.4rem;cursor:pointer;font-size:0.85rem;">
          <strong>#${p.id}</strong> - ${p.nombre}
        </div>
      `
        )
        .join("");

      resultsBox.innerHTML = html;
      resultsBox.classList.remove("hidden");
    }

    searchInput.addEventListener("input", () => {
      const term = searchInput.value.trim();
      hiddenId.value = "";
      if (!term || term.length < 2) {
        clearResults();
        recalculateSalesRow(tr);
        recalculateSalesTotals();
        return;
      }

      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchProducts(term).then((products) => {
          renderResults(products);
        });
      }, 300);
    });

    resultsBox.addEventListener("click", (e) => {
      const option = e.target.closest(".sales-product-option");
      if (!option) return;

      const id = option.dataset.id;
      const nombre = option.dataset.nombre || "";
      const precioMayor = Number(option.dataset.preciomayor || 0);
      const precioMenor = Number(option.dataset.preciomenor || 0);
      const defaultPrice = precioMayor || precioMenor || 0;

      hiddenId.value = id;
      searchInput.value = `#${id} - ${nombre}`;
      clearResults();

      if (priceInput && defaultPrice) {
        priceInput.value = defaultPrice;
      }

      recalculateSalesRow(tr);
      recalculateSalesTotals();
    });

    // Cerrar lista si clic fuera
    document.addEventListener("click", (e) => {
      if (!tr.contains(e.target)) {
        clearResults();
      }
    });
  }

  function setupSalesRowEvents(tr) {
    setupSearchForRow(tr);

    const qtyInput = tr.querySelector(".sales-qty");
    const priceInput = tr.querySelector(".sales-price");
    const discountInput = tr.querySelector(".sales-discount");
    const removeBtn = tr.querySelector(".sales-remove-item");

    const onChange = () => {
      recalculateSalesRow(tr);
      recalculateSalesTotals();
    };

    if (qtyInput) qtyInput.addEventListener("input", onChange);
    if (priceInput) priceInput.addEventListener("input", onChange);
    if (discountInput) discountInput.addEventListener("input", onChange);

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        tr.remove();
        recalculateSalesTotals();
      });
    }

    recalculateSalesRow(tr);
    recalculateSalesTotals();
  }

  function addSalesItemRow() {
    const tbody = document.getElementById("sales-items-body");
    if (!tbody) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div class="sales-product-cell" style="position:relative;">
          <input
            type="text"
            class="input sales-product-search"
            placeholder="Buscar por ID o nombre"
          />
          <input type="hidden" class="sales-product-id" />
          <div
            style="font-size:0.78rem;color:#64748b;margin-top:0.2rem;"
          >
            Escribe al menos 2 caracteres.
          </div>
          <div
            class="sales-product-results hidden"
            style="
              position:absolute;
              left:0;
              right:0;
              top:100%;
              margin-top:0.2rem;
              background:#fff;
              border:1px solid #e2e8f0;
              border-radius:0.4rem;
              max-height:180px;
              overflow-y:auto;
              box-shadow:0 4px 10px rgba(15,23,42,.15);
              z-index:50;
            "
          ></div>
        </div>
      </td>
      <td>
        <input type="number" min="1" step="1" class="input sales-qty" value="1">
      </td>
      <td>
        <input type="number" min="0" step="0.01" class="input sales-price" placeholder="0.00">
      </td>
      <td>
        <input type="number" min="0" step="0.01" class="input sales-discount" value="0">
      </td>
      <td>
        Q <span class="sales-subtotal">0.00</span>
      </td>
      <td>
        <button type="button" class="btn-small btn-danger sales-remove-item">Quitar</button>
      </td>
    `;

    tbody.appendChild(tr);
    setupSalesRowEvents(tr);
  }

  function collectSalesItemsFromDom() {
    const rows = document.querySelectorAll("#sales-items-body tr");
    const items = [];

    rows.forEach((tr) => {
      const productIdInput = tr.querySelector(".sales-product-id");
      const qtyInput = tr.querySelector(".sales-qty");
      const priceInput = tr.querySelector(".sales-price");
      const discountInput = tr.querySelector(".sales-discount");

      const producto_id = Number(productIdInput?.value || 0);
      const cantidad = Number(qtyInput?.value || 0);
      const precio_unitario = Number(priceInput?.value || 0);
      const descuento_aplicado = Number(discountInput?.value || 0);

      if (!producto_id || cantidad <= 0 || precio_unitario < 0) {
        return;
      }

      items.push({
        producto_id,
        cantidad,
        precio_unitario,
        descuento_aplicado,
      });
    });

    return items;
  }

  // --------- PAGOS ---------

  function recalculatePaymentsTotals() {
    const rows = document.querySelectorAll("#sales-payments-body tr");
    let totalPagos = 0;

    rows.forEach((tr) => {
      const amountInput = tr.querySelector(".sales-payment-amount");
      const monto = Number(amountInput?.value || 0);
      if (monto > 0) totalPagos += monto;
    });

    const totalFacturaText =
      document.getElementById("sales-total-general")?.textContent || "0";
    const totalFactura = Number(totalFacturaText.replace(",", ".")) || 0;

    const diff = totalFactura - totalPagos;

    const totalPagosEl = document.getElementById("sales-total-pagos");
    const diferenciaEl = document.getElementById("sales-diferencia");

    if (totalPagosEl) totalPagosEl.textContent = salesFormatMoney(totalPagos);
    if (diferenciaEl) diferenciaEl.textContent = salesFormatMoney(diff);
  }

  function addPaymentRow() {
    const tbody = document.getElementById("sales-payments-body");
    if (!tbody) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <select class="input sales-payment-type">
          <option value="">Seleccione tipo</option>
        </select>
      </td>
      <td>
        <input type="number" min="0" step="0.01" class="input sales-payment-amount" placeholder="0.00">
      </td>
      <td>
        <input type="text" class="input sales-payment-ref" placeholder="No. voucher, últimos 4 dígitos, etc.">
      </td>
      <td>
        <button type="button" class="btn-small btn-danger sales-remove-payment">Quitar</button>
      </td>
    `;

    tbody.appendChild(tr);

    const select = tr.querySelector(".sales-payment-type");
    const amountInput = tr.querySelector(".sales-payment-amount");
    const removeBtn = tr.querySelector(".sales-remove-payment");

    // Poblar tipos de pago
    if (select) {
      select.innerHTML = '<option value="">Seleccione tipo</option>';
      paymentTypes.forEach((tp) => {
        const opt = document.createElement("option");
        opt.value = tp.id;
        opt.textContent = tp.descripcion;
        select.appendChild(opt);
      });
    }

    const onChange = () => {
      recalculatePaymentsTotals();
    };

    if (amountInput) amountInput.addEventListener("input", onChange);

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        tr.remove();
        recalculatePaymentsTotals();
      });
    }

    recalculatePaymentsTotals();
  }

  function collectPaymentsFromDom() {
    const rows = document.querySelectorAll("#sales-payments-body tr");
    const pagos = [];

    rows.forEach((tr) => {
      const tipoSelect = tr.querySelector(".sales-payment-type");
      const amountInput = tr.querySelector(".sales-payment-amount");
      const refInput = tr.querySelector(".sales-payment-ref");

      const tipo_pago_id = Number(tipoSelect?.value || 0);
      const monto = Number(amountInput?.value || 0);
      const referencia = (refInput?.value || "").trim() || null;

      if (!tipo_pago_id || monto <= 0) {
        return;
      }

      pagos.push({
        tipo_pago_id,
        monto,
        referencia,
        tarjeta_id: null,
      });
    });

    return pagos;
  }

  // --------- FACTURAS LISTADO ---------

  function loadSalesInvoices() {
    const token = salesGetToken();
    if (!token) return;

    const tbody = document.getElementById("sales-invoices-body");
    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='6'>Cargando facturas...</td></tr>";

    fetch("/api/facturas?estado=vigente", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) {
          tbody.innerHTML =
            "<tr><td colspan='6'>Error al cargar facturas.</td></tr>";
          return;
        }

        const facturas = data.facturas || [];
        if (facturas.length === 0) {
          tbody.innerHTML =
            "<tr><td colspan='6'>No hay facturas registradas.</td></tr>";
          return;
        }

        tbody.innerHTML = "";
        facturas.forEach((f) => {
          const tr = document.createElement("tr");
          const clienteNombre = f.cliente_nombres || "";
          const clienteApellidos = f.cliente_apellidos || "";
          const cliente = `${clienteNombre} ${clienteApellidos}`.trim();
          const sucursal = f.sucursal_nombre || "";
          const fecha = f.fecha
            ? new Date(f.fecha).toLocaleString()
            : "";

          tr.innerHTML = `
            <td>${f.id}</td>
            <td>${fecha}</td>
            <td>${cliente}</td>
            <td>${sucursal}</td>
            <td>Q ${salesFormatMoney(f.total_factura)}</td>
            <td>${f.estado}</td>
          `;
          tbody.appendChild(tr);
        });
      })
      .catch((err) => {
        console.error("Error al cargar facturas:", err);
        tbody.innerHTML =
          "<tr><td colspan='6'>No se pudieron cargar las facturas.</td></tr>";
      });
  }

  // --------- FORMULARIO VENTAS ---------

  function setupSalesForm() {
    const form = document.getElementById("sales-form");
    const addItemBtn = document.getElementById("sales-add-item");
    const addPaymentBtn = document.getElementById("sales-add-payment");
    const msgEl = document.getElementById("sales-message");

    if (addItemBtn) {
      addItemBtn.addEventListener("click", () => {
        addSalesItemRow();
      });
    }

    if (addPaymentBtn) {
      addPaymentBtn.addEventListener("click", () => {
        addPaymentRow();
      });
    }

    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const token = salesGetToken();
      if (!token) {
        if (msgEl) {
          msgEl.textContent = "Debes iniciar sesión para facturar.";
          msgEl.style.color = "#d93025";
        }
        return;
      }

      const clienteId =
        document.getElementById("sales-cliente-id")?.value || "";
      const nit =
        document.getElementById("sales-cliente-nit")?.value.trim() || null;
      const nombres =
        document.getElementById("sales-cliente-nombres")?.value.trim() || "";
      const apellidos =
        document.getElementById("sales-cliente-apellidos")?.value.trim() || "";
      const correo =
        document.getElementById("sales-cliente-correo")?.value.trim() || null;
      const direccion =
        document.getElementById("sales-cliente-direccion")?.value.trim() ||
        null;

      const sucursalId =
        document.getElementById("sales-sucursal")?.value || "";
      const correlativo =
        document.getElementById("sales-correlativo")?.value.trim() || null;
      const serie =
        document.getElementById("sales-serie")?.value.trim() || null;

      if (!clienteId && (!nombres || !apellidos)) {
        if (msgEl) {
          msgEl.textContent =
            "Debes seleccionar un cliente por NIT o ingresar nombres y apellidos para crear uno nuevo.";
          msgEl.style.color = "#d93025";
        }
        return;
      }

      if (!sucursalId) {
        if (msgEl) {
          msgEl.textContent = "La sucursal es obligatoria.";
          msgEl.style.color = "#d93025";
        }
        return;
      }

      const items = collectSalesItemsFromDom();
      if (items.length === 0) {
        if (msgEl) {
          msgEl.textContent = "Debes agregar al menos un producto a la factura.";
          msgEl.style.color = "#d93025";
        }
        return;
      }

      const pagos = collectPaymentsFromDom();
      if (pagos.length === 0) {
        if (msgEl) {
          msgEl.textContent = "Debes registrar al menos un pago.";
          msgEl.style.color = "#d93025";
        }
        return;
      }

      const totalFacturaText =
        document.getElementById("sales-total-general")?.textContent || "0";
      const totalFactura = Number(totalFacturaText.replace(",", ".")) || 0;

      const totalPagosText =
        document.getElementById("sales-total-pagos")?.textContent || "0";
      const totalPagos = Number(totalPagosText.replace(",", ".")) || 0;

      const diff = Math.round((totalFactura - totalPagos) * 100) / 100;

      if (diff !== 0) {
        if (msgEl) {
          msgEl.textContent =
            "El total de pagos debe coincidir exactamente con el total de la factura.";
          msgEl.style.color = "#d93025";
        }
        return;
      }

      const payload = {
        sucursal_id: Number(sucursalId),
        correlativo,
        letra_serie: serie,
        items,
        pagos,
      };

      if (clienteId) {
        payload.cliente_id = Number(clienteId);
      } else {
        payload.nuevo_cliente = {
          nombres,
          apellidos,
          nit: nit || null,
          correo: correo || null,
          direccion: direccion || null,
        };
      }

      if (msgEl) {
        msgEl.textContent = "Enviando factura...";
        msgEl.style.color = "#64748b";
      }

      fetch("/api/facturas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.ok) {
            const errorsText = data.errors
              ? data.errors.join(" | ")
              : data.error || "Error al crear la factura.";
            if (msgEl) {
              msgEl.textContent = errorsText;
              msgEl.style.color = "#d93025";
            }
            return;
          }

          if (msgEl) {
            msgEl.textContent = "Factura creada correctamente.";
            msgEl.style.color = "#0b8457";
          }

          const itemsBody = document.getElementById("sales-items-body");
          const paymentsBody = document.getElementById("sales-payments-body");
          if (itemsBody) itemsBody.innerHTML = "";
          if (paymentsBody) paymentsBody.innerHTML = "";

          // Limpiar datos de cliente solo si era nuevo (no borramos NIT por si repite compra)
          // Podrías dejarlo, pero aquí lo dejo tal cual:
          // document.getElementById("sales-cliente-id").value = "";

          recalculateSalesTotals();
          addSalesItemRow();
          addPaymentRow();
          loadSalesInvoices();
        })
        .catch((err) => {
          console.error("Error al crear factura:", err);
          if (msgEl) {
            msgEl.textContent = "Error de conexión al crear la factura.";
            msgEl.style.color = "#d93025";
          }
        });
    });
  }

  // --------- INIT PÚBLICO ---------

  function initSalesView() {
    loadSalesCatalogs();
    loadSalesInvoices();
    setupClienteNitSection();

    const itemsBody = document.getElementById("sales-items-body");
    const paymentsBody = document.getElementById("sales-payments-body");

    if (itemsBody && itemsBody.children.length === 0) {
      addSalesItemRow();
    }
    if (paymentsBody && paymentsBody.children.length === 0) {
      addPaymentRow();
    }

    recalculateSalesTotals();
    setupSalesForm();
  }

  window.Sales = {
    initSalesView,
  };
})();
