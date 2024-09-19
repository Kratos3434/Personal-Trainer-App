const nodemailer = require('nodemailer');

class Email {
    static transporter = nodemailer.createTransport({
        service: 'gmail',
        //name: 'PTA',
        auth: {
            user: 'keithcarlos34@gmail.com',
            pass: process.env.MAIL_PASS
        }
    });

    /**
     * 
     * @param {string} to 
     * @param {string} otp 
     */
    static async sendOtp(to, otp) {
        const mailOptions = {
            from: 'keithcarlos34@gmail.com',
            to,
            subject: "Verify email",
            html: `
            <p>Dear ${to}</p>,
            <div></div>
            <div>
                <p>Welcome to  <b>Personal Trainer App</b> Enter the code below to activate your account</p>
                <b>${otp}</b>
                <p>This will expire in 24 hours</p>
                <p>Thank you,</p>
                <p>Personal Trainer App Team</p>
            </div>
         `
        }

        await Email.transporter.sendMail(mailOptions);
    }

    /**
     * 
     * @param {string} to 
     * @param {string} otp 
     */
    static async sendForgotOtp(to, otp) {
        const mailOptions = {
            from: 'keithcarlos34@gmail.com',
            to,
            subject: "Verify email",
            html: `
            <p>Dear ${to}</p>,
            <div></div>
            <div>
                <p>Please enter this OTP to reset your <b>Personal Trainer App</b> password</p>
                <b>${otp}</b>
                <p>This will expire in 10 minutes, please do not share this with anyone</p>
                <p>Thank you,</p>
                <p>Personal Trainer App Team</p>
            </div>
         `
        }

        await Email.transporter.sendMail(mailOptions);

    }
}

module.exports = Email;