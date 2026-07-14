import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PetAdopt</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #f97316, #fb923c); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 28px; }
    .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0; }
    .body { padding: 40px 32px; }
    .body h2 { color: #1e293b; margin-top: 0; }
    .body p { color: #475569; line-height: 1.6; }
    .btn { display: inline-block; padding: 14px 32px; background: #f97316; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 24px 32px; text-align: center; color: #94a3b8; font-size: 14px; border-top: 1px solid #e2e8f0; }
    .info-box { background: #f8fafc; border-left: 4px solid #f97316; border-radius: 4px; padding: 16px; margin: 20px 0; }
    .info-box p { margin: 0; color: #475569; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
    .status-approved { background: #dcfce7; color: #166534; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    .status-pending { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐾 PetAdopt</h1>
      <p>Finding forever homes for pets</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} PetAdopt. All rights reserved.</p>
      <p>If you didn't request this email, please ignore it.</p>
    </div>
  </div>
</body>
</html>
`;

// Email templates
export const sendWelcomeEmail = async (user) => {
  const html = baseTemplate(`
    <h2>Welcome to PetAdopt, ${user.name}! 🎉</h2>
    <p>We're so excited to have you join our community of pet lovers. PetAdopt connects wonderful animals with loving families.</p>
    <p>Here's what you can do:</p>
    <ul>
      <li>Browse hundreds of pets looking for a forever home</li>
      <li>Save your favorites and track applications</li>
      <li>Chat directly with shelters</li>
      <li>Schedule meet & greet appointments</li>
    </ul>
    <a href="${process.env.CLIENT_URL}/browse" class="btn">Start Browsing Pets →</a>
  `);
  return sendEmail({ to: user.email, subject: 'Welcome to PetAdopt! 🐾', html });
};

export const sendVerificationEmail = async (user, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email/${token}`;
  const html = baseTemplate(`
    <h2>Verify your email address</h2>
    <p>Hi ${user.name}, please verify your email to complete your registration.</p>
    <a href="${url}" class="btn">Verify Email →</a>
    <p style="font-size:13px;color:#94a3b8;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
  `);
  return sendEmail({ to: user.email, subject: 'Verify your PetAdopt account', html });
};

export const sendPasswordResetEmail = async (user, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password/${token}`;
  const html = baseTemplate(`
    <h2>Reset your password</h2>
    <p>Hi ${user.name}, we received a request to reset your password.</p>
    <a href="${url}" class="btn">Reset Password →</a>
    <p style="font-size:13px;color:#94a3b8;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
  `);
  return sendEmail({ to: user.email, subject: 'PetAdopt — Password Reset Request', html });
};

export const sendApplicationSubmittedEmail = async (user, pet, application) => {
  const html = baseTemplate(`
    <h2>Application Submitted! 📋</h2>
    <p>Hi ${user.name}, your adoption application for <strong>${pet.name}</strong> has been received.</p>
    <div class="info-box">
      <p><strong>Pet:</strong> ${pet.name} (${pet.breed || pet.species})</p>
      <p><strong>Application ID:</strong> #${application._id.toString().slice(-8).toUpperCase()}</p>
      <p><strong>Status:</strong> <span class="status-badge status-pending">Pending Review</span></p>
    </div>
    <p>The shelter will review your application and get back to you. You can track your application status in your dashboard.</p>
    <a href="${process.env.CLIENT_URL}/applications/${application._id}" class="btn">View Application →</a>
  `);
  return sendEmail({ to: user.email, subject: `Application submitted for ${pet.name}`, html });
};

export const sendApplicationStatusEmail = async (user, pet, application, status) => {
  const statusText = status === 'approved' ? 'Approved! 🎉' : status === 'rejected' ? 'Status Update' : 'Info Requested';
  const statusClass = status === 'approved' ? 'status-approved' : status === 'rejected' ? 'status-rejected' : 'status-pending';
  const message = status === 'approved'
    ? `Congratulations! Your application to adopt <strong>${pet.name}</strong> has been approved!`
    : status === 'rejected'
    ? `We're sorry, your application for <strong>${pet.name}</strong> was not approved at this time.`
    : `The shelter has requested additional information for your <strong>${pet.name}</strong> application.`;

  const html = baseTemplate(`
    <h2>Application ${statusText}</h2>
    <p>Hi ${user.name}, ${message}</p>
    <div class="info-box">
      <p><strong>Pet:</strong> ${pet.name}</p>
      <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></p>
      ${application.rejectionReason ? `<p><strong>Reason:</strong> ${application.rejectionReason}</p>` : ''}
      ${application.additionalInfoRequested ? `<p><strong>Info Requested:</strong> ${application.additionalInfoRequested}</p>` : ''}
    </div>
    <a href="${process.env.CLIENT_URL}/applications/${application._id}" class="btn">View Application →</a>
  `);
  return sendEmail({ to: user.email, subject: `Application ${statusText} — ${pet.name}`, html });
};

export const sendAppointmentEmail = async (user, appointment, pet, action = 'scheduled') => {
  const actions = { scheduled: 'Scheduled', confirmed: 'Confirmed ✅', cancelled: 'Cancelled', rescheduled: 'Rescheduled' };
  const html = baseTemplate(`
    <h2>Appointment ${actions[action] || action}</h2>
    <p>Hi ${user.name}, your appointment has been ${action}.</p>
    <div class="info-box">
      <p><strong>Pet:</strong> ${pet.name}</p>
      <p><strong>Date:</strong> ${new Date(appointment.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>Time:</strong> ${appointment.scheduledTime}</p>
      <p><strong>Type:</strong> ${appointment.type.replace(/_/g, ' ')}</p>
      ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
    </div>
    <a href="${process.env.CLIENT_URL}/appointments/${appointment._id}" class="btn">View Appointment →</a>
  `);
  return sendEmail({ to: user.email, subject: `Appointment ${actions[action]} — ${pet.name}`, html });
};

export const sendShelterApprovalEmail = async (user, shelter) => {
  const html = baseTemplate(`
    <h2>Shelter Approved! 🎉</h2>
    <p>Hi ${user.name}, your shelter <strong>${shelter.name}</strong> has been approved on PetAdopt!</p>
    <p>You can now start adding pets and managing adoptions.</p>
    <a href="${process.env.CLIENT_URL}/shelter/dashboard" class="btn">Go to Dashboard →</a>
  `);
  return sendEmail({ to: user.email, subject: `${shelter.name} — Shelter Approved!`, html });
};

export default sendEmail;
