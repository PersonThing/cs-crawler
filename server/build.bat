@echo off
REM Build script for Windows - builds the game server

echo Building CS Crawler Game Server for Windows...

cd /d "%~dp0"

REM Build the server (using pure Go SQLite, no CGO needed)
go build -o gameserver.exe ./cmd/gameserver

if %errorlevel% equ 0 (
    echo.
    echo Build successful! Server executable: gameserver.exe
    echo.

    REM Copy config directory if it doesn't exist or is empty
    if not exist "config\shared" (
        echo Copying config files from parent directory...
        if exist "..\config" (
            xcopy /E /I /Y "..\config" "config" >nul
            echo Config files copied successfully
        ) else (
            echo WARNING: Config directory not found in parent. Server may not start.
        )
    )

    echo.
    echo To run single-player mode:
    echo   gameserver.exe -db-type sqlite
    echo.
    echo To run with PostgreSQL:
    echo   gameserver.exe -db-type postgres -db-host localhost -db-port 7001
    echo.
) else (
    echo.
    echo Build failed!
    exit /b 1
)
