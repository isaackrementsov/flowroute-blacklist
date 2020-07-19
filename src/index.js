// FlowRoute Blacklist Code
// Listens for incoming SMS and blacklists numbers sending particular keywords;
// Any message without the keywords is forwarded to a particular email address
// Check README.md for more details
// Isaac Krementsov 7/18/2020

import express from 'express';
import bodyParser from 'body-parser';

import config from '../config.js';
import routes from './routes.js';
import {initDB, testDB} from './db.js';

// Set up middleware and web framework to read requests
const app = express();
app.use(bodyParser.urlencoded({extended: false}));

const pool = initDB();
testDB(pool);

app.listen(config.port, () => {
    console.log('Listening on port', config.port);
});

routes(app, pool);
