-- create stements for all 3 tables in the case users, resources, and images.
CREATE TABLE users (
	id serial primary key,
	name varchar(150) NOT NULL,
	email varchar(120) NOT NULL,
	phone_number varchar(18),
	password_hash varchar(72) NOT NULL
);

CREATE TABLE resources (
	id serial primary key,
	location geometry NOT NULL,
	type varchar(60) NOT NULL,
	name varchar(120),
	quantity int NOT NULL CHECK (quantity > 0),
	owned_by int,
	reserved_by int,
	foreign key (owned_by) references users(id),
	foreign key (reserved_by) references users(id)
);

CREATE TABLE images (
	id serial primary key,
	content varchar(300) NOT NULL,
	resource_id int,
	foreign key (resource_id) references resources(id)
);

create index resources_gix on resources using GIST (location);

-- Insert statements for prepopulated tables except for images.
-- Make sure to run create statements first and then the insert statements.

insert into users (name, email, phone_number, password_hash) values
('Jose Castro', 'josecastro1@csumb.edu', '8312027212', 'CAS123')
('Ben Woodward', 'bwoodward@csumb.edu', '8317839834', 'Wood784')
('Diego Vega', 'dvega@csumb.edu', '8314568976', 'Vega5678'),
('Liliana Valencia', 'lilival@csumb.edu', '8312938501', 'Val485672'),
('Rohit Kannaujiya', 'rkannau@csumb.edu', '8315432167', 'Roh6789');

insert into resources (location, type, name, quantity, owned_by) values 
('SRID=4326;POINT(-121.92248246169913 36.58336131937593)', 'Fridge_space', 'Jose', 1, 1),
('SRID=4326;POINT(-121.92248246169913 36.58336131937593)', 'Lanterns', 'Ben', 3, 2),
('SRID=4326;POINT(-121.92248246169913 36.58336131937593)', 'Generators', 'Diego', 2, 3),
('SRID=4326;POINT(-121.92248246169913 36.58336131937593)', 'Fridge_Space', 'Liliana', 2, 4),
('SRID=4326;POINT(-121.92248246169913 36.58336131937593)', 'Wifi', 'Rohit', 1, 5),
('SRID=4326;POINT(-121.92248246169913 36.58336131937593)', 'Candels', 'Ben', 5, 2),
('SRID=4326;POINT(-121.92248246169913 36.58336131937593)', 'Batteries', 'Jose', 10, 1),
('SRID=4326;POINT(-121.92248246169913 36.58336131937593)', 'First aid kit', 'Diego', 3, 3),