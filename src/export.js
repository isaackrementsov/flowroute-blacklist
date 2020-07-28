import fs from 'fs';

import config from '../config.js';
import {initDB, testDB} from './db.js';

// Initialize and test DB
const pool = initDB();
testDB(pool);

// Export the 'flowroute.blacklist' table in MariaDB to './db.txt'
let exportTxt = async pool => {
    let connection;

    try {
        connection = await pool.getConnection();

        // Get all rows from the blacklist table
        const rows = await connection.query('SELECT * FROM blacklist');

        // Loop through rows and add the numbers listed to text
        let text = '';

        for(let i = 0; i < rows.length; i++){
            const row = rows[i];
            text += row.from_number + (i == rows.length - 1 ? '' : '\n');
        }

        // Write the text data to './db.txt'
        fs.writeFileSync('db.txt', text, e => {
            if(e){
                console.log('Error writing file!', e);
            }
        });

        console.log('Finished writing to ./db.txt!');
    }catch(e){
        console.log('Error exporting text file!', e);
    }finally {
        // End the connection and process
        if(connection) connection.end();
        process.exit();
    }
}

exportTxt(pool);
