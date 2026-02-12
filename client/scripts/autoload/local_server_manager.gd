extends Node
## Local Server Manager
## Manages the lifecycle of a local Go server instance for single-player mode

signal server_started()
signal server_stopped()
signal server_error(error: String)

enum ServerMode {
	NONE,           # No local server running
	STARTING,       # Server is being started
	RUNNING,        # Server is running
	STOPPING        # Server is being stopped
}

const LOCAL_SERVER_PORT = 7000
const SERVER_STARTUP_TIMEOUT = 10.0  # seconds
const SERVER_EXECUTABLE_PATHS = [
	"../server/gameserver.exe",          # Windows build
	"../server/gameserver",              # Linux/Mac build
	"../../server/gameserver.exe",       # Alternative Windows path
	"../../server/gameserver",           # Alternative Linux/Mac path
]

var _server_mode: ServerMode = ServerMode.NONE
var _server_process: int = -1
var _startup_timer: float = 0.0
var _check_connection_timer: float = 0.0

func _ready() -> void:
	print("[LocalServerManager] Initialized")
	set_process(false)

func get_server_mode() -> ServerMode:
	return _server_mode

func is_server_running() -> bool:
	return _server_mode == ServerMode.RUNNING

## Start a local server instance
func start_local_server() -> void:
	if _server_mode != ServerMode.NONE:
		push_warning("[LocalServerManager] Server already running or starting")
		return

	print("[LocalServerManager] Starting local server...")
	_server_mode = ServerMode.STARTING
	_startup_timer = 0.0
	_check_connection_timer = 0.0

	# Find the server executable
	var server_path = _find_server_executable()
	if server_path.is_empty():
		_handle_server_error("Could not find server executable. Please build the server first.")
		return

	print("[LocalServerManager] Found server at: ", server_path)

	# Server needs to run from its directory to find ./config
	var server_dir = server_path.get_base_dir()

	# Ensure data directory exists for SQLite database
	var data_dir = server_dir.path_join("data")
	if not DirAccess.dir_exists_absolute(data_dir):
		DirAccess.make_dir_absolute(data_dir)
		print("[LocalServerManager] Created data directory: ", data_dir)

	# Check if config directory exists in server directory
	# If not, we need to link/copy from parent directory
	var server_config_dir = server_dir.path_join("config")
	var project_config_dir = server_dir.get_base_dir().path_join("config")

	# Check if project config exists
	if not DirAccess.dir_exists_absolute(project_config_dir):
		_handle_server_error("Config directory not found. Please ensure config/ exists in project root with game data files.")
		return

	# Check if server/config has the required files
	var has_config_files = false
	if DirAccess.dir_exists_absolute(server_config_dir):
		var shared_dir = server_config_dir.path_join("shared")
		has_config_files = DirAccess.dir_exists_absolute(shared_dir)

	# If server/config is empty or missing files, create symlink
	if not has_config_files:
		print("[LocalServerManager] Setting up config directory symlink...")

		# Remove empty config directory if it exists
		if DirAccess.dir_exists_absolute(server_config_dir):
			DirAccess.remove_absolute(server_config_dir)

		# On Windows, we'll need to copy instead of symlink (requires admin for symlinks)
		# On Linux/Mac, we can use symlink
		var os_name = OS.get_name()
		if os_name == "Windows":
			# Copy the config directory instead
			if not _copy_directory_recursive(project_config_dir, server_config_dir):
				_handle_server_error("Failed to copy config directory to server folder.")
				return
			print("[LocalServerManager] Copied config directory to server folder")
		else:
			# Create symlink on Linux/Mac
			var result = OS.execute("ln", ["-sf", project_config_dir, server_config_dir], [], true)
			if result != 0:
				_handle_server_error("Failed to create config symlink. Error code: " + str(result))
				return
			print("[LocalServerManager] Created config symlink")

	# Build absolute paths for database
	var db_file = data_dir.path_join("players.db")

	# Build the command arguments for the server with SQLite
	var args = [
		"-addr", ":7000",
		"-tick-rate", "60",
		"-db-type", "sqlite",
		"-db-file", db_file,
	]

	print("[LocalServerManager] Starting server from: ", server_dir)
	print("[LocalServerManager] Config directory: ", server_config_dir)
	print("[LocalServerManager] Database file: ", db_file)

	# On Windows, we need to use cmd /c to run the executable
	# This ensures the working directory is set correctly
	var os_name = OS.get_name()
	var pid = -1

	if os_name == "Windows":
		# Use cmd to change directory and run
		var batch_cmd = 'cd /d "' + server_dir + '" && "' + server_path + '" ' + " ".join(args)
		pid = OS.create_process("cmd.exe", ["/c", batch_cmd])
	else:
		# On Linux/Mac, we need to change the working directory before running
		# Unfortunately, OS.create_process doesn't have a working directory parameter
		# So we create a temporary shell script
		var shell_script = server_dir.path_join("run_server.sh")
		var file = FileAccess.open(shell_script, FileAccess.WRITE)
		if file:
			file.store_string("#!/bin/bash\ncd \"" + server_dir + "\"\nexec \"" + server_path + "\" " + " ".join(args) + "\n")
			file.close()
			# Make executable
			OS.execute("chmod", ["+x", shell_script], [], true)
			pid = OS.create_process(shell_script, [])
		else:
			_handle_server_error("Failed to create launch script")
			return

	# Start the server process in the background
	# var pid = OS.create_process(server_path, args)

	if pid == -1:
		_handle_server_error("Failed to start server process")
		return

	print("[LocalServerManager] Server process started with PID: ", pid)
	_server_process = pid

	# Start polling for server readiness
	set_process(true)

## Stop the local server instance
func stop_local_server() -> void:
	if _server_mode == ServerMode.NONE:
		return

	print("[LocalServerManager] Stopping local server...")
	_server_mode = ServerMode.STOPPING

	# Try graceful shutdown via HTTP request (if your server supports it)
	# Otherwise, we'll need to kill the process
	_kill_server_process()

	_server_mode = ServerMode.NONE
	_server_process = -1
	set_process(false)
	server_stopped.emit()
	print("[LocalServerManager] Server stopped")

func _kill_server_process() -> void:
	# On Windows, use taskkill
	# On Linux/Mac, use pkill or kill
	var os_name = OS.get_name()

	if os_name == "Windows":
		# Kill all gameserver.exe processes
		OS.execute("taskkill", ["/F", "/IM", "gameserver.exe"], [], true)
	else:
		# Kill by process name
		OS.execute("pkill", ["-f", "gameserver"], [], true)

func _find_server_executable() -> String:
	# Get the executable directory
	var exe_dir = OS.get_executable_path().get_base_dir()

	# Try each potential path
	for rel_path in SERVER_EXECUTABLE_PATHS:
		var full_path = exe_dir.path_join(rel_path)
		if FileAccess.file_exists(full_path):
			return full_path

	# Also try from the project root
	var project_dir = ProjectSettings.globalize_path("res://")
	for rel_path in SERVER_EXECUTABLE_PATHS:
		var full_path = project_dir.get_base_dir().path_join(rel_path)
		if FileAccess.file_exists(full_path):
			return full_path

	return ""

func _process(delta: float) -> void:
	if _server_mode == ServerMode.STARTING:
		_startup_timer += delta
		_check_connection_timer += delta

		# Check if server is ready every 0.5 seconds
		if _check_connection_timer >= 0.5:
			_check_connection_timer = 0.0
			_check_server_ready()

		# Timeout after SERVER_STARTUP_TIMEOUT seconds
		if _startup_timer >= SERVER_STARTUP_TIMEOUT:
			_handle_server_error("Server startup timed out")

func _check_server_ready() -> void:
	# Try to connect to the server's health endpoint or WebSocket
	var http = HTTPRequest.new()
	add_child(http)

	# Try a simple HTTP request to the server
	var url = "http://localhost:" + str(LOCAL_SERVER_PORT) + "/health"
	http.request_completed.connect(_on_health_check_completed.bind(http))
	var err = http.request(url)

	if err != OK:
		# Server might not have /health endpoint, try WebSocket instead
		http.queue_free()
		_try_websocket_connection()

func _on_health_check_completed(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()

	if response_code == 200 or response_code == 404:
		# Server is responding (404 is fine, means server is up but no /health endpoint)
		_server_mode = ServerMode.RUNNING
		set_process(false)
		server_started.emit()
		print("[LocalServerManager] Server is ready!")

func _try_websocket_connection() -> void:
	# Alternative: try connecting via WebSocket to verify server is up
	# For simplicity, we'll assume the server is ready after a short delay
	# In production, you'd want to actually test the WebSocket connection
	pass

func _handle_server_error(error_msg: String) -> void:
	push_error("[LocalServerManager] " + error_msg)
	_server_mode = ServerMode.NONE
	set_process(false)
	server_error.emit(error_msg)

	# Clean up any running processes
	_kill_server_process()

func _copy_directory_recursive(src_dir: String, dst_dir: String) -> bool:
	# Create destination directory
	if DirAccess.make_dir_recursive_absolute(dst_dir) != OK:
		return false

	var dir = DirAccess.open(src_dir)
	if not dir:
		return false

	dir.list_dir_begin()
	var file_name = dir.get_next()

	while file_name != "":
		if file_name == "." or file_name == "..":
			file_name = dir.get_next()
			continue

		var src_path = src_dir.path_join(file_name)
		var dst_path = dst_dir.path_join(file_name)

		if dir.current_is_dir():
			# Recursively copy subdirectory
			if not _copy_directory_recursive(src_path, dst_path):
				return false
		else:
			# Copy file
			if DirAccess.copy_absolute(src_path, dst_path) != OK:
				push_error("[LocalServerManager] Failed to copy: " + src_path)
				return false

		file_name = dir.get_next()

	dir.list_dir_end()
	return true

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_PREDELETE:
		# Clean up when the game exits
		stop_local_server()
