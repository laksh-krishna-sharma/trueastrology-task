# Multi-Agent Chatbot Backend

A sophisticated chatbot application built with Next.js, featuring a supervisor-agent architecture, user authentication, persistent storage, and real-time chat capabilities.

## Features

- **Multi-Agent Architecture**: Supervisor agent routes queries to specialized agents (Tech, Math, General)
- **User Authentication**: JWT-based authentication with secure password hashing
- **Persistent Storage**: MongoDB for user data and chat history
- **Real-time Chat**: Streaming responses with Google Gemini AI
- **Caching**: Redis for fast chat history retrieval

## Prerequisites

- Node.js 18+ and Bun runtime
- MongoDB (local or Atlas)
- Redis (optional, for caching)

## Setup and Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd truastro-task
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Environment Setup

Copy the environment template and configure your variables:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) section below for configuration details.

### 4. Database Setup

**Push Database Schema**:
```bash
bunx prisma generate
bunx prisma db push
```

### 5. Run the Application

```bash
# Lint check
bun run lint

# Development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start
```

The application will be available at `http://localhost:3000` (or `http://localhost:3001` if port 3000 is busy).

## Project Structure

```
truastro-task/
├── prisma/
│   └── schema.prisma          # Database schema
├── public/                    # Static assets
├── src/
│   ├── agents/
│   │   └── langgraphFlow.ts   # Multi-agent orchestration
│   ├── generated/
│   │   └── prisma/            # Generated Prisma client
│   ├── lib/
│   │   ├── middleware.ts      # Authentication middleware
│   │   ├── prisma.ts          # Database client
│   │   ├── redis.ts           # Redis caching
│   ├── pages/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login.ts   # User login endpoint
│   │   │   │   └── register.ts # User registration endpoint
│   │   │   └── chat/
│   │   │       ├── chat.ts    # Chat interaction endpoint
│   │   │       └── history.ts # Chat history endpoint
│   │   └── index.tsx          # Main chat interface
├── .env                       # Environment variables
├── next.config.ts             # Next.js configuration
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="mongodb://localhost:27017/chatbot"
# For MongoDB Atlas: "mongodb+srv://username:password@cluster.mongodb.net/chatbot"

# AI Service
GEMINI_API_KEY="your_google_gemini_api_key"

# Authentication
JWT_SECRET="your_secure_jwt_secret_key"

# Caching (Optional)
REDIS_URL="redis://localhost:6379"
# For Redis Cloud: "redis://username:password@host:port"
```

## Architecture

### Multi-Agent System

The chatbot uses a **supervisor-agent pattern**:

1. **Supervisor Agent**: Analyzes user queries and routes to appropriate specialized agents
2. **Tech Agent**: Handles technology, programming, and development questions
3. **Math Agent**: Processes mathematical problems and calculations
4. **General Agent**: Handles general conversation and miscellaneous queries

![Agent Architecture](./public/agent.svg)

### Data Flow

```
User Query → Supervisor → Specialized Agent → Gemini AI → Response → Database
```

### Authentication Flow

```
Register/Login → JWT Token → Protected Routes → User-Specific Data
```

