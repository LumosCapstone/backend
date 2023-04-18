-- Insert statements for prepopulated tables except for images.
-- Make sure to run create statements first and then the insert statements.

insert into users (name, email, phone_number, password_hash) values
('Jose Castro', 'josecastro1@csumb.edu', '8312027212', 'CAS123'),
('Ben Woodward', 'bwoodward@csumb.edu', '8317839834', 'Wood784'),
('Diego Vega', 'dvega@csumb.edu', '8314568976', 'Vega5678'),
('Liliana Valencia', 'lilival@csumb.edu', '8312938501', 'Val485672'),
('Rohit Kannaujiya', 'rkannau@csumb.edu', '8315432167', 'Roh6789');

insert into resources (location, type, name, quantity, owned_by) values 
('SRID=4326;POINT(-121.92248246169913 36.58336131937593)', 'fridge_space', 'freezer', 1, 1),
('SRID=4326;POINT(-121.82342 36.63958)', 'lanterns', 'gas coleman lantern', 3, 2),
('SRID=4326;POINT(-121.82745 36.61942)', 'generators', '3500 watt generator', 2, 3),
('SRID=4326;POINT(-121.83360 36.60986)', 'fridge_Space', 'refridgerator', 2, 4),
('SRID=4326;POINT(-121.82408 36.61325)', 'wifi', 'AT&T 5GHZ', 1, 5),
('SRID=4326;POINT(-121.82342 36.63958)', 'candels', 'beeswax candle', 5, 2),
('SRID=4326;POINT(-121.92248246169913 36.58336131937593)', 'batteries', 'triple & double A', 10, 1),
('SRID=4326;POINT(-121.82745 36.61942)', 'first aid kit', 'medical emergancy kit', 3, 3);


insert into images (id, content, resource_id) values 
(1, 'https://static.vecteezy.com/system/resources/previews/000/356/450/original/fridge-vector-icon.jpg', 1),
(2, 'https://static.vecteezy.com/system/resources/previews/006/695/809/non_2x/lantern-icon-template-black-color-editable-lantern-icon-symbol-flat-illustration-for-graphic-and-web-design-free-vector.jpg', 2),
(3, 'https://t3.ftcdn.net/jpg/03/48/72/98/360_F_348729870_1hX5skbUJHeD8nuvuGdtaOU9m3a4zYoq.jpg', 3),
(4, 'https://static.vecteezy.com/system/resources/previews/000/356/450/original/fridge-vector-icon.jpg', 4),
(5, 'https://media.istockphoto.com/id/1261027671/vector/wifi-icon.jpg?s=612x612&w=0&k=20&c=cILPmAhltJetlunXkfIIef-PvPwSkZd5710ofXBsstY=', 5),
(6, 'https://st3.depositphotos.com/4562487/13400/v/450/depositphotos_134008856-stock-illustration-candle-icon-illustration.jpg', 6),
(7, 'https://static.vecteezy.com/system/resources/thumbnails/000/574/802/small/vector60-6153-01.jpg', 7),
(8, 'https://static.vecteezy.com/system/resources/previews/000/602/288/original/first-aid-box-line-black-icon-vector.jpg', 8)