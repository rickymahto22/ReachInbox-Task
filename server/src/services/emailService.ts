import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[], fromName: string = "ReachInbox Scheduler", fromEmail: string = "scheduler@reachinbox.com") => {
    // Create a test account if not using real credentials
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });

    const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`, // sender address
        to, // list of receivers
        subject, // Subject line
        html, // html body
        attachments, // Pass attachments here
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('Message sent: %s', info.messageId);
    // Exact format requested by user
    console.log('Ethereal Preview: %s', previewUrl);

    return { info, previewUrl };
};
