// Importar modelo
const Follow = require("../models/follow");
const User = require("../models/user");

//Importar servicio
const followService = require("../services/followUserIds");

//Importar dependencias
const mongoosePaginate = require("mongoose-pagination");

// Acciones de prueba
const pruebaFollow = (req, res) => {
  return res.status(200).send({
    message: "Mensaje enviado desde: controllers/follow.js",
  });
};

// Accion de guardar un follow(accion seguir)
const save = async (req, res) => {
  // Conseguir datos por body
  //const params = req.body;
  const followed = req.body.followed;

  // Sacar id del usuario identificado
  //const identity = req.user;
  const user = req.user.id;
  try {
    //Verificar si ya lo sigue al usuario
    const validarFollow = await Follow.find({ user, followed });

    if (validarFollow.length > 0) {
      return res.status(500).send({
        status: "error",
        message: `Ya se sigue al usuario ${followed}`,
      });
    }
    // Crear objeto con modelo follow
    let userToFollow = new Follow({
      user,
      followed,
    });

    //Guardar objeto en la base
    const validartoFollow = await userToFollow.save();

    if (!validartoFollow) {
      return res.status(500).send({
        status: "error",
        message: "Error al seguir al usuario",
      });
    }
    return res.status(200).send({
      status: "success",
      message: "Metodo de follow",
      identity: req.user,
      validartoFollow,
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      msg: "Ha ocurrido un error en el guardado",
    });
  }
};

// Accion de borra un follow(accion dejar de seguir)
const unfollow = async (req, res) => {
  try {
    // recoger el id del usuario identificado
    const userId = req.user.id;
    // Recoger el id del usuario que sigo y quiero dejar de seguir
    const followdId = req.params.id;

    // Find de las coincidencias y hacer remove
    const userToUnfollow = await Follow.find({
      user: userId,
      followed: followdId,
    }).deleteOne();

    if (!userToUnfollow) {
      return res.status(500).send({
        status: "error",
        message: "Error, no sigues a ese usuario",
      });
    }

    return res.status(200).send({
      status: "success",
      message: "Follow eliminado correctamente",
    });
  } catch (error) {
    return res.status(500).send({
      status: "Error",
      mesage: "Error en la consulta de unfollow",
    });
  }
};

// Accion listado de usuarios que cualquier usuario está siguiendo
const following = async (req, res) => {
  try {
    //Sacar el id del usaurio identificado
    let usuario = req.user.id;

    //Comprobar si me llega el id por parametro en url
    if (req.params.id) userID = req.params.id;

    //Comprobar si me llega la pagina, si no la pagina 1
    let page = 1;

    if (req.params.page) page = req.params.page;

    //Usuarios por pagina quiero mostrar
    const itemsPerPage = 5;

    //Find a follow, popular datos de los usuario y paginar con mongoose paginate
    const countFollow = await Follow.countDocuments({ user: userID });
    const findFollow = await Follow.find({ user: userID })
      .populate("user followed", "-password -role -__v")
      .paginate(page, itemsPerPage);

    /*Promise.all([countFollow, findFollow])
      .then(async ([totalItems, result]) => {
        //Listado de usuarios de trinity, y soy victor
        //Sacar un array de ids de los usuarios que me siguen y los que sigo como victor
        let followUserIds = await followService.followUserIds(req.user.id);

        return res.status(200).send({
          status: "success",
          message: "Listado de usuarios que estoy siguiendo",
          totalPages: Math.ceil(totalItems / itemsPerPage),
          page,
          result,
          user_following: followUserIds.following,
        });
      })
      .catch((error) => {
        return res.status(500).send({
          status: "Error",
          message: "Error en consulra de datos de usuario",
        });
      });*/
    let followUserIds = await followService.followUserIds(req.user.id);

    return res.status(200).send({
      status: "success",
      message: "Listado de usuarios que estoy siguiendo",
      totalPages: Math.ceil(countFollow / itemsPerPage),
      page,
      result: findFollow,
      user_following: followUserIds.following,
    });
  } catch (error) {
    return res.status(500).send({
      status: "Error",
      message: "Error en consulra de datos de usuario",
    });
  }
};

// Accion listado de usuarios siguen a cualquier otro usuario
const followers = (req, res) => {
  return res.status(200).send({
    status: "success",
    message: "Listado de usuarios que me siguen",
  });
};

// Exportar acciones
module.exports = {
  pruebaFollow,
  save,
  unfollow,
  following,
  followers,
};
