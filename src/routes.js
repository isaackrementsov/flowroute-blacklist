import express from 'express';
import moment from 'moment';

import config from '../config.js';
import {sendMail} from './mailer.js';
import {sendMessage, lookupNotHandled} from './flowroute.js';

// Check if message contains keywords in config.js list
const containsKeyword = message => {
    message = message.toUpperCase();

    if(message){
        for(let keyword of config.keywords){
            if(message.indexOf(keyword) != -1){
                return true;
            }
        }
    }else{
        return false;
    }
}

const handleMessage = async (message, connection) => {
    const body = message.attributes.body;
    const from = message.attributes.from;
    const to = message.attributes.to;

    // Blacklist the number if the SMS contains particular keywords
    if(containsKeyword(body)){
        // Check if the number is already blacklisted
        const existingRows = await connection.query('SELECT * FROM blacklist WHERE from_number=(?)', [from]);

        // Insert the number if it is unique
        if(existingRows.length == 0) await connection.query('INSERT INTO blacklist value (?)', [from]);

        // Send a reply to the intial message
        await sendMessage(to, from, config.flowroute.removalMessage);
    }else{
        // Send an email with SMS details if it doesn't match any of the keywords
        await sendMail(from, `
            <div style="background-color: white; padding: 20px 30px; border: 1px solid grey; border-radius: 5px; font-family: 'Open Sans', Helvetica, sans-serif">
                <h2>Incoming SMS</h2>
                <h3>From: ${from}</h3>
                <p style="background-color: whitesmoke; padding: 10px 15px; border-radius: 3px">${body}</p>
            </div>
        `);
    }

    // Make sure message has been properly handled
    await connection.query('INSERT INTO responded value (?)', [message.id]);
}

const router = express.Router();

// Handle all HTTP requests
export default function routes(app, pool){
    app.use('/', router);

    // Listen for SMS POST requests from callback URL (set on the Flowroute website)
    app.post(config.callbackUrl, async (req, res) => {
        let connection;

        try {
            // Get a connection from the MariaDB pool
            connection = await pool.getConnection();

            // Find recent unhandled messages within a 10 minute range of now
            const startDate = moment.utc(moment().subtract(5, 'minutes').valueOf());
            const endDate = moment.utc(moment().add(5, 'minutes').valueOf());
            const unhandled = await lookupNotHandled(startDate, endDate, connection);

            // Handle these messages (blacklist or email info)
            for(let message of unhandled){
                await handleMessage(message, connection);
            }
        }catch(e){
            // Handle server errors
            console.log('Oh no, there seems to have been an error processing SMS!');
            console.log(e);
        }finally {
            // End DB connection and response
            if(connection) await connection.end();
            res.status(200).end();
        }
    });
}
