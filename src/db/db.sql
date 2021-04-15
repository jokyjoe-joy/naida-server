-- DATABASE STRUCTURE (Copy-Paste friendly)

CREATE DATABASE naida;
\c naida;

CREATE TABLE accounts(
	id SERIAL PRIMARY KEY NOT NULL,
	amount_of_money NUMERIC(15,6),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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






-- EXAMPLES

-- Example accounts
INSERT INTO accounts(amount_of_money) VALUES(300);
INSERT INTO accounts(amount_of_money) VALUES(1200);
INSERT INTO accounts(amount_of_money) VALUES(10);

-- Example users
INSERT INTO users(first_name, last_name, account_id, username, password) VALUES('Jack', 'Smith', 1, 'jacksmith', 'mybadpass');
INSERT INTO users(first_name, middle_name, last_name, account_id, username, password) VALUES('John', 'Caribbean', 'Doe', 2, 'johndoe', 'mygoodpass');

/* -- Check relation between accounts and users
SELECT accounts.id, users.first_name, users.last_name, accounts.amount_of_money
FROM accounts
INNER JOIN users ON accounts.id=users.id; */