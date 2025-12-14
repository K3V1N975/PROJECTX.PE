const http = require('http');

const data = JSON.stringify({
  nombres: "Usuario",
  apellidos: "De Prueba",
  dni: "87654321",
  telefono: "999-888-777",
  correo: "correo_prueba@ejemplo.com",
  edad: 30
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/registro',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log("Enviando solicitud de prueba al servidor...");

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`Código de estado: ${res.statusCode}`);
    console.log(`Respuesta del servidor: ${body}`);
  });
});

req.on('error', (error) => {
  console.error("Error al conectar con el servidor:", error);
});

req.write(data);
req.end();
