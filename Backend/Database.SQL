CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(20) NOT NULL,
  phone_number VARCHAR(15) UNIQUE,
  email VARCHAR(254) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,  -- hashed password
  user_rating NUMERIC(3,2) DEFAULT 0.0
);

CREATE TABLE locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  full_address VARCHAR(255)
);

CREATE TABLE restaurants (
  restaurant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(30),
  contact_info TEXT,
  restaurant_rating NUMERIC(3,2) DEFAULT 0.0,
  location_id UUID REFERENCES locations(location_id) ON DELETE SET NULL
);

CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time TIMESTAMP NOT NULL,
  host_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  event_description TEXT
);

CREATE TABLE user_events (
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
  is_host BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (user_id, event_id)
);
