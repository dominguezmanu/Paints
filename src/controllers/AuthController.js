const AuthService = require("../services/AuthService");

const AuthController = {
  // POST /api/auth/login
  async login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ ok: false, error: "Usuario y contraseña son obligatorios" });
    }

    try {
      const result = await AuthService.login(username, password);

      if (!result.ok) {
        return res.status(401).json({ ok: false, error: result.message });
      }

      res.json({
        ok: true,
        token: result.token,
        user: result.user,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Error en el servidor" });
    }
  },

  // GET /api/auth/me
  async me(req, res) {
    // authRequired ya cargó req.user
    res.json({ ok: true, user: req.user });
  },
};

module.exports = AuthController;
