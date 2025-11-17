const UserService = require("../services/UserService");

const HomeController = {
  async status(req, res) {
    res.json({
      ok: true,
      message: "API Paints funcionando",
      time: new Date(),
    });
  },

  async listUsers(req, res) {
    try {
      const users = await UserService.listUsers();
      res.json({ ok: true, users });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ ok: false, error: "Error al obtener la lista de usuarios" });
    }
  },
};

module.exports = HomeController;
