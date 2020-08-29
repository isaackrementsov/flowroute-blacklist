import {sendMessage} from './flowroute.js';

export default class OrderHandler {
	stages = ['name_required', 'password_required', 'content_required', 'pending_completion', 'completed'];

	messages = {
		help: `Available commands are:\n
			!cancel | Cancel and remove the order in progress\n
			!restart | Reset the information associated with the order in progress and restart the ordering process\n
			!back | Go back to the last step in the order\n
			!help | List available commands\n
		`,
		name_required: `Please enter the username associated with your account.`,
		password_required: ''
	}

	constructor(to, from, body, connection, orderInProgress){
		this.to = to;
		this.from = from;
		this.body = body;
		this.connection = connection;
		this.orderInProgress = orderInProgress;
		this.stage = orderInProgress['stage'];
	}

	handleMessage(){
		
	}

	back(){

	}

	cancel(){
		await connection.query('DELETE FROM orders WHERE from_number=(?) AND stage NOT "completed"', [from]);
	}

	restart(){

	}

	complete(){

	}

	async send(content){
		await sendMessage(this.to, this.from, content);
	}

	actions = {
		'name_required': () => {

		},
		'password_required': () => {},
		'content_required': () => {},
		'pending_completion': () => {}

	}
}

const actions = {
	back: async (stage) => {

	}
}

export function handleOrder(connection, to, from, body, orderInProgress){
	send = content => {
		sendMessage(to, from, content);
	}

	if(body.contains('')){

	}
}
