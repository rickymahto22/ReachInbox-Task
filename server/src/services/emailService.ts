import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[], fromName: string = "ReachInbox Scheduler", fromEmail: string = "scheduler@reachinbox.com") => {
    // Create a test account if not using real credentials
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
        },
    });

    const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`, // sender address
        to, // list of receivers
        subject, // Subject line
        html, // html body
        attachments, // Pass attachments here
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

    return info;
};
