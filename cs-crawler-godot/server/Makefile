.PHONY: help build test run docker-up docker-down docker-logs clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the game server
	go build -o bin/gameserver ./cmd/gameserver

test: ## Run all tests
	go test ./... -v -cover

test-coverage: ## Run tests with coverage report
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html

run: ## Run the server locally
	go run ./cmd/gameserver

up: ## Start all services with Docker Compose
	docker-compose up -d

up-b: ## Start all services with Docker Compose (build first)
	docker-compose up -d --build

down: ## Stop all services
	docker-compose down

down-v: ## Stop all services and remove volumes
	docker-compose down -v

logs: ## View logs from all services
	docker-compose logs -f

rebuild: ## Rebuild and restart services
	docker-compose up -d --build

clean: ## Clean build artifacts
	rm -rf bin/ tmp/ coverage.out coverage.html

deps: ## Download dependencies
	go mod download
	go mod tidy

lint: ## Run linter
	golangci-lint run

migrate-up: ## Run database migrations
	@echo "Running migrations..."
	# TODO: Add migration tool

migrate-down: ## Rollback database migrations
	@echo "Rolling back migrations..."
	# TODO: Add migration tool
