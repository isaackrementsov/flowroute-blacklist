import nodemailer from 'nodemailer';
import config from '../config.js';

// This is the sender and reciever email for SMS content
const email = config.email;

// Create a nodemailer gmail transport (change the options here if using a different provider)
let createTransport = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: email.user,
            pass: email.password
        }
    });
}

// Report SMS data via email
export let sendMail = async (from, html) => {
    try {
        const transport = createTransport();

        await transport.sendMail({
            from: `SMS Webhook @ <${email.user}>`,
            to: email.user,
            subject: `Incoming SMS From ${from}`,
            html: html
        });
    }catch(e){
        console.log('Error sending email!', e);
        console.log('If you are using a non-gmail address, you have to change the nodemailer transport configuration for this to work properly.');
    }
}
