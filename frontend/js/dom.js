// arrglo para leer los datos

let data = {
  usuario: "",
  password: "",
};

const usuario = document.querySelector("#usuario");
const password = document.querySelector("#password");
const formulario = document.querySelector("#form-login");

// Resetear formulario al cargar la página
window.addEventListener("load", () => {
  formulario.reset(); // Resetea el formulario y desmarca todos los radio buttons
});

// eventos
usuario.addEventListener('input', leerTexto);
password.addEventListener('input', leerTexto);
formulario.addEventListener('submit', function (evento) {
  evento.preventDefault();

  const { usuario, password } = data;
  if (usuario === "" || password === "") {
    alerta('Obligatorio, llenar todos los campos.', true);
    return;
  }

  fetch('http://localhost:8000/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data), // Serializa los datos del objeto `data`
  })
    .then(response => response.json())
    .then(result => {
      if (result.errores) {
        imprimirErrores(result.errores);
      } else {
        if (result.token) {
          // Guardar el token en localStorage
          localStorage.setItem("token", result.token);
          alerta('Formulario enviado correctamente', false);
          console.log(result);

          // Resetear el formulario tras el login
          formulario.reset();
          data = {
            usuario: "",
            password: "",
          };

          // Redirigir al panel de control
          window.location.href = result.redirect;
        } else if (result.message) {
          alerta(result.message, true);
        }
      }
    })
    .catch(error => {
      alerta('Error al enviar el formulario', true);
      console.error('Error:', error);
    });
});

// funciones

function leerTexto(e) {
  data[e.target.id] = e.target.value;
  console.log(data);
}

function alerta(mensaje, error = null) {
  const alerta = document.createElement("P");
  alerta.textContent = mensaje;

  if (error) {
    alerta.classList.add("error");
  } else {
    alerta.classList.add("correcto");
  }

  formulario.appendChild(alerta);
  // remover mensaje de validacion despues de 5 segundos
  setTimeout(() => {
    alerta.remove();
  }, 5000);
}

function imprimirErrores(errores) {
  const campoErrores = document.querySelector("#campo-errores");
  campoErrores.innerHTML = "";

  errores.forEach((error) => {
    const errorElemento = document.createElement("P");
    errorElemento.classList.add("error");
    errorElemento.textContent = error.msg;
    campoErrores.appendChild(errorElemento);
    // remover mensaje de validacion despues de 5 segundos
    setTimeout(() => {
      errorElemento.remove();
    }, 5000);
  });
}
