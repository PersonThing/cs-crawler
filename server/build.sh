#!/bin/bash
# Build script for Linux/Mac - builds the game server

echo "Building CS Crawler Game Server..."

cd "$(dirname "$0")"

# Build the server (using pure Go SQLite, no CGO needed)
go build -o gameserver ./cmd/gameserver

if [ $? -eq 0 ]; then
    echo ""
    echo "Build successful! Server executable: gameserver"
    echo ""

    # Copy config directory if it doesn't exist or is empty
    if [ ! -d "config/shared" ]; then
        echo "Copying config files from parent directory..."
        if [ -d "../config" ]; then
            cp -r ../config ./config
            echo "Config files copied successfully"
        else
            echo "WARNING: Config directory not found in parent. Server may not start."
        fi
    fi

    echo ""
    echo "To run single-player mode:"
    echo "  ./gameserver -db-type sqlite"
    echo ""
    echo "To run with PostgreSQL:"
    echo "  ./gameserver -db-type postgres -db-host localhost -db-port 7001"
    echo ""
    chmod +x gameserver
else
    echo ""
    echo "Build failed!"
    exit 1
fi
