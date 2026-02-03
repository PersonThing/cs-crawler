package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

// Config holds database configuration
type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
}

// DB wraps the database connection
type DB struct {
	conn *sql.DB
}

// PlayerData holds the serialized player state for persistence
type PlayerData struct {
	Username      string
	PositionX     float64
	PositionY     float64
	PositionZ     float64
	Rotation      float64
	Health        float64
	EquippedItems json.RawMessage // JSONB
	BagItems      json.RawMessage // JSONB
}

// Connect establishes a connection to PostgreSQL
func Connect(cfg Config) (*DB, error) {
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName,
	)

	conn, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Printf("[DB] Connected to database: %s@%s:%s/%s", cfg.User, cfg.Host, cfg.Port, cfg.DBName)

	return &DB{conn: conn}, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.conn.Close()
}

// EnsureSchema creates tables and runs migrations if they don't exist
func (db *DB) EnsureSchema() error {
	// Create players table
	playersQuery := `
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
	`
	_, err := db.conn.Exec(playersQuery)
	if err != nil {
		return fmt.Errorf("failed to create players table: %w", err)
	}
	log.Printf("[DB] Schema ensured (players table ready)")

	// Create feedback table
	feedbackQuery := `
		CREATE TABLE IF NOT EXISTS feedback (
			id SERIAL PRIMARY KEY,
			username VARCHAR(50),
			feedback_type VARCHAR(50) DEFAULT 'general',
			message TEXT NOT NULL,
			github_issue_url TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`
	_, err = db.conn.Exec(feedbackQuery)
	if err != nil {
		return fmt.Errorf("failed to create feedback table: %w", err)
	}

	// Add github_issue_url column if it doesn't exist (migration for existing tables)
	migrateFeedbackQuery := `
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'feedback' AND column_name = 'github_issue_url'
			) THEN
				ALTER TABLE feedback ADD COLUMN github_issue_url TEXT;
			END IF;
		END $$;
	`
	_, err = db.conn.Exec(migrateFeedbackQuery)
	if err != nil {
		return fmt.Errorf("failed to migrate feedback table: %w", err)
	}
	log.Printf("[DB] Schema ensured (feedback table ready)")

	return nil
}

// SavePlayer upserts player data into the database
func (db *DB) SavePlayer(data *PlayerData) error {
	query := `
		INSERT INTO players (username, position_x, position_y, position_z, rotation, health, equipped_items, bag_items, last_saved)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (username) DO UPDATE SET
			position_x = EXCLUDED.position_x,
			position_y = EXCLUDED.position_y,
			position_z = EXCLUDED.position_z,
			rotation = EXCLUDED.rotation,
			health = EXCLUDED.health,
			equipped_items = EXCLUDED.equipped_items,
			bag_items = EXCLUDED.bag_items,
			last_saved = EXCLUDED.last_saved
	`

	_, err := db.conn.Exec(query,
		data.Username,
		data.PositionX, data.PositionY, data.PositionZ,
		data.Rotation,
		data.Health,
		data.EquippedItems,
		data.BagItems,
		time.Now(),
	)
	if err != nil {
		return fmt.Errorf("failed to save player %s: %w", data.Username, err)
	}
	return nil
}

// LoadPlayer loads player data from the database. Returns nil if not found.
func (db *DB) LoadPlayer(username string) (*PlayerData, error) {
	query := `
		SELECT username, position_x, position_y, position_z, rotation, health, equipped_items, bag_items
		FROM players
		WHERE username = $1
	`

	data := &PlayerData{}
	err := db.conn.QueryRow(query, username).Scan(
		&data.Username,
		&data.PositionX, &data.PositionY, &data.PositionZ,
		&data.Rotation,
		&data.Health,
		&data.EquippedItems,
		&data.BagItems,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to load player %s: %w", username, err)
	}

	return data, nil
}
