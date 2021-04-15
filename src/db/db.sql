-- DATABASE STRUCTURE (Copy-Paste friendly)

CREATE DATABASE naida;
\c naida;

CREATE TABLE users(
	id SERIAL PRIMARY KEY NOT NULL,
	first_name TEXT NOT NULL,
	middle_name TEXT,
	last_name TEXT NOT NULL,
	username TEXT NOT NULL,
	password TEXT NOT NULL,
	place_of_birth CHAR(50), -- NOT NULL?
	date_of_birth DATE, -- NOT NULL?
	account_id INT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts(
	id SERIAL PRIMARY KEY NOT NULL,
	amount_of_money NUMERIC(15,6),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions(
	id SERIAL PRIMARY KEY NOT NULL,
	sender_account_id INT NOT NULL,
	receiver_account_id INT NOT NULL,
	amount_of_money NUMERIC(15,6) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	finished_at TIMESTAMP WITH TIME ZONE,
	status TEXT DEFAULT 'PENDING'
);


-- EXAMPLES

-- Example accounts
INSERT INTO accounts(amount_of_money) VALUES(300);
INSERT INTO accounts(amount_of_money) VALUES(1200);
INSERT INTO accounts(amount_of_money) VALUES(10);

-- Example users
INSERT INTO users(first_name, last_name, account_id, username, password) VALUES('Jack', 'Smith', 1, 'jacksmith', 'mybadpass');
INSERT INTO users(first_name, middle_name, last_name, account_id, username, password) VALUES('John', 'Caribbean', 'Doe', 2, 'johndoe', 'mygoodpass');