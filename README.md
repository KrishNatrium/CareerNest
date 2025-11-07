# Internship Aggregator

A web platform that consolidates internship opportunities from multiple sources (Internshala, LinkedIn, etc.) into a single searchable interface.

## Project Structure

```
internship-aggregator/
├── frontend/          # React TypeScript frontend with Vite
├── backend/           # Node.js TypeScript backend with Express
├── docker-compose.yml # Local development environment
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose

### Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development environment:
```bash
docker-compose up -d  # Start PostgreSQL and Redis
npm run dev           # Start both frontend and backend
```

3. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications for production
- `npm run lint` - Run linting for both applications
- `npm run format` - Format code for both applications

## Architecture

The application follows a monorepo structure with:
- **Frontend**: React 18 with TypeScript, Vite, and Material-UI
- **Backend**: Node.js with Express, TypeScript, and PostgreSQL
- **Database**: PostgreSQL for primary data, Redis for caching
- **Infrastructure**: Docker Compose for local development