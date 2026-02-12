# Skills & Modifier UI Redesign Plan

## Current Status

### Completed
- ✅ Health bar repositioned to bottom of character (y=-1.5 instead of y=4.5)
- ✅ Health bar increased to 3x size (3.6 x 0.45 units)
- ✅ Skill bar and modifier bar repositioned relative to health bar
- ✅ Data model changed from global modifiers to per-skill modifiers
- ✅ Modifier display shows count numbers (0-9) below each skill slot

### Data Structure
```gdscript
# Old system (global modifiers)
var active_modifiers: Array[String] = []

# New system (per-skill modifiers)
var skill_modifiers: Dictionary = {
    "lightning": [],        # Array of modifier types for this skill
    "basic_attack": [],
    "fireball": [],
    "frostbolt": []
}
```

## Remaining Work

### 1. Make Skill Slots Clickable
**Goal**: Allow clicking on action bar slots to open configuration widget

**Implementation Options**:
- **Option A**: Add Area3D with CollisionShape to each skill button
  - Create StaticBody3D for each button mesh
  - Add collision detection for mouse clicks
  - Use raycast from camera through mouse position

- **Option B**: Use viewport/camera projection
  - Project 3D button positions to 2D screen coordinates
  - Check if mouse click is within button bounds
  - Simpler but requires coordinate conversion

**Recommended**: Option A - More reliable for 3D UI elements

### 2. Create Skill Configuration Widget
**Goal**: Clean, modern widget for selecting skills and modifiers

**Design Requirements** (from user sketch):
- Appears when clicking a skill slot
- Shows available skills to choose from
- Shows available modifiers with checkboxes/toggles
- Shows count of active modifiers
- Has close button (X) in corner
- Closes when clicking outside widget
- Clean/sleek/modern/simple aesthetic

**Widget Structure**:
```
┌─────────────────────────────┐
│ Configure Slot 1        [X] │
├─────────────────────────────┤
│ Skill:                      │
│  ○ Fireball                 │
│  ● Frostbolt (selected)     │
│  ○ Lightning                │
│  ○ Basic Attack             │
├─────────────────────────────┤
│ Modifiers:                  │
│  ☑ Homing                   │
│  ☑ Piercing                 │
│  ☐ Pet                      │
│  ☑ Turret                   │
│                             │
│ Active: 3 modifiers         │
└─────────────────────────────┘
```

**Implementation Steps**:
1. Create Panel container (Control node)
2. Add VBoxContainer for layout
3. Create header with slot name and close button
4. Add skill selection radio buttons
5. Add modifier checkboxes
6. Style with modern theme
7. Add input handling for close-on-click-outside

**Styling**:
- Background: Semi-transparent dark panel (0.2, 0.2, 0.2, 0.85)
- Border: Subtle light border (0.4, 0.4, 0.4, 1.0)
- Rounded corners: 8px
- Padding: 16px
- Font: Clean sans-serif, size 14-16
- Colors: White text, blue highlights for selection
- Close button: Red X in top-right

### 3. Update Server Communication
**Goal**: Send per-skill modifier data to server

**Current System**:
```json
{
    "type": "set_modifier",
    "modifierType": "homing",
    "enabled": true
}
```

**New System**:
```json
{
    "type": "set_skill_config",
    "slot": 0,  // 0-3 for the 4 slots
    "abilityType": "fireball",
    "modifiers": ["homing", "piercing", "turret"]
}
```

**Server Changes Needed**:
- Add `handleSetSkillConfig` message handler
- Store per-player skill configurations
- Apply modifiers when ability is used based on slot config
- Send skill config to client on join

### 4. Update Ability Usage
**Goal**: Apply per-skill modifiers when casting

**Current**: Modifiers applied globally to all abilities
**New**: Modifiers applied based on which skill slot is used

**Changes**:
- When using ability from slot 0-3, look up that slot's modifiers
- Apply only those modifiers to the projectile/effect
- Update `use_ability` message to include slot index

### 5. Persistence
**Goal**: Save skill configurations between sessions

**Options**:
- Save to player profile in database
- Save to local config file
- Send with player state on world join

**Recommended**: Player profile in database for cross-device persistence

## Visual Layout (Final)

```
┌──────────────────────────────────────┐
│           [Character]                │
│                                      │
│    ━━━━━━━━━━━━━━━━━━━━━━          │ <- Health bar (3x bigger)
│    [1] [2] [3] [4]                   │ <- Skill slots
│     4   2   0   3                    │ <- Modifier counts
└──────────────────────────────────────┘
```

## Implementation Order

1. **Phase 1**: Clean up old modifier system code
   - Remove `active_modifiers` references
   - Update/remove old modifier handlers
   - Test that basic UI displays correctly

2. **Phase 2**: Add click detection to skill slots
   - Implement Area3D collision detection
   - Add input handling for clicks
   - Add visual feedback on hover/click

3. **Phase 3**: Create configuration widget
   - Build UI panel structure
   - Add skill selection radio buttons
   - Add modifier checkboxes
   - Implement close functionality

4. **Phase 4**: Wire up functionality
   - Connect widget to skill_modifiers data
   - Update modifier counts on change
   - Send config to server

5. **Phase 5**: Server integration
   - Add server-side skill config storage
   - Apply modifiers based on slot used
   - Add persistence

## Testing Checklist

- [ ] Health bar displays at bottom of character
- [ ] Health bar is 3x original size
- [ ] Modifier counts show correctly (0-9)
- [ ] Clicking skill slot opens config widget
- [ ] Can select different skills per slot
- [ ] Can toggle modifiers per slot
- [ ] Modifier count updates when toggling
- [ ] Widget closes on X button click
- [ ] Widget closes on click outside
- [ ] Config persists when changing slots
- [ ] Config sent to server correctly
- [ ] Modifiers applied correctly when using ability
- [ ] Config persists between sessions

## Future Enhancements

- Drag-and-drop to reorder slots
- Skill cooldown visualization
- Modifier preview tooltips
- Modifier unlock progression
- Hotkeys to open specific slot config
- Multiple loadouts/builds
