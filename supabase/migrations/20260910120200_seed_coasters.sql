-- Credit Count · 0003 catalogue seed
-- SOW §4.1 / §6: v1 seeds the catalogue directly (RCDB integration is out of
-- scope); admins maintain it afterwards. 44 real coasters across 12 countries,
-- 12 manufacturers and the three types. rcdb_id is left null on purpose: the
-- column is reserved for the future sync, and guessed ids would be worse than none.
-- Idempotent: re-running does nothing thanks to the unique (name, park) index.

insert into public.coasters (name, park, country, manufacturer, type) values
  -- United Kingdom
  ('Nemesis Reborn',                 'Alton Towers',                     'United Kingdom', 'Bolliger & Mabillard',            'steel'),
  ('The Smiler',                     'Alton Towers',                     'United Kingdom', 'Gerstlauer',                      'steel'),
  ('Wicker Man',                     'Alton Towers',                     'United Kingdom', 'Great Coasters International',    'wooden'),
  ('Stealth',                        'Thorpe Park',                      'United Kingdom', 'Intamin',                         'steel'),
  ('Hyperia',                        'Thorpe Park',                      'United Kingdom', 'Mack Rides',                      'steel'),
  ('Icon',                           'Blackpool Pleasure Beach',         'United Kingdom', 'Mack Rides',                      'steel'),
  ('The Big One',                    'Blackpool Pleasure Beach',         'United Kingdom', 'Arrow Dynamics',                  'steel'),
  ('Megafobia',                      'Oakwood Theme Park',               'United Kingdom', 'Custom Coasters International',   'wooden'),
  -- United States
  ('Fury 325',                       'Carowinds',                        'United States',  'Bolliger & Mabillard',            'steel'),
  ('Millennium Force',               'Cedar Point',                      'United States',  'Intamin',                         'steel'),
  ('Steel Vengeance',                'Cedar Point',                      'United States',  'Rocky Mountain Construction',     'hybrid'),
  ('Maverick',                       'Cedar Point',                      'United States',  'Intamin',                         'steel'),
  ('Magnum XL-200',                  'Cedar Point',                      'United States',  'Arrow Dynamics',                  'steel'),
  ('Top Thrill 2',                   'Cedar Point',                      'United States',  'Zamperla',                        'steel'),
  ('Iron Gwazi',                     'Busch Gardens Tampa Bay',          'United States',  'Rocky Mountain Construction',     'hybrid'),
  ('VelociCoaster',                  'Universal Islands of Adventure',   'United States',  'Intamin',                         'steel'),
  ('El Toro',                        'Six Flags Great Adventure',        'United States',  'Intamin',                         'wooden'),
  ('The Voyage',                     'Holiday World',                    'United States',  'The Gravity Group',               'wooden'),
  ('Phoenix',                        'Knoebels Amusement Resort',        'United States',  'Philadelphia Toboggan Coasters',  'wooden'),
  ('Twisted Colossus',               'Six Flags Magic Mountain',         'United States',  'Rocky Mountain Construction',     'hybrid'),
  -- Canada
  ('Leviathan',                      'Canada''s Wonderland',             'Canada',         'Bolliger & Mabillard',            'steel'),
  -- Mexico
  ('Medusa Steel Coaster',           'Six Flags México',                 'Mexico',         'Rocky Mountain Construction',     'hybrid'),
  -- Germany
  ('Taron',                          'Phantasialand',                    'Germany',        'Intamin',                         'steel'),
  ('Black Mamba',                    'Phantasialand',                    'Germany',        'Bolliger & Mabillard',            'steel'),
  ('Expedition GeForce',             'Holiday Park',                     'Germany',        'Intamin',                         'steel'),
  ('Colossos - Kampf der Giganten',  'Heide Park',                       'Germany',        'Intamin',                         'wooden'),
  ('Silver Star',                    'Europa-Park',                      'Germany',        'Bolliger & Mabillard',            'steel'),
  ('Wodan Timbur Coaster',           'Europa-Park',                      'Germany',        'Great Coasters International',    'wooden'),
  ('Voltron Nevera',                 'Europa-Park',                      'Germany',        'Mack Rides',                      'steel'),
  -- Netherlands
  ('Untamed',                        'Walibi Holland',                   'Netherlands',    'Rocky Mountain Construction',     'hybrid'),
  ('Goliath',                        'Walibi Holland',                   'Netherlands',    'Intamin',                         'steel'),
  ('Baron 1898',                     'Efteling',                         'Netherlands',    'Bolliger & Mabillard',            'steel'),
  ('Joris en de Draak',              'Efteling',                         'Netherlands',    'Great Coasters International',    'wooden'),
  -- Belgium
  ('Kondaa',                         'Walibi Belgium',                   'Belgium',        'Intamin',                         'steel'),
  -- France
  ('Toutatis',                       'Parc Astérix',                     'France',         'Intamin',                         'steel'),
  -- Spain
  ('Shambhala',                      'PortAventura Park',                'Spain',          'Bolliger & Mabillard',            'steel'),
  ('Dragon Khan',                    'PortAventura Park',                'Spain',          'Bolliger & Mabillard',            'steel'),
  ('Red Force',                      'Ferrari Land',                     'Spain',          'Intamin',                         'steel'),
  -- Sweden
  ('Helix',                          'Liseberg',                         'Sweden',         'Mack Rides',                      'steel'),
  ('Wildfire',                       'Kolmården',                        'Sweden',         'Rocky Mountain Construction',     'wooden'),
  -- Poland
  ('Hyperion',                       'Energylandia',                     'Poland',         'Intamin',                         'steel'),
  ('Zadra',                          'Energylandia',                     'Poland',         'Rocky Mountain Construction',     'hybrid'),
  -- Japan
  ('Steel Dragon 2000',              'Nagashima Spa Land',               'Japan',          'Morgan Manufacturing',            'steel'),
  ('Hakugei',                        'Nagashima Spa Land',               'Japan',          'Rocky Mountain Construction',     'hybrid')
on conflict (lower(name), lower(park)) do nothing;
