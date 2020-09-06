import {sendMessage} from './flowroute.js';
import {accountStatus, sendOrder} from './wooCommerce.js';
import config from '../config.js';

const orderNumbers = config.wooCommerce.orders;

export const messages = {
	cancel: 'Your order has been cancelled.',
	help: `Available commands are: \n
!cancel | Cancel and remove the order in progress\n
!restart | Reset the information associated with the order in progress and restart the ordering process\n
!back | Go back to the last step in the order\n
!help | List available commands`,
	init: 'You have requested to order through the delivery service. ',
	init_failed: 'An order is already in progress under this number. If you would like to restart the order, use !restart. If you would like to cancel the order, use !cancel.',
	init_wrong_number: `Unfortunately, you cannot place an order through this number. However, you can order from the following: ${orderNumbers.join(', ')}`,
	complete: 'Order successfully completed!',
	complete_error: 'There was an issue completing the order. Please try again or cancel the order.',
	complete_failed: 'Use !complete to send the order.',
	email_required: `Please enter the email associated with your account.`,
	content_required: 'What would you like to place an order for?',
	note_required: 'How would you like this order delivered?',
	pending_completion: (orderInProgress, body) => `Your order is ready to send. Does this sound right?\n\n
Order under ${orderInProgress['email']}:\n
For: ${orderInProgress['content']}\n
Delivery details: ${body}\n\n
If so, use !complete to send the order`,
	back_failed: 'Use !cancel to go back further than this.'
}

export class OrderHandler {
	stages = ['email_required', 'content_required', 'note_required', 'pending_completion', 'completed'];

	constructor(to, from, body, connection, orderInProgress){
		this.to = to;
		this.from = from;
		this.body = body;
		this.connection = connection;
		this.orderInProgress = orderInProgress;
		this.stage = orderInProgress['stage'];
	}

	async handleMessage(){
		if(this.body.contains('!cancel')){
			await this.cancel();
		}else if(this.body.contains('!restart')){
			await this.restart();
		}else if(this.body.contains('!help')){
			// List available commands
			await this.send(messages.help);
		}else if(this.body.contains('!back')){
			await this.back();
		}else{
			// Use actions based on the order status
			await this.actions[this.orderInProgress['stage']]();
		}
	}

	static async init(to, from, connection){
		// Check if an order has been started already
		const ordersInProgress = await connection.query('SELECT * FROM orders WHERE from_number=(?) AND NOT stage="completed"', [from]);

		if(ordersInProgress.length == 0){
			if(orderNumbers.indexOf(to) == -1){
				// Notify user that they cannot order through this number
				await sendMessage(to, from, messages.init_wrong_number);
			}else{
				// Create a new order if one is not in progress
				await connection.query('INSERT INTO orders (from_number, stage) values (?, "email_required")', [from]);
				// Prompt user for name
				await sendMessage(to, from, messages.init + messages.help);
				await sendMessage(to, from, messages.email_required);
			}
		}else{
			await sendMessage(to, from, messages.init_failed)
		}
	}

	async back(){
		if(this.orderInProgress['stage'] == 'email_required'){
			// Notify user that they cannot go further back without resetting the order
			await this.send(messages.back_failed);
		}else{
			// Go back to the previous order stage
			const previous = this.stages[this.stages.indexOf(this.orderInProgress['stage']) - 1];
			await this.send(messages[previous]);
			await this.connection.query('UPDATE orders SET stage=(?) WHERE from_number=(?) AND NOT stage="completed"', [previous, this.from])
		}
	}

	async cancel(){
		// Remove order in progress
		await this.connection.query('DELETE FROM orders WHERE from_number=(?) AND NOT stage="completed"', [this.from]);
		await this.send(messages.cancel);
	}

	async restart(){
		// Reset order in progress
		await this.connection.query('UPDATE orders SET stage="email_required"');
		await this.send(messages.email_required);
	}

	async send(content){
		await sendMessage(this.to, this.from, content);
	}

	actions = {
		email_required: async () => {
			const status = await accountStatus(this.body, this.from);

			if(status.failed){
				// Notify user of account error (wrong phone number, email, or not enough orders placed)
				await this.send(status.message);
			}else{
				// Update order with the email entered and ask for order content
				await this.connection.query('UPDATE orders SET email=(?), stage="content_required" WHERE from_number=(?) AND NOT stage="completed"', [this.body, this.from]);
				await this.send(messages.content_required);
			}
		},
		content_required: async () => {
			// Add order content to database
			await this.connection.query('UPDATE orders SET content=(?), stage="note_required" WHERE from_number=(?) AND NOT stage="completed"', [this.body, this.from]);
			await this.send(messages.note_required);
		},
		note_required: async () => {
			// Ask customer for an order note
			await this.connection.query('UPDATE orders SET note=(?), stage="pending_completion" WHERE from_number=(?) AND NOT stage="completed"', [this.body, this.from]);
			await this.send(messages.pending_completion(this.orderInProgress, this.body));
		},
		pending_completion: async () => {
			if(this.body.contains('!complete')){
				// Complete the order if the user confirms and send via WooCommerce
				try {
					await sendOrder(this.orderInProgress);

					await this.connection.query('UPDATE orders SET stage="completed" WHERE from_number=(?) AND NOT stage="completed"', [this.from]);
					await this.send(messages.complete);
				}catch(e){
					await this.send(messages.complete_error);
				}
			}else{
				// Ask for confirmation otherwise
				await this.send(messages.complete_failed);
			}
		}

	}
}
