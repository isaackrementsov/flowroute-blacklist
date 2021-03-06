/*
	FlowRoute Blacklist Code
	Listens for incoming SMS and blacklists numbers sending particular keywords;
	Any message without the keywords is forwarded to a particular email address
	Check README.md for more details
	Isaac Krementsov 7/18/2020
*/

import express from 'express';
import bodyParser from 'body-parser';
import flowroute from '../flowroute-sdk-v3-nodejs/lib/index.js';
import {fork} from 'child_process';
import path from 'path';

import config from '../config.js';
import {routes} from './endpoints.js';
import {initDB, testDB} from './db.js';

const __dirname = path.resolve();

// Initialize FlowRoute
flowroute.Configuration.username = config.flowroute.username;
flowroute.Configuration.password = config.flowroute.password;

// Add a useful string method
String.prototype.contains = function(...substrs){
	for(let substr of substrs){
		if(this.toLowerCase().indexOf(substr.toLowerCase()) != -1) return true;
	}

	return false;
}

// Set up middleware and web framework to read requests
const app = express();
// Use JSON to accept callback requests
app.use(bodyParser.json());

// Connect to MariaDB
const pool = initDB();
testDB(pool);

// Start IMAP server to handle email replies
fork(__dirname + '/src/mailer-client.js');

app.listen(config.port, async () => {
    console.log('Listening on port', config.port);
});

routes(app, pool);
