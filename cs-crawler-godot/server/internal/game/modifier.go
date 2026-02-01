package game

// ModifierType represents different types of ability modifiers
type ModifierType string

const (
	ModifierPet      ModifierType = "pet"
	ModifierTurret   ModifierType = "turret"
	ModifierHoming   ModifierType = "homing"
	ModifierPiercing ModifierType = "piercing"
	ModifierChain    ModifierType = "chain"
	ModifierSplit    ModifierType = "split"
)

// Modifier represents a modification to an ability
type Modifier struct {
	Type ModifierType
	Name string

	// Pet/Turret specific
	MinionDuration float64 // How long the minion lasts (seconds)
	CastInterval   float64 // How often the minion casts the ability (seconds)
	MinionCount    int     // Number of minions to spawn

	// Homing specific
	TurnRate float64 // How fast projectile can turn (degrees per second)

	// Piercing specific
	MaxPierces int // Maximum number of enemies to pierce through (-1 for infinite)

	// Chain specific
	ChainRange   float64 // Range to find next target
	MaxChains    int     // Maximum number of chain jumps
	ChainDamping float64 // Damage reduction per chain (0.0-1.0)

	// Split specific
	SplitCount int     // Number of projectiles to split into
	SplitAngle float64 // Angle spread for split projectiles (degrees)
}

// AbilityWithModifiers represents an ability with applied modifiers
type AbilityWithModifiers struct {
	BaseAbility *Ability
	Modifiers   []*Modifier
}

// NewAbilityWithModifiers creates a new ability with modifiers
func NewAbilityWithModifiers(ability *Ability) *AbilityWithModifiers {
	return &AbilityWithModifiers{
		BaseAbility: ability,
		Modifiers:   make([]*Modifier, 0),
	}
}

// AddModifier adds a modifier to the ability
func (awm *AbilityWithModifiers) AddModifier(modifier *Modifier) {
	awm.Modifiers = append(awm.Modifiers, modifier)
}

// HasModifier checks if the ability has a specific modifier type
func (awm *AbilityWithModifiers) HasModifier(modType ModifierType) bool {
	for _, mod := range awm.Modifiers {
		if mod.Type == modType {
			return true
		}
	}
	return false
}

// GetModifier returns the first modifier of a specific type
func (awm *AbilityWithModifiers) GetModifier(modType ModifierType) *Modifier {
	for _, mod := range awm.Modifiers {
		if mod.Type == modType {
			return mod
		}
	}
	return nil
}

// Predefined modifiers
func GetPetModifier() *Modifier {
	return &Modifier{
		Type:           ModifierPet,
		Name:           "Pet",
		MinionDuration: 30.0,
		CastInterval:   1.0,
		MinionCount:    1,
	}
}

func GetTurretModifier() *Modifier {
	return &Modifier{
		Type:           ModifierTurret,
		Name:           "Turret",
		MinionDuration: 20.0,
		CastInterval:   0.5,
		MinionCount:    1,
	}
}

func GetHomingModifier() *Modifier {
	return &Modifier{
		Type:     ModifierHoming,
		Name:     "Homing",
		TurnRate: 180.0, // 180 degrees per second
	}
}

func GetPiercingModifier() *Modifier {
	return &Modifier{
		Type:       ModifierPiercing,
		Name:       "Piercing",
		MaxPierces: 3, // Pierce through 3 enemies
	}
}

func GetChainModifier() *Modifier {
	return &Modifier{
		Type:         ModifierChain,
		Name:         "Chain",
		ChainRange:   10.0,
		MaxChains:    3,
		ChainDamping: 0.7, // 70% damage on each chain
	}
}

func GetSplitModifier() *Modifier {
	return &Modifier{
		Type:       ModifierSplit,
		Name:       "Split",
		SplitCount: 3,
		SplitAngle: 30.0, // 30 degree spread
	}
}
