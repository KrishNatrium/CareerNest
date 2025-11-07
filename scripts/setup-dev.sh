#!/bin/bash

# Development setup script for Internship Aggregator

echo "🚀 Setting up Internship Aggregator development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# Copy environment file
echo "📝 Setting up environment variables..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from example"
else
    echo "⚠️  backend/.env already exists, skipping..."
fi

# Start Docker services
echo "🐳 Starting Docker services (PostgreSQL and Redis)..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are healthy
if docker-compose ps | grep -q "healthy"; then
    echo "✅ Services are healthy and ready"
else
    echo "⚠️  Services might still be starting up. Check with 'docker-compose ps'"
fi

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "To start development:"
echo "  npm run dev              # Start both frontend and backend"
echo "  npm run dev:frontend     # Start only frontend"
echo "  npm run dev:backend      # Start only backend"
echo ""
echo "Services:"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:3000"
echo "  Database:  postgresql://postgres:password@localhost:5432/internship_aggregator"
echo "  Redis:     redis://localhost:6379"
echo ""
echo "Optional tools (run with --profile tools):"
echo "  docker-compose --profile tools up -d"
echo "  pgAdmin:   http://localhost:8080 (admin@example.com / admin)"
echo "  Redis UI:  http://localhost:8081"