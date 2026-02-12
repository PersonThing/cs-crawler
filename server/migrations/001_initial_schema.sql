-- Initial database schema for CS Crawler

-- Players table (keyed by username until account system is added)
CREATE TABLE IF NOT EXISTS players (
    username VARCHAR(50) PRIMARY KEY,
    position_x DOUBLE PRECISION DEFAULT 0,
    position_y DOUBLE PRECISION DEFAULT 0,
    position_z DOUBLE PRECISION DEFAULT 0,
    rotation DOUBLE PRECISION DEFAULT 0,
    health DOUBLE PRECISION DEFAULT 100,
    equipped_items JSONB DEFAULT '{}',
    bag_items JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_saved TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE players IS 'Player save data keyed by username';
COMMENT ON COLUMN players.equipped_items IS 'JSON object mapping slot names to item data';
COMMENT ON COLUMN players.bag_items IS 'JSON array of items in bag slots (null for empty)';
