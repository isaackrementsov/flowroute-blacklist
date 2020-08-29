import express from 'express';
import moment from 'moment';

import config from '../config.js';
import {sendMail} from './mailer.js';
import {sendMessage, lookupNotHandled} from './flowroute.js';
import {accountExists, sendOrder} from './wooCommerce.js';

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
		// TODO: Add order stuff to its own module

		// Check if an order has been started already
		const ordersInProgress = await connection.query('SELECT * FROM orders WHERE from_number=(?) AND stage NOT "completed"', [from]);

		if(ordersInProgress.length == 0){
			// Create a new order if one is not in progress
			await connection.query('INSERT INTO orders (from_number, stage) values (?, ?)', [from, 'name_required']);
			// Prompt user for name
			await sendMessage(`
				You have requested to order through the messaging service. Available commands are:\n
					!cancel | Cancel and remove the order in progress\n
					!restart | Reset the information associated with the order in progress and restart the ordering process\n
					!back | Go back to the last step in the order\n
					!help | List available commands\n\n
				Please enter the username associated with your account`);
		}else{
			await sendMessage(to, from, 'An order is already in progress under this number. If you would like to restart the order, use !restart. If you would like to cancel the order, use !cancel.')
		}
	}else{
		const ordersInProgress = await connection.query('SELECT * FROM orders WHERE from_number=(?) AND stage NOT "completed"', [from]);

		// Handle an order in progress if one exists
		if(ordersInProgress.length > 0){
			const orderInProgress = ordersInProgress[0];

			if(body.contains('!cancel')){
				// Remove order in progress
				await connection.query('DELETE FROM orders WHERE from_number=(?) AND stage NOT "completed"', [from]);
			}else if(body.contains('!restart')){
				// Reset order in progress
				await connection.query('UPDATE orders SET status="name_required"');
				await sendMessage(to, from, 'Please enter the username associated with your account');
			}else if(body.contains('!help')){
				await sendMessage(to, from, `Available commands:\n
					!cancel | Cancel and remove the order in progress\n
					!restart | Reset the information associated with the order in progress and restart the ordering process\n
					!back | Go back to the last step in the order\n
					!help | List available commands\n
				`);
			}else{
				// Use actions based on the order status
				switch(orderInProgress.status){
					case 'name_required':
						if(await accountExists(body)){
							await connection.query('UPDATE orders SET (name, status) values (?, "password_required") WHERE from_number=(?) AND stage NOT "completed"', [body, from]);
							await sendMessage(to, from, 'Enter the password for this account');
						}else{
							await sendMessage(to, from, 'No accounts found under that username. Please enter a valid one');
						}

					case 'password_required':
						if(await accountExists(orderInProgress['name'], body)){
							await connection.query('UPDATE orders SET (password, status) values (?, "content_required") WHERE from_number=(?) AND stage NOT "completed"', [body, from]);
							await sendMessage(to, from, 'What would you like to place an order for?');
						}else{
							await sendMessage(to, from, `That password didn't work. Please try again`);
						}

					// TODO: add !back command
					case 'content_required':
						await connection.query('UPDATE orders SET (content, status) values (?, "pending_completion") WHERE from_number=(?) AND stage NOT "completed"', [body, from]);
						await sendMessage(to, from, `Your order is ready to send. Does this sound right?\n\n
							Order for ${orderInProgress['name']}:\n
							For: ${body}\n\n
							If so, use !complete to send the order
						`);

					case 'pending_completion':
						if(body.contains('!complete')){
							await connection.query('UPDATE orders SET status="completed" WHERE from_number=(?) AND stage NOT "completed"', [from]);
							await sendMessage(to, from, 'Order successfully completed!');
						}else{
							await sendMessage(to, from, 'Use !complete to send the order.')
						}
				}
			}
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
    app.post(config.callbackUrl, async (_req, res) => {
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
