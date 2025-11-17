// public/js/app.js
(function () {
  const TOKEN_KEY = "paints_token";
  const USER_KEY = "paints_user";

  // ---------------------- SESIÓN ----------------------

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Error parseando usuario en localStorage:", e);
      return null;
    }
  }

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * Devuelve un nombre de rol legible a partir del objeto user.
   * Soporta muchas variantes:
   *  - user.rol_nombre, user.rol, user.role_name, user.role
   *  - cualquier campo que contenga "rol" o "role"
   *  - rol_id / id_rol / role_id como número (1..4)
   *  - fallback por username: "admin", "cajero", "digitador", "comprador"
   */
  function getUserRoleName(user) {
    if (!user) return "Usuario";

    // 1) Campos típicos de texto
    if (user.rol_nombre) return String(user.rol_nombre);
    if (user.rol && typeof user.rol === "string") return String(user.rol);
    if (user.role_name) return String(user.role_name);
    if (user.role && typeof user.role === "string") return String(user.role);

    // 2) Cualquier campo que contenga "rol" o "role"
    try {
      const keys = Object.keys(user);
      for (const key of keys) {
        if (/rol/i.test(key) || /role/i.test(key)) {
          const value = user[key];
          if (typeof value === "string" && value.trim().length > 0) {
            return value.trim();
          }
          if (typeof value === "number") {
            // lo mapeamos como id numérico
            return mapRoleIdToName(value);
          }
          if (typeof value === "string" && /^\d+$/.test(value)) {
            return mapRoleIdToName(Number(value));
          }
        }
      }
    } catch (e) {
      console.warn("Error inspeccionando claves de rol:", e);
    }

    // 3) rol_id / id_rol / role_id específicos
    const possibleIdFields = ["rol_id", "id_rol", "role_id", "idRol", "rolId"];
    for (const field of possibleIdFields) {
      if (field in user) {
        const raw = user[field];
        if (typeof raw === "number") {
          return mapRoleIdToName(raw);
        }
        if (typeof raw === "string" && /^\d+$/.test(raw)) {
          return mapRoleIdToName(Number(raw));
        }
      }
    }

    // 4) Fallback por username (útil si tienes usuario "admin" sin más info)
    const username = (user.username || "").toLowerCase();
    if (username === "admin") return "Admin";
    if (username === "cajero") return "Cajero";
    if (username === "digitador") return "Digitador";
    if (username === "comprador") return "Comprador";

    // 5) Último recurso
    return "Usuario";
  }

  function mapRoleIdToName(id) {
    switch (Number(id)) {
      case 1:
        return "Admin";
      case 2:
        return "Cajero";
      case 3:
        return "Digitador";
      case 4:
        return "Comprador";
      default:
        return "Usuario";
    }
  }

  // ---------------------- API WRAPPER ----------------------

  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = options.headers || {};
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(path, {
      ...options,
      headers,
    });

    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      // Puede venir vacío
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  }

  // ---------------------- UI: MENÚ Y HEADER ----------------------

  function showElement(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  function hideElement(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  }

  function setActiveMenu(hash) {
    const links = document.querySelectorAll(".sidebar-menu a");
    links.forEach((a) => {
      if (a.getAttribute("href") === hash) {
        a.classList.add("active");
      } else {
        a.classList.remove("active");
      }
    });
  }

  function updateSessionUI() {
    const user = getCurrentUser();
    const isLogged = !!user && !!getToken();

    const userNameEl = document.getElementById("user-name");
    const userRoleEl = document.getElementById("user-role");
    const headerSessionText = document.getElementById("header-session-text");

    if (!isLogged) {
      // Perfil
      if (userNameEl) userNameEl.textContent = "Invitado";
      if (userRoleEl) {
        userRoleEl.textContent = "Sin sesión";
        userRoleEl.className = "badge-role";
      }
      if (headerSessionText) headerSessionText.textContent = "Invitado";

      // Menú invitado
      showElement("menu-home-guest");
      showElement("menu-login-guest");
      hideElement("menu-reports-user");  
      hideElement("menu-quotes-user");  

      // Menú usuario
      hideElement("menu-dashboard-user");
      hideElement("menu-products-user");
      hideElement("menu-sales-user");
      hideElement("menu-stock-user")
      hideElement("menu-inventory-user");
      hideElement("menu-logout-user");

      return;
    }

    const roleName = getUserRoleName(user);
    const roleLower = roleName.toLowerCase();

    // Perfil
    if (userNameEl) userNameEl.textContent = user.username || "Usuario";
    if (userRoleEl) {
      userRoleEl.textContent = roleName;
      userRoleEl.className = "badge-role";
      userRoleEl.classList.add("role-" + roleLower.replace(/\s+/g, "-"));
    }
    if (headerSessionText) {
      headerSessionText.textContent =
        (user.username || "Usuario") + " · " + roleName;
    }

    // Menú invitado
    hideElement("menu-home-guest");
    hideElement("menu-login-guest");

    // Menú usuario base
    showElement("menu-logout-user");
    showElement("menu-dashboard-user");
    showElement("menu-products-user");

    // Menús extra por rol
    switch (roleLower) {
      case "admin":
        showElement("menu-dashboard-user");
        showElement("menu-products-user");
        showElement("menu-sales-user");
        showElement("menu-inventory-user");
        showElement("menu-stock-user");
        showElement("menu-reports-user");
        showElement("menu-quotes-user"); // si quieres que admin también vea cotizaciones
        break;
      case "cajero":
        showElement("menu-dashboard-user");
        showElement("menu-products-user");
        showElement("menu-sales-user");
        break;
      case "digitador":
        showElement("menu-dashboard-user");
        showElement("menu-products-user");
        showElement("menu-inventory-user");
        showElement("menu-stock-user");
        break;
      case "comprador":
        showElement("menu-dashboard-user");
        showElement("menu-products-user");
        showElement("menu-quotes-user"); // 👈 aquí seguro
        break;
      default:
        break;
    }

  }

  // ---------------------- CARGA DE VISTAS ----------------------

  async function loadView(viewName, initCallback) {
    const main = document.querySelector(".app-main");
    if (!main) {
      console.error("No se encontró .app-main en el DOM");
      return;
    }

    try {
      const res = await fetch("./views/" + viewName);
      if (!res.ok) {
        main.innerHTML =
          "<p>Error al cargar la vista: " + viewName + "</p>";
        return;
      }

      const html = await res.text();
      main.innerHTML = html;

      if (typeof initCallback === "function") {
        initCallback();
      }
    } catch (err) {
      console.error("Error cargando vista", viewName, err);
      main.innerHTML =
        "<p>No se pudo cargar la vista. Revisa la consola.</p>";
    }
  }

  // ---------------------- ESTADO API EN LOGIN ----------------------

  function checkApiStatus() {
    const statusEl = document.getElementById("api-status");
    if (!statusEl) return;

    statusEl.textContent = "Consultando API...";

    fetch("/api/status")
      .then((res) => {
        if (!res.ok) throw new Error("Respuesta no OK");
        return res.json();
      })
      .then((data) => {
        if (data && data.ok) {
          statusEl.textContent = "API en línea ✔";
          statusEl.style.color = "#0b8457";
        } else {
          statusEl.textContent = "API respondió con errores.";
          statusEl.style.color = "#d93025";
        }
      })
      .catch(() => {
        statusEl.textContent = "No se pudo contactar la API.";
        statusEl.style.color = "#d93025";
      });
  }

  // ---------------------- LOGIN VIEW ----------------------

  function initLoginView() {
    const form = document.getElementById("login-form");
    const msgEl = document.getElementById("login-message");

    checkApiStatus();

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username =
        document.getElementById("login-username")?.value || "";
      const password =
        document.getElementById("login-password")?.value || "";

      if (msgEl) {
        msgEl.textContent = "Autenticando...";
        msgEl.style.color = "#64748b";
      }

      if (!username || !password) {
        if (msgEl) {
          msgEl.textContent = "Usuario y contraseña son obligatorios.";
          msgEl.style.color = "#d93025";
        }
        return;
      }

      try {
        const res = await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });

        if (!res.ok || !res.data || !res.data.ok) {
          if (msgEl) {
            const errTxt =
              (res.data && (res.data.error || res.data.message)) ||
              "Credenciales inválidas.";
            msgEl.textContent = errTxt;
            msgEl.style.color = "#d93025";
          }
          return;
        }

        const { token, user } = res.data;

        // Pequeño log de depuración (lo verás en la consola del navegador)
        console.log("Usuario logueado:", user);

        saveSession(token, user);
        updateSessionUI();

        if (msgEl) {
          msgEl.textContent = "Inicio de sesión exitoso.";
          msgEl.style.color = "#0b8457";
        }

        window.location.hash = "#dashboard";
      } catch (err) {
        console.error("Error en login:", err);
        if (msgEl) {
          msgEl.textContent =
            "Error de conexión. Intenta de nuevo en unos segundos.";
          msgEl.style.color = "#d93025";
        }
      }
    });
  }

  // ---------------------- RUTAS ----------------------

  function handleRouteChange() {
    const user = getCurrentUser();
    let hash = window.location.hash || "";

    if (!hash) {
      hash = user && getToken() ? "#dashboard" : "#login";
      window.location.hash = hash;
    }

    const protectedRoutes = [
      "#dashboard",
      "#productos",
      "#ventas",
      "#inventario",
    ];
    if (
      protectedRoutes.includes(hash) &&
      (!user || !getToken())
    ) {
      window.location.hash = "#login";
      setActiveMenu("#login");
      loadView("login.html", initLoginView);
      return;
    }

    setActiveMenu(hash);

    switch (hash) {
      case "#login":
        loadView("login.html", initLoginView);
        break;

      case "#dashboard":
        if (
          window.Dashboard &&
          typeof Dashboard.initDashboardView === "function"
        ) {
          loadView("dashboard.html", Dashboard.initDashboardView);
        } else {
          loadView("dashboard.html");
        }
        break;

      case "#productos":
        if (
          window.Products &&
          typeof Products.initProductsView === "function"
        ) {
          loadView("products.html", Products.initProductsView);
        } else {
          loadView("products.html");
        }
        break;

      case "#ventas":
        if (
          window.Sales &&
          typeof Sales.initSalesView === "function"
        ) {
          loadView("sales.html", Sales.initSalesView);
        } else {
          loadView("sales.html");
        }
        break;

      case "#inventario":
        if (
          window.Inventory &&
          typeof Inventory.initInventoryView === "function"
        ) {
          loadView("inventory.html", Inventory.initInventoryView);
        } else {
          loadView("inventory.html");
        }
        break;
      case "#existencias":
        if (window.Stock && typeof Stock.initStockView === "function") {
          loadView("inventory-view.html", Stock.initStockView);
        } else {
          loadView("inventory-view.html");
        }
        break;
      case "#reportes":
        if (window.Reports && typeof Reports.initReportsView === "function") {
          loadView("reports.html", Reports.initReportsView);
        } else {
          loadView("reports.html");
        }
        break;
      
      case "#cotizaciones":
        if (window.Quotes && typeof Quotes.initQuotesView === "function") {
          loadView("quotes.html", Quotes.initQuotesView);
        } else {
          loadView("quotes.html");
        }
        break;


      default:
        if (user && getToken()) {
          window.location.hash = "#dashboard";
        } else {
          window.location.hash = "#login";
        }
        break;
    }
  }

  // ---------------------- EVENTOS GLOBALES ----------------------

  function initGlobalEvents() {
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        clearSession();
        updateSessionUI();
        window.location.hash = "#login";
      });
    }

    window.addEventListener("hashchange", handleRouteChange);
  }

  // ---------------------- INIT APP ----------------------

  function initApp() {
    updateSessionUI();
    initGlobalEvents();
    handleRouteChange();
  }

  window.App = {
    apiFetch,
    getToken,
    getCurrentUser,
    updateSessionUI,
  };

  document.addEventListener("DOMContentLoaded", initApp);
})();
