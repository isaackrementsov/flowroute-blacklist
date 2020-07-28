import {promisify} from 'util';
import moment from 'moment';
import flowroute from '../flowroute-sdk-v3-nodejs/lib/index.js';

import config from '../config.js';

const getMessages = promisify(flowroute.MessagesController.getLookUpASetOfMessages);

async function test(){

    flowroute.Configuration.username = config.flowroute.username;
    flowroute.Configuration.password = config.flowroute.password;

    const callback = (_err, _res, _context) => {};
    const limit = 2;
    const start_date = "2018-07-27"
    const end_date = "2020-07-28"

    const messagesString = await getMessages(moment(start_date), moment(end_date), limit, callback);
    const messages = JSON.parse(messagesString).data;

    console.log(messages)
}

test();
