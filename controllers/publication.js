//Importar modulos
const fs = require("fs");
const path = require("path");

// Importar modelos
const Publication = require("../models/publication");

// Importar servicios
const followService = require("../services/followUserIds");

// Acciones de prueba
const pruebaPublication = (req, res) => {
  return res.status(200).send({
    message: "Mensaje enviado desde: controllers/publication.js",
  });
};

// Guardar publicacion
const save = async (req, res) => {
  try {
    //Recoger datos del body
    const params = req.body;

    // Si no me llegan dar respuesta megativa
    if (!params.text) {
      return res.status(400).send({
        status: "errror",
        error: "Debes enviar el texto",
      });
    }

    //Crear y rellenar el objeto del modelo
    let newPublication = new Publication(params);
    newPublication.user = req.user.id;

    //Guardar objeto en bbdd
    const publicationStored = await newPublication.save();
    if (!publicationStored) {
      return res.status(404).send({
        status: "error",
        message: "No se ha podido guardar la publicaion",
      });
    }

    return res.status(200).send({
      status: "success",
      message: "Publicacion guardada correctamente",
      publicationStored,
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "No se ha guardado la publicacion",
      error,
    });
  }
};

// Sacar una publicacion
const detail = async (req, res) => {
  try {
    //Sacar id de publicacion de la url
    const publicationId = req.params.id;
    //Find con la condicion del id
    const publicationStored = await Publication.findById(publicationId);

    if (publicationStored) {
      return res.status(404).send({
        status: "error",
        message: "No se ha encontrado la publicacion",
      });
    }

    return res.status(200).send({
      status: "success",
      message: "Mostrar Publicacion",
      publication: publicationStored,
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "Error al buscar la publicacion",
    });
  }
};

// Eliminar publicaciones
const remove = async (req, res) => {
  try {
    //Sacra el id de la publicaion a eliminar
    const publicationId = req.params.id;

    //Find y luego un remove
    const deletePublication = await Publication.find({
      user: req.user.id,
      _id: publicationId,
    }).deleteOne();

    if (!deletePublication) {
      return res.status(404).send({
        status: "error",
        message: "No se ha encontrado la publicacion",
      });
    }
    return res.status(200).send({
      status: "success",
      message: "Publicacion eliminada correctamente",
      publication: publicationId,
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "No se ha eliminado la publicacion",
    });
  }
};
// Listar publicaciones de un usuario
const user = async (req, res) => {
  try {
    // Sacar el id de usuario
    let userId = req.params.id;

    // Controlar la pagina
    let page = 1;
    if (req.params.page) page = req.params.page;

    const itemsPerPage = 5;

    //Total
    const countPublication = await Publication.countDocuments({ user: userId });
    // Find, populate, ordenar, paginar
    const publicationUser = await Publication.find({ user: userId })
      .sort("created_at")
      .populate("user", "-password -__v -role -email")
      .paginate(page, itemsPerPage);

    if (!publicationUser || publicationUser.length <= 0) {
      return res.status(404).send({
        status: "error",
        message: "No hay publicaciones que encontrar",
      });
    }

    return res.status(200).send({
      status: "success",
      message: "Publicaciones del perfil de un usuario",
      page,
      Total: Math.ceil(countPublication / itemsPerPage),
      user: req.user,
      publication: publicationUser,
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "Error al buscar publicaciones",
    });
  }
};

// Subir ficheros
const upload = async (req, res) => {
  try {
    //Sacar publication id
    const publicationId = req.params.id;
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
    const publicationUpdated = await Publication.findOneAndUpdate(
      { user: req.user.id, _id: publicationId },
      { file: req.file.filename },
      { new: true }
    );

    if (!publicationUpdated || publicationUpdated.length <= 0) {
      return res.status(500).send({
        status: "error",
        message: "Error al subir imagen de publicacion",
      });
    }

    return res.status(200).send({
      status: "success",
      message: "Subida de imagenes",
      publication: publicationUpdated,
      file: req.file,
    });
  } catch (error) {
    const filePath = req.file.path;
    const fileDeleted = fs.unlinkSync(filePath);

    return res.status(500).send({
      status: "error",
      message: "Error al subir imagen de publicacion",
    });
  }
};

//Devolver archivos multimedia imagenes
const media = (req, res) => {
  // Sacar el parametro de la url
  const file = req.params.file;

  // Montar el path real de la imagen
  const filePath = `./uploads/publication/${file}`;

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

// Listar todas las publicaciones(FEED)
const feed = async (req, res) => {
  try {
    // Sacar la pagina actual
    let page = 1;
    if (req.params.page) page = req.params.page;

    // Establecer numero de elementos por pagina
    let itemsPerPage = 5;
    // Sacara un array de identifiacores de usuarios que yo sigo

    const myFollows = await followService.followUserIds(req.user.id);

    //Find a publicaciones
    const publications = await Publication.find({
      user: myFollows.following,
    })
      .populate("user", "-password -role -__v -email")
      .sort("-created_at")
      .paginate(page, itemsPerPage);

    const countPublications = await Publication.countDocuments({
      user: myFollows.following,
    });
    if (!myFollows || !publications || !countPublications) {
      return res.status(500).send({
        status: "error",
        message: "No se encontraron resultados",
      });
    }

    return res.status(200).send({
      status: "success",
      message: "Feed Correcto",
      myFollows: myFollows.following,
      publications,
      page,
      itemsPerPage,
      TotalPage: Math.ceil(countPublications / itemsPerPage),
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "No se han listado las publicaciones del feed",
    });
  }
};

// Exportar acciones
module.exports = {
  pruebaPublication,
  save,
  detail,
  remove,
  user,
  upload,
  media,
  feed,
};
