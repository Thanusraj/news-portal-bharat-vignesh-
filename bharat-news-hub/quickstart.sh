#!/bin/bash

# IndicTrans2 High-Performance Translation Server - Quick Start
# ==============================================================
# This script sets up and starts the optimized translator server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  IndicTrans2 HIGH-PERFORMANCE Translation Server Setup         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Python version
echo -e "${YELLOW}[1/5]${NC} Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
if python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)' 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Python $PYTHON_VERSION"
else
    echo -e "${RED}✗${NC} Python 3.8+ required (found $PYTHON_VERSION)"
    exit 1
fi

# Create virtual environment
echo -e "${YELLOW}[2/5]${NC} Setting up virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓${NC} Virtual environment created"
else
    echo -e "${GREEN}✓${NC} Virtual environment exists"
fi

# Activate venv
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null || true

# Install dependencies
echo -e "${YELLOW}[3/5]${NC} Installing dependencies..."
pip install --upgrade pip setuptools wheel >/dev/null 2>&1
pip install -r requirements-translator-hpo.txt >/dev/null 2>&1
echo -e "${GREEN}✓${NC} Dependencies installed"

# Check for ONNX option
echo -e "${YELLOW}[4/5]${NC} Configuring ONNX (optional, HIGHLY recommended)..."

if [ ! -d "models/indictrans2-onnx" ]; then
    read -p "Convert model to ONNX for 30-40% speedup? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Installing onnxruntime and optimum...${NC}"
        pip install onnxruntime optimum >/dev/null 2>&1
        
        echo -e "${YELLOW}Converting model to ONNX (2-5 minutes)...${NC}"
        python3 convert_to_onnx.py \
            --model ai4bharat/indictrans2-en-indic-dist-200M \
            --output models/indictrans2-onnx
        
        export INDICTRANS_ONNX=1
        export INDICTRANS_ONNX_DIR="models/indictrans2-onnx"
        echo -e "${GREEN}✓${NC} ONNX conversion complete!"
    else
        echo -e "${YELLOW}Skipping ONNX (PyTorch will be used, slower)${NC}"
        export INDICTRANS_ONNX=0
    fi
else
    echo -e "${GREEN}✓${NC} ONNX model already available"
    export INDICTRANS_ONNX=1
    export INDICTRANS_ONNX_DIR="models/indictrans2-onnx"
fi

# Configuration
echo -e "${YELLOW}[5/5]${NC} Setting up configuration..."

# Detect CPU cores and set threads (N-1 to avoid overload)
CPU_COUNT=$(python3 -c 'import os; print(os.cpu_count() or 4)')
CPU_THREADS=$((CPU_COUNT > 1 ? CPU_COUNT - 1 : 1))

export INDICTRANS_CPU_THREADS=$CPU_THREADS
export INDICTRANS_CPU_BATCH_SIZE=16
export INDICTRANS_PERSISTENT_CACHE=1
export INDICTRANS_PERF_LOG=1

echo -e "${GREEN}✓${NC} Configuration:"
echo "  CPU threads: $CPU_THREADS"
echo "  Persistent cache: enabled"
echo "  Performance logging: enabled"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Setup Complete! Starting IndicTrans2 HPO Server...            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Server will be available at ${BLUE}http://localhost:8000${NC}"
echo ""
echo -e "Test translation:"
echo -e "  ${BLUE}curl -X POST http://localhost:8000/translate \\${NC}"
echo -e "    ${BLUE}-H 'Content-Type: application/json' \\${NC}"
echo -e "    ${BLUE}-d '{\"text_nodes\": [\"Hello world\"], \"target_lang\": \"hindi\"}'${NC}"
echo ""
echo -e "Run benchmarks:"
echo -e "  ${BLUE}python benchmark_translator.py${NC}"
echo ""
echo -e "Press Ctrl+C to stop the server"
echo ""

# Start server
python3 translator_api_optimized.py
