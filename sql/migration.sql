CREATE DATABASE flowroute;
USE flowroute;

CREATE TABLE blacklist (from_number varchar(255));

CREATE TABLE responded (message_id varchar(255));

CREATE TABLE orders (
	from_number varchar(255),
	username varchar(255),
	password varchar(255),
	content varchar(255),
	stage varchar(255)
);

CREATE TABLE sent_emails (
    message_id varchar(255),
    from_number varchar(255),
    to_number varchar(255)
);
