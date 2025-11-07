@echo off
REM Development setup script for Internship Aggregator (Windows)

echo 🚀 Setting up Internship Aggregator development environment...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ and try again.
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm and try again.
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install root dependencies
echo 📦 Installing root dependencies...
npm install

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
npm install
cd ..

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
npm install
cd ..

REM Copy environment file
echo 📝 Setting up environment variables...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo ✅ Created backend\.env from example
) else (
    echo ⚠️  backend\.env already exists, skipping...
)

REM Start Docker services
echo 🐳 Starting Docker services (PostgreSQL and Redis)...
docker-compose up -d postgres redis

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo.
echo 🎉 Development environment setup complete!
echo.
echo To start development:
echo   npm run dev              # Start both frontend and backend
echo   npm run dev:frontend     # Start only frontend
echo   npm run dev:backend      # Start only backend
echo.
echo Services:
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:3000
echo   Database:  postgresql://postgres:password@localhost:5432/internship_aggregator
echo   Redis:     redis://localhost:6379
echo.
echo Optional tools (run with --profile tools):
echo   docker-compose --profile tools up -d
echo   pgAdmin:   http://localhost:8080 (admin@example.com / admin)
echo   Redis UI:  http://localhost:8081