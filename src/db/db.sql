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
	email TEXT NOT NULL,
	role TEXT DEFAULT 'user',
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
	sender_first_name TEXT NOT NULL,
	sender_last_name TEXT NOT NULL,
	receiver_account_id INT NOT NULL,
	amount_of_money NUMERIC(15,6) NOT NULL,
	message TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	finished_at TIMESTAMP WITH TIME ZONE,
	status TEXT DEFAULT 'PENDING'
);

CREATE TABLE logs(
	id SERIAL PRIMARY KEY NOT NULL,
	date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	type TEXT DEFAULT 'LOG',
	message TEXT NOT NULL
);