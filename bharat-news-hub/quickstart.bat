@echo off
REM IndicTrans2 High-Performance Translation Server - Quick Start (Windows)
REM ======================================================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║  IndicTrans2 HIGH-PERFORMANCE Translation Server Setup         ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check for Python
echo [1/5] Checking Python version...
python --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Python not found! Install from https://www.python.org/
    exit /b 1
)
python --version
echo ✓ Python found
echo.

REM Create virtual environment
echo [2/5] Setting up virtual environment...
if not exist "venv" (
    python -m venv venv
    echo ✓ Virtual environment created
) else (
    echo ✓ Virtual environment exists
)
echo.

REM Activate venv
call venv\Scripts\activate.bat

REM Install dependencies
echo [3/5] Installing dependencies...
python -m pip install --upgrade pip setuptools wheel >nul 2>&1
pip install -r requirements-translator-hpo.txt >nul 2>&1
if errorlevel 1 (
    echo ✗ Failed to install dependencies
    exit /b 1
)
echo ✓ Dependencies installed
echo.

REM Optional ONNX setup
echo [4/5] Configuring ONNX conversion (optional, HIGHLY recommended)...
if not exist "models\indictrans2-onnx" (
    set /p CONVERT_ONNX="Convert model to ONNX for 30-40%% speedup? (y/n): "
    if /i "!CONVERT_ONNX!"=="y" (
        echo Installing onnxruntime and optimum...
        pip install onnxruntime optimum >nul 2>&1
        
        echo Converting model to ONNX (2-5 minutes)...
        python convert_to_onnx.py ^
            --model ai4bharat/indictrans2-en-indic-dist-200M ^
            --output models/indictrans2-onnx
        
        set INDICTRANS_ONNX=1
        set INDICTRANS_ONNX_DIR=models/indictrans2-onnx
        echo ✓ ONNX conversion complete!
    ) else (
        echo Skipping ONNX (PyTorch will be used, slower)
        set INDICTRANS_ONNX=0
    )
) else (
    echo ✓ ONNX model already available
    set INDICTRANS_ONNX=1
    set INDICTRANS_ONNX_DIR=models/indictrans2-onnx
)
echo.

REM Configuration
echo [5/5] Setting up configuration...
set INDICTRANS_CPU_BATCH_SIZE=16
set INDICTRANS_PERSISTENT_CACHE=1
set INDICTRANS_PERF_LOG=1
echo ✓ Configuration:
echo   Persistent cache: enabled
echo   Performance logging: enabled
if "!INDICTRANS_ONNX!"=="1" (
    echo   ONNX: enabled
) else (
    echo   ONNX: disabled
)
echo.

echo ╔════════════════════════════════════════════════════════════════╗
echo ║  Setup Complete! Starting IndicTrans2 HPO Server...            ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Server will be available at http://localhost:8000
echo.
echo Test translation:
echo   curl -X POST http://localhost:8000/translate ^^
echo     -H "Content-Type: application/json" ^^
echo     -d "{\"text_nodes\": [\"Hello world\"], \"target_lang\": \"hindi\"}"
echo.
echo Run benchmarks:
echo   python benchmark_translator.py
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start server
python translator_api_optimized.py

pause
