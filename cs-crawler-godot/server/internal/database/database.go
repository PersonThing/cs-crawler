package database

import (
	"database/sql"
	"fmt"
	"log"

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

	log.Printf("Connected to database: %s@%s:%s/%s", cfg.User, cfg.Host, cfg.Port, cfg.DBName)

	return &DB{conn: conn}, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.conn.Close()
}

// Character represents a player character
type Character struct {
	ID        string
	AccountID string
	Name      string
	Level     int
}

// CreateCharacter creates a new character for an account
func (db *DB) CreateCharacter(accountID, name string) (*Character, error) {
	char := &Character{}

	query := `
		INSERT INTO characters (account_id, name)
		VALUES ($1, $2)
		RETURNING id, account_id, name, level
	`

	err := db.conn.QueryRow(query, accountID, name).Scan(
		&char.ID, &char.AccountID, &char.Name, &char.Level,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create character: %w", err)
	}

	return char, nil
}

// GetCharactersByAccount retrieves all characters for an account
func (db *DB) GetCharactersByAccount(accountID string) ([]Character, error) {
	query := `
		SELECT id, account_id, name, level
		FROM characters
		WHERE account_id = $1
		ORDER BY last_played DESC
	`

	rows, err := db.conn.Query(query, accountID)
	if err != nil {
		return nil, fmt.Errorf("failed to query characters: %w", err)
	}
	defer rows.Close()

	var characters []Character
	for rows.Next() {
		var char Character
		if err := rows.Scan(&char.ID, &char.AccountID, &char.Name, &char.Level); err != nil {
			return nil, fmt.Errorf("failed to scan character: %w", err)
		}
		characters = append(characters, char)
	}

	return characters, nil
}
