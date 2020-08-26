import {promisify} from 'util';
import flowroute from '../flowroute-sdk-v3-nodejs/lib/index.js';

import config from '../config.js';

// Promisify flowroute functions for use with async/await
const createMessage = promisify(flowroute.MessagesController.createSendAMessage);
const getMessages = promisify(flowroute.MessagesController.getLookUpASetOfMessages);

const callback = (_err, _res, _context) => {};

// Send a message to a predefined number
export let sendMessage = async (from, to, content) => {
	const msg = {
		to: to,
		from: from,
		body: content
	};
	console.log(msg)
	await createMessage(msg);
}

// List messages in a particular date range
let listMessages = async (startDate, endDate) => {
	return await getMessages(startDate, endDate, 10, callback);
}

// Lookup the messages that haven't been responded to
export let lookupNotHandled = async (startDate, endDate, connection) => {
	let messages = await listMessages(startDate, endDate);
	messages = JSON.parse(messages).data;

	const notHandled = [];

	for(let message of messages){
		if(message.attributes.body && message.attributes.body != config.flowroute.removalMessage){
			// Check if the message was put in the responded table
			const rows = await connection.query('SELECT * FROM responded WHERE message_id = (?)', [message.id]);

			if(rows.length == 0) notHandled.push(message);
		}
	}

	return notHandled;
}
