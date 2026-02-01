-- Initial database schema for CS Crawler

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_played TIMESTAMP,

    -- Stats
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,

    -- Inventory (stored as JSONB for flexibility)
    equipped_items JSONB DEFAULT '{}',
    bag_items JSONB DEFAULT '[]',

    -- Abilities
    unlocked_abilities JSONB DEFAULT '[]',
    ability_bar JSONB DEFAULT '[]',

    -- Proficiency
    fire_proficiency INTEGER DEFAULT 0,
    cold_proficiency INTEGER DEFAULT 0,
    lightning_proficiency INTEGER DEFAULT 0,
    physical_proficiency INTEGER DEFAULT 0,
    poison_proficiency INTEGER DEFAULT 0,

    -- Ability familiarity (stored as JSONB: {"fireball": 100, "frostbolt": 50})
    ability_familiarity JSONB DEFAULT '{}',

    CONSTRAINT unique_char_name_per_account UNIQUE(account_id, name)
);

-- Indexes for performance
CREATE INDEX idx_characters_account_id ON characters(account_id);
CREATE INDEX idx_characters_last_played ON characters(last_played);
CREATE INDEX idx_accounts_username ON accounts(username);

-- Sample data for development
INSERT INTO accounts (username, password_hash, email)
VALUES ('testuser', 'hash_placeholder', 'test@example.com')
ON CONFLICT (username) DO NOTHING;

-- Comments
COMMENT ON TABLE accounts IS 'Player accounts for authentication';
COMMENT ON TABLE characters IS 'Player characters (multiple per account)';
COMMENT ON COLUMN characters.equipped_items IS 'JSON object mapping slot names to item data';
COMMENT ON COLUMN characters.bag_items IS 'JSON array of items in bag slots (null for empty)';
COMMENT ON COLUMN characters.ability_bar IS 'JSON array of ability IDs in slots 1-4';
COMMENT ON COLUMN characters.ability_familiarity IS 'JSON object tracking ability usage counts';
