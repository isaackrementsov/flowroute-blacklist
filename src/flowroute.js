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

	await createMessage(msg);
}
