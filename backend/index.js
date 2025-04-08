const { body, validationResult } = require("express-validator");
const bcrypt = require('bcryptjs');
const express = require("express");
const cors = require("cors");
const app = express();
const path = require("path");
const axios = require("axios");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const port = 8000;
app.use(express.json());
app.use(cors());
// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '..','index.html')));

//conexion a la base de datos.
const knex = require("knex")({
  client: "pg",
  connection: {
    host: "db",
    port: 5432,
    user: "alejo",
    password: "1234",
    database: "desarrolloweb",
  },
});

// lectura de sensores en la base de datos
async function lecturaDatosDHT(){
  try {
    const result = await axios.get('http://192.168.192.218/data');
    const {temperature, humidity} = result.data;

    // guardar en la base de datos
    // temperatura ambiente
    await knex ('lectura_sensores').insert( {
        sensor_id: 1,
        valor: temperature,
        fecha_lectura: new Date()
      }
    )

    // humedad ambiente
    await knex ('lectura_sensores').insert( {
        sensor_id: 2,
        valor: humidity,
        fecha_lectura: new Date()
      }
    )

    console.log('Datos del sensor DHT22 guardados');
  } catch (error) {
    console.error(error);
  }
}

async function lecturaDatosHumedadSuelo (){

  try {
    const result = await axios.get('http://192.168.192.218/humedad/suelo');
    const {humidity} = result.data;
    await knex ('lectura_sensores').insert({
      sensor_id: 3,
      valor: humidity,
      fecha_lectura: new Date()
    }); 
    console.log("Datos del sensor capacitivo guardados.")
  } catch (error) {
    console.error(error);
  }
}

async function lecturaDatosDistancia() {
  try {
    const result = await axios.get('http://192.168.192.218/distancia');
    const {distance} = result.data;
    await knex ('lectura_sensores').insert({
      sensor_id: 4,
      valor: distance,
      fecha_lectura: new Date()
    });

    console.log("Datos del sensor HC-SR04 ultasonico guardados.")
  } catch (error) {
    console.error(error);
  }
}

async function lecturaDatosDeGas(){
  try {
    const result = await axios.get('http://192.168.192.218/leer/gas');
    const {porcentajeGas} = result.data;
    await knex ('lectura_sensores').insert({
      sensor_id: 5,
      valor: porcentajeGas,
      fecha_lectura: new Date()
    });
    console.log("Datos del sensor MQ2 guardados.")
  } catch (error) {
    console.error(error);
  }
}

setInterval(lecturaDatosDHT, 5 * 60 * 1000);
setInterval(lecturaDatosHumedadSuelo, 5 * 60 * 1000);
setInterval(lecturaDatosDistancia, 5 * 60 * 1000);
setInterval(lecturaDatosDeGas, 5 * 60 * 1000);


// Middleware para verificar el token JWT
function validarToken(req, res, next) {
  const token = req.header('Authorization').replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ msg: "Acceso denegado. Token no proporcionado." });
  }

  try {
    const verificado = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = verificado;
    next();
  } catch (err) {
    res.status(400).json({ msg: "Token no válido" });
  }
}

// Middleware para verificar si el usuario es administrador
async function validarAdministrador(req, res, next) {
  try {
    // Obtener el id del usuario desde el token 
    const userId = req.usuario.id;

    // Consultar la base de datos para obtener el rol del usuario
    const user = await knex('usuarios')
      .join('roles', 'usuarios.rol_id', 'roles.id')  // Unimos con la tabla roles
      .where('usuarios.id', userId)
      .first();

    if (!user) {
      return res.status(401).json({ msg: "Usuario no encontrado" });
    }

    // Verificar roles en la base de datos
    if (user.tipo_roles !== 'administrador') {  // validacion para admin o invitado
      return res.status(403).json({ msg: "Acceso denegado. No tienes permisos de administrador." });
    }

    // continuar si el rol del usuario es administrador
    next();
  } catch (error) {
    console.error("Error al verificar rol de administrador", error);
    return res.status(500).json({ msg: "Error interno del servidor" });
  }
}

app.post("/login",
  [
    // Validación de campos requeridos
    body("usuario").notEmpty().withMessage("El nombre es obligatorio"),
    body("password").notEmpty().withMessage("La contraseña es obligatoria"),
  ],
  async (req, res) => {
    // Manejar el resultado de las validaciones
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    try {
      // Obtener nombre y password del body
      const { usuario, password } = req.body;

      // Buscar usuario en la base de datos
      const user = await knex("usuarios")
        .join('roles', 'usuarios.rol_id', 'roles.id')  // iner join, Unimos con la tabla roles
        .where('usuarios.usuario', usuario)
        .first();

      // Verificar si el usuario existe
      if (!user) {
        return res.status(400).json({ message: "Usuario o contraseña incorrecta" });
      }

      // Verificar la contraseña (si está encriptada)
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(400).json({ message: "Usuario o contraseña incorrecta" });
      }

      // Si la contraseña coincide generar un token
      // Generar un token JWT
      const token = jwt.sign(
        { id: user.id, role: user.rol_id },  // Guardamos el id y el rol_id en el token
        process.env.JWT_SECRET, // firma del token
        { expiresIn: '2h' } // el token dura dos horas
      );

      return res.status(200).json({ token, message: "Token generado", redirect: '/panel.html'});

    } catch (err) {
      console.error("Error al intentar iniciar sesión:", err);
      if (!res.headersSent) {
        return res
          .status(500)
          .json({ msg: 'Error del servidor. Contacte al administrador.' });
      }
    }
  }
);


// Ruta protegida para servir el archivo panel.html
app.get('/panel', validarToken, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'panel.html'));
});


app.post("/submit", validarToken, validarAdministrador, 
  [
    // Validación de campos requeridos
    body("usuario").notEmpty().withMessage("El nombre es obligatorio"),
    body("password").notEmpty().withMessage("El password es obligatorio")
  ],
  async (req, res) => {
    // Manejar el resultado de las validaciones
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    // datos recibidos
    const data = req.body;
    console.log("Datos recibidos", data);

    // Guardar datos en la base de datos
    try {
      const { usuario, password } = req.body;
      const salt = await bcrypt.genSalt(5);
      const hashedPassword = await bcrypt.hash(password, salt);

      const result = await knex("usuarios")
        .insert({
          rol_id: 3, 
          usuario: usuario,
          password: hashedPassword
        })
        .returning("*");

      console.log("Info stored successfully");

      return res.status(200).json({ message: "Datos insertados correctamente", result });
    } catch (err) {
      console.error("Error al insertar datos", err);

      if (!res.headersSent) {
        return res
          .status(500)
          .json({ msg: 'Internal Server Error. Please contact "al inge"' });
      }
    }

    res.status(200).json({ message: "Datos validados y procesados correctamente" });
  }
);

const crearTablas = async () => {
  try {
      // Verificar y crear tabla 'roles'
      const rolesExiste = await knex.schema.hasTable('roles');
      if (!rolesExiste) {
          console.log('Creando tabla "roles" en la base de datos');
          await knex.schema.createTable('roles', (table) => {
              table.increments('id').primary();
              table.string('nombre').notNullable();
              // Puedes agregar otras columnas para roles aquí (ej: descripcion)
          });
          console.log('Tabla "roles" creada exitosamente');
      } else {
          console.log('La tabla "roles" ya existe');
      }

      // Verificar y crear tabla 'usuarios'
      const usuariosExiste = await knex.schema.hasTable('usuarios');
      if (!usuariosExiste) {
          console.log('Creando tabla "usuarios" en la base de datos');
          await knex.schema.createTable('usuarios', (table) => {
              table.increments('id').primary();
              table.string('usuario').notNullable().unique(); // 'unique()' asegura que no haya usuarios duplicados
              table.string('password').notNullable();
              table.integer('rol_id').unsigned().references('roles.id'); // Clave foránea a 'roles'
              // Puedes agregar otras columnas para usuarios aquí (ej: email, nombre_completo)
          });
          console.log('Tabla "usuarios" creada exitosamente');
      } else {
          console.log('La tabla "usuarios" ya existe');
      }

  } catch (err) {
      console.error('Error al crear las tablas:', err);
  }
};
// Llama a la función crear tabla cuando el servidor se inicie
app.listen(port, async () => {
  console.log('Servidor iniciando...');
  await crearTablas();
  console.log(`Servidor activo en el puerto ${port}`);
});
