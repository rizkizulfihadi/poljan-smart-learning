import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'rizkizulfihadi17@gmail.com',
        pass: 'x1wavuna2qetuo3ad4s5'
    }
})

const sendVerificationEmail = (email, token) => {
    const mailOptions = {
        from : 'rizkizulfihadi17@gmail.com',
        to: email,
        subject: 'Email Verification',
        text: `Please verify you email by clicking the following link http://localhost:5173/verify-email?token=${token}`
    }
    return transporter.sendMail(mailOptions)
}
export default sendVerificationEmail;
