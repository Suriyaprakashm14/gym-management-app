# Forgot Password Functionality Setup Guide

This document explains how to set up and use the forgot password functionality in your Gym Management System.

## Overview

The forgot password feature allows users (admin and manager roles) to reset their password using email-based OTP verification. The system includes:

- Email OTP generation and validation
- Secure password reset process
- Rate limiting and security measures
- Professional email templates

## API Endpoints

### 1. Forgot Password (Send OTP)
**POST** `/api/legacy/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP has been sent to your email address",
  "data": {
    "email": "user@example.com",
    "expiresIn": "10 minutes"
  }
}
```

### 2. Verify OTP
**POST** `/api/legacy/auth/verify-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "email": "user@example.com",
    "verifiedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### 3. Reset Password
**POST** `/api/legacy/auth/reset-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully",
  "data": {
    "email": "user@example.com",
    "resetAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### 4. Resend OTP
**POST** `/api/legacy/auth/resend-otp`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "New OTP has been sent to your email address",
  "data": {
    "email": "user@example.com",
    "expiresIn": "10 minutes"
  }
}
```

## Email Configuration

### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Configure Environment Variables:**

```bash
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

### Alternative Email Services

#### Outlook/Hotmail
```bash
EMAIL_SERVICE=hotmail
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

#### Yahoo
```bash
EMAIL_SERVICE=yahoo
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

#### Custom SMTP
```bash
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-username
EMAIL_PASS=your-password
```

## Security Features

### OTP Security
- **6-digit numeric OTP** with 10-minute expiration
- **Maximum 3 verification attempts** per OTP
- **Automatic cleanup** of expired OTPs
- **Rate limiting** - 2 minutes between resend requests

### Access Control
- Only **admin** and **manager** roles can use password reset
- Email must exist in the system
- Password must be at least 6 characters

### Database Security
- OTPs are automatically deleted after expiration (TTL index)
- Used OTPs are marked and cannot be reused
- Failed attempts are tracked and can block OTP

## Frontend Integration Example

```javascript
// Step 1: Request password reset
const forgotPassword = async (email) => {
  try {
    const response = await fetch('/api/legacy/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('OTP sent to email');
      return data;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Step 2: Verify OTP and reset password
const resetPassword = async (email, otp, newPassword) => {
  try {
    const response = await fetch('/api/legacy/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('Password reset successful');
      return data;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

## Error Handling

### Common Error Responses

```json
// Email not found
{
  "error": "No account found with this email address"
}

// Invalid OTP
{
  "error": "Invalid or expired OTP"
}

// Rate limiting
{
  "error": "Please wait at least 2 minutes before requesting a new OTP"
}

// Email service unavailable
{
  "error": "Email service is temporarily unavailable. Please try again later."
}

// Role restriction
{
  "error": "Password reset is only available for admin and manager accounts"
}
```

## Testing

### Test the Email Service
1. Start your server
2. Check console logs for "Email service is ready to send messages"
3. Make a test request to `/forgot-password`

### Test the Complete Flow
1. Send forgot password request
2. Check email for OTP
3. Verify OTP
4. Reset password with new password
5. Try logging in with new password

## Troubleshooting

### Email Not Sending
- Verify email configuration in `.env`
- Check if 2FA is enabled for Gmail
- Ensure App Password is correct
- Check server logs for email service errors

### OTP Not Working
- Check if OTP has expired (10 minutes)
- Verify maximum attempts not exceeded (3 attempts)
- Ensure OTP is 6 digits exactly
- Check database for OTP records

### Database Issues
- Ensure MongoDB connection is working
- Check if OTP collection is created
- Verify TTL index is working for cleanup

## Files Created/Modified

1. **New Files:**
   - `models/otp.js` - OTP model with security features
   - `utils/emailService.js` - Email service with templates
   - `FORGOT_PASSWORD_SETUP.md` - This documentation

2. **Modified Files:**
   - `controllers/authController.js` - Added forgot/reset password functions
   - `routes/authRoutes.js` - Added new routes
   - `package.json` - Added nodemailer dependency

## Next Steps

1. Configure your email service in `.env`
2. Test the functionality with a valid admin/manager account
3. Integrate with your frontend application
4. Consider adding email templates customization
5. Monitor email delivery and OTP usage

For support or questions, check the server logs and ensure all dependencies are properly installed.

