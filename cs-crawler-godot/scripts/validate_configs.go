package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// BasicConfig represents the minimal structure all configs should have
type BasicConfig struct {
	Version string `json:"version"`
}

// AbilitiesConfig represents the abilities.json structure
type AbilitiesConfig struct {
	Version   string                 `json:"version"`
	Abilities map[string]AbilityData `json:"abilities"`
}

type AbilityData struct {
	Name       string  `json:"name"`
	Cooldown   float64 `json:"cooldown"`
	Damage     float64 `json:"damage"`
	DamageType string  `json:"damageType"`
}

// EnemiesConfig represents the enemies.json structure
type EnemiesConfig struct {
	Version     string              `json:"version"`
	EnemyTypes  map[string]EnemyData `json:"enemyTypes"`
}

type EnemyData struct {
	Name      string  `json:"name"`
	Health    float64 `json:"health"`
	MaxHealth float64 `json:"maxHealth"`
}

func main() {
	configDir := filepath.Join("..", "config")

	// Check if config directory exists
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		fmt.Printf("[ERROR] Config directory not found: %s\n", configDir)
		os.Exit(1)
	}

	fmt.Println("Validating configuration files...\n")

	allValid := true

	// Validate shared configs
	fmt.Println("=== Shared Configs ===")
	sharedDir := filepath.Join(configDir, "shared")
	if valid := validateDirectory(sharedDir); !valid {
		allValid = false
	}

	// Additional validation for specific files
	abilitiesPath := filepath.Join(sharedDir, "abilities.json")
	if _, err := os.Stat(abilitiesPath); err == nil {
		if valid := validateAbilities(abilitiesPath); !valid {
			allValid = false
		}
	}

	enemiesPath := filepath.Join(sharedDir, "enemies.json")
	if _, err := os.Stat(enemiesPath); err == nil {
		if valid := validateEnemies(enemiesPath); !valid {
			allValid = false
		}
	}

	// Validate client configs
	fmt.Println("\n=== Client Configs ===")
	clientDir := filepath.Join(configDir, "client")
	if valid := validateDirectory(clientDir); !valid {
		allValid = false
	}

	// Validate server configs
	fmt.Println("\n=== Server Configs ===")
	serverDir := filepath.Join(configDir, "server")
	if valid := validateDirectory(serverDir); !valid {
		allValid = false
	}

	// Print final result
	fmt.Println("\n" + "==================================================")
	if allValid {
		fmt.Println("[SUCCESS] All configuration files are valid!")
		os.Exit(0)
	} else {
		fmt.Println("[FAILED] Some configuration files have errors")
		os.Exit(1)
	}
}

func validateDirectory(dir string) bool {
	allValid := true

	files, err := filepath.Glob(filepath.Join(dir, "*.json"))
	if err != nil {
		fmt.Printf("[ERROR] Failed to read directory: %s\n", err)
		return false
	}

	for _, file := range files {
		if valid := validateJSONFile(file); !valid {
			allValid = false
		}
	}

	return allValid
}

func validateJSONFile(filePath string) bool {
	// Read file
	data, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Printf("[ERROR] %s: File not found\n", filepath.Base(filePath))
		return false
	}

	// Parse JSON
	var config BasicConfig
	if err := json.Unmarshal(data, &config); err != nil {
		fmt.Printf("[ERROR] %s: JSON Parse Error - %v\n", filepath.Base(filePath), err)
		return false
	}

	// Check for version field
	if config.Version == "" {
		fmt.Printf("[WARN] %s: Missing 'version' field\n", filepath.Base(filePath))
	}

	fmt.Printf("[OK] %s: Valid JSON (version: %s)\n", filepath.Base(filePath), config.Version)
	return true
}

func validateAbilities(filePath string) bool {
	data, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Printf("[ERROR] abilities.json validation failed: %v\n", err)
		return false
	}

	var config AbilitiesConfig
	if err := json.Unmarshal(data, &config); err != nil {
		fmt.Printf("[ERROR] abilities.json validation failed: %v\n", err)
		return false
	}

	for abilityName, abilityData := range config.Abilities {
		missing := []string{}

		if abilityData.Name == "" {
			missing = append(missing, "name")
		}
		if abilityData.Cooldown == 0 {
			missing = append(missing, "cooldown")
		}
		if abilityData.Damage == 0 {
			missing = append(missing, "damage")
		}
		if abilityData.DamageType == "" {
			missing = append(missing, "damageType")
		}

		if len(missing) > 0 {
			fmt.Printf("[WARN] Ability '%s' missing fields: %v\n", abilityName, missing)
		}
	}

	fmt.Printf("[OK] abilities.json: %d abilities validated\n", len(config.Abilities))
	return true
}

func validateEnemies(filePath string) bool {
	data, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Printf("[ERROR] enemies.json validation failed: %v\n", err)
		return false
	}

	var config EnemiesConfig
	if err := json.Unmarshal(data, &config); err != nil {
		fmt.Printf("[ERROR] enemies.json validation failed: %v\n", err)
		return false
	}

	for enemyName, enemyData := range config.EnemyTypes {
		missing := []string{}

		if enemyData.Name == "" {
			missing = append(missing, "name")
		}
		if enemyData.Health == 0 {
			missing = append(missing, "health")
		}
		if enemyData.MaxHealth == 0 {
			missing = append(missing, "maxHealth")
		}

		if len(missing) > 0 {
			fmt.Printf("[WARN] Enemy '%s' missing fields: %v\n", enemyName, missing)
		}
	}

	fmt.Printf("[OK] enemies.json: %d enemy types validated\n", len(config.EnemyTypes))
	return true
}
