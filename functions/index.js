// Módulo de notificaciones asíncronas de Amati
// Cada hora revisa a los usuarios que activaron el recordatorio por correo y, si en su hora
// elegida tienen tarjetas pendientes, les envía UN correo breve (máximo uno al día).
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret, defineString } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configuración del servicio externo de correo (SMTP: Gmail, Brevo, SendGrid, etc.)
// Gmail del proyecto: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_USER=correo de Gmail,
// SMTP_PASS=contraseña de aplicación de 16 caracteres (se guarda como secreto, nunca en el código).
const SMTP_HOST = defineString('SMTP_HOST', { default: 'smtp.gmail.com' });
const SMTP_PORT = defineString('SMTP_PORT', { default: '465' });
const SMTP_USER = defineString('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');
const MAIL_FROM = defineString('MAIL_FROM'); // ej. "Amati <amati.uvp@gmail.com>"
const APP_URL = defineString('APP_URL', { default: 'https://amati-8382f.web.app' });

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

function emailHtml(name, count, url, exam) {
  const saludo = name ? `Hola, ${name.split(' ')[0]}` : 'Hola';
  const tarjetas = count === 1 ? '1 tarjeta lista' : `${count} tarjetas listas`;
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto;color:#1f2a3d">
    <h2 style="color:#4f5bd5;margin-bottom:8px">${saludo} 🌿</h2>
    <p>Tienes <strong>${tarjetas}</strong> para repasar hoy en Amati.</p>
    <p>Unos minutos son suficientes. Respira, repasa a tu ritmo y listo.</p>
    ${exam ? `<p style="background:#f0f1fa;border-radius:10px;padding:10px 12px">Tu examen de <strong>${exam.name}</strong> es ${exam.left === 0 ? 'hoy' : exam.left === 1 ? 'mañana' : `en ${exam.left} días`}. Vas a tiempo: un repaso tranquilo hoy suma mucho.</p>` : ''}
    <p style="margin:24px 0">
      <a href="${url}" style="background:#4f5bd5;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Abrir Amati</a>
    </p>
    <p style="font-size:12px;color:#667085">Recibes este correo porque activaste los recordatorios. Puedes desactivarlos en Ajustes.</p>
  </div>`;
}

exports.dailyReminders = onSchedule(
  { schedule: '0 * * * *', timeZone: 'America/Mexico_City', secrets: [SMTP_PASS], region: 'us-central1' },
  async () => {
    const db = admin.firestore();
    const now = new Date();
    const users = await db.collection('users').where('reminders.emailEnabled', '==', true).get();
    if (users.empty) return;

    const port = Number(SMTP_PORT.value());
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port,
      secure: port === 465,
      auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
    });

    let sent = 0;
    for (const docSnap of users.docs) {
      const u = docSnap.data();
      const r = u.reminders || {};
      const tz = r.timezone || 'America/Mexico_City';
      let local;
      try {
        local = localParts(now, tz);
      } catch {
        local = localParts(now, 'America/Mexico_City');
      }
      if (local.hour !== Number(r.hour ?? 18) || r.lastSentDay === local.day) continue;

      const due = await db
        .collection(`users/${docSnap.id}/cards`)
        .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(now))
        .count()
        .get();
      const count = due.data().count;
      if (count === 0) continue; // sin pendientes, sin correo (no generar presión)

      // Examen más próximo (en los siguientes 7 días), para mencionarlo con calma
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
          from: MAIL_FROM.value(),
          to: u.email,
          subject: `Amati: ${count} ${count === 1 ? 'tarjeta' : 'tarjetas'} para hoy`,
          html: emailHtml(u.displayName, count, APP_URL.value(), exam),
        });
        await docSnap.ref.update({ 'reminders.lastSentDay': local.day });
        sent += 1;
      } catch (err) {
        logger.error('No se pudo enviar recordatorio', { uid: docSnap.id, err: err.message });
      }
    }
    logger.info(`Recordatorios enviados: ${sent}`);
  },
);
