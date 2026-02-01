# CryptoGuard - Detailed Setup Guide

Complete step-by-step setup instructions for the entire CryptoGuard monorepo.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Setup](#repository-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Running Services](#running-services)
8. [Verification](#verification)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **OS**: Windows, macOS, or Linux
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: 2GB free space

### Required Software

#### 1. Git

```bash
# Check if installed
git --version

# Install if needed
# Windows: https://git-scm.com/download/win
# macOS: brew install git
# Linux: sudo apt-get install git
```

#### 2. Python 3.8+

```bash
# Check if installed
python --version
# Should output Python 3.8 or higher

# Install if needed
# Windows: https://www.python.org/downloads/
# macOS: brew install python
# Linux: sudo apt-get install python3
```

#### 3. Node.js 18+ and npm 9+

```bash
# Check Node version
node --version
# Should output v18.0.0 or higher

# Check npm version
npm --version
# Should output 9.0.0 or higher

# Install if needed
# Windows/macOS: https://nodejs.org/
# Linux: sudo apt-get install nodejs npm

# Update npm if needed
npm install -g npm@latest
```

#### 4. MetaMask Browser Extension (for frontend testing)

- Download from: https://metamask.io/
- Install in your browser (Chrome, Firefox, Edge, Brave)

### Optional but Recommended

- **PostgreSQL Client**: For database management

  ```bash
  # macOS
  brew install postgresql

  # Windows: Download from https://www.postgresql.org/download/windows/
  # Linux
  sudo apt-get install postgresql-client
  ```

- **VSCode**: Code editor
  - Download: https://code.visualstudio.com/
  - Extensions: Python, ES7+ React/Redux/React-Native snippets

---

## Repository Setup

### 1. Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/yourusername/CryptoGuard.git
cd CryptoGuard

# Or if you've already cloned it, navigate to it
cd /path/to/CryptoGuard
```

### 2. Verify Repository Structure

```bash
# Verify main directories exist
ls -la
# Should show: backend/, frontend/, .git/, README.md, etc.

# Verify backend
ls backend/
# Should show: app.py, requirements.txt, models/, data/, utils/, etc.

# Verify frontend
ls frontend/
# Should show: package.json, src/, public/, etc.
```

### 3. Initialize Git (if starting fresh)

```bash
# Check if git is initialized
git status

# If not initialized, initialize
git init
git add .
git commit -m "Initial commit: CryptoGuard monorepo"
```

---

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Create Python Virtual Environment

**On Windows (PowerShell):**

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```

**On Windows (Command Prompt):**

```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**On macOS/Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` prefix in your terminal.

### Step 3: Upgrade pip

```bash
pip install --upgrade pip
```

### Step 4: Install Dependencies

```bash
pip install -r requirements.txt
```

**Expected packages** (from requirements.txt):

- Flask or FastAPI (web framework)
- pandas, numpy (data processing)
- scikit-learn (ML utilities)
- catboost, lightgbm, xgboost (models)
- joblib (model serialization)
- python-dotenv (environment variables)
- requests (HTTP client)
- google-generativeai (Gemini API)

### Step 5: Verify Installation

```bash
# Check Python version
python --version

# Test imports
python -c "import pandas; import numpy; import sklearn; print('✓ Data science packages OK')"
python -c "import catboost; import lightgbm; import xgboost; print('✓ ML models OK')"
python -c "import flask; print('✓ Flask OK')"
# OR
python -c "import fastapi; print('✓ FastAPI OK')"
```

All imports should succeed without errors.

### Step 6: Verify Model Files

```bash
# Check if models exist
ls models/

# Expected files:
# - CatBoost.joblib
# - LightGBM.joblib
# - LogisticRegression.joblib
# - RandomForest.joblib
# - XGBoost.joblib
# - scaler.pkl (if exists)
```

If models are missing, they may need to be trained first or downloaded from a shared location.

### Step 7: Create Backend Environment File

Create `.env` file in `backend/` directory:

```bash
# Create file
touch .env  # On Windows: New-Item -Path .env -Type File
```

Edit `.env` and add:

```env
# Flask Configuration
FLASK_ENV=development
FLASK_APP=app.py
API_PORT=5000

# Machine Learning
MODEL_PATH=./models
SCALER_PATH=./models/scaler.pkl

# API Keys
GEMINI_API_KEY=your-gemini-api-key-here

# Optional: Database
DATABASE_URL=postgresql://user:password@localhost:5432/cryptoguard

# Optional: Blockchain RPC
WEB3_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Logging
LOG_LEVEL=INFO
```

**Important**: Don't commit `.env` files to Git!

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory

```bash
# From project root
cd frontend

# Or from anywhere
cd /path/to/CryptoGuard/frontend
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
```

This installs all packages listed in `package.json`:

- next (React framework)
- react, react-dom (React library)
- typescript (type checking)
- tailwindcss (styling)
- ethers (Web3)
- jose (JWT)
- and many others

**Expected time**: 2-5 minutes depending on internet speed

### Step 3: Verify Installation

```bash
# Check Node version
node --version
# Should show v18+

# Check npm version
npm --version
# Should show 9+

# Check Next.js installation
npx next --version
```

All should succeed without errors.

### Step 4: Create Frontend Environment File

Create `.env.local` file in `frontend/` directory:

```bash
# Create file
touch .env.local  # On Windows: New-Item -Path .env.local -Type File
```

Edit `.env.local` and add:

```env
# Authentication Secret (CHANGE THIS IN PRODUCTION!)
# Generate with: openssl rand -base64 32
JWT_SECRET=your-secret-key-generate-with-openssl-rand-base64-32

# Admin Credentials
ADMIN_EMAIL=admin@cryptoguard.io
ADMIN_PASSWORD=admin123

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Network Configuration (1 = mainnet, 5 = goerli)
NEXT_PUBLIC_NETWORK_ID=1

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

**Important**:

- Never commit `.env.local` to version control
- Change `JWT_SECRET` in production!
- Change `ADMIN_PASSWORD` in production!

### Step 5: Generate JWT Secret

```bash
# On macOS/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}) -as [byte[]])

# Copy the output and paste into NEXT_PUBLIC_JWT_SECRET in .env.local
```

### Step 6: Verify Build

```bash
# Test build (optional but recommended)
npm run build

# This compiles TypeScript and Next.js
# Should complete without errors
# If successful, you'll see: ✓ Compiled successfully
```

---

## Environment Configuration

### Backend Environment Variables

Create or edit `backend/.env`:

```env
# === APPLICATION ===
FLASK_ENV=development          # development | production
API_PORT=5000                  # Port to run on
LOG_LEVEL=INFO                 # DEBUG | INFO | WARNING | ERROR

# === ML MODELS ===
MODEL_PATH=./models            # Path to model files
SCALER_PATH=./models/scaler.pkl # Feature scaler path

# === EXTERNAL APIS ===
GEMINI_API_KEY=sk-...          # Get from https://makersuite.google.com/
WEB3_RPC_URL=https://eth-...   # Ethereum RPC endpoint

# === DATABASE (Optional) ===
DATABASE_URL=postgresql://user:pass@localhost:5432/cryptoguard
DATABASE_ECHO=false            # Set to true for SQL logging

# === BLOCKCHAIN ===
NETWORK_ID=1                   # 1 = mainnet, 5 = goerli
NETWORK_NAME=ethereum          # For display
```

### Frontend Environment Variables

Create or edit `frontend/.env.local`:

```env
# === AUTHENTICATION ===
JWT_SECRET=generated-secret-key-here
JWT_EXPIRATION=86400           # 24 hours in seconds

# === ADMIN CREDENTIALS ===
ADMIN_EMAIL=admin@cryptoguard.io
ADMIN_PASSWORD=your-strong-password

# === API CONFIGURATION ===
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_API_TIMEOUT=30000  # 30 seconds

# === BLOCKCHAIN ===
NEXT_PUBLIC_NETWORK_ID=1
NEXT_PUBLIC_NETWORK_NAME=Ethereum

# === FEATURES ===
NEXT_PUBLIC_ENABLE_3D_VIZ=true
NEXT_PUBLIC_ENABLE_GNN=true

# === MONITORING ===
NEXT_PUBLIC_GA_ID=                    # Optional: Google Analytics
NEXT_PUBLIC_SENTRY_DSN=              # Optional: Error tracking
```

### Environment Best Practices

```bash
# 1. Never commit .env files
git add .gitignore  # Make sure it includes .env, .env.local

# 2. Create .env.example as template
cp backend/.env backend/.env.example
cp frontend/.env.local frontend/.env.example
# Remove sensitive values from examples

# 3. Use different secrets for different environments
# Development: Use simple test values
# Staging: Use real test API keys
# Production: Use secure, rotated secrets

# 4. Rotate secrets regularly
# Generate new JWT_SECRET every 3 months
# Update API keys when providers rotate them
```

---

## Database Setup (Optional)

### PostgreSQL Installation

**macOS:**

```bash
brew install postgresql
brew services start postgresql
createuser cryptoguard -P  # Enter password when prompted
createdb -O cryptoguard cryptoguard
```

**Windows:**

1. Download from: https://www.postgresql.org/download/windows/
2. Run installer
3. Remember the password for postgres user
4. Open pgAdmin or psql

**Linux:**

```bash
sudo apt-get install postgresql
sudo -u postgres createuser cryptoguard -P
sudo -u postgres createdb -O cryptoguard cryptoguard
```

### Initialize Database

```bash
# Connect to database
psql -U cryptoguard -d cryptoguard

# Create tables (paste from backend/data-pipeline/data/create_database.sql)
\i /path/to/backend/data-pipeline/data/create_database.sql

# Verify tables created
\dt

# Exit
\q
```

### Connection String

In `backend/.env`:

```env
DATABASE_URL=postgresql://cryptoguard:your_password@localhost:5432/cryptoguard
```

---

## Running Services

### Option 1: Run in Separate Terminals (Recommended for Development)

**Terminal 1 - Backend:**

```bash
cd /path/to/CryptoGuard/backend

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

# Run Flask app
python app.py

# Should output:
# * Serving Flask app
# * Running on http://127.0.0.1:5000
```

**Terminal 2 - Frontend:**

```bash
cd /path/to/CryptoGuard/frontend

# Run Next.js dev server
npm run dev

# Should output:
# ▲ Next.js 14.0.0
# - Local: http://localhost:3000
# - Environments: .env.local
```

**Terminal 3 - (Optional) Data Pipeline:**

```bash
cd /path/to/CryptoGuard/backend/data-pipeline/processor

npm install  # If not already done
npm run dev
```

### Option 2: Run with Docker (Production-like)

```bash
# Build images
docker build -t cryptoguard-backend ./backend
docker build -t cryptoguard-frontend ./frontend

# Run containers
docker run -p 5000:5000 cryptoguard-backend
docker run -p 3000:3000 cryptoguard-frontend
```

---

## Verification

### Backend Verification

```bash
# 1. Check if server is running
curl http://localhost:5000/health

# Should return: {"status": "ok"}

# 2. Test prediction endpoint
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "features": [1.0, 2.0, 3.0, ...]
  }'

# 3. Check if models are loaded
python -c "import joblib; m = joblib.load('models/CatBoost.joblib'); print('✓ CatBoost loaded')"
```

### Frontend Verification

```bash
# 1. Check if dev server is running
curl http://localhost:3000

# Should return HTML page

# 2. Open browser
# Navigate to http://localhost:3000
# Should see landing page

# 3. Test MetaMask integration
# - Install MetaMask extension
# - Visit http://localhost:3000
# - Click "Connect Wallet"
# - Sign in with MetaMask
```

### Integration Testing

```bash
# 1. Start both servers (as above)

# 2. Open browser: http://localhost:3000

# 3. Connect wallet:
#    - Click "Connect Wallet"
#    - Approve MetaMask signature
#    - Should see dashboard

# 4. Submit wallet for analysis:
#    - Enter a wallet address
#    - Click "Analyze"
#    - Should see risk score and visualizations

# 5. Check browser console (F12):
#    - Should see no error messages
#    - Network tab should show successful API calls to localhost:5000
```

---

## Troubleshooting

### Python Virtual Environment Issues

**Problem:** `python: command not found` or `python --version` shows Python 2

**Solution:**

```bash
# Use python3 instead
python3 -m venv venv
source venv/bin/activate
python3 -m pip install -r requirements.txt
```

**Problem:** Cannot activate virtual environment

**Solution:**

```bash
# Check venv exists
ls venv/

# Reinstall venv
python -m venv venv --clear

# Try activating again
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows
```

### Dependency Installation Issues

**Problem:** `pip install -r requirements.txt` fails

**Solution:**

```bash
# Upgrade pip
pip install --upgrade pip

# Try installing with no cache
pip install --no-cache-dir -r requirements.txt

# Install packages individually to identify problem
pip install flask
pip install pandas
# ... etc
```

**Problem:** Permission denied when installing packages

**Solution:**

```bash
# Don't use sudo with pip
# Always use virtual environment first
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate      # Windows

# Then install
pip install -r requirements.txt
```

### Port Already in Use

**Problem:** `Address already in use` when starting server

**Solution:**

```bash
# Find process using port 5000 (backend)
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use different port
FLASK_PORT=5001 python app.py
```

### Node/npm Issues

**Problem:** `npm: command not found`

**Solution:**

```bash
# Reinstall Node.js from https://nodejs.org/
# Or use package manager

# macOS
brew install node

# Linux
sudo apt-get install nodejs npm

# Verify
node --version
npm --version
```

**Problem:** `npm install` is slow

**Solution:**

```bash
# Clear npm cache
npm cache clean --force

# Use faster registry
npm config set registry https://registry.npmjs.org/

# Try installing again
npm install
```

### Model Loading Issues

**Problem:** `FileNotFoundError: models/CatBoost.joblib not found`

**Solution:**

```bash
# Check if models directory exists and has files
ls backend/models/

# If missing, models may need to be:
# 1. Downloaded from shared storage
# 2. Trained locally (if training script available)

# For now, create dummy files for testing
touch backend/models/CatBoost.joblib
```

### MetaMask Connection Issues

**Problem:** MetaMask window doesn't open or connection fails

**Solution:**

```bash
# 1. Ensure MetaMask extension is installed
#    - Chrome/Firefox/Edge/Brave Web Store
#    - Pinned to toolbar

# 2. Check browser console (F12) for errors

# 3. Make sure localhost:3000 is accessible
#    - Open http://localhost:3000 in browser
#    - Should load without errors

# 4. Try in different browser profile
#    - Create new browser profile
#    - Install MetaMask fresh
```

### Frontend Build Issues

**Problem:** `npm run build` fails

**Solution:**

```bash
# Check for TypeScript errors
npm run type-check

# Check for linting errors
npm run lint

# Clear Next.js cache
rm -rf .next

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install

# Try build again
npm run build
```

### Database Connection Issues

**Problem:** `could not connect to server`

**Solution:**

```bash
# Check if PostgreSQL is running
# macOS
brew services list

# Linux
sudo systemctl status postgresql

# Windows
# Check Services app -> PostgreSQL Server

# Start if not running
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux

# Test connection
psql -U cryptoguard -d cryptoguard
```

---

## Getting Help

If you encounter issues:

1. **Check logs**: Look at terminal output for error messages
2. **Read error carefully**: Most errors have clear solutions
3. **Google the error**: Paste error message in Google
4. **Check GitHub Issues**: Look for similar issues reported
5. **Ask on Discord/Slack**: Community can help troubleshoot
6. **Create GitHub Issue**: If truly stuck, document the issue

---

## Next Steps

Once setup is complete:

1. **Read the main README**: [README.md](README.md)
2. **Review Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
3. **Explore Code**: Start with `frontend/src/app/page.tsx` and `backend/app.py`
4. **Try it out**: Connect wallet, submit analysis, explore dashboard

---

**Last Updated**: February 2026
**Version**: 1.0.0
