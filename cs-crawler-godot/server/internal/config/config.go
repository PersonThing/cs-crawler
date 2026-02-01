package config

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
)

// Global config instances
var (
	Abilities AbilitiesData
	Enemies   EnemiesData
	Player    PlayerData
	Combat    CombatData
	Spawning  SpawningData
	Server    ServerData
)

// AbilityConfig represents a single ability's configuration
type AbilityConfig struct {
	Name            string                 `json:"name"`
	Type            string                 `json:"type"`
	Cooldown        float64                `json:"cooldown"`
	Damage          float64                `json:"damage"`
	DamageType      string                 `json:"damageType"`
	Range           float64                `json:"range"`
	Speed           float64                `json:"speed"`
	Lifetime        float64                `json:"lifetime"`
	CollisionRadius float64                `json:"collisionRadius"`
	ManaCost        float64                `json:"manaCost"`
	Description     string                 `json:"description"`
	StatusEffect    map[string]interface{} `json:"statusEffect,omitempty"`
	Angle           float64                `json:"angle,omitempty"`
}

// AbilitiesData represents the abilities.json structure
type AbilitiesData struct {
	Version   string                    `json:"version"`
	Abilities map[string]AbilityConfig  `json:"abilities"`
}

// EnemyVisual represents enemy visual configuration
type EnemyVisual struct {
	MeshType string    `json:"meshType"`
	Color    []float64 `json:"color"`
	Scale    []float64 `json:"scale"`
	Height   float64   `json:"height"`
	Radius   float64   `json:"radius"`
}

// EnemyAI represents enemy AI configuration
type EnemyAI struct {
	Type       string  `json:"type"`
	AggroRange float64 `json:"aggroRange"`
	ChaseSpeed float64 `json:"chaseSpeed,omitempty"`
}

// EnemyConfig represents a single enemy type's configuration
type EnemyConfig struct {
	Name      string      `json:"name"`
	Health    float64     `json:"health"`
	MaxHealth float64     `json:"maxHealth"`
	MoveSpeed float64     `json:"moveSpeed"`
	Damage    float64     `json:"damage"`
	XPReward  int         `json:"xpReward"`
	Visual    EnemyVisual `json:"visual"`
	AI        EnemyAI     `json:"ai"`
}

// EnemiesData represents the enemies.json structure
type EnemiesData struct {
	Version     string                  `json:"version"`
	EnemyTypes  map[string]EnemyConfig  `json:"enemyTypes"`
}

// PlayerStats represents player base stats
type PlayerStats struct {
	Health     float64 `json:"health"`
	MaxHealth  float64 `json:"maxHealth"`
	MoveSpeed  float64 `json:"moveSpeed"`
	Mana       float64 `json:"mana"`
	MaxMana    float64 `json:"maxMana"`
	ManaRegen  float64 `json:"manaRegen"`
}

// PlayerVisual represents player visual configuration
type PlayerVisual struct {
	MeshType string    `json:"meshType"`
	Color    []float64 `json:"color"`
	Height   float64   `json:"height"`
	Radius   float64   `json:"radius"`
}

// PlayerData represents the player.json structure
type PlayerData struct {
	Version           string   `json:"version"`
	BaseStats         PlayerStats `json:"baseStats"`
	Visual            PlayerVisual `json:"visual"`
	StartingAbilities []string `json:"startingAbilities"`
}

// CombatData represents the combat.json structure
type CombatData struct {
	Version            string                            `json:"version"`
	CollisionRadii     map[string]float64                `json:"collisionRadii"`
	DamageMultipliers  map[string]map[string]float64     `json:"damageMultipliers"`
	StatusEffects      map[string]map[string]interface{} `json:"statusEffects"`
}

// SpawnPattern represents a spawn pattern configuration
type SpawnPattern struct {
	Pattern        string    `json:"pattern"`
	EnemyType      string    `json:"enemyType,omitempty"`
	EnemyTypes     []string  `json:"enemyTypes,omitempty"`
	Count          int       `json:"count,omitempty"`
	Radius         float64   `json:"radius,omitempty"`
	CenterPosition []float64 `json:"centerPosition,omitempty"`
	Spacing        float64   `json:"spacing,omitempty"`
	Rows           int       `json:"rows,omitempty"`
	Columns        int       `json:"columns,omitempty"`
}

// SpawningData represents the spawning.json structure
type SpawningData struct {
	Version       string                  `json:"version"`
	SpawnPatterns map[string]SpawnPattern `json:"spawnPatterns"`
}

// DebugConfig represents debug settings
type DebugConfig struct {
	LogPlayerMovement bool `json:"logPlayerMovement"`
	LogAbilityCasts   bool `json:"logAbilityCasts"`
	LogWorldState     bool `json:"logWorldState"`
}

// ServerData represents the server.json structure
type ServerData struct {
	Version               string      `json:"version"`
	ShutdownDelaySeconds  int         `json:"shutdownDelaySeconds"`
	TickRate              int         `json:"tickRate"`
	BroadcastRate         int         `json:"broadcastRate"`
	MaxPlayers            int         `json:"maxPlayers"`
	Debug                 DebugConfig `json:"debug"`
}

// LoadAll loads all configuration files from the config directory
func LoadAll(configDir string) error {
	log.Println("[CONFIG] Loading configuration files...")

	// Load shared configs
	if err := loadJSON(filepath.Join(configDir, "shared", "abilities.json"), &Abilities); err != nil {
		return fmt.Errorf("failed to load abilities: %w", err)
	}
	log.Printf("[CONFIG] Loaded %d abilities (version %s)", len(Abilities.Abilities), Abilities.Version)

	if err := loadJSON(filepath.Join(configDir, "shared", "enemies.json"), &Enemies); err != nil {
		return fmt.Errorf("failed to load enemies: %w", err)
	}
	log.Printf("[CONFIG] Loaded %d enemy types (version %s)", len(Enemies.EnemyTypes), Enemies.Version)

	if err := loadJSON(filepath.Join(configDir, "shared", "player.json"), &Player); err != nil {
		return fmt.Errorf("failed to load player: %w", err)
	}
	log.Printf("[CONFIG] Loaded player config (version %s)", Player.Version)

	if err := loadJSON(filepath.Join(configDir, "shared", "combat.json"), &Combat); err != nil {
		return fmt.Errorf("failed to load combat: %w", err)
	}
	log.Printf("[CONFIG] Loaded combat config (version %s)", Combat.Version)

	// Load server-specific configs
	if err := loadJSON(filepath.Join(configDir, "server", "spawning.json"), &Spawning); err != nil {
		return fmt.Errorf("failed to load spawning: %w", err)
	}
	log.Printf("[CONFIG] Loaded %d spawn patterns (version %s)", len(Spawning.SpawnPatterns), Spawning.Version)

	if err := loadJSON(filepath.Join(configDir, "server", "server.json"), &Server); err != nil {
		return fmt.Errorf("failed to load server: %w", err)
	}
	log.Printf("[CONFIG] Loaded server config (version %s, shutdown delay: %ds)", Server.Version, Server.ShutdownDelaySeconds)

	log.Println("[CONFIG] All configuration files loaded successfully")
	return nil
}

// loadJSON loads a JSON file into the provided struct
func loadJSON(path string, v interface{}) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

// GetAbilityConfig returns an ability configuration by type
func GetAbilityConfig(abilityType string) (*AbilityConfig, bool) {
	config, ok := Abilities.Abilities[abilityType]
	return &config, ok
}

// GetEnemyConfig returns an enemy configuration by type
func GetEnemyConfig(enemyType string) (*EnemyConfig, bool) {
	config, ok := Enemies.EnemyTypes[enemyType]
	return &config, ok
}

// GetSpawnPattern returns a spawn pattern by name
func GetSpawnPattern(patternName string) (*SpawnPattern, bool) {
	pattern, ok := Spawning.SpawnPatterns[patternName]
	return &pattern, ok
}
