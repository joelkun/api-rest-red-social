// Importar dependencias y modulos
const bcrypt = require("bcryptjs");
const mongoosePagination = require("mongoose-pagination");
const fs = require("fs");
const path = require("path");

// Importar modelos
const User = require("../models/user");
const Follow = require("../models/follow");
const Publication = require("../models/publication");

// Importar servicios
const jwt = require("../services/jwt");
const followService = require("../services/followUserIds");
const validate = require("../helpers/validate");

// Acciones de prueba
const pruebaUser = (req, res) => {
  return res.status(200).send({
    message: "Mensaje enviado desde: controllers/user.js",
    usuario: req.user,
  });
};

// Registro de usuarios
const register = async (req, res) => {
  // Recoger datos de la peticion
  let params = req.body;
  // Comprobar que me llegan bien(+validacion)
  if (!params.name || !params.email || !params.password || !params.nick) {
    return res.status(400).json({
      status: "error",
      message: "Faltan datos por enviar",
    });
  }

  // Validacion avanzada
  try {
    validate(params);
  } catch (error) {
    return res.status(400).json({
      status: "error",
      message: "Validación no superada",
    });
  }

  // Control usuarios duplicados
  try {
    const existingUsers = await User.find({
      $or: [
        {
          email: params.email.toLowerCase(),
        },
        { nick: params.nick.toLowerCase() },
      ],
    }).exec();

    if (existingUsers && existingUsers.length >= 1) {
      return res.status(200).send({
        status: "success",
        message: "El usuario ya existe",
      });
    }
    // Cifrar la contraseña
    let salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(params.password, salt);
    params.password = hash;

    // Crear objeto de usuario
    const user_to_save = new User(params);

    // Guardar usuario en la bbdd

    let user_saved = await user_to_save.save();
    if (!user_saved) {
      // Devolver resultado si marca error en registro
      return res.status(500).send({
        message: "Error saving user",
        status: "error",
      });
    }

    // Devolver usuario en la bbdd
    return res.status(200).json({
      status: "success",
      message: "Acción de registro de usuario",
      user_saved,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Error",
      message: "Error en la consulta de usuarios",
    });
  }
};

const login = (req, res) => {
  // Recoger parametros body
  let params = req.body;

  if (!params.email || !params.password) {
    return res.status(400).send({
      status: "error",
      message: "Faltan datos por enviar",
    });
  }
  // Buscar en la bbdd
  User.findOne({ email: params.email })
    //.select({ password: 0 })
    .exec()
    .then((user) => {
      // Comprobar su contraseña
      const pwd = bcrypt.compareSync(params.password, user.password);

      if (!pwd) {
        return res.status(400).send({
          status: "error",
          message: "No te has identificado correctamente",
        });
      }
      // Devolver Token
      const token = jwt.createToken(user);

      // Devolver Datos del usuario
      return res.status(200).send({
        status: "success",
        message: "Te has identificado correctamente!!",
        user: {
          id: user._id,
          name: user.name,
          nick: user.nick,
        },
        token,
      });
    })
    .catch((error) => {
      return res.status(404).send({
        status: "error",
        message: "No existe el usuario",
      });
    });
};

const profile = async (req, res) => {
  try {
    //Recibir el parametro del id de usuario por la url
    const id = req.params.id;

    //Consulta para sacar los datos
    const userProfile = await User.findById(id)
      .select({ password: 0, role: 0 })
      .exec();

    if (!userProfile) {
      return res.status(404).send({
        status: "error",
        message: "El usuario no existe o hay un error",
      });
    }
    //Devolver el resultado
    // Posteriormente: devolver informacion de follows
    const followInfo = await followService.followThisUser(req.user.id, id);

    return res.status(200).send({
      status: "success",
      user: userProfile,
      following: followInfo.following,
      follower: followInfo.follower,
    });
  } catch (error) {}
  return res.status(500).send({
    status: "error",
    message: "Error en la consulta de perfil",
  });
};

const list = async (req, res) => {
  try {
    // Controlar en que pagina estamos
    let page = 1;
    if (req.params.page) {
      page = req.params.page;
    }
    page = parseInt(page);

    let itemsPerPage = 5;

    // Conteo de usuarios
    let totalUsers = await User.countDocuments().exec();
    // Consulta con mongoose paginate

    let users = await User.find()
      .select("-password -email -role -__v")
      .sort("_id")
      .paginate(page, itemsPerPage)
      .exec();
    if (!users) {
      return response.status(404).send({
        status: "error",
        message: "No users avaliable",
      });
    }

    // Devolver el resultado(posteriormente info follow)
    const followInfo = await followService.followThisUser(req.user.id, id);

    return res.status(200).send({
      status: "success",
      users,
      page,
      itemsPerPage,
      totalUsers,
      pages: Math.ceil(total / itemsPerPage),
      following: followInfo.following,
      follower: followInfo.follower,
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "Error en lista de usuario",
    });
  }
};

const update = async (req, res) => {
  try {
    //Recoger info del usuario a actualizar
    let userIdentity = req.user;
    let userToUpdate = req.body;

    //Eliminar campos sobrantes
    delete userToUpdate.iat;
    delete userToUpdate.exp;
    delete userToUpdate.role;
    delete userToUpdate.image;

    //Comprobar si el usuario ya existe
    const users = await User.find({
      $or: [
        { email: userToUpdate.email.toLowerCase() },
        { nick: userToUpdate.nick.toLowerCase() },
      ],
    }).exec();
    let userIsset = false;

    if (users) {
      users.forEach((user) => {
        if (user && user._id != userIdentity.id) userIsset = true;
      });
    }

    if (userIsset) {
      return res.status(200).send({
        status: "succes",
        message: "El usuario ya existe",
      });
    }

    // Cifrar la contraseña
    if (userToUpdate.password) {
      let salt = bcrypt.genSaltSync(10);
      let hash = bcrypt.hashSync(userToUpdate.password, salt);
      userToUpdate.password = hash;
    } else {
      delete userToUpdate.password;
    }

    // Buscar y actualizar
    User.findByIdAndUpdate({ _id: userIdentity.id }, userToUpdate, {
      new: true,
    })
      .then((userUpdated) => {
        return res.status(200).json({
          status: "success",
          message: "Metodo de actualizar usuario",
          user: userUpdated,
        });
      })
      .catch((error) => {
        return res.status(500).send({
          message: "Error saving user",
          status: "error",
        });
      });
  } catch (error) {
    return res.status(500).json({
      status: "Error",
      message: "Error en la consulta de actualizacion de usuario",
    });
  }
};

const upload = async (req, res) => {
  try {
    //Recoger el fichero de imagen y comprobar que existe
    if (!req.file) {
      return res.status(404).send({
        status: "error",
        message: "Petición no incluye la imagen",
      });
    }
    //Conseguir el nombre del rchivo
    let image = req.file.originalname;

    //Sacar la extension del archivo
    const imageSplit = image.split(".");
    const extension = imageSplit[1];
    //Comprobar extension
    if (
      extension != "gif" &&
      extension != "png" &&
      extension != "jpg" &&
      extension != "jpeg"
    ) {
      //Si no es correcta, borrar archivo
      const filePath = req.file.path;
      const fileDeleted = fs.unlinkSync(filePath);
      return res.status(400).send({
        status: "error",
        message: "Extensión del fichero invalida",
      });
    }

    //Si es correcta, guaradra imagen en bbdd
    const userUpdated = await User.findOneAndUpdate(
      { _id: req.user.id },
      { image: req.file.filename },
      { new: true }
    );

    if (userUpdated) {
      return res.status(200).send({
        status: "success",
        message: "Subida de imagenes",
        user: userUpdated,
        file: req.file,
      });
    }
  } catch (error) {
    const filePath = req.file.path;
    const fileDeleted = fs.unlinkSync(filePath);

    return res.status(500).send({
      status: "error",
      message: "Error a la subida de avatar",
    });
  }
};

const avatar = (req, res) => {
  // Sacar el parametro de la url
  const file = req.params.file;

  // Montar el path real de la imagen
  const filePath = `./uploads/avatars/${file}`;

  // Comprobar que existe
  fs.stat(filePath, (error, exists) => {
    if (!exists) {
      return res.status(404).send({
        status: "error",
        message: "No existe la imagen",
      });
    }

    // Devolver un file
    return res.sendFile(path.resolve(filePath));
  });
};

const counters = async (req, res) => {
  let userId = req.user.id;

  if (req.user.id) userId = req.user.id;

  try {
    const following = await Follow.count({ user: userId });

    const followed = await Follow.count({ followed: userId });

    const publications = await Publication.count({ user: userId });

    return res.status(200).send({
      userId,
      following: following,
      followed: followed,
      publications: publications,
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "Error en los contadores",
    });
  }
};

// Exportar acciones
module.exports = {
  pruebaUser,
  register,
  login,
  profile,
  list,
  update,
  upload,
  avatar,
  counters,
};
