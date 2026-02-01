package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/yourusername/cs-crawler-godot/server/internal/config"
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

func main() {
	flag.Parse()

	log.Printf("CS Crawler Game Server starting...")
	log.Printf("Server address: %s", *addr)
	log.Printf("Tick rate: %d TPS", *tickRate)

	// Load configuration files
	configDir := "./config"
	if err := config.LoadAll(configDir); err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize game server
	gameServer := game.NewServer(*tickRate)

	// Initialize network server
	netServer := network.NewServer(*addr, gameServer)

	// Start game loop
	go gameServer.Start()

	// Start network server
	go func() {
		log.Printf("WebSocket server listening on %s", *addr)
		if err := netServer.Start(); err != nil {
			log.Fatalf("Failed to start network server: %v", err)
		}
	}()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down server...")
	gameServer.Stop()
	netServer.Stop()
	log.Println("Server stopped")
}
