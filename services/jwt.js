// Importar dependencias
const jwt = require("jwt-simple");
const moment = require("moment");

// Clave secreta
const secret = "CALVE_SECRETA_del_proyecto_DE_la_red_soCIAL_987987";

// Crear una funcion para generar tokens
const createToken = (user) => {
  const payload = {
    id: user._id,
    name: user.name,
    surname: user.surname,
    nick: user.nick,
    email: user.email,
    role: user.role,
    image: user.image,
    iat: moment().unix(),
    exp: moment().add(30, "days").unix(),
  };

  // Devolver jwt token codificado
  return jwt.encode(payload, secret);
};

module.exports = {
  secret,
  createToken,
};
