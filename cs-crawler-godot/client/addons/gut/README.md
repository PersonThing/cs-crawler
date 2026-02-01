# Gut Testing Framework

This directory contains the Gut (Godot Unit Test) framework.

## Installation

1. Download Gut from: https://github.com/bitwes/Gut
2. Extract to `addons/gut/`
3. Enable plugin in Godot: Project -> Project Settings -> Plugins -> Enable Gut

## Running Tests

### From Godot Editor
1. Open the bottom panel
2. Select "Gut" tab
3. Click "Run All"

### From Command Line
```bash
godot --path client -s addons/gut/gut_cmdln.gd -gtest=res://tests/
```

## Writing Tests

Create test scripts in `tests/` directory with prefix `test_`:

```gdscript
extends GutTest

func test_something():
    assert_eq(1 + 1, 2)

func test_signal_emission():
    var emitter = Node.new()
    watch_signals(emitter)
    emitter.emit_signal("some_signal")
    assert_signal_emitted(emitter, "some_signal")
```

## Gut Assertions

- `assert_true(value)` - Value is true
- `assert_false(value)` - Value is false
- `assert_eq(got, expected)` - Values are equal
- `assert_ne(got, expected)` - Values are not equal
- `assert_null(value)` - Value is null
- `assert_signal_emitted(object, signal_name)` - Signal was emitted
- And many more! See Gut documentation.

## Documentation

Full documentation: https://github.com/bitwes/Gut/wiki
