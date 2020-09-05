// Listen for incoming emails using an IMAP server

import notifier from 'mail-notifier';
import flowroute from '../flowroute-sdk-v3-nodejs/lib/index.js';

import config from '../config.js';
import {initDB} from './db.js';
import {handleReply} from './endpoints.js';

const listenIMAP = cb => {
    const imap = {
        user: config.email.user,
        password: config.email.password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: {rejectUnauthorized: false},
        box: 'INBOX'
    }

    const instance = notifier(imap);

	instance
		.on('connected', () => console.log('IMAP server connected!'))
        .on('end', () => instance.start())
        .on('mail', mail => cb(mail)).start();
}

// Initialize FlowRoute
flowroute.Configuration.username = config.flowroute.username;
flowroute.Configuration.password = config.flowroute.password;

const poolIMAP = initDB();

listenIMAP(handleReply(poolIMAP));
