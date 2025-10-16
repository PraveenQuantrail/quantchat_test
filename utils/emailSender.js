const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Helper to safely extract first name, handles undefined, null, whitespace, etc.
function extractFirstName(name) {
  if (typeof name !== "string" || !name.trim()) return "User";
  return name.split(" ")[0];
}

const generateOTP = () => {
  // Generate 6 digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateStrongPassword = () => {
  // Generate a strong password with 12 characters: uppercase, lowercase, number, special character
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specials = '!@#$%^&*()_+-=';

  // Ensure at least one of each required character type
  let password = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    specials[Math.floor(Math.random() * specials.length)]
  ];

  // Fill the rest with random characters from all sets
  const allChars = uppercase + lowercase + numbers + specials;
  for (let i = password.length; i < 12; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle the password array
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
};

const sendOTPEmail = async (email, name, otp) => {
  try {
    const firstName = extractFirstName(name);
    const organizationName = process.env.ORGANIZATION_NAME || 'Our Organization';
    const webAppName = process.env.WEBAPP_NAME || 'Our Website';

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset OTP',
      text: `Hi ${firstName},\n\nHere is your OTP (One Time PIN) for resetting your password on ${webAppName}:\n\nOTP: ${otp}\n\nThis OTP is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: linear-gradient(135deg, #5D3FD3, #8B5CF6); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Password Reset OTP</h1>
          </div>
          <div style="padding: 25px; background: #f9f9f9; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p>Hi ${firstName},</p>
            <p>You requested to reset your password on <strong>${webAppName}</strong>. Here is your OTP (One Time PIN):</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background: #5D3FD3; color: white; font-size: 24px; font-weight: bold; letter-spacing: 5px; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                ${otp}
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px;">This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.</p>
            
            <p>If you didn't request this password reset, please ignore this email or contact our support team immediately.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 14px;">Best regards,<br>The ${organizationName} Team</p>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset OTP sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};

const sendInitialPasswordEmail = async (email, name, initialPassword) => {
  try {
    const firstName = extractFirstName(name);
    const organizationName = process.env.ORGANIZATION_NAME || 'Our Organization';
    const webAppName = process.env.WEBAPP_NAME || 'Our Website';

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Welcome to ${webAppName} - Your Account Details`,
      text: `Hi ${firstName},\n\nYour account has been created on ${webAppName}. Here are your login details:\n\nEmail: ${email}\nInitial Password: ${initialPassword}\n\nPlease login and change your password immediately for security reasons.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: linear-gradient(135deg, #5D3FD3, #8B5CF6); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to ${webAppName}</h1>
          </div>
          <div style="padding: 25px; background: #f9f9f9; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p>Hi ${firstName},</p>
            <p>Your account has been successfully created on <strong>${webAppName}</strong>. Here are your login details:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; margin: 20px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="30%" style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; vertical-align: top;"><strong>Initial Password:</strong></td>
                  <td style="padding: 8px 0;">
                    <div style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #5D3FD3; letter-spacing: 1px; background: #f5f5f5; padding: 10px; border-radius: 5px; border: 1px dashed #ccc;">
                      ${initialPassword}
                    </div>
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="background: #fff8e1; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-weight: bold;">
                <strong>Important:</strong> Please login and change your password immediately for security reasons.
              </p>
            </div>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 14px;">Best regards,<br>The ${organizationName} Team</p>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Initial password email sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending initial password email:', error);
    return false;
  }
};

module.exports = {
  generateOTP,
  generateStrongPassword,
  sendOTPEmail,
  sendInitialPasswordEmail
};