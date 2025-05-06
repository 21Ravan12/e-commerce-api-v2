const nodemailer = require('nodemailer');
const logger = require('./logger');
const crypto = require('crypto');

async function sendVerificationEmail(email, code) {
    /**
     * Synchronous and context-safe email sending function
     * @param {string} email - Recipient email address
     * @param {string} code - Verification code to send
     * @returns {Promise<boolean>} - Returns true if email was sent successfully
     * @throws {Error} - Throws error if email fails to send or if configuration is invalid
     */
    try {
        // Validate required environment variables
        const requiredEnvVars = [
            'MAIL_HOST',
            'MAIL_PORT',
            'MAIL_SECURE',
            'MAIL_USERNAME',
            'MAIL_PASSWORD'
        ];
        
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required email configuration: ${missingVars.join(', ')}`);
        }

        // Parse and validate mail configuration
        const mailConfig = {
            host: process.env.MAIL_HOST.trim(),
            port: parseInt(process.env.MAIL_PORT),
            secure: process.env.MAIL_SECURE.toLowerCase() === 'true',
            auth: {
                user: process.env.MAIL_USERNAME.trim(),
                pass: process.env.MAIL_PASSWORD.trim()
            }
        };

        if (isNaN(mailConfig.port)) {
            throw new Error('Invalid MAIL_PORT: must be a number');
        }

        // Validate email parameters
        if (!email || !code) {
            throw new Error('Both email and code parameters are required');
        }

        // 2. Create reusable transporter object
        const transporter = nodemailer.createTransport(mailConfig);

        // Verify transporter configuration
        try {
            await transporter.verify();
            logger.info('Email transporter verified successfully');
        } catch (verifyError) {
            throw new Error(`Email transporter verification failed: ${verifyError.message}`);
        }
        
        // 3. Create premium HTML email template
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Secure Verification Code | MedSecure</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    line-height: 1.65;
                    color: #1a1a1a;
                    background-color: #f9fafb;
                    margin: 0;
                    padding: 0;
                    -webkit-font-smoothing: antialiased;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 40px 20px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 40px;
                }
                .logo {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    color: #111827;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                    margin-bottom: 15px;
                    text-decoration: none;
                }
                .logo-accent {
                    color: #4f46e5;
                }
                .card {
                    background-color: #ffffff;
                    border-radius: 16px;
                    padding: 48px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.02), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
                    border: 1px solid #e5e7eb;
                }
                .title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #111827;
                    text-align: center;
                    margin-bottom: 24px;
                }
                .description {
                    font-size: 16px;
                    color: #4b5563;
                    text-align: center;
                    margin-bottom: 32px;
                    line-height: 1.7;
                }
                .code-container {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 40px;
                }
                .code {
                    font-family: 'Courier New', monospace;
                    font-size: 24px;
                    font-weight: 700;
                    color: #4f46e5;
                    letter-spacing: 1px;
                    text-align: center;
                    padding: 24px 32px;
                    background-color: #f5f3ff;
                    border-radius: 12px;
                    border: 1px solid #ddd6fe;
                    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
                }
                .note {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-size: 14px;
                    color: #6b7280;
                    text-align: center;
                    margin-top: 8px;
                }
                .icon {
                    width: 16px;
                    height: 16px;
                    color: #ef4444;
                }
                .footer {
                    margin-top: 48px;
                    text-align: center;
                    font-size: 13px;
                    color: #9ca3af;
                    line-height: 1.6;
                }
                .divider {
                    height: 1px;
                    background-color: #e5e7eb;
                    margin: 32px 0;
                }
                .security-note {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    background-color: #f3f4f6;
                    border-radius: 8px;
                    font-size: 14px;
                    color: #4b5563;
                    margin-top: 32px;
                }
                .security-icon {
                    flex-shrink: 0;
                    color: #4f46e5;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <a href="#" class="logo">
                        <span class="logo-accent">Med</span>Secure
                    </a>
                </div>
                
                <div class="card">
                    <h1 class="title">Your Security Verification</h1>
                    <p class="description">
                        To authenticate your request, please enter the following verification code 
                        in your application. This ensures your account remains secure.
                    </p>
                    
                    <div class="code-container">
                        <div class="code">${code}</div>
                    </div>
                    
                    <div class="note">
                        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Expires in 15 minutes • Do not share this code
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="security-note">
                        <svg class="security-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 15V17M6 21H18C18.5523 21 19 20.5523 19 20V13C19 12.4477 18.5523 12 18 12H6C5.44772 12 5 12.4477 5 13V20C5 20.5523 5.44772 21 6 21ZM16 12V8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8V12H16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
                
                <div class="footer">
                    <p>© ${new Date().getFullYear()} MedSecure Technologies. All rights reserved.</p>
                    <p>This is an automated message - please do not reply directly to this email.</p>
                </div>
            </div>
        </body>
        </html>
        `;
        
        // 4. Create message and send
        const mailOptions = {
            from: process.env.MAIL_FROM_ADDRESS?.trim() || 'no-reply@medchainpro.com',
            to: email.trim(),
            subject: 'Hesap Doğrulama Kodu',
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent to ${email} with message ID: ${info.messageId}`);
        
        return true;

    } catch (error) {
        logger.error(`Failed to send email: ${error.message}`, { stack: error.stack });
        throw new Error('E-posta gönderilemedi: ' + error.message);
    }
}

function createVerificationToken() {
    const verificationToken = crypto.randomBytes(32).toString('hex'); 
    logger.info(`Email verification token created`);
    return verificationToken;
}

/**
 * Generates a cryptographic challenge without time constraints
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.size=32] - Size of the challenge in bytes
 * @param {string} [options.encoding='hex'] - Encoding for the output
 * @returns {string} The generated challenge string
 * @throws {Error} Throws error if invalid parameters are provided
 */
function createChallenge(options = {}) {
    const {
        size = 32,
        encoding = 'hex'
    } = options;

    // Validate parameters
    if (typeof size !== 'number' || size < 16 || size > 128) {
        throw new Error('Invalid size: must be between 16 and 128 bytes');
    }

    const validEncodings = ['hex', 'base64', 'base64url'];
    if (!validEncodings.includes(encoding)) {
        throw new Error(`Invalid encoding: must be one of ${validEncodings.join(', ')}`);
    }

    // Generate and return the challenge
    const challenge = crypto.randomBytes(size).toString(encoding);
    logger.debug(`New challenge generated (size: ${size} bytes)`);
    return challenge;
}

module.exports = { 
    sendVerificationEmail, 
    createVerificationToken, 
    createChallenge 
};