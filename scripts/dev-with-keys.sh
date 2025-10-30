#!/bin/bash

# ============================================================================
# InnPilot Development Server with API Keys
# ============================================================================
# Robust script that:
# - Cleans up any existing processes before starting
# - Exports required API keys
# - Handles graceful shutdown on Ctrl+C
# - Provides clear status messages
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PORT=3000
SERVER_PID=""

# ============================================================================
# Cleanup Function
# ============================================================================
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down development server...${NC}"

    # Kill the main process if running
    if [ ! -z "$SERVER_PID" ]; then
        echo -e "${BLUE}   Killing server process (PID: $SERVER_PID)${NC}"
        kill $SERVER_PID 2>/dev/null || true
    fi

    # Clean up any remaining processes
    echo -e "${BLUE}   Cleaning up Next.js processes...${NC}"
    pkill -f 'next dev' 2>/dev/null || true
    pkill -f 'node.*next' 2>/dev/null || true

    # Clean up port
    echo -e "${BLUE}   Freeing port $PORT...${NC}"
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true

    echo -e "${GREEN}✅ Cleanup complete${NC}"
    exit 0
}

# Register cleanup function for various exit signals
trap cleanup SIGINT SIGTERM EXIT

# ============================================================================
# Pre-flight Cleanup
# ============================================================================
echo -e "${BLUE}🧹 Pre-flight cleanup...${NC}"

# Check for existing processes on port
EXISTING_PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
if [ ! -z "$EXISTING_PIDS" ]; then
    echo -e "${YELLOW}   Found existing processes on port $PORT: $EXISTING_PIDS${NC}"
    echo -e "${BLUE}   Killing processes...${NC}"
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Kill any orphaned Next.js processes
NEXT_PROCESSES=$(pgrep -f 'next dev' 2>/dev/null || true)
if [ ! -z "$NEXT_PROCESSES" ]; then
    echo -e "${YELLOW}   Found orphaned Next.js processes: $NEXT_PROCESSES${NC}"
    echo -e "${BLUE}   Cleaning up...${NC}"
    pkill -f 'next dev' 2>/dev/null || true
    pkill -f 'node.*next' 2>/dev/null || true
    sleep 1
fi

# Verify port is free
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}❌ Error: Port $PORT is still occupied after cleanup${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Port $PORT is free${NC}"
fi

# ============================================================================
# API Keys Setup
# ============================================================================
echo ""
echo -e "${BLUE}🔑 Setting up API keys from .env.local...${NC}"

# Source API keys from .env.local
if [ -f .env.local ]; then
    # Export only the API key variables we need
    export $(grep -v '^#' .env.local | grep -E '^(OPENAI_API_KEY|ANTHROPIC_API_KEY)=' | xargs)

    if [ -z "$OPENAI_API_KEY" ]; then
        echo -e "${RED}   ❌ OPENAI_API_KEY not found in .env.local${NC}"
        exit 1
    fi

    if [ -z "$ANTHROPIC_API_KEY" ]; then
        echo -e "${RED}   ❌ ANTHROPIC_API_KEY not found in .env.local${NC}"
        exit 1
    fi

    echo -e "${GREEN}   ✅ OPENAI_API_KEY:    ${OPENAI_API_KEY:0:20}...${OPENAI_API_KEY: -4}${NC}"
    echo -e "${GREEN}   ✅ ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:0:20}...${ANTHROPIC_API_KEY: -4}${NC}"
else
    echo -e "${RED}   ❌ Error: .env.local file not found${NC}"
    echo -e "${YELLOW}   Please create .env.local with OPENAI_API_KEY and ANTHROPIC_API_KEY${NC}"
    exit 1
fi

# ============================================================================
# Start Development Server
# ============================================================================
echo ""
echo -e "${GREEN}🚀 Starting MUVA.CHAT development server...${NC}"
echo -e "${BLUE}   Port: $PORT${NC}"
echo -e "${BLUE}   Press Ctrl+C to stop${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start the server and capture its PID
pnpm run dev &
SERVER_PID=$!

# Wait for the server process
wait $SERVER_PID
