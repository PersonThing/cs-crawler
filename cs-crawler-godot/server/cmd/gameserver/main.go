package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/yourusername/cs-crawler-godot/server/internal/config"
	"github.com/yourusername/cs-crawler-godot/server/internal/database"
	"github.com/yourusername/cs-crawler-godot/server/internal/game"
	"github.com/yourusername/cs-crawler-godot/server/internal/network"
)

var (
	addr       = flag.String("addr", ":7000", "HTTP service address")
	dbHost     = flag.String("db-host", "localhost", "Database host")
	dbPort     = flag.String("db-port", "7001", "Database port")
	dbUser     = flag.String("db-user", "crawler", "Database user")
	dbPassword = flag.String("db-password", "crawler", "Database password")
	dbName     = flag.String("db-name", "crawler", "Database name")
	tickRate   = flag.Int("tick-rate", 60, "Game loop ticks per second")
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
	resolvedDBHost := envOrFlag("DB_HOST", dbHost)
	resolvedDBPort := envOrFlag("DB_PORT", dbPort)
	resolvedDBUser := envOrFlag("DB_USER", dbUser)
	resolvedDBPassword := envOrFlag("DB_PASSWORD", dbPassword)
	resolvedDBName := envOrFlag("DB_NAME", dbName)
	resolvedTickRate := envOrFlagInt("TICK_RATE", tickRate)

	log.Printf("CS Crawler Game Server starting...")
	log.Printf("Server address: %s", resolvedAddr)
	log.Printf("Tick rate: %d TPS", resolvedTickRate)

	// Load configuration files
	configDir := "./config"
	if err := config.LoadAll(configDir); err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to database
	db, err := database.Connect(database.Config{
		Host:     resolvedDBHost,
		Port:     resolvedDBPort,
		User:     resolvedDBUser,
		Password: resolvedDBPassword,
		DBName:   resolvedDBName,
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Ensure database schema exists
	if err := db.EnsureSchema(); err != nil {
		log.Fatalf("Failed to ensure database schema: %v", err)
	}

	// Initialize game server
	gameServer := game.NewServer(resolvedTickRate, db)

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
