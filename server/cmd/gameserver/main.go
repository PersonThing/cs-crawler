package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/PersonThing/cs-crawler/server/internal/config"
	"github.com/PersonThing/cs-crawler/server/internal/database"
	"github.com/PersonThing/cs-crawler/server/internal/game"
	"github.com/PersonThing/cs-crawler/server/internal/network"
)

var (
	addr       = flag.String("addr", ":7000", "HTTP service address")
	dbType     = flag.String("db-type", "sqlite", "Database type: 'sqlite' or 'postgres'")
	dbFile     = flag.String("db-file", "./data/players.db", "SQLite database file path")
	dbHost     = flag.String("db-host", "localhost", "Database host (PostgreSQL only)")
	dbPort     = flag.String("db-port", "7001", "Database port (PostgreSQL only)")
	dbUser     = flag.String("db-user", "crawler", "Database user (PostgreSQL only)")
	dbPassword = flag.String("db-password", "crawler", "Database password (PostgreSQL only)")
	dbName     = flag.String("db-name", "crawler", "Database name (PostgreSQL only)")
	tickRate   = flag.Int("tick-rate", 60, "Game loop ticks per second")
	llmURL     = flag.String("llm-url", "", "URL of llama-server for AI combat (e.g., http://localhost:8080)")
)

func envOrFlag(envKey string, flagVal *string) string {
	if v := os.Getenv(envKey); v != "" {
		return v
	}
	return *flagVal
}

func envOrFlagInt(envKey string, flagVal *int) int {
	if v := os.Getenv(envKey); v != "" {
		var n int
		if _, err := fmt.Sscanf(v, "%d", &n); err == nil {
			return n
		}
	}
	return *flagVal
}

func main() {
	flag.Parse()

	// Environment variables override flags
	resolvedAddr := envOrFlag("SERVER_ADDR", addr)
	resolvedDBType := envOrFlag("DB_TYPE", dbType)
	resolvedDBFile := envOrFlag("DB_FILE", dbFile)
	resolvedDBHost := envOrFlag("DB_HOST", dbHost)
	resolvedDBPort := envOrFlag("DB_PORT", dbPort)
	resolvedDBUser := envOrFlag("DB_USER", dbUser)
	resolvedDBPassword := envOrFlag("DB_PASSWORD", dbPassword)
	resolvedDBName := envOrFlag("DB_NAME", dbName)
	resolvedTickRate := envOrFlagInt("TICK_RATE", tickRate)

	log.Printf("CS Crawler Game Server starting...")
	log.Printf("Server address: %s", resolvedAddr)
	log.Printf("Database type: %s", resolvedDBType)
	log.Printf("Tick rate: %d TPS", resolvedTickRate)

	// Load configuration files
	configDir := "./config"
	if err := config.LoadAll(configDir); err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Build database config based on type
	var dbConfig database.Config
	if resolvedDBType == "sqlite" {
		dbConfig = database.Config{
			Type:     database.SQLite,
			FilePath: resolvedDBFile,
		}
		log.Printf("Using SQLite database: %s", resolvedDBFile)
	} else {
		dbConfig = database.Config{
			Type:     database.PostgreSQL,
			Host:     resolvedDBHost,
			Port:     resolvedDBPort,
			User:     resolvedDBUser,
			Password: resolvedDBPassword,
			DBName:   resolvedDBName,
		}
		log.Printf("Using PostgreSQL database: %s@%s:%s/%s", resolvedDBUser, resolvedDBHost, resolvedDBPort, resolvedDBName)
	}

	// Connect to database
	db, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Ensure database schema exists
	if err := db.EnsureSchema(); err != nil {
		log.Fatalf("Failed to ensure database schema: %v", err)
	}

	// Initialize LLM provider if URL is provided
	var llmProvider game.LLMProvider
	resolvedLLMURL := envOrFlag("LLM_URL", llmURL)

	if resolvedLLMURL != "" {
		log.Printf("Initializing HTTP LLM provider at: %s", resolvedLLMURL)
		provider, err := game.NewHTTPLLMProvider(game.HTTPLLMConfig{
			BaseURL: resolvedLLMURL,
			Timeout: 30,
		})
		if err != nil {
			log.Printf("WARNING: Failed to initialize LLM provider: %v", err)
			log.Printf("AI combat will use fallback behavior trees")
		} else {
			llmProvider = provider
			log.Printf("LLM provider initialized successfully")
		}
	} else {
		log.Printf("No LLM server specified, AI combat will use fallback behavior trees")
		log.Printf("To enable AI combat, start llama-server and use -llm-url flag")
	}

	// Initialize game server
	gameServer := game.NewServer(resolvedTickRate, db, llmProvider)

	// Initialize network server
	netServer := network.NewServer(resolvedAddr, gameServer, db)

	// Start game loop
	go gameServer.Start()

	// Start network server
	go func() {
		log.Printf("WebSocket server listening on %s", resolvedAddr)
		if err := netServer.Start(); err != nil {
			log.Fatalf("Failed to start network server: %v", err)
		}
	}()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down server...")

	// Save all players before stopping
	gameServer.SaveAllPlayers()

	gameServer.Stop()
	netServer.Stop()
	log.Println("Server stopped")
}
