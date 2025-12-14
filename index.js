const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(cors());
app.use(express.json());

async function createTransport() {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport(process.env.SMTP_URL);
  }
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = (process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  }
  const testAccount = await nodemailer.createTestAccount();
  const transport = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  transport._isEthereal = true;
  console.log("⚠️  ATENCIÓN: Usando servidor de prueba (Ethereal).");
  console.log("⚠️  Los correos NO llegarán a tu bandeja de entrada real.");
  console.log("⚠️  Solo verás un enlace de 'Vista previa' en esta consola.");
  return transport;
}

app.get("/", (req, res) => {
  res.send("Project X Email API");
});

app.post("/api/registro", async (req, res) => {
  const { nombres, apellidos, dni, telefono, correo, edad } = req.body || {};
  if (!nombres || !apellidos || !dni || !correo) return res.status(400).json({ ok: false, error: "faltan_campos" });
  const transport = await createTransport();
  const to = process.env.RECIPIENT_EMAIL || "kevinvelabuelot83@gmail.com";
  const from = process.env.FROM_EMAIL || (transport.options && transport.options.auth ? transport.options.auth.user : undefined);
  try {
    const info = await transport.sendMail({
      from,
      to,
      subject: `Nuevo registro: ${nombres} ${apellidos}`,
      text: `Nombres: ${nombres}\nApellidos: ${apellidos}\nDNI: ${dni}\nTelefono: ${telefono || ""}\nCorreo: ${correo}\nEdad: ${edad || ""}`,
      html: `<h2>Nuevo registro</h2>
             <ul>
               <li><b>Nombres:</b> ${nombres}</li>
               <li><b>Apellidos:</b> ${apellidos}</li>
               <li><b>DNI:</b> ${dni}</li>
               <li><b>Teléfono:</b> ${telefono || ""}</li>
               <li><b>Correo:</b> ${correo}</li>
               <li><b>Edad:</b> ${edad || ""}</li>
             </ul>`
    });
    const preview = transport._isEthereal ? nodemailer.getTestMessageUrl(info) : null;
    if (preview) console.log("Vista previa del correo:", preview);
    res.json({ ok: true, preview });
  } catch (e) {
    console.error("Error enviando correo", e);
    res.status(500).json({ ok: false, error: "envio_fallido" });
  }
});

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, () => {
  console.log(`Server http://localhost:${port}/`);
});
