# CryptoGuard Backend

[![Python](https://img.shields.io/badge/Python-3.9+-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-REST_API-black?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com/)
[![Machine Learning](https://img.shields.io/badge/ML-CatBoost_XGBoost_LightGBM-9932CC?style=for-the-badge)](https://catboost.ai/)
[![Blockchain](https://img.shields.io/badge/Blockchain-Ethereum-627EEA?style=for-the-badge&logo=ethereum)](https://ethereum.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](../LICENSE)

AI Anti Money Laundering Detection System for Digital Wallets - Powered by Multiple ML Models

> 📁 **Part of the [CryptoGuard Monorepo](../README.md)** - See root directory for full project setup and architecture.

## Project Overview

CryptoGuard Backend provides advanced machine learning models for detecting suspicious cryptocurrency transactions and wallet behaviors. The system uses an ensemble of multiple ML algorithms to identify potential money laundering activities on blockchain networks.

### Project Structure

The backend follows a modular structure organized by functionality:

```
backend/
├── app.py                   # Main Flask application & API routes
├── requirements.txt         # Python dependencies
├── models/                  # Pre-trained ML models
│   ├── CatBoost.joblib
│   ├── LightGBM.joblib
│   ├── LogisticRegression.joblib
│   ├── RandomForest.joblib
│   ├── XGBoost.joblib
│
├── utils/                   # Utility modules for ML operations
│   ├── catboost_model.py
│   ├── lightgbm_model.py
│   ├── logistic_regression.py
│   ├── random_forest.py
│   ├── xgboost_model.py
│   ├── crypto_graph_analyzer.py
│   ├── data_process.py
│   ├── gemini_explainer.py
│
├── data/                    # Dataset files
│   ├── raw.csv              # Original blockchain data
│   ├── processed.csv        # Processed features
│
└── data-pipeline/           # Data collection & ETL
    ├── processor/           # TypeScript data processors
    ├── data/                # Data sources & SQL queries
```

## Installation & Setup

### Prerequisites

- Python 3.9 or higher
- pip or conda
- Virtual environment (recommended)

### Quick Start

**1️⃣ Clone the Monorepo**

```bash
git clone <repo-link>
cd CryptoGuard/backend
```

**2️⃣ Create Virtual Environment**

```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On Mac/Linux
source venv/bin/activate
```

**3️⃣ Install Dependencies**

```bash
pip install -r requirements.txt
```

## Usage

### Run the Flask API Server

```bash
python app.py
```

The API will be available at `http://localhost:5000`

### Train ML Models

To train individual models from the `utils/` folder:

```bash
# Train CatBoost model
python utils/catboost_model.py

# Train LightGBM model
python utils/lightgbm_model.py

# Train XGBoost model
python utils/xgboost_model.py

# Train Random Forest model
python utils/random_forest.py

# Train Logistic Regression model
python utils/logistic_regression.py
```

Trained models are saved in `./models/` as joblib files.

### Make Predictions

Use the Flask API endpoints or invoke models directly:

```bash
python app.py
```

## Machine Learning Pipeline

### Data Preprocessing

- **Load Data**: Ingests raw blockchain transaction data
- **Feature Engineering**: Creates relevant features from transaction patterns
- **Handle Missing Values**: Imputation and outlier treatment
- **Feature Scaling**: Normalizes numerical features for ML models
- **Data Augmentation**: Uses SMOTE to balance fraud vs. legitimate transactions (6:4 ratio)
- **Export**: Saves processed data to `processed.csv`

### Model Training

- **Data Split**: 80% training, 20% testing
- **Models Trained**:
  - Logistic Regression
  - CatBoost
  - LightGBM
  - XGBoost
  - Random Forest
- **Hyperparameter Tuning**: GridSearchCV optimization
- **Cross-Validation**: 5-fold cross-validation for evaluation
- **Metrics**: Accuracy, Precision, Recall, F1-Score, AUC-ROC

## API Endpoints

| Endpoint   | Method | Description                                      |
| ---------- | ------ | ------------------------------------------------ |
| `/predict` | POST   | Make predictions using ensemble models           |
| `/analyze` | POST   | Analyze wallet behavior and transaction patterns |
| `/health`  | GET    | API health check                                 |

## Model Performance

Each model is evaluated on the test set with the following metrics:

- **Accuracy**: Overall correctness of predictions
- **Precision**: True positives vs. all positive predictions
- **Recall**: True positives vs. all actual positives
- **F1-Score**: Harmonic mean of precision and recall
- **AUC-ROC**: Area under receiver operating characteristic curve

## Tech Stack

- **Framework**: Flask
- **ML Libraries**: scikit-learn, CatBoost, LightGBM, XGBoost
- **Data Processing**: pandas, NumPy
- **Data Augmentation**: imbalanced-learn (SMOTE)
- **Database**: BigQuery (for data sourcing)
- **APIs**: ethers.js, Web3.py

## Related Documentation

- [Main README](../README.md)
- [Architecture Guide](../ARCHITECTURE.md)
- [Setup Instructions](../SETUP.md)
- [Frontend Documentation](../frontend/README.md)

## License

MIT License - See [LICENSE](../LICENSE) for details
