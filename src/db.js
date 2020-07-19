import mariadb from 'mariadb';
import config from '../config.js';

// Initialize MariaDB connection with config file
export let initDB = () => {
    return mariadb.createPool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        database: config.db.name,
        password: config.db.password,
        connectionLimit: 3,
        acquireTimeout: 1000000
    });
}

// Run a test query to make sure the connection is working properly
export let testDB = async pool => {
    let testConnection;
    try {
        testConnection = await pool.getConnection();
        let testData = await testConnection.query('SELECT * FROM blacklist');

        console.log('Database sucessfully connected!');
    }catch(e){
        console.log('Connection error!', e);
    }finally {
        if(testConnection) await testConnection.end();
    }
}
