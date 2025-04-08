
const esp32Ip = "http://192.168.28.192";  // ip que nos genera el servidor ESP32

// temperatura ambiente
 // Create Temperature Gauge
 let temperatureGauge = new JustGage({
    id: "temperatureGauge",
    value: 14,          // Initial value for the gauge
    min: 0,
    max: 70,
    symbol: "°C", 
    pointer: true,      // Show pointer
    gaugeWidthScale: 0.6,
    pointerOptions: {
        toplength: -15,
        bottomlength: 10,
        bottomwidth: 12,
        color: '#8e8e93',
        stroke: '#ffffff',
        stroke_width: 3,
        stroke_linecap: 'round'
    },
    counter: true       // Enable the value counter
});

// Create Humidity Gauge
let humidityGauge = new JustGage({
    id: 'humidityGauge',
    value: 20,
    min: 0,
    max: 100,
    symbol: '%',
    pointer: true,
    pointerOptions: {
        toplength: 10,
        bottomlength: 10,
        bottomwidth: 8,
        color: '#000'
    },
    gaugeWidthScale: 0.6,
    counter: true
});

// Función para obtener datos del sensor y actualizar los gauges
function obtenerDatosDHT() {
    fetch(`${esp32Ip}/data`)
      .then(response => response.json())
      .then(data => {
        // Actualizar los valores de los gauges
        temperatureGauge.refresh(data.temperature);
        humidityGauge.refresh(data.humidity);
      })
      .catch(error => {
        console.error('Error obteniendo los datos:', error);
      });
  }

// Llamar a la función cada 5 segundos para actualizar los datos
setInterval(obtenerDatosDHT, 5000);

//
const cnt = document.getElementById("count");
const water = document.getElementById("water");
const message = document.getElementById("statusMsg");
let percent = 0;
let animationInterval; // Almacena la referencia al intervalo de animación


function obtenerHumedadSuelo() {
    fetch(`${esp32Ip}/humedad/suelo`)
    .then(response => response.json())
    .then(datos => {    
       console.log(datos);
       // diferencia entre le nuevo valor y el % actual
       const diff = Math.abs(datos.humidity - percent);

       // actulizar percent con el valor de humedad actualizado
       percent = datos.humidity;
       message.innerText = datos.status;
       // detener la animacion actual si esta en ejecucion
       if(animationInterval){
         clearInterval(animationInterval);
       }
       animateWaterLevel(diff);
    })
    .catch(error => {
        console.error('Error obteniendo los datos:', error);
    });
}

function animateWaterLevel(diff) {
   let currentPercent = parseInt(cnt.innerHTML); // Porcentaje inicial
  
  animationInterval = setInterval(function () {
    // Incrementar o decrementar el porcentaje actual en función de la diferencia
    if (percent > currentPercent) {
      currentPercent++;
    } else {
      currentPercent--;
    }
    
    cnt.innerHTML = currentPercent;
    water.style.transform = `translate(0, ${100 - currentPercent}%)`;

    // Detener la animación cuando el porcentaje actual coincida con el de humedad recibido
    if (currentPercent === percent) {
      clearInterval(animationInterval);
    }
  }, 60);   
}
  
// Llamar a la función cada 5 segundos para obtener los datos del sensor
setInterval(obtenerHumedadSuelo, 5000);

// Función para obtener datos del sensor de movimiento y actualizar los gauges
 let movimientoGauge = new JustGage({
  id: "movimientoGauge",
  value: 5,          // Initial value for the gauge
  min: 0,
  max: 90,
  symbol: "cm",
  pointer: true,      // Show pointer
  gaugeWidthScale: 0.6,
  pointerOptions: {
      toplength: -15,
      bottomlength: 10,
      bottomwidth: 12,
      color: '#8e8e93',
      stroke: '#ffffff',
      stroke_width: 3,
      stroke_linecap: 'round'
  },
  counter: true       // Enable the value counter
});

function obtenerDatosSensorDistancia() {
  fetch(`${esp32Ip}/distancia`)
    .then(response => response.json())
    .then(data => {
      console.log("Distancia: ", data.distance);
      movimientoGauge.refresh(data.distance);
    })
    .catch(error => {
      console.error('Error obteniendo los datos:', error);
    });
}
// Llamar a la función cada 1 segundos para actualizar los datos
setInterval(obtenerDatosSensorDistancia, 2000);

// grafico para el sensor de gas
let sensorGasGauge = new JustGage({
  id: 'sensorGasGauge',
  value: 20,
  min: 0,
  max: 100,
  symbol: '%',
  pointer: true,
  pointerOptions: {
      toplength: 10,
      bottomlength: 10,
      bottomwidth: 8,
      color: '#000'
  },
  gaugeWidthScale: 0.6,
  counter: true
});
// componente par msg de gas
const msg = document.getElementById("statusGasMsg");
function obtenerDatosSensorGas() {
  fetch(`${esp32Ip}/leer/gas`)
    .then(response => response.json())
    .then(data => {
      console.log("Gas: ", data)
      sensorGasGauge.refresh(data.porcentajeGas);
      msg.innerText = data.status;
    })
    .catch(error => {
      console.error('Error obteniendo los datos:', error);
    });
}

// Llamar a la función cada 5 segundos para actualizar los datos
setInterval(obtenerDatosSensorGas, 3000);


// actuadores
// Función para encender iluminacion
document.getElementById('turnOn').addEventListener('click', function() {
  fetch(`${esp32Ip}/led/on`)
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
});

// Función para apagar la iluminacion
document.getElementById('turnOff').addEventListener('click', function() {
  fetch(`${esp32Ip}/led/off`)
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
});

// Función para llamar la ruta de reigo
document.getElementById('openRiego').addEventListener('click', function() {
  fetch(`${esp32Ip}/riego/on`)
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
});

// Función para apagar riego
document.getElementById('closeRiego').addEventListener('click', function() {
  fetch(`${esp32Ip}/riego/off`)
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
});


// Funcion fetch para abrir techo
document.getElementById('openDoor').addEventListener('click', function() {
  fetch(`${esp32Ip}/abrir/puerta`)
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
});

// Función para cerrar techo
document.getElementById('closeDoor').addEventListener('click', function() {
  fetch(`${esp32Ip}/cerrar/puerta`)
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
});

// Función para activar IA
document.getElementById('activarIA').addEventListener('click', function () {
    console.log("Intentando activar IA..."); // Mensaje de prueba
    fetch(`${esp32Ip}/modoIA?estado=on`)
        .then(response => response.text())
        .then(data => {
            console.log("Respuesta del servidor:", data); // Verificar si llega la respuesta del ESP32
            alert("Modo Automático Activado"); 
        })
        .catch(error => console.error('Error al activar la IA:', error));
});

// Función para desactivar IA (Modo Manual)
document.getElementById('desactivarIA').addEventListener('click', function () {
    console.log("Intentando desactivar IA..."); // Mensaje de prueba
    fetch(`${esp32Ip}/modoIA?estado=off`)
        .then(response => response.text())
        .then(data => {
            console.log("Respuesta del servidor:", data);
            alert("Modo Manual Activado"); 
        })
        .catch(error => console.error('Error al desactivar la IA:', error));
});
