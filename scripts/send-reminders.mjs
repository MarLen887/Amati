// Recordatorios de estudio por correo, sin Cloud Functions (no requiere plan Blaze).
// Lo ejecuta GitHub Actions cada hora (.github/workflows/reminders.yml). Si en la hora elegida por el
// alumno tiene tarjetas pendientes, recibe UN correo breve (máximo uno al día).
//
// Variables de entorno (secretos del repositorio en GitHub):
//   FIREBASE_SERVICE_ACCOUNT  JSON completo de la cuenta de servicio de Firebase
//   SMTP_USER / SMTP_PASS     cuenta de Gmail y su contraseña de aplicación de 16 caracteres
//   MAIL_FROM                 ej. Amati <amati.uvp@gmail.com>
//   APP_URL                   opcional, por defecto https://amati-8382f.web.app
//   TEST_EMAIL                opcional: si existe, solo envía un correo de prueba a esa dirección y termina
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

const { FIREBASE_SERVICE_ACCOUNT, SMTP_USER, SMTP_PASS, MAIL_FROM, TEST_EMAIL } = process.env;
const APP_URL = process.env.APP_URL || 'https://amati-8382f.web.app';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);

for (const [k, v] of Object.entries({ FIREBASE_SERVICE_ACCOUNT, SMTP_USER, SMTP_PASS, MAIL_FROM })) {
  if (!v) {
    console.error(`Falta el secreto ${k}.`);
    process.exit(1);
  }
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

function emailHtml(name, count, exam) {
  const saludo = name ? `Hola, ${esc(name.split(' ')[0])}` : 'Hola';
  const tarjetas = count === 1 ? '1 tarjeta lista' : `${count} tarjetas listas`;
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto;color:#1f2a3d">
    <h2 style="color:#4f5bd5;margin-bottom:8px">${saludo} 🌿</h2>
    <p>Tienes <strong>${tarjetas}</strong> para repasar hoy en Amati.</p>
    <p>Unos minutos son suficientes. Respira, repasa a tu ritmo y listo.</p>
    ${exam ? `<p style="background:#f0f1fa;border-radius:10px;padding:10px 12px">Tu examen de <strong>${esc(exam.name)}</strong> es ${exam.left === 0 ? 'hoy' : exam.left === 1 ? 'mañana' : `en ${exam.left} días`}. Vas a tiempo: un repaso tranquilo hoy suma mucho.</p>` : ''}
    <p style="margin:24px 0">
      <a href="${APP_URL}" style="background:#4f5bd5;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Abrir Amati</a>
    </p>
    <p style="font-size:12px;color:#667085">Recibes este correo porque activaste los recordatorios. Puedes desactivarlos en Ajustes.</p>
  </div>`;
}

// Prueba de configuración: confirma que el correo sale antes de depender del horario
if (TEST_EMAIL) {
  await transporter.sendMail({
    from: MAIL_FROM,
    to: TEST_EMAIL,
    subject: 'Amati: correo de prueba',
    html: emailHtml('prueba', 3, null),
  });
  console.log(`Correo de prueba enviado a ${TEST_EMAIL}.`);
  process.exit(0);
}

const now = new Date();
const users = await db.collection('users').where('reminders.emailEnabled', '==', true).get();
console.log(`Usuarios con recordatorio por correo: ${users.size}`);

let sent = 0;
for (const docSnap of users.docs) {
  const u = docSnap.data();
  const r = u.reminders || {};
  let local;
  try {
    local = localParts(now, r.timezone || 'America/Mexico_City');
  } catch {
    local = localParts(now, 'America/Mexico_City');
  }
  // GitHub puede retrasar la ejecución, así que se envía en la hora elegida o después, el mismo día, una sola vez
  const target = Number(r.hour ?? 18);
  if (r.lastSentDay === local.day || local.hour < target || !u.email) continue;

  const due = await db
    .collection(`users/${docSnap.id}/cards`)
    .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(now))
    .count()
    .get();
  const count = due.data().count;
  if (count === 0) continue; // sin pendientes, sin correo (no generar presión)

  let exam = null;
  const subjects = await db
    .collection(`users/${docSnap.id}/subjects`)
    .where('examDate', '>=', admin.firestore.Timestamp.fromDate(now))
    .orderBy('examDate')
    .limit(1)
    .get();
  if (!subjects.empty) {
    const sub = subjects.docs[0].data();
    const left = Math.round((sub.examDate.toDate() - now) / 86_400_000);
    if (left <= 7) exam = { name: sub.name, left: Math.max(0, left) };
  }

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: u.email,
      subject: `Amati: ${count} ${count === 1 ? 'tarjeta' : 'tarjetas'} para hoy`,
      html: emailHtml(u.displayName, count, exam),
    });
    await docSnap.ref.update({ 'reminders.lastSentDay': local.day });
    sent += 1;
  } catch (err) {
    console.error(`No se pudo enviar el recordatorio de ${docSnap.id}: ${err.message}`);
  }
}
console.log(`Recordatorios enviados: ${sent}`);
process.exit(0);
