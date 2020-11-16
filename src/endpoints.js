import express from 'express';
import moment from 'moment';

import config from '../config.js';
import {sendMail} from './mailer.js';
import {sendMessage} from './flowroute.js';
import {OrderHandler} from './orders.js';

// Check if message contains keywords in config.js list
const containsKeyword = message => {
    message = message.toUpperCase();

    if(message){
        for(let keyword of config.keywords){
            if(message.contains(keyword)){
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

        // Insert the number and send a message if it is unique
        if(existingRows.length == 0){
            await connection.query('INSERT INTO blacklist value (?)', [from]);

            // Send a reply to the intial message
            await sendMessage(to, from, config.flowroute.removalMessage);
        }
    }else if(body.contains('!order')){
		await OrderHandler.init(to, from, connection);
	}else{
        const ordersInProgress = await connection.query('SELECT * FROM orders WHERE from_number=(?) AND NOT stage="completed"', [from]);

		// Handle an order in progress if one exists
		if(ordersInProgress.length > 0){
			const orderHandler = new OrderHandler(to, from, body, connection, ordersInProgress[0]);
            await orderHandler.handleMessage();
		}else{
			// Send an email with SMS details if it doesn't match any of the keywords
			const messageId = await sendMail(from, `
				<div style="background-color: white; padding: 20px 30px; border: 1px solid grey; border-radius: 5px; font-family: 'Open Sans', Helvetica, sans-serif">
					<h2>Incoming SMS</h2>
					<h3>From: ${from}</h3>
					<p style="background-color: whitesmoke; padding: 10px 15px; border-radius: 3px">${body}</p>
				</div>
			`);

			await connection.query('INSERT INTO sent_emails (message_id, from_number, to_number) values (?, ?, ?)', [messageId, from, to]);
		}
    }

    // Make sure message has been properly handled
    await connection.query('INSERT INTO responded value (?)', [message.id]);
}

// Method to make email replies texts to orginal number
export function handleReply(pool){
    return async mail => {
        let inReplyTo = mail.headers['in-reply-to'];

        if(inReplyTo){
            let connection;

            try {
                connection = await pool.getConnection();
                const results = await connection.query('SELECT from_number, to_number FROM sent_emails WHERE message_id=(?)', [inReplyTo]);

                if(results.length > 0){
                    // Get the phone numbers involved in the original email
                    const numbers = results[0];
                    // Send a reply to the sender (from_number) from the receiver (to_number)
                    await sendMessage(numbers['to_number'], numbers['from_number'], mail.text);
                }
            }catch(e){
                // Display mail problems
                console.log('There was an issue converting an email reply to an SMS');
                console.log(e);
            }finally {
                if(connection) await connection.end();
            }
        }
    }
}

const router = express.Router();

// Handle all HTTP requests
export function routes(app, pool){
    app.use('/', router);

    // Listen for SMS POST requests from callback URL (set on the Flowroute website)
    app.post(config.callbackUrl, async (req, res) => {
        let connection;

        try {
            // Get a connection from the MariaDB pool
            connection = await pool.getConnection();
            // Get message request data
            let message = req.body.data;

            // Check whether the message has already been recieved
            let rows = await connection.query('SELECT message_id FROM responded WHERE message_id = (?)', [message.id]);
            // Handle only if unique
            if(rows.length == 0 && message.type != 'delivery_receipt'){
                handleMessage(message, connection);
            }else{
                await connection.query('DELETE FROM responded WHERE message_id = (?)', [message.id]);
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
