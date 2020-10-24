// https://support.google.com/accounts/answer/6010255
// https://myaccount.google.com/lesssecureapps
// https://nodemailer.com/about/

import nodemailer from 'nodemailer';
// Technically this is not mail service, but mail client. 
export class MailService {
    host: string;
    port: string;
    user: string;
    pass: string;
    name: string
    transporter: any;
    constructor({ host, port, user, pass, name}){
        this.host = host;
        this.port = port;
        this.pass = pass;
        this.user = user;
        this.name = name;
        
        this.transporter = nodemailer.createTransport({
            host: this.host,
            port: this.port,
            secure: true, // true for 465, false for other ports. TODO: find better way to work with it
            auth: {
              user: this.user, 
              pass: this.pass, 
            },
        });
    }

    async sendEmail(to: string, message: string, subject: string){
        const info = await this.transporter.sendMail({
            from: `${this.name} <${this.user}>`,
            to,
            subject,
            html: message // in plain text
            // html: "<b>Hello world From hypermine!</b>", // html body
        });
        return info;
    }
}