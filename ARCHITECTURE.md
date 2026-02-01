# CryptoGuard System Architecture

## Overview

CryptoGuard is built as a **monorepo** containing a Python backend ML service and a Next.js frontend application. The system detects money laundering patterns in cryptocurrency transactions using ensemble machine learning models and provides an intuitive web interface for analysis and case management.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Layer                              │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │  Browser (Desktop)   │  │  Browser (Mobile - in progress)  │ │
│  │  - MetaMask Wallet   │  │  - Mobile Web Support            │ │
│  │  - Web3 Integration  │  └──────────────────────────────────┘ │
│  └──────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
                        │
                        │ HTTP/HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Presentation Layer                            │
│                    (Next.js 14 Frontend)                        │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐   │
│  │ Public Pages    │  │ User Dashboard  │  │Admin Console │   │
│  │ - Landing       │  │ - Wallet Search │  │ - Cases      │   │
│  │ - Docs          │  │ - Risk Analysis │  │ - Analysis   │   │
│  │ - Auth (Wallet) │  │ - Visualizations│  │ - Reports    │   │
│  └─────────────────┘  └─────────────────┘  └──────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              State Management                            │  │
│  │  - React Context (Auth, User State)                      │  │
│  │  - SWR/React Query (Data Fetching & Caching)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Visualization Components                       │  │
│  │  - Three.js (3D Topology)                                │  │
│  │  - D3.js / react-force-graph (Transaction Graphs)        │  │
│  │  - Recharts (Statistics & Analytics)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                        │
                        │ REST API / JSON
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
│                   (Python Flask/FastAPI)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Route Handlers / Controllers                │  │
│  │  - /api/auth/* (Authentication)                          │  │
│  │  - /api/predict/* (Predictions)                          │  │
│  │  - /api/analyze/* (Wallet Analysis)                      │  │
│  │  - /api/cases/* (Case Management)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Business Logic Layer                          │  │
│  │  ┌────────────────┐  ┌──────────────────────────────┐   │  │
│  │  │ Feature        │  │ Model Ensemble Logic         │   │  │
│  │  │ Engineering    │  │ - Score Aggregation          │   │  │
│  │  │ - Data Prep    │  │ - Threshold Application      │   │  │
│  │  │ - Validation   │  │ - Risk Categorization        │   │  │
│  │  └────────────────┘  └──────────────────────────────┘   │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ Analysis Modules                                   │  │  │
│  │  │ - Graph Analysis (Crypto Graph Analyzer)           │  │  │
│  │  │ - Explainability (Gemini AI Integration)           │  │  │
│  │  │ - Feature Attribution                              │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            ML Model Layer (5-Model Ensemble)            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │CatBoost  │ │LightGBM  │ │ XGBoost  │ │ RandomFor│  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  │        └──────────────┬──────────────┘                 │  │
│  │                       │                                │  │
│  │            ┌──────────▼──────────┐                     │  │
│  │            │ Logistic Regression │                     │  │
│  │            └─────────────────────┘                     │  │
│  │                                                        │  │
│  │  All models output risk scores (0-1) which are        │  │
│  │  aggregated using weighted averaging or voting        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬──────────────┐
        │               │               │              │
        ▼               ▼               ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐
│   PostgreSQL │ │  BigQuery    │ │ Redis    │ │ External APIs│
│   Database   │ │  (Blockchain)│ │ Cache    │ │ - Gemini     │
│              │ │              │ │          │ │ - Web3 RPC   │
│ - Cases      │ │ - On-chain   │ │ - Cached │ │ - Dune       │
│ - Metadata   │ │   Transactions│ │ Results  │ │ - Sentinel   │
│ - History    │ │ - Wallets    │ │          │ │              │
└──────────────┘ └──────────────┘ └──────────┘ └──────────────┘
```

## Component Architecture

### Frontend Architecture

#### Directory Structure

```
frontend/src/
├── app/                           # Next.js App Router
│   ├── page.tsx                   # Landing page
│   ├── layout.tsx                 # Root layout
│   ├── globals.css                # Global styles
│   ├── admin/                     # Admin protected routes
│   │   ├── layout.tsx             # Admin layout wrapper
│   │   ├── overview/              # Dashboard overview
│   │   ├── cases/                 # Case listing & management
│   │   ├── case/[id]/             # Individual case details
│   │   ├── visualization/         # Advanced analytics
│   │   ├── gnn-detection/         # GNN visualization
│   │   ├── peeling-chains/        # Chain analysis
│   │   └── gather-scatter/        # Network topology
│   ├── user/                      # User protected routes
│   │   └── dashboard/             # User dashboard
│   └── api/                       # API routes (server-side)
│       └── auth/                  # Authentication endpoints
│           ├── wallet/nonce       # Wallet auth nonce
│           ├── wallet/verify      # Signature verification
│           ├── admin/login        # Admin authentication
│           ├── logout             # Session termination
│           └── session            # Session info
│
├── components/                    # Reusable React components
│   ├── ui/                        # Base UI components
│   │   ├── button/
│   │   ├── card/
│   │   ├── dialog/
│   │   ├── dropdown/
│   │   ├── input/
│   │   ├── label/
│   │   ├── tabs/
│   │   └── ...
│   │
│   └── visualizations/            # Domain-specific visualizations
│       ├── TransactionGraph.tsx    # Force-directed graph
│       ├── Topology3D.tsx          # 3D network topology
│       ├── RiskChart.tsx           # Risk score visualization
│       └── TimelineView.tsx        # Temporal analysis
│
├── lib/                           # Utility libraries
│   ├── auth.ts                    # Authentication functions
│   ├── auth-context.tsx           # React Context for auth
│   ├── wallet-service.ts          # Web3/MetaMask integration
│   ├── utils.ts                   # General utilities
│   └── api/                       # API client
│       ├── client.ts              # HTTP client setup
│       ├── wallet.ts              # Wallet API methods
│       └── cases.ts               # Case API methods
│
├── providers/                     # React providers
│   └── auth-provider.tsx          # Auth context provider
│
└── styles/                        # Global stylesheets
    ├── globals.css
    ├── index.css
    ├── tailwind.css
    └── theme.css
```

#### Data Flow in Frontend

```
User Action (Click, Form Submit)
    │
    ▼
Event Handler / Hook
    │
    ▼
API Call (via lib/api/)
    │
    ├─── Request Headers (JWT Token)
    │
    ▼
Backend API
    │
    ▼
API Response
    │
    ▼
State Update (useState / useContext)
    │
    ▼
Component Re-render
    │
    ▼
UI Display / Visualization Update
```

### Backend Architecture

#### Directory Structure

```
backend/
├── app.py                         # Main Flask/FastAPI application
├── requirements.txt               # Python dependencies
│
├── data-pipeline/                 # ETL for blockchain data
│   ├── processor/                 # TypeScript data processor
│   │   ├── src/                   # Data fetching scripts
│   │   │   ├── fetch_block_transactions.ts
│   │   │   ├── fetch_KYC_tokens_transactions.ts
│   │   │   ├── fetch_block_wallet_balance.ts
│   │   │   ├── set_token_classification.ts
│   │   │   └── set_wallet_classification.ts
│   │   ├── lib/                   # Database & utilities
│   │   │   ├── db.ts              # Database connection
│   │   │   ├── onchain.ts         # On-chain data fetching
│   │   │   ├── secrets.ts         # Secrets management
│   │   │   └── utils.ts           # Helpers
│   │   └── setup/                 # Setup documentation
│   │
│   └── data/                      # Data files & queries
│       ├── training_data.csv      # Labeled training set
│       ├── create_database.sql    # Database schema
│       ├── dune.sql               # Dune Analytics queries
│       ├── biquery.txt            # BigQuery documentation
│       └── sentinel_model.mwb     # Database model
│
├── models/                        # Trained ML models
│   ├── CatBoost.joblib           # CatBoost model
│   ├── LightGBM.joblib           # LightGBM model
│   ├── XGBoost.joblib            # XGBoost model
│   ├── RandomForest.joblib       # Random Forest model
│   ├── LogisticRegression.joblib # Logistic Regression model
│   └── scaler.pkl                # Feature scaler
│
├── utils/                         # Utility modules
│   ├── __init__.py
│   ├── data_info.py               # Dataset statistics
│   ├── data_process.py            # Data preprocessing
│   ├── catboost_model.py          # CatBoost wrapper
│   ├── lightgbm_model.py          # LightGBM wrapper
│   ├── xgboost_model.py           # XGBoost wrapper
│   ├── random_forest.py           # Random Forest wrapper
│   ├── logistic_regression.py     # Logistic Regression wrapper
│   ├── crypto_graph_analyzer.py   # Graph analysis
│   └── gemini_explainer.py        # AI-powered explanations
│
├── data/                          # Datasets
│   ├── raw.csv                    # Raw transactions
│   ├── processed.csv              # Preprocessed data
│   └── train_test_split/          # Train/test sets
│
└── catboost_info/                 # Training logs
    ├── learn_error.tsv
    └── time_left.tsv
```

#### Backend Request Flow

```
HTTP Request from Frontend
    │
    ├─ URL: /api/predict
    ├─ Method: POST
    ├─ Headers: {Authorization: Bearer <JWT>}
    ├─ Body: {walletAddress: "0x...", features: [...]}
    │
    ▼
Route Handler (app.py)
    │
    ▼
Authentication Middleware
    │
    ├─ Verify JWT token
    ├─ Extract user info
    │
    ▼
Input Validation
    │
    ├─ Validate wallet address format
    ├─ Validate required fields
    ├─ Type checking
    │
    ▼
Feature Engineering (data_process.py)
    │
    ├─ Load scaler
    ├─ Normalize features
    ├─ Encode categorical variables
    │
    ▼
Model Prediction (5 Model Ensemble)
    │
    ├─ CatBoost.predict() → score1
    ├─ LightGBM.predict() → score2
    ├─ XGBoost.predict() → score3
    ├─ RandomForest.predict() → score4
    └─ LogisticRegression.predict() → score5
    │
    ▼
Score Aggregation
    │
    ├─ Weighted Average: (score1*w1 + score2*w2 + ... + score5*w5) / Σw
    ├─ Ensemble Risk Score: 0.0 - 1.0
    │
    ▼
Risk Categorization
    │
    ├─ score < 0.3   → "Low Risk"
    ├─ 0.3 ≤ score < 0.7 → "Medium Risk"
    └─ score ≥ 0.7   → "High Risk"
    │
    ▼
Explainability (gemini_explainer.py)
    │
    ├─ Send prediction + features to Gemini API
    ├─ Get human-readable explanation
    │
    ▼
Graph Analysis (crypto_graph_analyzer.py) [Optional]
    │
    ├─ Analyze transaction network
    ├─ Identify suspicious patterns
    ├─ Flag connected wallets
    │
    ▼
Database Storage [Optional]
    │
    ├─ Save case to PostgreSQL
    ├─ Log prediction metadata
    │
    ▼
Response Construction
    │
    {
      "riskScore": 0.85,
      "category": "high_risk",
      "modelScores": {
        "catboost": 0.89,
        "lightgbm": 0.85,
        ...
      },
      "explanation": "This wallet...",
      "flaggedFeatures": [...],
      "connectedWallets": [...],
      "timestamp": "2025-02-01T..."
    }
    │
    ▼
HTTP Response (200 OK)
    │
    ▼
Frontend receives & updates UI
```

## Data Flow

### Training Data Pipeline

```
Raw Blockchain Data
    │
    ├─ Source: Dune Analytics, BigQuery, Sentinel
    │
    ▼
ETL Pipeline (data-pipeline/processor/)
    │
    ├─ Extract: Fetch transactions, wallet data, KYC info
    ├─ Transform: Clean, normalize, feature engineering
    ├─ Load: Store in PostgreSQL
    │
    ▼
Labeled Dataset (training_data.csv)
    │
    ├─ Wallet features: transaction count, volume, frequency
    ├─ Behavioral features: pattern analysis, anomaly flags
    ├─ Network features: connected wallets, graph metrics
    ├─ Classification: Scam (1) / Legitimate (0)
    │
    ▼
Feature Scaling (scaler.pkl)
    │
    ├─ StandardScaler or RobustScaler
    │
    ▼
Model Training
    │
    ├─ CatBoost.fit()
    ├─ LightGBM.fit()
    ├─ XGBoost.fit()
    ├─ RandomForest.fit()
    └─ LogisticRegression.fit()
    │
    ▼
Trained Models (models/*.joblib)
    │
    └─ Serialized with joblib for production use
```

### Real-Time Prediction Pipeline

```
User Submits Wallet Address
    │
    ▼
Fetch On-Chain Data
    │
    ├─ Web3 API calls
    ├─ Transaction history
    ├─ Balance information
    ├─ Token transfers
    │
    ▼
Feature Engineering
    │
    ├─ Apply same transformations as training
    ├─ Normalize with stored scaler
    │
    ▼
Model Inference
    │
    ├─ Load all 5 models from disk
    ├─ Generate predictions
    ├─ Average scores
    │
    ▼
Risk Assessment
    │
    ├─ Apply thresholds
    ├─ Categorize risk level
    ├─ Identify red flags
    │
    ▼
Explain Results
    │
    ├─ Use Gemini API
    ├─ Generate human-readable reasoning
    │
    ▼
Present to User
    │
    ├─ Interactive visualizations
    ├─ Detailed report
    ├─ Save to case history
```

## Authentication Flow

### MetaMask (User) Authentication

```
1. User clicks "Connect Wallet"
    │
    ▼
2. Frontend requests nonce: POST /api/auth/wallet/nonce
    │
    ├─ Payload: {walletAddress: "0x..."}
    │
    ▼
3. Backend generates unique nonce
    │
    ├─ Nonce stored in session/cache with TTL
    ├─ Response: {nonce: "12345", message: "Sign this..."}
    │
    ▼
4. User signs nonce with MetaMask
    │
    ├─ Message: "CryptoGuard Authentication\nNonce: 12345"
    ├─ Signature: "0x..."
    │
    ▼
5. Frontend sends signature: POST /api/auth/wallet/verify
    │
    ├─ Payload: {walletAddress, signature, nonce}
    │
    ▼
6. Backend verifies signature
    │
    ├─ Recover address from signature
    ├─ Compare with provided address
    ├─ Verify nonce matches
    ├─ Check nonce TTL
    │
    ▼
7. Generate JWT token
    │
    ├─ Payload: {walletAddress, sub: walletAddress, iat, exp}
    ├─ Signed with JWT_SECRET
    ├─ Set as HTTP-only cookie
    │
    ▼
8. Return session info
    │
    ├─ Response: {token, user: {walletAddress, isAdmin: false}}
    │
    ▼
9. Frontend stores token & redirects to dashboard
```

### Admin Authentication

```
1. Admin navigates to /auth/admin
    │
    ▼
2. Admin enters email & password
    │
    ▼
3. Frontend submits credentials: POST /api/auth/admin/login
    │
    ├─ Payload: {email, password}
    │
    ▼
4. Backend validates credentials
    │
    ├─ Compare with ADMIN_EMAIL env var
    ├─ Compare password hash with ADMIN_PASSWORD
    │
    ▼
5. Generate JWT token (same as wallet auth)
    │
    ├─ Payload: {email, isAdmin: true, sub: email, iat, exp}
    ├─ Set as HTTP-only cookie
    │
    ▼
6. Return session info
    │
    ├─ Response: {token, user: {email, isAdmin: true}}
    │
    ▼
7. Frontend redirects to admin dashboard
```

## Database Schema

### PostgreSQL Schema (Planned)

```sql
-- Cases table
CREATE TABLE cases (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    wallet_address VARCHAR(42),
    risk_score FLOAT,
    risk_category VARCHAR(20),
    status VARCHAR(20),  -- open, closed, flagged
    analyst_notes TEXT,
    created_by VARCHAR(255)
);

-- Predictions table
CREATE TABLE predictions (
    id UUID PRIMARY KEY,
    case_id UUID REFERENCES cases(id),
    model_name VARCHAR(50),
    model_version VARCHAR(20),
    score FLOAT,
    created_at TIMESTAMP
);

-- Wallets table
CREATE TABLE wallets (
    address VARCHAR(42) PRIMARY KEY,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    transaction_count INT,
    total_volume DECIMAL,
    risk_flag BOOLEAN,
    is_contract BOOLEAN
);

-- Transactions table
CREATE TABLE transactions (
    hash VARCHAR(66) PRIMARY KEY,
    from_address VARCHAR(42),
    to_address VARCHAR(42),
    value DECIMAL,
    timestamp TIMESTAMP,
    block_number INT
);
```

## ML Model Ensemble Strategy

### Model Selection

| Model                   | Type               | Strengths                          | Use Case             |
| ----------------------- | ------------------ | ---------------------------------- | -------------------- |
| **CatBoost**            | Gradient Boosting  | Handles categorical features, fast | Primary model        |
| **LightGBM**            | Gradient Boosting  | Memory efficient, fast training    | Secondary validation |
| **XGBoost**             | Gradient Boosting  | Industry standard, robust          | Cross-validation     |
| **Random Forest**       | Ensemble (Bagging) | Interpretable, parallelizable      | Baseline             |
| **Logistic Regression** | Linear             | Explainable, baseline              | Interpretability     |

### Score Aggregation

```python
def ensemble_predict(features):
    scores = {
        'catboost': catboost_model.predict(features),
        'lightgbm': lightgbm_model.predict(features),
        'xgboost': xgboost_model.predict(features),
        'random_forest': random_forest_model.predict(features),
        'logistic_regression': lr_model.predict(features)
    }

    # Weighted average (can be tuned)
    weights = {
        'catboost': 0.3,
        'lightgbm': 0.25,
        'xgboost': 0.25,
        'random_forest': 0.1,
        'logistic_regression': 0.1
    }

    ensemble_score = sum(
        scores[model] * weights[model]
        for model in scores
    )

    return ensemble_score  # 0.0 - 1.0
```

## Security Architecture

### API Security

```
Request Flow:
│
├─ CORS Policy: Whitelist frontend origin
│
├─ HTTPS Required: Enforce TLS 1.2+
│
├─ Rate Limiting:
│  └─ 100 requests/minute per IP
│  └─ 1000 requests/hour per user
│
├─ Authentication:
│  ├─ JWT tokens (exp: 24 hours)
│  ├─ HTTP-only cookies (prevents XSS)
│  ├─ Refresh token rotation
│
├─ Input Validation:
│  ├─ Wallet address format (0x + 40 hex chars)
│  ├─ Feature range validation
│  ├─ SQL injection prevention (parameterized queries)
│
├─ Authorization:
│  ├─ Role-based access (User vs Admin)
│  ├─ Resource-level permissions
│  └─ Case ownership validation
│
└─ Output Encoding:
   └─ JSON serialization (prevents injection)
```

### Secret Management

```
Environment Variables (.env):
├─ JWT_SECRET: Long random string (32+ bytes)
├─ ADMIN_EMAIL: Configured email
├─ ADMIN_PASSWORD: Hashed password
├─ GEMINI_API_KEY: API key for explanations
├─ DATABASE_URL: Connection string
└─ Other sensitive configs
```

## Deployment Architecture (Future)

```
┌──────────────────────────────────────────────┐
│          Production Environment              │
│                                              │
│  ┌─ Frontend (Vercel/Netlify)              │
│  │  ├─ CDN for static assets               │
│  │  ├─ Automatic deployments on git push   │
│  │  ├─ Environment-specific configs        │
│  │  └─ Analytics & monitoring              │
│  │                                         │
│  ├─ Backend (AWS/GCP)                      │
│  │  ├─ Containerized with Docker          │
│  │  ├─ Kubernetes orchestration            │
│  │  ├─ Auto-scaling based on load         │
│  │  ├─ Health checks & monitoring          │
│  │  └─ Backup & disaster recovery          │
│  │                                         │
│  └─ Database (AWS RDS / Cloud SQL)         │
│     ├─ PostgreSQL replicas                 │
│     ├─ Automated backups                   │
│     ├─ Point-in-time recovery              │
│     └─ Read replicas for analytics         │
│                                              │
└──────────────────────────────────────────────┘
```

## Performance Considerations

### Frontend Optimization

- **Code Splitting**: Lazy load admin routes
- **Image Optimization**: Next.js Image component
- **Caching**: SWR for API responses
- **Bundling**: Minification & tree-shaking

### Backend Optimization

- **Model Loading**: Cache loaded models in memory
- **Feature Caching**: Redis cache for computed features
- **Query Optimization**: Indexed database queries
- **Connection Pooling**: Reuse database connections

## Monitoring & Observability

### Metrics to Track

**Backend:**

- API response times
- Model inference latency
- Error rates & exceptions
- Database query performance
- Cache hit rates

**Frontend:**

- Page load times
- Component render performance
- API call success rates
- User session duration

**ML Models:**

- Prediction distribution
- Model accuracy metrics
- Feature importance changes
- Drift detection

## Scalability

### Horizontal Scaling

- **Frontend**: CDN + multiple edge servers
- **Backend**: Load balancer + multiple API instances
- **Database**: Read replicas for analytics

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database indices
- Increase batch size for predictions

---

For more details, see:

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [SETUP.md](SETUP.md) for detailed installation
