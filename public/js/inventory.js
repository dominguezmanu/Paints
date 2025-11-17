// public/js/inventory.js
(function () {
  const Inventory = {};

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function getArrayFromResponse(res) {
    if (!res) return [];
    const d = res.data;
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    return [];
  }

  async function loadCombos() {
    const sucSelect = document.getElementById("inv-sucursal");
    const tipoSelect = document.getElementById("inv-tipo-movimiento");
    const provSelect = document.getElementById("inv-proveedor");

    try {
      const [sucRes, tipoRes, provRes] = await Promise.all([
        App.apiFetch("/api/sucursales"),
        App.apiFetch("/api/tipos-movimiento"),
        App.apiFetch("/api/proveedores"),
      ]);

      console.log("Sucursales res:", sucRes);
      console.log("Tipos mov res:", tipoRes);
      console.log("Proveedores res:", provRes);

      const sucursales = getArrayFromResponse(sucRes);
      const tipos = getArrayFromResponse(tipoRes);
      const proveedores = getArrayFromResponse(provRes);

      // Sucursales
      if (sucSelect) {
        sucSelect.innerHTML = '<option value="">Seleccione sucursal</option>';
        sucursales.forEach((s) => {
          const opt = document.createElement("option");
          opt.value = s.id;
          opt.textContent = s.nombre;
          sucSelect.appendChild(opt);
        });
      }

      // Tipos de movimiento
      if (tipoSelect) {
        tipoSelect.innerHTML = '<option value="">Seleccione tipo</option>';
        tipos.forEach((t) => {
          const opt = document.createElement("option");
          opt.value = t.id;
          opt.textContent = t.nombre;
          tipoSelect.appendChild(opt);
        });
      }

      // Proveedores
      if (provSelect) {
        provSelect.innerHTML = '<option value="">Sin proveedor</option>';
        proveedores.forEach((p) => {
          const opt = document.createElement("option");
          opt.value = p.id;
          opt.textContent = p.nombre;
          provSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error("Error cargando combos de inventario:", err);
    }
  }

  function recalcTotals() {
    const tbody = document.getElementById("inv-items-body");
    const totalEl = document.getElementById("inv-total-general");
    if (!tbody || !totalEl) return;

    let total = 0;

    Array.from(tbody.querySelectorAll("tr")).forEach((tr) => {
      const qtyInput = tr.querySelector(".inv-qty");
      const costInput = tr.querySelector(".inv-cost");
      const subtotalCell = tr.querySelector(".inv-subtotal");

      const qty = Number(qtyInput?.value || 0);
      const cost = Number(costInput?.value || 0);
      const subtotal = qty * cost;

      if (subtotalCell) {
        subtotalCell.textContent = `Q ${subtotal.toFixed(2)}`;
      }

      total += subtotal;
    });

    totalEl.textContent = total.toFixed(2);
  }

  function addItemRow() {
    const tbody = document.getElementById("inv-items-body");
    if (!tbody) return;

    const tr = document.createElement("tr");

    const tdProd = document.createElement("td");
    const inputProd = document.createElement("input");
    inputProd.type = "text";
    inputProd.placeholder = "ID o nombre de producto";
    inputProd.className = "input inv-product";
    tdProd.appendChild(inputProd);

    const tdQty = document.createElement("td");
    const inputQty = document.createElement("input");
    inputQty.type = "number";
    inputQty.min = "0";
    inputQty.step = "1";
    inputQty.value = "0";
    inputQty.className = "input inv-qty";
    inputQty.addEventListener("input", recalcTotals);
    tdQty.appendChild(inputQty);

    const tdCost = document.createElement("td");
    const inputCost = document.createElement("input");
    inputCost.type = "number";
    inputCost.min = "0";
    inputCost.step = "0.01";
    inputCost.value = "0.00";
    inputCost.className = "input inv-cost";
    inputCost.addEventListener("input", recalcTotals);
    tdCost.appendChild(inputCost);

    const tdSub = document.createElement("td");
    tdSub.className = "inv-subtotal";
    tdSub.textContent = "Q 0.00";

    const tdActions = document.createElement("td");
    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "btn btn-secondary";
    btnDel.textContent = "Eliminar";
    btnDel.addEventListener("click", () => {
      tr.remove();
      recalcTotals();
    });
    tdActions.appendChild(btnDel);

    tr.appendChild(tdProd);
    tr.appendChild(tdQty);
    tr.appendChild(tdCost);
    tr.appendChild(tdSub);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
    recalcTotals();
  }

  async function loadRecentMovements() {
    const tbody = document.getElementById("inv-movements-body");
    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='7'>Cargando movimientos...</td></tr>";

    try {
      const res = await App.apiFetch("/api/inventario/movimientos?limit=10");
      console.log("Movimientos res:", res);

      const movimientos = getArrayFromResponse(res);

      if (!res.ok) {
        tbody.innerHTML =
          "<tr><td colspan='7'>No se pudieron obtener los movimientos.</td></tr>";
        return;
      }

      if (movimientos.length === 0) {
        tbody.innerHTML =
          "<tr><td colspan='7'>No hay movimientos registrados.</td></tr>";
        return;
      }

      tbody.innerHTML = "";

      movimientos.forEach((m) => {
        const tr = document.createElement("tr");

        const tdId = document.createElement("td");
        tdId.textContent = m.id;

        const tdFecha = document.createElement("td");
        tdFecha.textContent = m.fecha || "";

        const tdSuc = document.createElement("td");
        tdSuc.textContent = m.sucursal_nombre || m.sucursal || "";

        const tdTipo = document.createElement("td");
        tdTipo.textContent = m.tipo_nombre || m.tipo || "";

        const tdProv = document.createElement("td");
        tdProv.textContent = m.proveedor_nombre || m.proveedor || "";

        const tdTotal = document.createElement("td");
        tdTotal.textContent =
          m.total != null ? `Q ${Number(m.total).toFixed(2)}` : "";

        const tdUsuario = document.createElement("td");
        tdUsuario.textContent = m.usuario_nombre || m.usuario || "";

        tr.appendChild(tdId);
        tr.appendChild(tdFecha);
        tr.appendChild(tdSuc);
        tr.appendChild(tdTipo);
        tr.appendChild(tdProv);
        tr.appendChild(tdTotal);
        tr.appendChild(tdUsuario);

        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Error cargando movimientos de inventario:", err);
      tbody.innerHTML =
        "<tr><td colspan='7'>Error al cargar movimientos.</td></tr>";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const msgEl = document.getElementById("inv-message");
    const sucursalId = document.getElementById("inv-sucursal")?.value || "";
    const tipoId = document.getElementById("inv-tipo-movimiento")?.value || "";
    const proveedorId = document.getElementById("inv-proveedor")?.value || "";
    const fecha = document.getElementById("inv-fecha")?.value || "";
    const comentario = document.getElementById("inv-comentario")?.value || "";

    const tbody = document.getElementById("inv-items-body");
    if (!tbody) return;

    const items = [];
    Array.from(tbody.querySelectorAll("tr")).forEach((tr) => {
      const prodInput = tr.querySelector(".inv-product");
      const qtyInput = tr.querySelector(".inv-qty");
      const costInput = tr.querySelector(".inv-cost");

      const prodValue = (prodInput?.value || "").trim();
      const qty = Number(qtyInput?.value || 0);
      const cost = Number(costInput?.value || 0);

      if (!prodValue || qty <= 0) return;

      items.push({
        producto: prodValue,
        cantidad: qty,
        costo_unitario: cost,
      });
    });

    if (!sucursalId || !tipoId) {
      setText(msgEl, "Debe seleccionar sucursal y tipo de movimiento.");
      msgEl.style.color = "#d93025";
      return;
    }

    if (items.length === 0) {
      setText(msgEl, "Agregue al menos un producto al movimiento.");
      msgEl.style.color = "#d93025";
      return;
    }

    setText(msgEl, "Registrando movimiento...");
    msgEl.style.color = "#64748b";

    const payload = {
      sucursal_id: sucursalId,
      tipo_movimiento_id: tipoId,
      proveedor_id: proveedorId || null,
      fecha,
      comentario,
      items,
    };

    try {
      const res = await App.apiFetch("/api/inventario/movimientos", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log("Crear movimiento res:", res);

      if (!res.ok || !res.data || res.data.ok === false) {
        const errMsg =
          (res.data && (res.data.error || res.data.message)) ||
          "No se pudo registrar el movimiento.";
        setText(msgEl, errMsg);
        msgEl.style.color = "#d93025";
        return;
      }

      setText(msgEl, "Movimiento registrado correctamente.");
      msgEl.style.color = "#0b8457";

      tbody.innerHTML = "";
      addItemRow();
      recalcTotals();
      loadRecentMovements();
    } catch (err) {
      console.error("Error registrando movimiento:", err);
      setText(
        msgEl,
        "Error de conexión al registrar el movimiento. Revisa la consola."
      );
      msgEl.style.color = "#d93025";
    }
  }

  Inventory.initInventoryView = function () {
    const addItemBtn = document.getElementById("inv-add-item");
    const form = document.getElementById("inventory-form");

    loadCombos();
    loadRecentMovements();

    if (addItemBtn) {
      addItemBtn.addEventListener("click", addItemRow);
    }

    if (form) {
      form.addEventListener("submit", handleSubmit);
    }

    // Fila inicial
    addItemRow();
  };

  window.Inventory = Inventory;
})();
