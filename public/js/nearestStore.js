// public/js/nearestStore.js
(function () {
  async function fetchNearestBranch(lat, lng) {
    const url = `/api/sucursales/nearest?lat=${encodeURIComponent(
      lat
    )}&lng=${encodeURIComponent(lng)}`;

    // Usamos App.apiFetch para que incluya el token si hace falta
    return await App.apiFetch(url);
  }

  function initNearestStoreView() {
    const statusEl = document.getElementById("nearest-status");
    const resultEl = document.getElementById("nearest-result");
    const btn = document.getElementById("nearest-refresh");

    if (!statusEl || !resultEl || !btn) return;

    function renderResult(data) {
      const b = data.nearestBranch || data;

      resultEl.innerHTML = `
        <p><strong>Sucursal:</strong> ${b.nombre || "Desconocida"}</p>
        <p><strong>Dirección:</strong> ${b.direccion || "Sin dirección"}</p>
        <p><strong>Distancia aproximada:</strong> ${
          typeof b.distanceKm === "number"
            ? b.distanceKm.toFixed(2) + " km"
            : "No disponible"
        }</p>
      `;
    }

    async function detectAndLoad() {
      if (!navigator.geolocation) {
        statusEl.textContent =
          "Tu navegador no soporta geolocalización. No se puede calcular la sucursal más cercana.";
        statusEl.style.color = "#d93025";
        return;
      }

      statusEl.textContent = "Solicitando permiso de ubicación...";
      statusEl.style.color = "#64748b";

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;

          statusEl.textContent = "Calculando sucursal más cercana...";
          statusEl.style.color = "#64748b";

          try {
            const res = await fetchNearestBranch(latitude, longitude);
            console.log("NearestStore - respuesta:", res);

            if (!res.ok || !res.data || !res.data.ok) {
              statusEl.textContent =
                "No se pudo obtener la sucursal más cercana.";
              statusEl.style.color = "#d93025";
              return;
            }

            const payload = res.data.data || res.data;
            renderResult(payload);

            statusEl.textContent = "Sucursal más cercana calculada correctamente.";
            statusEl.style.color = "#0b8457";
          } catch (err) {
            console.error("Error obteniendo sucursal más cercana:", err);
            statusEl.textContent =
              "Ocurrió un error al calcular la sucursal más cercana.";
            statusEl.style.color = "#d93025";
          }
        },
        (err) => {
          console.error("Error de geolocalización:", err);
          if (err.code === err.PERMISSION_DENIED) {
            statusEl.textContent =
              "No se otorgó permiso de ubicación. No se puede calcular la sucursal.";
          } else {
            statusEl.textContent =
              "No se pudo obtener tu ubicación actual.";
          }
          statusEl.style.color = "#d93025";
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      detectAndLoad();
    });
  }

  window.NearestStore = {
    initNearestStoreView,
  };
})();
