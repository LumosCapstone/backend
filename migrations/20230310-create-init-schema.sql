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


-- Examples of inserts (only minimum columns required)
-- INSERT INTO resources (location, type, quantity) VALUES ('SRID=4326;POINT(-121.79796783646778 36.65301564458816)', 'fridge_space', 1);
-- INSERT INTO resources (location, type, quantity) VALUES ('SRID=4326;POINT(-121.76355792717915 36.68135246552803)', 'fridge_space', 1);
-- INSERT INTO resources (location, type, quantity) VALUES ('SRID=4326;POINT(-121.66620564872026 36.79643055574802)', 'fridge_space', 1);

-- Example of selecting within 25km
-- select ST_AsText(location), type from resources where ST_DWithin('SRID=4326;POINT(-121.79796783646778 36.65301564458816)'::geography, resources.location::geography, 25000);