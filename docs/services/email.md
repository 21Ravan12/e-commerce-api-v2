# email.md
```markdown
```javascript
// Email Service Configuration
// ==========================
// Required environment variables:
MAIL_HOST=smtp.yourprovider.com
MAIL_PORT=587
MAIL_SECURE=false  // true for 465, false for other ports
MAIL_USERNAME=your@email.com
MAIL_PASSWORD=your-email-password
MAIL_FROM_ADDRESS=noreply@yourdomain.com

// Example Usage:
const { sendVerificationEmail } = require('./services/mailService');

// Sending a verification email
try {
  const success = await sendVerificationEmail('user@example.com', 'ABC123');
  if (success) {
    console.log('Verification email sent successfully');
  }
} catch (error) {
  console.error('Failed to send email:', error.message);
}

// Available Functions:
// -------------------
// 1. sendVerificationEmail(email, code)
//    - Sends HTML formatted verification email
//    - Returns: Promise<boolean>
//    - Throws: Error if sending fails

// 2. createVerificationToken()
//    - Generates cryptographically secure token
//    - Returns: string (hex encoded)

// 3. createChallenge(options)
//    - Generates cryptographic challenge
//    - Options: { size: number, encoding: string }
//    - Returns: string

// Email Template Features:
// -----------------------
// - Responsive HTML design
// - Branded styling
// - Security warnings
// - Auto-expiry notice
// - Mobile-friendly layout
// - Accessibility optimized