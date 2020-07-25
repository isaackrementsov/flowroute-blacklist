import {promisify} from 'util';
import flowroute from '../flowroute-sdk-v3-nodejs/lib/index.js';

import config from '../config.js';

// Promisify createMessage for use with async/await
const createMessage = promisify(flowroute.MessagesController.createMessage).bind(flowroute.MessagesController);

// Send a message to a predefined number
export let sendMessage = async (to, content) => {
	const msg = {
		to: to,
		from: config.flowroute.fromNumber
	};

	await createMessage(msg);
}
