# Show this help message
help:
    @just --list

# Build the game server
build:
    cd server && go build -o bin/gameserver ./cmd/gameserver

# Run all tests
test:
    cd server && go test ./... -v -cover

# Run tests with coverage report
test-coverage:
    cd server && go test ./... -coverprofile=coverage.out
    cd server && go tool cover -html=coverage.out -o coverage.html

# Run the server locally
run:
    cd server && go run ./cmd/gameserver

# Start all services with Docker Compose
up:
    docker-compose -f server/docker-compose.yml up -d

# Start all services with Docker Compose (build first)
up-b:
    docker-compose -f server/docker-compose.yml up -d --build

# Stop all services
down:
    docker-compose -f server/docker-compose.yml down

# Stop all services and remove volumes
down-v:
    docker-compose -f server/docker-compose.yml down -v

# View logs from all services
logs:
    docker-compose -f server/docker-compose.yml logs -f

# Rebuild and restart services
rebuild:
    docker-compose -f server/docker-compose.yml up -d --build

# Clean build artifacts
clean:
    rm -rf server/bin/ server/tmp/ server/coverage.out server/coverage.html

# Download dependencies
deps:
    cd server && go mod download
    cd server && go mod tidy

# Run linter
lint:
    cd server && golangci-lint run

# Run database migrations
migrate-up:
    @echo "Running migrations..."
    # TODO: Add migration tool

# Rollback database migrations
migrate-down:
    @echo "Rolling back migrations..."
    # TODO: Add migration tool


# commit everything with an optional commit message
commit message='just commit':
    @echo "Committing changes..."
    git add .
    git commit -m "{{message}}"

# commit (if there are changes) and push everything with an optional commit message
push message='just push':
    @echo "Committing and pushing changes..."
    git add .
    git diff --cached --quiet || git commit -m "{{message}}"
    git push origin HEAD