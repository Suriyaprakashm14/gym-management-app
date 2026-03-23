const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email configuration - using Gmail as default
// You can configure these in your .env file
const EMAIL_CONFIG = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '' // Use App Password for Gmail
  }
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter(EMAIL_CONFIG);
};

// Verify email configuration
const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email service is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email service configuration error:', error);
    return false;
  }
};

// Send OTP email
const sendOTPEmail = async (email, otp, type = 'password_reset') => {
  try {
    await sgMail.send({
      to: email,
      from: 'suriyaprakash2k03@gmail.com', // MUST be verified
      subject: 'Your OTP Code',
      html: `<h2>Your OTP is ${otp}</h2><p>Expires in 10 minutes</p>`
    });

    return { success: true };
  } catch (error) {
    console.error('🔥 SENDGRID ERROR:', error.response?.body || error);
    throw error;
  }
};



// Send password reset success email
const sendPasswordResetSuccessEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();
    
    const subject = 'Password Reset Successful - Gym Management System';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="color: #28a745; margin-bottom: 20px;">Password Reset Successful</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Hello ${firstName || 'User'},
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Your password has been successfully reset. You can now log in to your account using your new password.
          </p>
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #155724; margin: 0; font-weight: bold;">
              🔒 Your account is secure
            </p>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you did not request this password reset, please contact our support team immediately.
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Gym Management System<br>
            This is an automated message, please do not reply.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"Gym Management System" <${EMAIL_CONFIG.auth.user}>`,
      to: email,
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset success email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Failed to send password reset success email:', error);
    // Don't throw error for this as it's not critical
    return { success: false, error: error.message };
  }
};

module.exports = {
  createTransporter,
  verifyEmailConfig,
  sendOTPEmail,
  sendPasswordResetSuccessEmail
};

