const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTP(email, otp) {
  await resend.emails.send({
    from: 'SDSC Medical App <onboarding@resend.dev>',
    to: email,
    subject: 'Your OTP Verification Code - SDSC',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:10px">
        <h2 style="color:#38bdf8;text-align:center">Smart Disease Symptoms Checker</h2>
        <p>Your OTP verification code is:</p>
        <div style="background:#0f172a;color:#38bdf8;font-size:2rem;font-weight:bold;text-align:center;padding:20px;border-radius:8px;letter-spacing:8px">
          ${otp}
        </div>
        <p style="color:#666;font-size:.85rem;margin-top:20px">This code expires in <b>15 minutes</b>. Do not share it with anyone.</p>
        <p style="color:#666;font-size:.85rem">If you did not request this, please ignore this email.</p>
      </div>
    `
  });
}

module.exports = { generateOTP, sendOTP };