package database

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConnect_InvalidConfig(t *testing.T) {
	cfg := Config{
		Host:     "invalid-host",
		Port:     "5432",
		User:     "test",
		Password: "test",
		DBName:   "test",
	}

	_, err := Connect(cfg)
	assert.Error(t, err)
}

// Integration tests require database running
// Run with: docker-compose up -d postgres
// Then: go test ./internal/database -tags=integration
