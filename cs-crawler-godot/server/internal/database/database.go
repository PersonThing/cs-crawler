package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"
)

// DatabaseType represents the type of database to use
type DatabaseType string

const (
	PostgreSQL DatabaseType = "postgres"
	SQLite     DatabaseType = "sqlite"
)

// Config holds database configuration
type Config struct {
	Type     DatabaseType // "postgres" or "sqlite"
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	FilePath string // For SQLite: path to database file
}

// DB wraps the database connection
type DB struct {
	conn   *sql.DB
	dbType DatabaseType
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

// Connect establishes a connection to the database (PostgreSQL or SQLite)
func Connect(cfg Config) (*DB, error) {
	var conn *sql.DB
	var err error

	// Default to SQLite if no type specified
	if cfg.Type == "" {
		if cfg.FilePath != "" {
			cfg.Type = SQLite
		} else {
			cfg.Type = PostgreSQL
		}
	}

	switch cfg.Type {
	case SQLite:
		// Use FilePath or default to ./data/players.db
		dbPath := cfg.FilePath
		if dbPath == "" {
			dbPath = "./data/players.db"
		}

		// Ensure directory exists
		dbDir := filepath.Dir(dbPath)
		if err := os.MkdirAll(dbDir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create database directory: %w", err)
		}

		conn, err = sql.Open("sqlite", dbPath)
		if err != nil {
			return nil, fmt.Errorf("failed to open SQLite database: %w", err)
		}
		log.Printf("[DB] Connected to SQLite database: %s", dbPath)

	case PostgreSQL:
		connStr := fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName,
		)
		conn, err = sql.Open("postgres", connStr)
		if err != nil {
			return nil, fmt.Errorf("failed to open PostgreSQL database: %w", err)
		}
		log.Printf("[DB] Connected to PostgreSQL database: %s@%s:%s/%s", cfg.User, cfg.Host, cfg.Port, cfg.DBName)

	default:
		return nil, fmt.Errorf("unsupported database type: %s", cfg.Type)
	}

	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{conn: conn, dbType: cfg.Type}, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.conn.Close()
}

// EnsureSchema creates the players table if it doesn't exist
func (db *DB) EnsureSchema() error {
	var query string

	switch db.dbType {
	case SQLite:
		query = `
			CREATE TABLE IF NOT EXISTS players (
				username TEXT PRIMARY KEY,
				position_x REAL DEFAULT 0,
				position_y REAL DEFAULT 0,
				position_z REAL DEFAULT 0,
				rotation REAL DEFAULT 0,
				health REAL DEFAULT 100,
				equipped_items TEXT DEFAULT '{}',
				bag_items TEXT DEFAULT '[]',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				last_saved DATETIME DEFAULT CURRENT_TIMESTAMP
			);
		`
	case PostgreSQL:
		query = `
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
	}

	_, err := db.conn.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create players table: %w", err)
	}
	log.Printf("[DB] Schema ensured (players table ready)")
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
