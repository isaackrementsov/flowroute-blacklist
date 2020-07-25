import express from 'express';

import config from '../config.js';
import {sendMail} from './mailer.js';
import {sendMessage} from './flowroute.js';

// Check if message contains keywords in config.js list
let containsKeyword = message => {
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

const router = express.Router();

// Handle all HTTP requests
export default function routes(app, pool){
    app.use('/', router);

    // Listen for SMS POST requests from callback URL (set on the Flowroute website)
    app.post(config.callbackUrl, async (req, res) => {
        let connection;

        try {
            const message = req.body.body;
            const from = req.body.from;

            // Blacklist the number if the SMS contains particular keywords
            if(containsKeyword(message)){
                // Get a connection from the MariaDB pool
                connection = await pool.getConnection();

                // Check if the number is already blacklisted
                const existingRows = await connection.query('SELECT * FROM blacklist WHERE from_number=(?)', [from]);

                // Insert the number if it is unique
                if(existingRows.length == 0) await connection.query('INSERT INTO blacklist value (?)', [from]);

				// Send a reply to the intial message
				await sendMessage(from, 'You have been successfuly removed from the messaging service.')
            }else{
                // Send an email with SMS details if it doesn't match any of the keywords
                await sendMail(from, `
                    <div style="background-color: white; padding: 20px 30px; border: 1px solid grey; border-radius: 5px; font-family: 'Open Sans', Helvetica, sans-serif">
                        <h2>Incoming SMS</h2>
                        <h3>From: ${from}</h3>
                        <p style="background-color: whitesmoke; padding: 10px 15px; border-radius: 3px">${message}</p>
                    </div>
                `);
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
