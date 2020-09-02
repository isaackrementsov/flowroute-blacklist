# Flowroute Blacklist
This is a program to blacklist phone numbers upon request using Flowroute.
## Setup
There are a lot of moving parts to this application, so some setup is required.
All of the setup info must be added to the `./config.js` file (which you will need to create if cloning/pulling this code for the first time).  

Here is the basic framework for `config.js`
```js
const config = {
    port: XXXX,
    keywords: ['STOP', 'REMOVE', 'UNSUBSCRIBE', 'QUIT', 'UNSUB'],
    callbackUrl: '/flowroute_callback_url',
    email: {
        user: 'you@gmail.com',
        password: 'your_password',
    },
    db: {
        host: 'db_host',
        port: XXXX,
        name: 'flowroute',
        user: 'db_user',
        password: 'db_password'
    }
};

export default config;
```
### Email
To use the `./src/mailer.js` and `mailer-client.js` modules in this app as they are written, you will need to have a gmail account. Otherwise, change the transporter configuration in that file using [Nodemailer documentation](https://www.npmjs.com/package/nodemailer).

Once you have decided on an email address to use, simply add it to the `email` section in `config.js`.  

By default, gmail will deny usage of Nodemailer and the IMAP client without Oath verification. To solve this issue, go to the [Less Secure Apps Settings](https://myaccount.google.com/lesssecureapps) page and toggle the switch shown to the "on" status.  

### Flowroute
To actually accept and send incoming SMS from Flowroute, you will need to add a callback url in the Flowroute API portal as explained [here](https://blog.flowroute.com/2016/09/22/receive-an-inbound-message/). Then, modify the `callbackUrl` option in `config.js` accordingly.  

You also will need to configure the `flowroute` section in `config.js` as follows:

```js
const config = {
    ...
    flowroute: {
        username: 'api_access_key',
        password: 'api_secret_key',
        removalMessage: 'Message to send to users after they are blacklisted'
    }
    ...
}
```

You will need to configure this application so that it runs on a public IP address or domain name. This can be done through a hosting service or personal server.
### MariaDB
To setup the database for this app, you will need to run the code found in `./sql/migration.sql` on a MariaDB server of your choice.  

Then, use the `db` section of `config.js` to set the correct database password, username, port, and host. For example, a database running on `localhost:3306`, accessed by user `root` with password `password123`, would have the following configuration:  
```js
const config = {
    ...
    db: {
        host: 'localhost',
        port: 3306,
        name: 'flowroute',
        user: 'root',
        password: 'password123'
    }    
}
...
```
### Node
To run this app, make sure you have the latest version of Node (14.x) installed. Additionally, set the `port` option in `config.js` to a network port not currently in use. Then, run the following commands:
```bash
$ npm install -g nodemon
$ npm install
$ npm start
```
To test it on a development server, open another terminal window and run the following (if curl is installed) each time you send a message to the Flowroute number
```bash
$ curl --d "" http://localhost:my_port/callback_url
```
If you are running this app in a production environment, you can use a PM2 configuration instead of `npm start`.
### WooCommerce
The use the order feature of this application, you will need to generate a set of WooCommerce API keys using the Wordpress plugin dashboard. Additionally, make sure the Wordpress permalink option is set to "Post name". Add the API information to `config.js` as follows:
```js
const config = {
	...
	wooCommerce: {
		url: 'store_url',
		consumerKey: 'woocommerce_client_key',
		consumerSecret: 'woocommerce_client_secret'
	}
}
```
Use `!order` to place an order via text message.
## Exporting Blacklist
To get the blacklist stored in MariaDB exported to a `.txt` file (specifically `./db.txt`), run the following in terminal:
```bash
$ npm run export
```
