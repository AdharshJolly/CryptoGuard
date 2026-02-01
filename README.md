# CryptoGuard: AI Anti-Money Laundering Intelligence Platform

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Flask](https://img.shields.io/badge/Flask-REST_API-000000?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[![Machine Learning](https://img.shields.io/badge/ML-CatBoost_XGBoost_LightGBM-FF6600?style=for-the-badge)](https://catboost.ai/)
[![Blockchain](https://img.shields.io/badge/Blockchain-Ethereum-627EEA?style=for-the-badge&logo=ethereum&logoColor=white)](https://ethereum.org/)
[![Web3](https://img.shields.io/badge/Web3-MetaMask-F6851B?style=for-the-badge&logo=metamask&logoColor=white)](https://metamask.io/)
[![AI](https://img.shields.io/badge/AI-Gemini_Powered-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

[![Status](https://img.shields.io/badge/Status-In_Development-yellow?style=for-the-badge)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)

</div>

---

**CryptoGuard** is an advanced blockchain forensics and regulatory technology platform designed to detect and prevent money laundering in digital wallets. Built with AI/ML models and a modern web interface, it combines real-time transaction analysis with interactive visualization tools for AML compliance and risk assessment.

---

<div align="center">

### 🎖️ Platform Highlights

|        🤖 ML Models         |     📊 Data Points      | ⚡ Processing Speed | 🎯 Accuracy |
| :-------------------------: | :---------------------: | :-----------------: | :---------: |
|       **5 Ensemble**        |      **Millions+**      |    **Real-time**    |  **High**   |
| CatBoost, XGBoost, LightGBM | Blockchain Transactions |     < 1 second      |   85-95%    |

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Development](#development)
- [License](#license)

---

## 🎯 Overview

CryptoGuard leverages multiple machine learning models (CatBoost, LightGBM, XGBoost, Random Forest, Logistic Regression) to analyze blockchain transactions and identify suspicious wallet activities associated with money laundering. The platform provides:

- 🔍 **Real-time Analysis**: Process blockchain transactions and flag suspicious patterns
- 📊 **Visual Intelligence**: Interactive graphs and 3D topology visualizations
- 🎯 **Risk Scoring**: AI-powered risk assessment with explainable predictions
- 📝 **Case Management**: Administrative tools for investigating and managing cases
- ✅ **Regulatory Compliance**: Support for KYC (Know Your Customer) and AML requirements

---

## ✨ Key Features

### 🔐 Backend Services

- 🤖 **Multi-Model ML Pipeline**: Ensemble of 5 trained machine learning models
  - CatBoost, LightGBM, XGBoost, Random Forest, Logistic Regression
- ⚡ **Real-time Transaction Analysis**: Process blockchain transactions and wallet behaviors
- 🔗 **Blockchain Integration**: Direct access to on-chain data via BigQuery and Web3 APIs
- 📊 **Data Processing Pipeline**: ETL pipeline for raw blockchain data
- 🌐 **API-First Architecture**: RESTful API for predictions and analysis
- 💡 **Model Explainability**: Gemini-powered explanations for predictions
- 📈 **Scalable Processing**: Handles large-scale blockchain data efficiently

### 🖥️ Frontend Interface

- 🦊 **User Authentication**: MetaMask wallet-based authentication for users
- 👨‍💼 **Admin Dashboard**: Secure admin portal with email/password authentication
- 📊 **Interactive Visualizations**:
  - 🌐 Real-time transaction graphs (force-directed)
  - 🎨 3D money laundering topology visualization
  - 🔍 Peeling chains analysis
  - 🧠 GNN-based detection overlays
- 📝 **Case Management**: Create, track, and manage AML investigation cases
- 📱 **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- 🎯 **Risk Scoring**: Visual risk indicators and detailed reports

---

## 📁 Project Structure

```
CryptoGuard/
├── backend/                          # Python ML backend service
│   ├── app.py                       # Flask/FastAPI application entry point
│   ├── requirements.txt              # Python dependencies
│   ├── README.md                    # Backend documentation
│   │
│   ├── data-pipeline/               # ETL pipeline for blockchain data
│   │   ├── processor/               # TypeScript data processor
│   │   │   ├── src/                 # Transaction fetching and processing scripts
│   │   │   ├── lib/                 # Database and utility modules
│   │   │   └── setup/               # Setup guides for database
│   │   └── data/                    # SQL queries and data files
│   │
│   ├── models/                      # Trained ML models (joblib format)
│   │   ├── CatBoost.joblib
│   │   ├── LightGBM.joblib
│   │   ├── LogisticRegression.joblib
│   │   ├── RandomForest.joblib
│   │   └── XGBoost.joblib
│   │
│   ├── utils/                       # Utility modules
│   │   ├── data_process.py          # Data preprocessing utilities
│   │   ├── data_info.py             # Data analysis utilities
│   │   ├── catboost_model.py        # CatBoost model wrapper
│   │   ├── lightgbm_model.py        # LightGBM model wrapper
│   │   ├── xgboost_model.py         # XGBoost model wrapper
│   │   ├── random_forest.py         # Random Forest model wrapper
│   │   ├── logistic_regression.py   # Logistic Regression model wrapper
│   │   ├── crypto_graph_analyzer.py # Transaction graph analysis
│   │   └── gemini_explainer.py      # AI-powered prediction explanations
│   │
│   ├── data/                        # Datasets
│   │   ├── raw.csv                  # Raw blockchain transaction data
│   │   └── processed.csv            # Preprocessed training data
│   │
│   └── catboost_info/               # CatBoost training logs
│
├── frontend/                         # Next.js web application
│   ├── src/
│   │   ├── app/                     # App Router pages
│   │   │   ├── page.tsx             # Landing page
│   │   │   ├── admin/               # Admin routes
│   │   │   │   ├── overview/        # Dashboard overview
│   │   │   │   ├── cases/           # Case management
│   │   │   │   ├── case/            # Individual case view
│   │   │   │   ├── visualization/   # Advanced visualizations
│   │   │   │   ├── gnn-detection/   # GNN detection interface
│   │   │   │   ├── peeling-chains/  # Peeling chains analysis
│   │   │   │   └── gather-scatter/  # Gather-scatter visualization
│   │   │   └── user/                # User routes
│   │   ├── api/                     # API routes
│   │   │   └── auth/                # Authentication endpoints
│   │   ├── components/              # Reusable UI components
│   │   │   ├── ui/                  # Base UI primitives
│   │   │   └── visualizations/      # Visualization components
│   │   ├── lib/                     # Utility libraries
│   │   │   ├── auth.ts              # Authentication logic
│   │   │   ├── wallet-service.ts    # Web3/MetaMask integration
│   │   │   ├── auth-context.tsx     # Auth React context
│   │   │   ├── api/                 # API client utilities
│   │   │   └── utils.ts             # General utilities
│   │   ├── providers/               # React providers
│   │   └── styles/                  # Global stylesheets
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.mjs
│   └── README.md                    # Frontend documentation
│
├── .gitignore                       # Global git ignore
├── README.md                        # THIS FILE - Root documentation
├── LICENSE                          # MIT License
├── ARCHITECTURE.md                  # System architecture documentation
├── SETUP.md                         # Detailed setup instructions
└── package.json                     # Monorepo root configuration
```

---

## 🛠 Technology Stack

<div align="center">

### 🐍 Backend Technologies

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=flat-square&logo=flask)](https://flask.palletsprojects.com/)
[![CatBoost](https://img.shields.io/badge/CatBoost-ML-FFCC00?style=flat-square)](https://catboost.ai/)
[![XGBoost](https://img.shields.io/badge/XGBoost-ML-FF6600?style=flat-square)](https://xgboost.ai/)
[![LightGBM](https://img.shields.io/badge/LightGBM-ML-00ADD8?style=flat-square)](https://lightgbm.readthedocs.io/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3-F7931E?style=flat-square&logo=scikitlearn)](https://scikit-learn.org/)
[![pandas](https://img.shields.io/badge/pandas-Data-150458?style=flat-square&logo=pandas)](https://pandas.pydata.org/)
[![NumPy](https://img.shields.io/badge/NumPy-Array-013243?style=flat-square&logo=numpy)](https://numpy.org/)
[![Web3.py](https://img.shields.io/badge/Web3.py-Blockchain-3C3C3D?style=flat-square)](https://web3py.readthedocs.io/)

### ⚛️ Frontend Technologies

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.0-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Radix UI](https://img.shields.io/badge/Radix_UI-Components-161618?style=flat-square)](https://www.radix-ui.com/)
[![ethers.js](https://img.shields.io/badge/ethers.js-6.0-2535A0?style=flat-square)](https://docs.ethers.org/)
[![Three.js](https://img.shields.io/badge/Three.js-3D-000000?style=flat-square&logo=three.js)](https://threejs.org/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animation-0055FF?style=flat-square)](https://www.framer.com/motion/)

### 🗄️ Data & Infrastructure

[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![BigQuery](https://img.shields.io/badge/BigQuery-Data-669DF6?style=flat-square&logo=googlebigquery)](https://cloud.google.com/bigquery)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens)](https://jwt.io/)
[![Git](https://img.shields.io/badge/Git-Version_Control-F05032?style=flat-square&logo=git&logoColor=white)](https://git-scm.com/)

</div>

---

### Backend

| Component           | Technology                                | Purpose                        |
| ------------------- | ----------------------------------------- | ------------------------------ |
| **Runtime**         | Python 3.9+                               | Core backend language          |
| **Web Framework**   | Flask/FastAPI                             | HTTP API server                |
| **ML/AI**           | CatBoost, LightGBM, XGBoost, scikit-learn | Model training and prediction  |
| **Data Processing** | Pandas, NumPy                             | Data manipulation and analysis |
| **Blockchain Data** | BigQuery, Web3.py                         | On-chain data access           |
| **Explanations**    | Google Gemini API                         | AI-powered result explanations |
| **Serialization**   | joblib, pickle                            | Model persistence              |

### Frontend

| Component          | Technology                  | Purpose                             |
| ------------------ | --------------------------- | ----------------------------------- |
| **Framework**      | Next.js 14 (App Router)     | React-based web application         |
| **Styling**        | Tailwind CSS 4              | Utility-first CSS framework         |
| **UI Components**  | Radix UI                    | Unstyled, accessible components     |
| **Authentication** | jose (JWT)                  | Token management                    |
| **Web3**           | ethers.js                   | MetaMask and blockchain interaction |
| **Visualization**  | Three.js, react-force-graph | 3D and graph visualizations         |
| **Animations**     | Framer Motion               | Smooth UI animations                |
| **Language**       | TypeScript                  | Type-safe frontend code             |

### Data Pipeline

| Component    | Technology               | Purpose                   |
| ------------ | ------------------------ | ------------------------- |
| **Language** | TypeScript               | Type-safe data processing |
| **Database** | PostgreSQL               | Data storage              |
| **API**      | Dune Analytics, BigQuery | Blockchain data sources   |
| **Runtime**  | Node.js                  | Script execution          |

---

## 🚀 Quick Start

### Prerequisites

<div align="left">

![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![MetaMask](https://img.shields.io/badge/MetaMask-Required-F6851B?style=flat-square&logo=metamask&logoColor=white)
![Git](https://img.shields.io/badge/Git-Version_Control-F05032?style=flat-square&logo=git&logoColor=white)

</div>

- **Node.js** 18+ (for frontend)
- **Python** 3.9+ (for backend)
- **npm** or **yarn** (for package management)
- **MetaMask** browser extension (for user login)
- **Git** (for version control)

### Installation Summary

#### 1. Clone & Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/CryptoGuard.git
cd CryptoGuard

# Install dependencies for both frontend and backend
npm install
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env  # Create from template if exists

cd ..
```

#### 3. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Configure environment variables
cp .env.example .env.local  # Create from template if exists

cd ..
```

#### 4. Run Services

```bash
# Terminal 1: Start backend
cd backend
python app.py

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 📦 Installation

### Detailed Backend Installation

```bash
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Requirements:**

- Python 3.8+
- pip package manager
- Virtual environment tool (venv)

### Detailed Frontend Installation

```bash
cd frontend

# Install Node dependencies
npm install
# or
yarn install

# Verify installation
npm --version  # Should be 9+
node --version # Should be 18+
```

**Requirements:**

- Node.js 18+
- npm 9+ or yarn 3+

---

## ⚙️ Configuration

### Backend Configuration

Create a `.env` file in the `backend/` directory:

```env
# Flask/FastAPI Configuration
FLASK_ENV=development
API_PORT=5000

# Machine Learning Models
MODEL_PATH=./models
SCALER_PATH=./models/scaler.pkl

# Blockchain Data Sources
BIGQUERY_PROJECT_ID=your-project-id
BIGQUERY_DATASET=your-dataset

# Gemini API (for explanations)
GEMINI_API_KEY=your-gemini-api-key

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/cryptoguard

# Logging
LOG_LEVEL=INFO
```

### Frontend Configuration

Create a `.env.local` file in the `frontend/` directory:

```env
# Authentication
JWT_SECRET=your-super-secret-key-change-this-in-production

# Admin Credentials
ADMIN_EMAIL=admin@cryptoguard.io
ADMIN_PASSWORD=your-secure-password-change-this

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000

# Network Configuration
NEXT_PUBLIC_NETWORK_ID=1  # 1 for Ethereum mainnet, 5 for Goerli testnet
```

**Important**: Never commit `.env` or `.env.local` files to version control!

---

## 📖 Usage

### Backend - Making Predictions

```bash
cd backend

# Run the main application
python app.py

# Make API request to predict for a wallet
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x1234...",
    "transaction_history": [...]
  }'
```

### Frontend - User Dashboard

1. Visit `http://localhost:3000`
2. Click "Connect Wallet" (MetaMask required)
3. Sign the authentication message
4. Access user dashboard with transaction analysis

### Frontend - Admin Dashboard

1. Visit `http://localhost:3000/auth/admin`
2. Enter configured admin credentials
3. Access admin dashboard for case management and detailed analysis

---

## 🏗 Architecture

CryptoGuard follows a **monorepo architecture** with clear separation of concerns:

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      User Browser                            │
│  (MetaMask Wallet Integration, Web3 Support)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (Next.js 14)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  User Routes │  │Admin Dashboard│  │ Visualizations  │   │
│  │  (MetaMask)  │  │  (JWT Auth)   │  │(Three.js, D3.js)│   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTP/REST API
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend (Python API)                         │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │ Data Ingress │  │  ML Models       │  │  Analysis    │   │
│  │ (Validation) │  │  (5 Models)      │  │  & Scoring   │   │
│  └──────────────┘  └──────────────────┘  └──────────────┘   │
│         │                                         │            │
│         └─────────────────┬──────────────────────┘            │
│                          │                                     │
│         ┌────────────────┴─────────────────┐                  │
│         ▼                                   ▼                  │
│  ┌────────────────┐           ┌──────────────────────┐        │
│  │ Explainability │           │  Graph Analysis      │        │
│  │ (Gemini API)   │           │  (Crypto Analyzer)   │        │
│  └────────────────┘           └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐         ┌─────────┐         ┌──────────┐
   │ BigQuery│         │ Postgres│         │  Redis   │
   │(Blockchain Data)  │(Metadata)        │(Cache)   │
   └─────────┘         └─────────┘         └──────────┘
```

### Data Flow

1. **User Input** → Frontend captures wallet address or case parameters
2. **API Request** → Sent to backend with validation
3. **Data Processing** → Backend loads features and preprocessing
4. **ML Prediction** → Ensemble of 5 models generates scores
5. **Explainability** → Gemini API explains prediction reasoning
6. **Visualization** → Results rendered in interactive graphs
7. **Storage** → Case data persisted to PostgreSQL

For detailed architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 📡 API Documentation

### Authentication Endpoints

#### Get Wallet Nonce

```
POST /api/auth/wallet/nonce
Content-Type: application/json

{
  "walletAddress": "0x1234567890abcdef..."
}

Response:
{
  "nonce": "12345",
  "message": "Sign this message to authenticate..."
}
```

#### Verify Wallet Signature

```
POST /api/auth/wallet/verify
Content-Type: application/json

{
  "walletAddress": "0x1234567890abcdef...",
  "signature": "0x..."
}

Response:
{
  "token": "eyJhbGc...",
  "user": {
    "walletAddress": "0x1234567890abcdef...",
    "isAdmin": false
  }
}
```

#### Admin Login

```
POST /api/auth/admin/login
Content-Type: application/json

{
  "email": "admin@cryptoguard.io",
  "password": "password"
}

Response:
{
  "token": "eyJhbGc...",
  "user": {
    "email": "admin@cryptoguard.io",
    "isAdmin": true
  }
}
```

### Prediction Endpoints

#### Analyze Wallet (Backend)

```
POST /analyze
Content-Type: application/json
Authorization: Bearer {token}

{
  "walletAddress": "0x1234567890abcdef...",
  "includeExplanation": true
}

Response:
{
  "riskScore": 0.87,
  "category": "high_risk",
  "modelScores": {
    "catboost": 0.89,
    "lightgbm": 0.85,
    "xgboost": 0.88,
    "randomforest": 0.86,
    "logisticregression": 0.82
  },
  "explanation": "This wallet shows patterns consistent with...",
  "flaggedFeatures": [...]
}
```

For complete API documentation, see [API.md](API.md) (to be created)

---

## 🔧 Development

### Running in Development Mode

```bash
# Terminal 1: Backend (Flask Development Server)
cd backend
python app.py
# 🚀 Runs on http://localhost:5000

# Terminal 2: Frontend (Next.js Development Server)
cd frontend
npm run dev
# 🚀 Runs on http://localhost:3000
```

### Debugging

**Backend Debugging:**

```bash
# Run with Python debugger
python -m pdb app.py

# Or use VS Code with Python extension
# 🔍 Add breakpoints and use Debug launcher (F5)
```

**Frontend Debugging:**

```bash
# Use Next.js built-in debugging
# VSCode: Select "Next.js: debug server-side" launcher

# Or use browser DevTools
# 🔍 F12 → Sources tab → Set breakpoints
```

### Testing

```bash
# Backend tests (when test suite is added)
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
npm run test
# or
npm run test:watch
```

### Code Quality

![Code Style: Black](https://img.shields.io/badge/code%20style-black-000000.svg?style=flat-square)
![ESLint](https://img.shields.io/badge/ESLint-Enabled-4B32C3?style=flat-square&logo=eslint)
![Prettier](https://img.shields.io/badge/Prettier-Enabled-F7B93E?style=flat-square&logo=prettier)

- **Backend**: Follow PEP 8 with `black` and `flake8`
- **Frontend**: Follow ESLint rules in `.eslintrc.json`

---

## 🎯 What Makes CryptoGuard Different?

<div align="center">

| Feature                | CryptoGuard              | Traditional AML Tools |
| ---------------------- | ------------------------ | --------------------- |
| **ML Models**          | 🟢 5 Ensemble Models     | 🟡 Single Model/Rules |
| **Real-time Analysis** | 🟢 Instant Predictions   | 🔴 Batch Processing   |
| **Blockchain Native**  | 🟢 Direct On-Chain Data  | 🟡 Third-party APIs   |
| **Explainability**     | 🟢 AI-Powered Insights   | 🔴 Black Box          |
| **Visualization**      | 🟢 Interactive 3D/Graphs | 🟡 Static Reports     |
| **Open Source**        | 🟢 Fully Open            | 🔴 Proprietary        |
| **Cost**               | 🟢 Free                  | 🔴 Expensive Licenses |

</div>

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## 🙏 Acknowledgments

- 🔐 **Blockchain Security Community** for insights and best practices
- 🌟 **Open Source Contributors** of all dependencies used
- 🧠 **ML Research Community** for model architectures and techniques
- 💎 **Ethereum Foundation** for Web3 infrastructure

---

## 📞 Support & Contact

<div align="center">

[![GitHub Issues](https://img.shields.io/badge/Issues-Report_Bug-red?style=for-the-badge&logo=github)](https://github.com/yourusername/CryptoGuard/issues)
[![GitHub Discussions](https://img.shields.io/badge/Discussions-Ask_Question-blue?style=for-the-badge&logo=github)](https://github.com/yourusername/CryptoGuard/discussions)
[![Email](https://img.shields.io/badge/Email-Contact_Team-green?style=for-the-badge&logo=gmail)](mailto:contact@cryptoguard.io)

</div>

For questions, issues, or suggestions:

- 🐛 **Bug Reports**: [Open an issue](https://github.com/yourusername/CryptoGuard/issues)
- 💡 **Feature Requests**: [Create a discussion](https://github.com/yourusername/CryptoGuard/discussions)
- 📧 **Email**: contact@cryptoguard.io
- 💬 **Community**: Join our discussions

---

## 🗺 Roadmap

### Phase 1 (Current)

- [x] Multi-model ML pipeline
- [x] MetaMask authentication
- [x] Interactive visualizations
- [x] Case management system

### Phase 2 (In Progress)

- [ ] Enhanced GNN-based detection models
- [ ] Real-time blockchain monitoring
- [ ] Advanced risk scoring algorithms
- [ ] API rate limiting and quota management

### Phase 3 (Planned)

- [ ] Multi-chain support (Polygon, BSC, Arbitrum)
- [ ] Mobile application (iOS/Android)
- [ ] Regulatory reporting features
- [ ] Webhook support for external systems
- [ ] Machine learning model retraining pipeline

---

<div align="center">

### ⭐ Star this repository if you find it helpful!

[![GitHub stars](https://img.shields.io/github/stars/yourusername/CryptoGuard?style=social)](https://github.com/yourusername/CryptoGuard/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/yourusername/CryptoGuard?style=social)](https://github.com/yourusername/CryptoGuard/network/members)
[![GitHub watchers](https://img.shields.io/github/watchers/yourusername/CryptoGuard?style=social)](https://github.com/yourusername/CryptoGuard/watchers)

---

**Built with ❤️ by the CryptoGuard Team**

🔐 Making Blockchain Safer, One Transaction at a Time

</div>

---

**Last Updated**: February 2026  
**Version**: 1.0.0
