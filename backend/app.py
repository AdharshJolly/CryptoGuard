from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import joblib
import numpy as np
import os
import pandas as pd
from datetime import datetime, timedelta
import queue
import json
import time
import threading
from utils.crypto_graph_analyzer import CryptoGraphAnalyzer
from utils.gemini_explainer import GeminiExplainer

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Cryptocurrency definitions for realistic blockchain data
CRYPTO_CURRENCIES = [
    {"symbol": "BTC", "name": "Bitcoin", "decimals": 8, "conversion_rate": 0.000025},
    {"symbol": "ETH", "name": "Ethereum", "decimals": 6, "conversion_rate": 0.00035},
    {"symbol": "SOL", "name": "Solana", "decimals": 4, "conversion_rate": 0.0055},
    {"symbol": "MATIC", "name": "Polygon", "decimals": 2, "conversion_rate": 1.25},
    {"symbol": "AVAX", "name": "Avalanche", "decimals": 4, "conversion_rate": 0.028},
    {"symbol": "DOT", "name": "Polkadot", "decimals": 4, "conversion_rate": 0.14},
    {"symbol": "LINK", "name": "Chainlink", "decimals": 4, "conversion_rate": 0.065},
    {"symbol": "XRP", "name": "Ripple", "decimals": 2, "conversion_rate": 2.0},
]


def get_crypto_for_wallet(wallet_address: str) -> dict:
    """Get a consistent crypto currency based on wallet address hash"""
    import hashlib

    hash_val = int(hashlib.md5(wallet_address.encode()).hexdigest(), 16)
    return CRYPTO_CURRENCIES[hash_val % len(CRYPTO_CURRENCIES)]


def format_crypto_amount(
    amount: float, wallet_address: str = None, crypto: dict = None
) -> str:
    """Format an amount as cryptocurrency instead of USD"""
    if crypto is None and wallet_address:
        crypto = get_crypto_for_wallet(wallet_address)
    elif crypto is None:
        # Random selection for edge labels
        import random

        crypto = random.choice(CRYPTO_CURRENCIES)

    # Convert from base unit to crypto amount
    crypto_amount = amount * crypto["conversion_rate"]

    if crypto_amount >= 1000:
        return f"{crypto_amount/1000:.2f}K {crypto['symbol']}"
    elif crypto_amount >= 1:
        return f"{crypto_amount:.2f} {crypto['symbol']}"
    else:
        return f"{crypto_amount:.4f} {crypto['symbol']}"


def format_crypto_label(amount: float, crypto_symbol: str = None) -> str:
    """Format a label for edges with crypto amount"""
    if crypto_symbol is None:
        import random

        crypto = random.choice(CRYPTO_CURRENCIES)
    else:
        crypto = next(
            (c for c in CRYPTO_CURRENCIES if c["symbol"] == crypto_symbol),
            CRYPTO_CURRENCIES[0],
        )

    crypto_amount = amount * crypto["conversion_rate"]
    if crypto_amount >= 1000:
        return f"{crypto_amount/1000:.1f}K {crypto['symbol']}"
    elif crypto_amount >= 1:
        return f"{crypto_amount:.2f} {crypto['symbol']}"
    else:
        return f"{crypto_amount:.4f} {crypto['symbol']}"


# Initialize graph analyzer (global instance for session persistence)
graph_analyzer = CryptoGraphAnalyzer()

# Initialize Gemini explainer (will be lazy-loaded)
gemini_explainer = None


def get_gemini_explainer():
    """Lazy load Gemini explainer"""
    global gemini_explainer
    if gemini_explainer is None:
        try:
            gemini_explainer = GeminiExplainer()
        except Exception as e:
            print(f"Warning: Gemini API not available: {e}")
            gemini_explainer = False  # Mark as unavailable
    return gemini_explainer if gemini_explainer is not False else None


# Load the trained models
model_catboost = joblib.load(os.path.join("models", "CatBoost.joblib"))
model_lightgbm = joblib.load(os.path.join("models", "LightGBM.joblib"))
model_xgboost = joblib.load(os.path.join("models", "XGBoost.joblib"))
model_logistic_regression = joblib.load(
    os.path.join("models", "LogisticRegression.joblib")
)
model_random_forest = joblib.load(os.path.join("models", "RandomForest.joblib"))

# Load the scaler
scaler = joblib.load(os.path.join("models", "scaler.pkl"))


@app.route("/predict", methods=["POST"])
def predict():
    """
    Predict money laundering risk for transaction data

    Supports two modes:
    1. Aggregated features (original format)
    2. Crypto transaction data with optional blockchain analysis
    """
    # Parse JSON input
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    try:
        # Check if crypto-enhanced mode
        if "token_type" in data or "wallet_address" in data:
            return _predict_crypto_enhanced(data)

        # Original prediction logic
        return _predict_aggregated(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _predict_aggregated(data):
    """Original aggregated prediction logic"""
    # Extract features from the JSON input
    df = pd.DataFrame([data])

    # Store original values for business logic before scaling
    original_total_count = data.get("total_transaction_count", 0)
    original_total_sum = data.get("total_transaction_sum", 0)
    original_to_wallets = data.get("to_unique_wallet", 0)
    original_from_wallets = data.get("from_unique_wallet", 0)
    original_big_count = data.get("big_transaction_count", 0)

    # Scale the features using the loaded scaler
    exclude_columns = ["to_unique_wallet", "from_unique_wallet"]
    features_to_scale = [col for col in df.columns if col not in exclude_columns]
    df[features_to_scale] = scaler.transform(df[features_to_scale])

    # Predict probabilities with each model (using [:, 0] based on how models were trained)
    prob_catboost = model_catboost.predict_proba(df)[:, 0]
    prob_lightgbm = model_lightgbm.predict_proba(df)[:, 0]
    prob_xgboost = model_xgboost.predict_proba(df)[:, 0]
    prob_logistic_regression = model_logistic_regression.predict_proba(df)[:, 0]
    prob_random_forest = model_random_forest.predict_proba(df)[:, 0]

    # Calculate final prediction as simple average of all model probabilities
    final_probability = np.mean(
        [
            prob_catboost[0],
            prob_lightgbm[0],
            prob_xgboost[0],
            prob_logistic_regression[0],
            prob_random_forest[0],
        ]
    )

    # Apply business logic checks for edge cases
    total_wallets = original_to_wallets + original_from_wallets

    # Calculate risk indicators
    wallet_diversity = total_wallets / max(
        original_total_count, 1
    )  # Wallets per transaction
    avg_transaction_size = original_total_sum / max(original_total_count, 1)
    big_transaction_ratio = original_big_count / max(original_total_count, 1)

    # Risk scoring based on money laundering patterns
    risk_score = 0

    # CRITICAL: Filter out clearly legitimate small transactions first
    if original_total_count <= 10 and original_total_sum <= 1000 and total_wallets <= 3:
        # Very low activity - almost certainly legitimate
        classification = "positive" if final_probability >= 0.95 else "negative"
        return jsonify(
            {
                "prediction_breakdown": {
                    "catboost": prob_catboost.tolist()[0],
                    "lightgbm": prob_lightgbm.tolist()[0],
                    "xgboost": prob_xgboost.tolist()[0],
                    "logistic_regression": prob_logistic_regression.tolist()[0],
                    "random_forest": prob_random_forest.tolist()[0],
                },
                "final_prediction": float(final_probability),
                "classification": classification,
            }
        )

    # Filter moderate legitimate activity (e.g., small business, personal finance)
    if (
        original_total_count <= 25
        and original_total_sum <= 3000
        and total_wallets <= 12
    ):
        # Moderate activity - require extremely high confidence (96%)
        classification = "positive" if final_probability >= 0.96 else "negative"
        return jsonify(
            {
                "prediction_breakdown": {
                    "catboost": prob_catboost.tolist()[0],
                    "lightgbm": prob_lightgbm.tolist()[0],
                    "xgboost": prob_xgboost.tolist()[0],
                    "logistic_regression": prob_logistic_regression.tolist()[0],
                    "random_forest": prob_random_forest.tolist()[0],
                },
                "final_prediction": float(final_probability),
                "classification": classification,
            }
        )

    # Filter moderate-high volume but LOW amount and LOW wallet count
    # 30-40 transactions with small amounts and reasonable wallet count = likely legitimate business
    if (
        original_total_count <= 40
        and original_total_sum <= 9000
        and total_wallets <= 15
    ):
        # Require very high confidence (94%)
        classification = "positive" if final_probability >= 0.94 else "negative"
        return jsonify(
            {
                "prediction_breakdown": {
                    "catboost": prob_catboost.tolist()[0],
                    "lightgbm": prob_lightgbm.tolist()[0],
                    "xgboost": prob_xgboost.tolist()[0],
                    "logistic_regression": prob_logistic_regression.tolist()[0],
                    "random_forest": prob_random_forest.tolist()[0],
                },
                "final_prediction": float(final_probability),
                "classification": classification,
            }
        )

    # Smurfing pattern: HIGH volume + HIGH wallet count + significant splitting
    if original_total_count >= 30 and total_wallets >= 15 and wallet_diversity > 0.4:
        risk_score += 3

    # Layering pattern: VERY high transaction count through many wallets
    if original_total_count >= 40 and total_wallets >= 20:
        risk_score += 2

    # Large transaction amounts
    if original_total_sum > 10000:
        risk_score += 2
    elif original_total_sum > 5000:
        risk_score += 1

    # Structuring: Many big transactions (avoiding reporting)
    if original_big_count > 5:
        risk_score += 2
    elif original_big_count > 3:
        risk_score += 1

    # Adjust threshold based on risk score
    if risk_score >= 5:
        # Very high risk - standard threshold
        classification = "positive" if final_probability >= 0.5 else "negative"
    elif risk_score >= 3:
        # High risk - moderate threshold
        classification = "positive" if final_probability >= 0.65 else "negative"
    else:
        # Lower risk - high threshold
        classification = "positive" if final_probability >= 0.85 else "negative"

    # Return the concatenated probabilities as JSON
    return jsonify(
        {
            "prediction_breakdown": {
                "catboost": prob_catboost.tolist()[0],
                "lightgbm": prob_lightgbm.tolist()[0],
                "xgboost": prob_xgboost.tolist()[0],
                "logistic_regression": prob_logistic_regression.tolist()[0],
                "random_forest": prob_random_forest.tolist()[0],
            },
            "final_prediction": float(final_probability),
            "classification": classification,
        }
    )


def _predict_crypto_enhanced(data):
    """
    Enhanced prediction with cryptocurrency-specific features

    Input JSON includes standard features plus:
    - token_type: BTC, ETH, USDT, SOL, etc.
    - wallet_address (optional)
    - time_span_hours (optional)
    - cross_chain_transfers (optional)
    """
    # Get standard features prediction
    result_dict = {}

    # Extract features from the JSON input
    df = pd.DataFrame([data])

    # Store original values for business logic before scaling
    original_total_count = data.get("total_transaction_count", 0)
    original_total_sum = data.get("total_transaction_sum", 0)
    original_to_wallets = data.get("to_unique_wallet", 0)
    original_from_wallets = data.get("from_unique_wallet", 0)
    original_big_count = data.get("big_transaction_count", 0)

    # Scale the features using the loaded scaler
    # Build feature dict with all required features
    model_features_dict = {}

    # Features that need scaling (from scaler)
    for feature in scaler.feature_names_in_:
        if feature in data:
            model_features_dict[feature] = data[feature]
        else:
            model_features_dict[feature] = 0

    # Add unscaled features that models expect
    model_features_dict["to_unique_wallet"] = data.get("to_unique_wallet", 0)
    model_features_dict["from_unique_wallet"] = data.get("from_unique_wallet", 0)

    # Create dataframe with scaled features
    scaled_df = pd.DataFrame(
        [
            {
                k: v
                for k, v in model_features_dict.items()
                if k in scaler.feature_names_in_
            }
        ]
    )
    scaled_features = scaler.transform(scaled_df)

    # Build final feature dataframe with correct column order
    # The models expect this exact order:
    # First 10 scaled features, then to_unique_wallet, from_unique_wallet, then remaining 4 scaled features
    expected_column_order = [
        "total_transaction_count",
        "total_transaction_sum",
        "big_transaction_count",
        "big_transaction_sum",
        "small_transaction_count",
        "small_transaction_sum",
        "from_transaction_count",
        "from_transaction_sum",
        "to_transaction_count",
        "to_transaction_sum",
        "to_unique_wallet",
        "from_unique_wallet",
        "from_unique_big",
        "to_unique_big",
        "from_unique_small",
        "to_unique_small",
    ]

    # Combine scaled and unscaled features in correct order
    final_features_dict = {}
    scaled_feature_idx = 0
    for col in expected_column_order:
        if col in ["to_unique_wallet", "from_unique_wallet"]:
            final_features_dict[col] = model_features_dict[col]
        else:
            final_features_dict[col] = scaled_features[0][scaled_feature_idx]
            scaled_feature_idx += 1

    # Create final dataframe with exact column order
    model_features = pd.DataFrame([final_features_dict], columns=expected_column_order)

    # Predict probabilities with each model
    prob_catboost = model_catboost.predict_proba(model_features)[:, 0]
    prob_lightgbm = model_lightgbm.predict_proba(model_features)[:, 0]
    prob_xgboost = model_xgboost.predict_proba(model_features)[:, 0]
    prob_logistic_regression = model_logistic_regression.predict_proba(model_features)[
        :, 0
    ]
    prob_random_forest = model_random_forest.predict_proba(model_features)[:, 0]

    # Calculate final prediction
    base_prediction = np.mean(
        [
            prob_catboost[0],
            prob_lightgbm[0],
            prob_xgboost[0],
            prob_logistic_regression[0],
            prob_random_forest[0],
        ]
    )

    # Add crypto-specific risk factors
    token_type = data.get("token_type", "UNKNOWN")
    crypto_risk_score = 0
    crypto_indicators = []

    # Privacy coins higher risk
    privacy_coins = ["XMR", "ZEC", "DASH", "BEAM"]
    if token_type.upper() in privacy_coins:
        crypto_risk_score += 0.2
        crypto_indicators.append(f"Privacy coin detected: {token_type}")

    # Stablecoins used in layering
    stablecoins = ["USDT", "USDC", "DAI", "BUSD"]
    if token_type.upper() in stablecoins and original_total_count > 20:
        crypto_risk_score += 0.15
        crypto_indicators.append(f"High-volume stablecoin activity: {token_type}")

    # Cross-chain transfers (obfuscation technique)
    cross_chain = data.get("cross_chain_transfers", 0)
    if cross_chain > 2:
        crypto_risk_score += 0.2
        crypto_indicators.append(f"Multiple cross-chain transfers: {cross_chain}")

    # Rapid transactions (time-based layering)
    time_span = data.get("time_span_hours", 999)
    if time_span < 24 and original_total_count > 10:
        crypto_risk_score += 0.15
        crypto_indicators.append(
            f"Rapid transaction velocity: {original_total_count} txn in {time_span}h"
        )

    # Adjust final prediction with crypto risk
    adjusted_prediction = min(base_prediction + crypto_risk_score, 1.0)

    # Determine classification
    if adjusted_prediction >= 0.7:
        classification = "positive"
    elif adjusted_prediction >= 0.5 and crypto_risk_score > 0.2:
        classification = "positive"
    else:
        classification = "negative"

    return jsonify(
        {
            "prediction_breakdown": {
                "catboost": prob_catboost.tolist()[0],
                "lightgbm": prob_lightgbm.tolist()[0],
                "xgboost": prob_xgboost.tolist()[0],
                "logistic_regression": prob_logistic_regression.tolist()[0],
                "random_forest": prob_random_forest.tolist()[0],
            },
            "base_ml_prediction": float(base_prediction),
            "crypto_risk_score": crypto_risk_score,
            "final_prediction": float(adjusted_prediction),
            "classification": classification,
            "token_type": token_type,
            "crypto_risk_indicators": crypto_indicators,
            "analysis_type": "crypto_enhanced",
        }
    )


# ===================== NEW CRYPTOCURRENCY ENDPOINTS =====================


@app.route("/crypto/analyze-wallet", methods=["POST"])
def analyze_crypto_wallet():
    """
    Analyze a specific cryptocurrency wallet for money laundering patterns

    Input JSON:
    {
        "wallet_address": "0x1234...",
        "transactions": [
            {
                "source_wallet": "0x1234...",
                "dest_wallet": "0x5678...",
                "amount": 1.5,
                "timestamp": "2025-01-31T10:30:00",
                "token_type": "BTC"
            },
            ...
        ],
        "known_illicit_wallets": ["0xABCD...", ...]
    }

    Returns: Comprehensive wallet analysis with suspicion score
    """
    data = request.get_json()
    if not data or "wallet_address" not in data:
        return jsonify({"error": "wallet_address required"}), 400

    try:
        wallet_address = data["wallet_address"]
        transactions = data.get("transactions", [])
        illicit_wallets = data.get("known_illicit_wallets", [])

        # Parse timestamps
        for txn in transactions:
            if isinstance(txn["timestamp"], str):
                txn["timestamp"] = datetime.fromisoformat(
                    txn["timestamp"].replace("Z", "+00:00")
                )

        # Load data into graph
        analyzer = CryptoGraphAnalyzer()
        analyzer.load_transactions(transactions)
        analyzer.mark_illicit_wallets(illicit_wallets)

        # Get wallet summary
        wallet_summary = analyzer.get_wallet_summary(wallet_address)

        # Detect smurfing patterns
        smurfing_patterns = analyzer.detect_fan_out_fan_in(
            wallet_address, max_depth=4, min_intermediaries=3
        )

        # Detect peeling chains
        peeling_chains = analyzer.detect_peeling_chain(wallet_address, min_hops=5)

        # Classify laundering pattern
        laundering_pattern = analyzer.classify_laundering_pattern(wallet_address)

        # Determine classification
        suspicion_score = wallet_summary["suspicion_score"]
        classification = "positive" if suspicion_score >= 0.6 else "negative"
        risk_level = (
            "high"
            if suspicion_score >= 0.8
            else "medium" if suspicion_score >= 0.5 else "low"
        )

        # Update dashboard metrics
        dashboard_cache["total_wallets_analyzed"] += 1
        dashboard_cache["smurfing_patterns"] += len(smurfing_patterns)
        dashboard_cache["volume_24h"] += wallet_summary.get("total_received", 0)

        # Store for batch summary
        result = {
            "wallet_address": wallet_address,
            "classification": classification,
            "risk_level": risk_level,
            "suspicion_score": suspicion_score,
            "laundering_pattern": laundering_pattern,
            "wallet_metrics": {
                "total_received": wallet_summary.get("total_received", 0),
                "total_sent": wallet_summary.get("total_sent", 0),
                "unique_senders": wallet_summary.get("unique_senders", 0),
                "unique_receivers": wallet_summary.get("unique_receivers", 0),
            },
            "wallet_summary": wallet_summary,
            "smurfing_patterns_detected": len(smurfing_patterns),
            "smurfing_patterns": smurfing_patterns[:5],  # Top 5
            "peeling_chains_detected": len(peeling_chains),
            "peeling_chains": peeling_chains[:3],  # Top 3
            "analysis_type": "blockchain_graph_analysis",
        }

        dashboard_cache["analyzed_wallets"].append(result)

        # Keep only last 100 wallets
        if len(dashboard_cache["analyzed_wallets"]) > 100:
            dashboard_cache["analyzed_wallets"] = dashboard_cache["analyzed_wallets"][
                -100:
            ]

        # Emit real-time log
        if risk_level == "high":
            dashboard_cache["active_alerts"] += 1
            emit_log(
                f"High-risk wallet detected: {wallet_address[:10]}...",
                "alert",
                {
                    "suspicion_score": suspicion_score,
                    "pattern": laundering_pattern.get("type"),
                },
            )
        elif risk_level == "medium":
            emit_log(
                f"Medium-risk wallet analyzed: {wallet_address[:10]}...",
                "warning",
                {"suspicion_score": suspicion_score},
            )
        else:
            emit_log(
                f"Wallet analyzed: {wallet_address[:10]}...",
                "info",
                {"suspicion_score": suspicion_score},
            )

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/crypto/batch-analyze", methods=["POST"])
def batch_analyze_wallets():
    """
    Analyze multiple wallets in a transaction graph

    Input JSON:
    {
        "transactions": [
            {
                "source_wallet": "0x1234...",
                "dest_wallet": "0x5678...",
                "amount": 1.5,
                "timestamp": "2025-01-31T10:30:00",
                "token_type": "BTC"
            },
            ...
        ],
        "known_illicit_wallets": ["0xABCD...", ...],
        "wallets_to_analyze": ["0x1234...", "0x5678...", ...]  # Optional
    }

    Returns: Suspicion scores for all wallets
    """
    emit_log("Starting batch wallet analysis...", "info", {"status": "started"})

    data = request.get_json()
    if not data or "transactions" not in data:
        return jsonify({"error": "transactions required"}), 400

    try:
        transactions = data["transactions"]
        illicit_wallets = data.get("known_illicit_wallets", [])
        specific_wallets = data.get("wallets_to_analyze", None)

        # Parse timestamps
        for txn in transactions:
            if isinstance(txn["timestamp"], str):
                txn["timestamp"] = datetime.fromisoformat(
                    txn["timestamp"].replace("Z", "+00:00")
                )

        # Load data into global graph analyzer to persist transaction network
        global graph_analyzer
        graph_analyzer.load_transactions(transactions)
        graph_analyzer.mark_illicit_wallets(illicit_wallets)
        analyzer = graph_analyzer

        # Analyze all wallets or specific ones
        if specific_wallets:
            wallets_to_check = specific_wallets
        else:
            wallets_to_check = list(analyzer.graph.nodes())

        # Analyze each wallet
        results = []
        for wallet in wallets_to_check:
            summary = analyzer.get_wallet_summary(wallet)
            suspicion = summary["suspicion_score"]
            laundering_pattern = analyzer.classify_laundering_pattern(wallet)

            # Get suspicion breakdown for components (fan_out_score, fan_in_score, etc.)
            suspicion_breakdown = analyzer.calculate_suspicion_breakdown(wallet)

            # Get in/out edges for sources and destinations
            in_edges = list(analyzer.graph.in_edges(wallet, data=True))
            out_edges = list(analyzer.graph.out_edges(wallet, data=True))

            # Build sources list
            sources = [
                {
                    "wallet": src,
                    "amount": data.get("total_amount", 0),
                    "transaction_count": data.get("transaction_count", 0),
                }
                for src, _, data in in_edges
            ]

            # Build destinations list
            destinations = [
                {
                    "wallet": dest,
                    "amount": data.get("total_amount", 0),
                    "transaction_count": data.get("transaction_count", 0),
                }
                for _, dest, data in out_edges
            ]

            # Enhance laundering pattern with additional metadata including components
            enhanced_pattern = {
                **laundering_pattern,
                "pattern_type": laundering_pattern.get("type", "UNKNOWN"),
                "total_volume": summary["total_received"] + summary["total_sent"],
                "unique_counterparties": summary["unique_senders"]
                + summary["unique_receivers"],
                # Add components from suspicion breakdown (CRITICAL for GNN detection)
                "components": suspicion_breakdown.get("components", {}),
                # Add sources and destinations for graph analysis
                "sources": sources,
                "destinations": destinations,
                "token_types": list(
                    set(
                        txn["token_type"]
                        for _, _, data in in_edges
                        for txn in data.get("transactions", [])
                    )
                )
                + list(
                    set(
                        txn["token_type"]
                        for _, _, data in out_edges
                        for txn in data.get("transactions", [])
                    )
                ),
            }

            results.append(
                {
                    "wallet_address": wallet,
                    "suspicion_score": suspicion,
                    "classification": "positive" if suspicion >= 0.6 else "negative",
                    "risk_level": (
                        "critical"
                        if suspicion >= 0.9
                        else (
                            "high"
                            if suspicion >= 0.7
                            else "medium" if suspicion >= 0.5 else "low"
                        )
                    ),
                    "laundering_pattern": enhanced_pattern,
                    "distance_to_illicit": summary["distance_to_illicit"],
                    "total_received": summary["total_received"],
                    "total_sent": summary["total_sent"],
                    "unique_counterparties": summary["unique_senders"]
                    + summary["unique_receivers"],
                    "centrality_score": summary["centrality"]["pagerank"],
                    # Add wallet_metrics for visualization compatibility
                    "wallet_metrics": {
                        "total_received": summary["total_received"],
                        "total_sent": summary["total_sent"],
                        "unique_senders": summary["unique_senders"],
                        "unique_receivers": summary["unique_receivers"],
                        "distance_to_illicit": summary["distance_to_illicit"],
                    },
                }
            )

        # Sort by suspicion score
        results = sorted(results, key=lambda x: x["suspicion_score"], reverse=True)

        # Statistics
        critical_risk_count = sum(1 for r in results if r["risk_level"] == "critical")
        high_risk_count = sum(1 for r in results if r["risk_level"] == "high")
        medium_risk_count = sum(1 for r in results if r["risk_level"] == "medium")
        low_risk_count = sum(1 for r in results if r["risk_level"] == "low")

        # Update dashboard cache - accumulate wallets permanently
        # Create a dictionary for efficient lookup and updates
        wallet_dict = {
            w["wallet_address"]: w for w in dashboard_cache["analyzed_wallets"]
        }

        # Add or update wallets from current analysis
        for wallet in results:
            addr = wallet["wallet_address"]
            # If wallet exists and new score is higher, update it
            # Otherwise, add new wallet
            if (
                addr not in wallet_dict
                or wallet["suspicion_score"] > wallet_dict[addr]["suspicion_score"]
            ):
                wallet_dict[addr] = wallet

        # Convert back to list, sort by suspicion score, and keep top 200 for persistence
        dashboard_cache["analyzed_wallets"] = sorted(
            wallet_dict.values(), key=lambda x: x["suspicion_score"], reverse=True
        )[
            :200
        ]  # Increased to 200 for better persistence

        dashboard_cache["total_wallets_analyzed"] += len(results)

        # Update cumulative risk distribution (track critical separately)
        dashboard_cache["critical_risk_total"] += critical_risk_count
        dashboard_cache["high_risk_total"] += high_risk_count
        dashboard_cache["medium_risk_total"] += medium_risk_count
        dashboard_cache["low_risk_total"] += low_risk_count

        # Update metrics
        total_volume = sum(r["total_received"] + r["total_sent"] for r in results)
        dashboard_cache["volume_24h"] += total_volume

        # Count smurfing patterns
        smurfing_count = sum(
            1
            for r in results
            if r["laundering_pattern"].get("type")
            in ["FAN_OUT_FAN_IN", "MULTI_LAYER_REAGGREGATION"]
        )
        dashboard_cache["smurfing_patterns"] += smurfing_count

        # Emit high-risk wallet alerts
        for wallet in results[:3]:  # Top 3 high-risk
            if wallet["risk_level"] in ["high", "critical"]:
                emit_log(
                    f"⚠️ High-risk wallet detected: {wallet['wallet_address'][:10]}...",
                    "alert",
                    {
                        "wallet": wallet["wallet_address"][:16] + "...",
                        "risk": wallet["risk_level"],
                        "score": f"{wallet['suspicion_score']:.2f}",
                        "pattern": wallet["laundering_pattern"].get("type", "UNKNOWN"),
                    },
                )

        # Emit completion log
        emit_log(
            f"✓ Batch analysis complete: {len(results)} wallets analyzed",
            "success",
            {
                "critical_risk": critical_risk_count,
                "high_risk": high_risk_count,
                "medium_risk": medium_risk_count,
                "low_risk": low_risk_count,
            },
        )

        return jsonify(
            {
                "total_wallets_analyzed": len(results),
                "critical_risk_wallets": critical_risk_count,
                "high_risk_wallets": high_risk_count,
                "medium_risk_wallets": medium_risk_count,
                "low_risk_wallets": low_risk_count,
                "wallet_rankings": results,
                "analysis_type": "batch_blockchain_analysis",
            }
        )

    except Exception as e:
        emit_log(f"Batch analysis failed: {str(e)}", "alert", {"error": str(e)})
        return jsonify({"error": str(e)}), 500


@app.route("/crypto/detect-smurfing", methods=["POST"])
def detect_smurfing_patterns():
    """
    Specialized endpoint for detecting smurfing/layering patterns

    Input JSON:
    {
        "transactions": [...],
        "source_wallet": "0x1234...",  # Optional: specific wallet to analyze
        "min_intermediaries": 3,
        "max_depth": 4
    }

    Returns: Detailed smurfing pattern analysis
    """
    data = request.get_json()
    if not data or "transactions" not in data:
        return jsonify({"error": "transactions required"}), 400

    try:
        transactions = data["transactions"]
        source_wallet = data.get("source_wallet", None)
        min_intermediaries = data.get("min_intermediaries", 3)
        max_depth = data.get("max_depth", 4)

        # Parse timestamps
        for txn in transactions:
            if isinstance(txn["timestamp"], str):
                txn["timestamp"] = datetime.fromisoformat(
                    txn["timestamp"].replace("Z", "+00:00")
                )

        # Load data into graph
        analyzer = CryptoGraphAnalyzer()
        analyzer.load_transactions(transactions)

        # Analyze specific wallet or all high-activity wallets
        if source_wallet:
            wallets_to_check = [source_wallet]
        else:
            # Find wallets with high outgoing transaction counts
            wallets_to_check = [
                node
                for node in analyzer.graph.nodes()
                if analyzer.graph.out_degree(node) >= min_intermediaries
            ][
                :20
            ]  # Limit to top 20

        all_patterns = []
        for wallet in wallets_to_check:
            patterns = analyzer.detect_fan_out_fan_in(
                wallet, max_depth, min_intermediaries
            )
            all_patterns.extend(patterns)

        # Sort by suspicion score
        all_patterns = sorted(
            all_patterns, key=lambda x: x["suspicion_score"], reverse=True
        )

        # Identify unique smurfing networks
        smurfing_networks = []
        seen_wallets = set()

        for pattern in all_patterns[:10]:  # Top 10 patterns
            wallet_set = set(
                [pattern["source"], pattern["destination"]] + pattern["intermediaries"]
            )
            if not wallet_set.intersection(seen_wallets):
                smurfing_networks.append(pattern)
                seen_wallets.update(wallet_set)

        return jsonify(
            {
                "smurfing_patterns_found": len(all_patterns),
                "unique_smurfing_networks": len(smurfing_networks),
                "top_patterns": all_patterns[:10],
                "smurfing_networks": smurfing_networks,
                "analysis_type": "smurfing_detection",
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/crypto/visualize", methods=["POST"])
def visualize_transaction_graph():
    """
    Generate visualization data for transaction graph

    Input JSON:
    {
        "transactions": [...],
        "highlight_wallets": ["0x1234...", ...],  # Optional
        "known_illicit_wallets": ["0xABCD...", ...]  # Optional
    }

    Returns: Graph data in format suitable for D3.js or vis.js
    """
    data = request.get_json()
    if not data or "transactions" not in data:
        return jsonify({"error": "transactions required"}), 400

    try:
        transactions = data["transactions"]
        highlight_wallets = set(data.get("highlight_wallets", []))
        illicit_wallets = set(data.get("known_illicit_wallets", []))

        # Parse timestamps
        for txn in transactions:
            if isinstance(txn["timestamp"], str):
                txn["timestamp"] = datetime.fromisoformat(
                    txn["timestamp"].replace("Z", "+00:00")
                )

        # Load data into graph
        analyzer = CryptoGraphAnalyzer()
        analyzer.load_transactions(transactions)
        analyzer.mark_illicit_wallets(illicit_wallets)

        # Build nodes list
        nodes = []
        for wallet in analyzer.graph.nodes():
            suspicion = analyzer.calculate_suspicion_score(wallet)
            centrality = analyzer.calculate_wallet_centrality(wallet)

            node_data = {
                "id": wallet,
                "label": (
                    wallet[:8] + "..." + wallet[-4:] if len(wallet) > 12 else wallet
                ),
                "suspicion_score": suspicion,
                "size": centrality["pagerank"] * 100 + 10,  # Scale for visualization
                "color": (
                    "#FF0000"
                    if wallet in illicit_wallets
                    else (
                        "#FFA500"
                        if suspicion >= 0.8
                        else (
                            "#FFFF00"
                            if suspicion >= 0.6
                            else "#90EE90" if suspicion >= 0.4 else "#00FF00"
                        )
                    )
                ),
                "highlighted": wallet in highlight_wallets,
            }
            nodes.append(node_data)

        # Build edges list
        edges = []
        for source, dest, data in analyzer.graph.edges(data=True):
            edge_data = {
                "from": source,
                "to": dest,
                "value": data["total_amount"],
                "label": format_crypto_label(data["total_amount"]),
                "transactions": data["transaction_count"],
                "width": min(
                    data["transaction_count"] / 2, 10
                ),  # Scale for visualization
            }
            edges.append(edge_data)

        return jsonify(
            {
                "nodes": nodes,
                "edges": edges,
                "graph_statistics": {
                    "total_nodes": len(nodes),
                    "total_edges": len(edges),
                    "illicit_nodes": len(illicit_wallets),
                    "high_risk_nodes": sum(
                        1 for n in nodes if n["suspicion_score"] >= 0.8
                    ),
                },
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/crypto/explain-suspicion", methods=["POST"])
def explain_wallet_suspicion():
    """
    Generate detailed explanation for wallet suspicion score with AI-powered analysis

    Input JSON:
    {
        "wallet_address": "0x1234...",
        "transactions": [
            {
                "source_wallet": "0x1234...",
                "dest_wallet": "0x5678...",
                "amount": 1.5,
                "timestamp": "2025-01-31T10:30:00",
                "token_type": "BTC"
            },
            ...
        ],
        "known_illicit_wallets": ["0xABCD...", ...]
    }

    Returns:
    {
        "wallet_address": "0x1234...",
        "suspicion_explanation": {
            "fan_out_score": 0.32,
            "fan_in_score": 0.28,
            "temporal_burst_score": 0.17,
            "path_similarity_score": 0.10,
            "illicit_proximity_score": 0.13
        },
        "total_suspicion_score": 0.87,
        "risk_level": "HIGH_RISK",
        "ai_explanation": {
            "executive_summary": "...",
            "detailed_explanation": "...",
            "recommendations": [...]
        },
        "wallet_metrics": {...}
    }
    """
    data = request.get_json()
    if not data or "wallet_address" not in data:
        return jsonify({"error": "wallet_address required"}), 400

    try:
        wallet_address = data["wallet_address"]
        transactions = data.get("transactions", [])
        illicit_wallets = data.get("known_illicit_wallets", [])

        # Parse timestamps
        for txn in transactions:
            if isinstance(txn["timestamp"], str):
                txn["timestamp"] = datetime.fromisoformat(
                    txn["timestamp"].replace("Z", "+00:00")
                )

        # Load data into graph
        analyzer = CryptoGraphAnalyzer()
        analyzer.load_transactions(transactions)
        analyzer.mark_illicit_wallets(illicit_wallets)

        # Get detailed suspicion breakdown
        suspicion_breakdown = analyzer.calculate_suspicion_breakdown(wallet_address)

        # Get wallet summary
        wallet_summary = analyzer.get_wallet_summary(wallet_address)

        # Detect patterns for context
        smurfing_patterns = analyzer.detect_fan_out_fan_in(
            wallet_address, max_depth=4, min_intermediaries=3
        )
        peeling_chains = analyzer.detect_peeling_chain(wallet_address, min_hops=5)

        # Build simplified suspicion_explanation for frontend
        suspicion_explanation = {}
        for component_name, component_data in suspicion_breakdown["components"].items():
            suspicion_explanation[component_name] = component_data["score"]

        # Classify laundering pattern
        laundering_pattern = analyzer.classify_laundering_pattern(wallet_address)

        # Determine risk level
        total_score = suspicion_breakdown["total_suspicion_score"]
        if total_score >= 0.7:
            risk_level = "HIGH_RISK"
        elif total_score >= 0.4:
            risk_level = "MEDIUM_RISK"
        else:
            risk_level = "LOW_RISK"

        # Prepare data for Gemini
        gemini_input = {
            "wallet_address": wallet_address,
            "total_suspicion_score": total_score,
            "components": suspicion_breakdown["components"],
            "wallet_summary": wallet_summary,
            "laundering_pattern": laundering_pattern,
            "smurfing_patterns": smurfing_patterns[:3] if smurfing_patterns else [],
            "peeling_chains": peeling_chains[:2] if peeling_chains else [],
        }

        # Generate AI explanation
        ai_explanation = None
        explainer = get_gemini_explainer()
        if explainer:
            try:
                ai_explanation = explainer.generate_suspicion_explanation(gemini_input)
            except Exception as e:
                print(f"Gemini API error: {e}")
                # Use fallback explanation
                ai_explanation = explainer._generate_fallback_explanation(gemini_input)
        else:
            # No Gemini available - create basic explanation
            if total_score >= 0.7:
                ai_explanation = {
                    "executive_summary": f"This wallet exhibits highly suspicious behavior with a suspicion score of {total_score:.2f}. Multiple risk indicators suggest potential money laundering activity.",
                    "detailed_explanation": "The wallet demonstrates patterns consistent with smurfing and layering techniques commonly used in cryptocurrency money laundering operations.",
                    "risk_level": risk_level,
                    "recommendations": [
                        "Immediate investigation required",
                        "Review all transaction counterparties",
                        "Check for connections to known illicit entities",
                        "Consider filing Suspicious Activity Report (SAR)",
                    ],
                }
            elif total_score >= 0.4:
                ai_explanation = {
                    "executive_summary": f"This wallet shows moderately suspicious patterns with a suspicion score of {total_score:.2f}. Enhanced monitoring is recommended.",
                    "detailed_explanation": "Some transaction patterns raise concerns and warrant further investigation to determine if they represent legitimate business activity or potential money laundering.",
                    "risk_level": risk_level,
                    "recommendations": [
                        "Enhanced due diligence recommended",
                        "Monitor for escalating activity",
                        "Review transaction patterns over time",
                        "Verify business purpose if available",
                    ],
                }
            else:
                ai_explanation = {
                    "executive_summary": f"This wallet exhibits relatively normal behavior with a low suspicion score of {total_score:.2f}.",
                    "detailed_explanation": "Transaction patterns appear consistent with normal cryptocurrency usage without significant indicators of money laundering activity.",
                    "risk_level": risk_level,
                    "recommendations": [
                        "Standard monitoring sufficient",
                        "No immediate action required",
                        "Continue periodic review",
                        "Escalate if patterns change",
                    ],
                }

        # Build comprehensive response
        response = {
            "wallet_address": wallet_address,
            "suspicion_explanation": suspicion_explanation,
            "total_suspicion_score": total_score,
            "risk_level": risk_level,
            "classification": "positive" if total_score >= 0.6 else "negative",
            "laundering_pattern": laundering_pattern,
            "ai_explanation": ai_explanation,
            "wallet_metrics": {
                "total_received": wallet_summary["total_received"],
                "total_sent": wallet_summary["total_sent"],
                "unique_senders": wallet_summary["unique_senders"],
                "unique_receivers": wallet_summary["unique_receivers"],
                "net_flow": wallet_summary["total_received"]
                - wallet_summary["total_sent"],
                "is_illicit": wallet_summary["is_illicit"],
                "distance_to_illicit": wallet_summary["distance_to_illicit"],
            },
            "detected_patterns": {
                "smurfing_patterns": len(smurfing_patterns),
                "peeling_chains": len(peeling_chains),
            },
            "component_details": suspicion_breakdown["components"],
            "analysis_type": "comprehensive_risk_explanation",
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===================== END CRYPTOCURRENCY ENDPOINTS =====================

# ===================== DASHBOARD & ANALYTICS ENDPOINTS =====================

# In-memory storage for demo purposes (replace with database in production)
dashboard_cache = {
    "total_wallets_analyzed": 0,
    "active_alerts": 0,
    "open_cases": 0,
    "volume_24h": 0.0,
    "smurfing_patterns": 0,
    "analyzed_wallets": [],  # Store accumulated analysis results
    "critical_risk_total": 0,  # Cumulative critical-risk wallets (≥0.9)
    "high_risk_total": 0,  # Cumulative high-risk wallets (0.7-0.89)
    "medium_risk_total": 0,  # Cumulative medium-risk wallets
    "low_risk_total": 0,  # Cumulative low-risk wallets
    "ignored_wallets": set(),  # Wallets user chose to ignore
}


@app.route("/api/dashboard/metrics", methods=["GET"])
def get_dashboard_metrics():
    """
    Get aggregated system metrics for admin dashboard with live simulation

    Returns:
        - total_wallets_analyzed: Cumulative count
        - active_alerts: High/critical risk events
        - open_cases: Active investigations
        - volume_24h: Total USD volume monitored
        - smurfing_patterns: Identified fan-out/fan-in structures
        - batch_summary: Risk distribution
    """
    try:
        # Initialize last_update timestamp if not exists
        if not hasattr(dashboard_cache, "last_update"):
            dashboard_cache["last_update"] = time.time()

        current_time = time.time()

        # Only auto-generate wallets if time has passed and we have some baseline
        # This creates live feed effect without dummy data
        if current_time - dashboard_cache.get("last_update", 0) > 5:
            dashboard_cache["last_update"] = current_time

        # Get real analyzed wallets only - no simulated data, filter ignored ones
        all_analyzed_wallets = [
            w
            for w in dashboard_cache["analyzed_wallets"]
            if w.get("wallet_address")
            not in dashboard_cache.get("ignored_wallets", set())
        ]

        # Compute risk distribution counts from actual wallet data (keeps them in sync)
        critical_risk = sum(
            1 for w in all_analyzed_wallets if w.get("risk_level") == "critical"
        )
        high_risk = sum(
            1 for w in all_analyzed_wallets if w.get("risk_level") == "high"
        )
        medium_risk = sum(
            1 for w in all_analyzed_wallets if w.get("risk_level") == "medium"
        )
        low_risk = sum(1 for w in all_analyzed_wallets if w.get("risk_level") == "low")

        # Sort by suspicion score and get top 50 for ranking display
        sorted_wallets = sorted(
            all_analyzed_wallets,
            key=lambda x: x.get("suspicion_score", 0),
            reverse=True,
        )[:50]

        wallets_to_rank = sorted_wallets

        wallet_rankings = [
            {
                "wallet_address": w.get("wallet_address", ""),
                "suspicion_score": w.get("suspicion_score", 0),
                "risk_level": w.get("risk_level", "low"),
                "classification": w.get("classification", "negative"),
                "total_received": w.get("total_received")
                or w.get("wallet_metrics", {}).get("total_received", 0),
                "total_sent": w.get("total_sent")
                or w.get("wallet_metrics", {}).get("total_sent", 0),
                "unique_counterparties": w.get("unique_counterparties")
                or (
                    w.get("wallet_metrics", {}).get("unique_senders", 0)
                    + w.get("wallet_metrics", {}).get("unique_receivers", 0)
                ),
                "centrality_score": w.get(
                    "centrality_score", 0.05 + np.random.random() * 0.05
                ),
            }
            for w in wallets_to_rank
        ]

        response = {
            "system_metrics": {
                "total_wallets_analyzed": dashboard_cache["total_wallets_analyzed"],
                "active_alerts": dashboard_cache["active_alerts"],
                "open_cases": dashboard_cache["open_cases"],
                "volume_24h": dashboard_cache["volume_24h"],
                "smurfing_patterns": dashboard_cache["smurfing_patterns"],
            },
            "batch_summary": {
                "critical_risk_wallets": critical_risk,
                "high_risk_wallets": high_risk,
                "medium_risk_wallets": medium_risk,
                "low_risk_wallets": low_risk,
                "wallet_rankings": wallet_rankings,
            },
            "timestamp": datetime.now().isoformat(),
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/wallets/ignore", methods=["POST"])
def ignore_wallet():
    """
    Mark a wallet as ignored so it's removed from the suspicious wallets queue

    Request body:
        - wallet_address: Wallet to ignore
    """
    try:
        data = request.get_json()

        if not data or "wallet_address" not in data:
            return jsonify({"error": "wallet_address required"}), 400

        wallet_address = data["wallet_address"]

        # Add to ignored set
        if "ignored_wallets" not in dashboard_cache:
            dashboard_cache["ignored_wallets"] = set()
        dashboard_cache["ignored_wallets"].add(wallet_address)

        emit_log(
            f"Wallet ignored: {wallet_address[:16]}...",
            "info",
            {"wallet": wallet_address[:16] + "...", "action": "ignored"},
        )

        return jsonify(
            {
                "success": True,
                "wallet_address": wallet_address,
                "message": "Wallet ignored successfully",
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/dashboard/reset", methods=["POST"])
def reset_dashboard_data():
    """
    Reset all dashboard data and start fresh simulation

    This clears all accumulated wallet analysis data, metrics, and allows
    the frontend to restart the simulation with fresh data.
    """
    global dashboard_cache, cases_db, case_counter

    try:
        # Reset dashboard cache to initial state
        dashboard_cache = {
            "total_wallets_analyzed": 0,
            "active_alerts": 0,
            "open_cases": 0,
            "volume_24h": 0.0,
            "smurfing_patterns": 0,
            "analyzed_wallets": [],
            "critical_risk_total": 0,
            "high_risk_total": 0,
            "medium_risk_total": 0,
            "low_risk_total": 0,
            "ignored_wallets": set(),
            "last_update": time.time(),
        }

        # Reset cases (optional - keep if you want to preserve cases)
        cases_db = {}
        case_counter = 1

        emit_log(
            "Dashboard data reset - starting fresh simulation",
            "success",
            {"action": "reset", "timestamp": datetime.now().isoformat()},
        )

        return jsonify(
            {
                "success": True,
                "message": "Dashboard data reset successfully",
                "timestamp": datetime.now().isoformat(),
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===================== CASE MANAGEMENT ENDPOINTS =====================

# In-memory case storage (replace with database in production)
cases_db = {}
case_counter = 1


@app.route("/api/cases", methods=["GET"])
def get_cases():
    """
    Get all cases with optional status filter

    Query params:
        - status: Filter by case status (New, Open, Investigating, Closed)
    """
    try:
        status_filter = request.args.get("status")

        cases = list(cases_db.values())

        if status_filter:
            cases = [c for c in cases if c["status"] == status_filter]

        # Sort by case_id descending
        cases.sort(key=lambda x: x["case_id"], reverse=True)

        return jsonify({"cases": cases, "total": len(cases)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/cases/<case_id>", methods=["GET"])
def get_case(case_id):
    """
    Get specific case details with full wallet analysis

    Returns comprehensive case data including:
    - Basic case info
    - Fresh wallet analysis from graph
    - ML predictions
    - Network visualization data
    """
    try:
        case = cases_db.get(case_id)

        if not case:
            return jsonify({"error": "Case not found"}), 404

        # Get the wallet from the accumulated wallets in dashboard cache
        wallet_address = case["primary_wallet"]
        wallet_data = None

        # Find wallet in accumulated analysis results
        for wallet in dashboard_cache.get("analyzed_wallets", []):
            if wallet["wallet_address"] == wallet_address:
                wallet_data = wallet
                break

        # If not found in cache, return basic case data
        if not wallet_data:
            return jsonify(
                {
                    **case,
                    "wallet_analysis": None,
                    "prediction": None,
                    "graph_data": None,
                }
            )

        # Build comprehensive wallet analysis response
        laundering_pattern = wallet_data.get("laundering_pattern", {})
        pattern_type = laundering_pattern.get("type", "UNKNOWN")

        wallet_analysis = {
            "wallet_address": wallet_address,
            "classification": (
                "positive" if wallet_data["suspicion_score"] >= 0.6 else "negative"
            ),
            "risk_level": wallet_data["risk_level"],
            "suspicion_score": wallet_data["suspicion_score"],
            "wallet_summary": {
                "total_received": wallet_data.get("total_received", 0),
                "total_sent": wallet_data.get("total_sent", 0),
                "unique_senders": wallet_data.get("unique_counterparties", 0)
                // 2,  # Approximate
                "unique_receivers": wallet_data.get("unique_counterparties", 0) // 2,
                "centrality": {
                    "degree": wallet_data.get("centrality_score", 0),
                    "betweenness": wallet_data.get("centrality_score", 0) * 0.8,
                    "pagerank": wallet_data.get("centrality_score", 0),
                    "closeness": wallet_data.get("centrality_score", 0) * 1.2,
                },
                "distance_to_illicit": wallet_data.get("distance_to_illicit", None),
            },
            "smurfing_patterns_detected": (
                1
                if pattern_type in ["FAN_OUT_FAN_IN", "MULTI_LAYER_REAGGREGATION"]
                else 0
            ),
            "smurfing_patterns": [],
            "peeling_chains_detected": (
                1 if pattern_type in ["PEELING_CHAIN", "SEQUENTIAL_PEEL"] else 0
            ),
            "analysis_type": "blockchain_graph_analysis",
        }

        # Generate ML prediction breakdown (simulate model ensemble)
        base_score = wallet_data["suspicion_score"]
        prediction = {
            "prediction_breakdown": {
                "catboost": min(base_score + 0.02, 1.0),
                "lightgbm": min(base_score + 0.05, 1.0),
                "logistic_regression": max(base_score - 0.03, 0.0),
                "random_forest": min(base_score + 0.08, 1.0),
                "xgboost": min(base_score + 0.01, 1.0),
            },
            "base_ml_prediction": base_score,
            "crypto_risk_score": 0.15 if pattern_type != "NORMAL_ACTIVITY" else 0.05,
            "final_prediction": wallet_data["suspicion_score"],
            "classification": (
                "positive" if wallet_data["suspicion_score"] >= 0.6 else "negative"
            ),
            "crypto_risk_indicators": case.get("risk_indicators", []),
            "analysis_type": "crypto_enhanced",
        }

        # Build graph visualization data using the graph analyzer
        graph_data = None
        try:
            # Generate network visualization from stored transactions
            if hasattr(graph_analyzer, "graph") and graph_analyzer.graph.has_node(
                wallet_address
            ):
                # Get all edges connected to this wallet
                wallet_edges = list(
                    graph_analyzer.graph.in_edges(wallet_address, data=True)
                ) + list(graph_analyzer.graph.out_edges(wallet_address, data=True))

                # Collect all nodes in this wallet's immediate network
                connected_wallets = set([wallet_address])
                for source, dest, _ in wallet_edges:
                    connected_wallets.add(source)
                    connected_wallets.add(dest)

                # Build nodes
                nodes = []
                for w in connected_wallets:
                    suspicion = (
                        graph_analyzer.calculate_suspicion_score(w)
                        if hasattr(graph_analyzer, "calculate_suspicion_score")
                        else 0.5
                    )
                    centrality = (
                        graph_analyzer.calculate_wallet_centrality(w)
                        if hasattr(graph_analyzer, "calculate_wallet_centrality")
                        else {"pagerank": 0.01}
                    )

                    # Determine if this wallet is illicit
                    is_illicit = (
                        hasattr(graph_analyzer, "illicit_wallets")
                        and w in graph_analyzer.illicit_wallets
                    )

                    # Get risk level for this wallet
                    w_risk_level = (
                        "critical"
                        if suspicion >= 0.9
                        else (
                            "high"
                            if suspicion >= 0.7
                            else "medium" if suspicion >= 0.5 else "low"
                        )
                    )

                    nodes.append(
                        {
                            "id": w,
                            "label": formatWalletAddress(w, 8),
                            "suspicion_score": suspicion,
                            "size": centrality.get("pagerank", 0.01) * 100 + 15,
                            "color": (
                                "#ef4444"
                                if suspicion >= 0.9
                                else (
                                    "#f97316"
                                    if suspicion >= 0.7
                                    else "#eab308" if suspicion >= 0.5 else "#22c55e"
                                )
                            ),
                            "highlighted": w == wallet_address,
                            "is_illicit": is_illicit,
                        }
                    )

                # Build edges
                edges = []
                for source, dest, edge_data in wallet_edges:
                    edges.append(
                        {
                            "from": source,
                            "to": dest,
                            "value": edge_data.get("total_amount", 0),
                            "label": format_crypto_label(
                                edge_data.get("total_amount", 0)
                            ),
                            "transactions": edge_data.get("transaction_count", 1),
                            "width": min(edge_data.get("transaction_count", 1) / 2, 10),
                        }
                    )

                graph_data = {
                    "nodes": nodes,
                    "edges": edges,
                    "graph_statistics": {
                        "total_nodes": len(nodes),
                        "total_edges": len(edges),
                        "illicit_nodes": sum(
                            1 for n in nodes if n.get("is_illicit", False)
                        ),
                        "high_risk_nodes": sum(
                            1 for n in nodes if n["suspicion_score"] >= 0.7
                        ),
                    },
                }
        except Exception as e:
            print(f"Error generating graph data: {e}")

        # Fallback to simplified graph if generation fails
        if not graph_data:
            graph_data = {
                "nodes": [
                    {
                        "id": wallet_address,
                        "label": formatWalletAddress(wallet_address, 6),
                        "suspicion_score": wallet_data["suspicion_score"],
                        "size": 30,
                        "color": (
                            "#ef4444"
                            if wallet_data["risk_level"] == "critical"
                            else (
                                "#f97316"
                                if wallet_data["risk_level"] == "high"
                                else "#eab308"
                            )
                        ),
                        "highlighted": True,
                    }
                ],
                "edges": [],
                "graph_statistics": {
                    "total_nodes": 1,
                    "total_edges": 0,
                    "illicit_nodes": (
                        1 if wallet_data.get("distance_to_illicit", 999) == 0 else 0
                    ),
                    "high_risk_nodes": (
                        1 if wallet_data["risk_level"] in ["high", "critical"] else 0
                    ),
                },
            }

        return jsonify(
            {
                **case,
                "wallet_analysis": wallet_analysis,
                "prediction": prediction,
                "graph_data": graph_data,
                "laundering_pattern": laundering_pattern,
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def formatWalletAddress(address, chars=6):
    """Helper function to format wallet address"""
    if len(address) <= chars * 2:
        return address
    return f"{address[:chars]}...{address[-chars:]}"


@app.route("/api/cases", methods=["POST"])
def create_case():
    """
    Create a new investigation case from wallet analysis

    Request body:
        - wallet_address: Primary wallet
        - suspicion_score: AI/ML score
        - patterns: Detected pattern counts
        - distance_to_illicit: Hops to blacklisted wallet
        - risk_indicators: List of narrative reasons
    """
    global case_counter

    try:
        data = request.get_json()

        if not data or "wallet_address" not in data:
            return jsonify({"error": "wallet_address required"}), 400

        case_id = f"CASE-2026-{case_counter:03d}"
        case_counter += 1

        case = {
            "case_id": case_id,
            "status": "New",
            "primary_wallet": data["wallet_address"],
            "suspicion_score": data.get("suspicion_score", 0),
            "patterns": {
                "smurfing": data.get("patterns", {}).get("smurfing_patterns", 0),
                "peeling_chains": data.get("patterns", {}).get("peeling_chains", 0),
            },
            "distance_to_illicit": data.get("distance_to_illicit", None),
            "risk_indicators": data.get("risk_indicators", []),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "notes": [],
            "laundering_pattern": data.get("laundering_pattern", {}),
        }

        cases_db[case_id] = case

        # Update dashboard metrics
        dashboard_cache["open_cases"] += 1
        if case["suspicion_score"] >= 0.7:
            dashboard_cache["active_alerts"] += 1

        # Emit case creation log
        emit_log(
            f"🔍 New investigation case opened: {case_id}",
            "warning" if case["suspicion_score"] >= 0.7 else "info",
            {
                "case_id": case_id,
                "wallet": data["wallet_address"][:16] + "...",
                "score": f"{case['suspicion_score']:.2f}",
                "patterns": f"{case['patterns']['smurfing']} smurfing, {case['patterns']['peeling_chains']} peeling",
            },
        )

        return jsonify(case), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/cases/<case_id>", methods=["PATCH"])
def update_case(case_id):
    """
    Update case status or add notes

    Request body:
        - status: New case status
        - note: Add investigation note
    """
    try:
        case = cases_db.get(case_id)

        if not case:
            return jsonify({"error": "Case not found"}), 404

        data = request.get_json()

        if "status" in data:
            old_status = case["status"]
            case["status"] = data["status"]

            # Update dashboard metrics
            if old_status != "Closed" and data["status"] == "Closed":
                dashboard_cache["open_cases"] -= 1
                if case["suspicion_score"] >= 0.7:
                    dashboard_cache["active_alerts"] -= 1

        if "note" in data:
            case["notes"].append(
                {"text": data["note"], "timestamp": datetime.now().isoformat()}
            )

        case["updated_at"] = datetime.now().isoformat()

        return jsonify(case)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/cases/<case_id>", methods=["DELETE"])
def delete_case(case_id):
    """Delete a case"""
    try:
        if case_id not in cases_db:
            return jsonify({"error": "Case not found"}), 404

        case = cases_db[case_id]

        # Update metrics
        if case["status"] != "Closed":
            dashboard_cache["open_cases"] -= 1
            if case["suspicion_score"] >= 0.7:
                dashboard_cache["active_alerts"] -= 1

        del cases_db[case_id]

        return jsonify({"message": "Case deleted successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/cases/<case_id>/explain", methods=["POST"])
def explain_case(case_id):
    """
    Generate AI explanation for a case using Gemini

    Uses the case data and wallet analysis to generate
    a detailed explanation of the suspicious activity
    """
    try:
        case = cases_db.get(case_id)
        if not case:
            return jsonify({"error": "Case not found"}), 404

        # Get Gemini explainer
        explainer = get_gemini_explainer()
        if not explainer:
            return jsonify(
                {
                    "explanation": "AI explanation service not available. Please configure Gemini API key.",
                    "risk_level": case.get("suspicion_score", 0),
                    "key_indicators": case.get("risk_indicators", []),
                }
            )

        # Find wallet data
        wallet_address = case["primary_wallet"]
        wallet_data = None
        for wallet in dashboard_cache.get("analyzed_wallets", []):
            if wallet["wallet_address"] == wallet_address:
                wallet_data = wallet
                break

        if not wallet_data:
            return jsonify(
                {
                    "explanation": f"Unable to generate explanation. Wallet {wallet_address} not found in analysis cache.",
                    "risk_level": case.get("suspicion_score", 0),
                    "key_indicators": case.get("risk_indicators", []),
                }
            )

        # Generate explanation using Gemini
        laundering_pattern = wallet_data.get("laundering_pattern", {})

        try:
            explanation = explainer.explain_risk_indicators(
                wallet_address=wallet_address,
                suspicion_score=wallet_data["suspicion_score"],
                risk_level=wallet_data["risk_level"],
                pattern_type=laundering_pattern.get("type", "UNKNOWN"),
                pattern_confidence=laundering_pattern.get("confidence", 0),
                evidence=laundering_pattern.get("evidence", []),
                total_volume=wallet_data.get("total_received", 0)
                + wallet_data.get("total_sent", 0),
                counterparties=wallet_data.get("unique_counterparties", 0),
                distance_to_illicit=wallet_data.get("distance_to_illicit", None),
            )

            return jsonify(
                {
                    "explanation": explanation,
                    "risk_level": wallet_data["suspicion_score"],
                    "pattern_type": laundering_pattern.get("type", "UNKNOWN"),
                    "key_indicators": case.get("risk_indicators", []),
                    "generated_at": datetime.now().isoformat(),
                }
            )

        except Exception as e:
            print(f"Error generating Gemini explanation: {e}")
            # Fallback to rule-based explanation
            return jsonify(
                {
                    "explanation": _generate_fallback_explanation(
                        wallet_data, laundering_pattern
                    ),
                    "risk_level": wallet_data["suspicion_score"],
                    "pattern_type": laundering_pattern.get("type", "UNKNOWN"),
                    "key_indicators": case.get("risk_indicators", []),
                }
            )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _generate_fallback_explanation(wallet_data, laundering_pattern):
    """Generate rule-based explanation when Gemini is unavailable"""
    pattern_type = laundering_pattern.get("type", "UNKNOWN")
    suspicion = wallet_data["suspicion_score"]
    risk_level = wallet_data["risk_level"]

    explanations = {
        "FAN_OUT_FAN_IN": f"This wallet shows a {risk_level} risk smurfing pattern (fan-out/fan-in). Funds are being split across multiple intermediary wallets and then reconsolidated, which is a classic money laundering technique used to obscure the trail of funds.",
        "MULTI_LAYER_REAGGREGATION": f"Detected {risk_level} risk multi-layer reaggregation pattern. The wallet is part of a complex network where funds are distributed and recollected through multiple layers, indicating sophisticated laundering activity.",
        "PEELING_CHAIN": f"This wallet exhibits {risk_level} risk peeling chain behavior. Funds are being gradually withdrawn in decreasing amounts through a chain of transactions, typical of organized crime operations.",
        "SEQUENTIAL_PEEL": f"Sequential peeling pattern detected with {risk_level} risk. Small amounts are systematically removed at each step, designed to avoid detection thresholds.",
        "CYCLIC_WASH": f"Circular transaction pattern identified with {risk_level} risk. Funds are moving in cycles through multiple wallets to create confusion and distance from the original source.",
        "TEMPORAL_LAYERING": f"Time-based layering detected with {risk_level} risk. Transactions are structured across specific time intervals to evade velocity-based detection systems.",
        "MIXED_STRATEGY": f"Complex {risk_level} risk mixed strategy detected. Multiple laundering techniques are being used simultaneously, indicating highly sophisticated criminal activity.",
    }

    base_explanation = explanations.get(
        pattern_type,
        f"This wallet has a {risk_level} risk level with a suspicion score of {suspicion:.0%}. ",
    )

    # Add volume context
    volume = wallet_data.get("total_received", 0) + wallet_data.get("total_sent", 0)
    if volume > 100000:
        base_explanation += (
            f" High transaction volume of ${volume:,.0f} increases concern."
        )

    # Add illicit connection context
    distance = wallet_data.get("distance_to_illicit", None)
    if distance == 0:
        base_explanation += (
            " CRITICAL: Direct connection to known illicit wallet detected."
        )
    elif distance and distance <= 2:
        base_explanation += (
            f" Warning: Only {distance} hop(s) away from known illicit wallets."
        )

    # Add evidence if available
    evidence = laundering_pattern.get("evidence", [])
    if evidence:
        base_explanation += "\n\nKey Evidence:\n" + "\n".join(
            f"• {e}" for e in evidence[:5]
        )

    return base_explanation


@app.route("/api/visualization/graph", methods=["GET"])
def get_visualization_graph():
    """
    Get transaction graph visualization from analyzed wallets

    Returns:
        - nodes: List of wallet nodes with suspicion scores
        - edges: Transaction relationships between wallets
        - graph_statistics: Summary metrics
    """
    try:
        # Get all analyzed wallets
        wallets = dashboard_cache.get("analyzed_wallets", [])

        if len(wallets) == 0:
            return jsonify(
                {
                    "nodes": [],
                    "edges": [],
                    "graph_statistics": {
                        "total_nodes": 0,
                        "total_edges": 0,
                        "illicit_nodes": 0,
                        "high_risk_nodes": 0,
                    },
                }
            )

        # Build nodes from analyzed wallets
        nodes = []
        for wallet in wallets:
            suspicion_score = wallet.get("suspicion_score", 0)

            # Determine color based on risk
            if suspicion_score >= 0.85:
                color = "#ef4444"  # red
            elif suspicion_score >= 0.70:
                color = "#f97316"  # orange
            elif suspicion_score >= 0.40:
                color = "#eab308"  # yellow
            else:
                color = "#22c55e"  # green

            # Calculate size based on volume and score
            base_size = 10
            score_size = suspicion_score * 25
            volume = wallet.get("wallet_metrics", {}).get(
                "total_received", 0
            ) or wallet.get("total_received", 0)
            volume_size = min(volume / 5000, 20)
            size = base_size + score_size + volume_size

            wallet_addr = wallet.get("wallet_address", "")
            node = {
                "id": wallet_addr,
                "label": (
                    wallet_addr[:8] + "..." + wallet_addr[-4:]
                    if len(wallet_addr) > 12
                    else wallet_addr
                ),
                "suspicion_score": suspicion_score,
                "size": size,
                "color": color,
                "highlighted": suspicion_score >= 0.8,
                "is_illicit": (
                    wallet.get("distance_to_illicit") == 0
                    if wallet.get("distance_to_illicit") is not None
                    else False
                ),
            }
            nodes.append(node)

        # Generate edges based on transaction graph and laundering patterns
        edges = []
        wallet_ids = {w.get("wallet_address") for w in wallets}

        # Build edges from the transaction graph
        for wallet in wallets:
            wallet_addr = wallet.get("wallet_address", "")
            laundering = wallet.get("laundering_pattern", {})

            # Create edges from sources (incoming transactions)
            if laundering.get("sources"):
                for source in laundering["sources"][:5]:  # Up to 5 sources
                    source_wallet = source.get("wallet", "")
                    # Only create edge if both nodes exist in our wallet list
                    if source_wallet and source_wallet in wallet_ids:
                        edges.append(
                            {
                                "from": source_wallet,
                                "to": wallet_addr,
                                "value": source.get("amount", 100),
                                "label": format_crypto_label(source.get("amount", 100)),
                                "transactions": source.get("transaction_count", 1),
                                "width": min(
                                    max(source.get("transaction_count", 1) / 2, 1), 5
                                ),
                            }
                        )

            # Create edges to destinations (outgoing transactions)
            if laundering.get("destinations"):
                for dest in laundering["destinations"][:5]:  # Up to 5 destinations
                    dest_wallet = dest.get("wallet", "")
                    # Only create edge if both nodes exist in our wallet list
                    if dest_wallet and dest_wallet in wallet_ids:
                        edges.append(
                            {
                                "from": wallet_addr,
                                "to": dest_wallet,
                                "value": dest.get("amount", 100),
                                "label": format_crypto_label(dest.get("amount", 100)),
                                "transactions": dest.get("transaction_count", 1),
                                "width": min(
                                    max(dest.get("transaction_count", 1) / 2, 1), 5
                                ),
                            }
                        )

        # If no edges from laundering patterns, create edges based on proximity/risk
        # This ensures the graph is always connected and meaningful
        # Use a more aggressive threshold: create synthetic edges if we have less than 50% connectivity
        min_edges_needed = max(
            len(nodes) // 2, len(nodes) - 1
        )  # At least half the nodes should have edges

        if len(edges) < min_edges_needed:  # If too few edges
            print(
                f"[DEBUG] Creating synthetic edges for better visualization ({len(edges)} edges, need {min_edges_needed})"
            )
            # Sort wallets by suspicion score
            sorted_wallets = sorted(
                wallets, key=lambda x: x.get("suspicion_score", 0), reverse=True
            )

            # Create hub-and-spoke pattern with high-risk wallets as hubs
            high_risk_hubs = [
                w for w in sorted_wallets if w.get("suspicion_score", 0) >= 0.7
            ][:5]
            medium_risk = [
                w for w in sorted_wallets if 0.4 <= w.get("suspicion_score", 0) < 0.7
            ]
            low_risk = [w for w in sorted_wallets if w.get("suspicion_score", 0) < 0.4]

            if high_risk_hubs:
                # Connect high-risk hubs to medium and low-risk wallets (money flow)
                for hub in high_risk_hubs:
                    hub_addr = hub.get("wallet_address", "")
                    # Connect to up to 8 medium-risk wallets (incoming)
                    for wallet in medium_risk[:8]:
                        wallet_addr = wallet.get("wallet_address", "")
                        if wallet_addr != hub_addr and wallet_addr:
                            edges.append(
                                {
                                    "from": wallet_addr,
                                    "to": hub_addr,
                                    "value": hub.get("total_received", 1000)
                                    / max(len(medium_risk), 1),
                                    "label": format_crypto_label(
                                        hub.get("total_received", 1000)
                                        / max(len(medium_risk), 1)
                                    ),
                                    "transactions": 1,
                                    "width": 2,
                                }
                            )

                    # Connect hub to low-risk wallets (outgoing)
                    for wallet in low_risk[:8]:
                        wallet_addr = wallet.get("wallet_address", "")
                        if wallet_addr != hub_addr and wallet_addr:
                            edges.append(
                                {
                                    "from": hub_addr,
                                    "to": wallet_addr,
                                    "value": hub.get("total_sent", 800)
                                    / max(len(low_risk), 1),
                                    "label": format_crypto_label(
                                        hub.get("total_sent", 800)
                                        / max(len(low_risk), 1)
                                    ),
                                    "transactions": 1,
                                    "width": 1.5,
                                }
                            )

            # Create chain connections for remaining wallets to ensure connectivity
            for i in range(min(len(sorted_wallets) - 1, len(sorted_wallets) - 1)):
                from_wallet = sorted_wallets[i].get("wallet_address", "")
                to_wallet = sorted_wallets[i + 1].get("wallet_address", "")
                if from_wallet and to_wallet:
                    # Avoid creating duplicate edges
                    edge_exists = any(
                        e["from"] == from_wallet and e["to"] == to_wallet for e in edges
                    )
                    if not edge_exists:
                        edges.append(
                            {
                                "from": from_wallet,
                                "to": to_wallet,
                                "value": sorted_wallets[i].get("total_sent", 500) / 2,
                                "label": format_crypto_label(
                                    sorted_wallets[i].get("total_sent", 500) / 2
                                ),
                                "transactions": 1,
                                "width": 1.5,
                            }
                        )

        # Remove duplicate edges
        seen_edges = set()
        unique_edges = []
        for edge in edges:
            edge_key = (edge["from"], edge["to"])
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                unique_edges.append(edge)
        edges = unique_edges

        # Calculate statistics
        high_risk_count = sum(1 for n in nodes if n["suspicion_score"] >= 0.8)
        illicit_count = sum(1 for n in nodes if n.get("is_illicit", False))

        print(f"[DEBUG] Returning {len(nodes)} nodes and {len(edges)} edges")

        return jsonify(
            {
                "nodes": nodes,
                "edges": edges,
                "graph_statistics": {
                    "total_nodes": len(nodes),
                    "total_edges": len(edges),
                    "illicit_nodes": illicit_count,
                    "high_risk_nodes": high_risk_count,
                },
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===================== REAL-TIME LOG STREAM (SSE) =====================

# Global log queue for SSE
log_queue = queue.Queue(maxsize=100)


def generate_log_stream():
    """Generate server-sent events for real-time logs"""
    while True:
        try:
            # Non-blocking get with timeout
            log_entry = log_queue.get(timeout=30)
            yield f"data: {log_entry}\n\n"
        except queue.Empty:
            # Send keepalive
            yield f"data: {{'type': 'keepalive', 'timestamp': '{datetime.now().isoformat()}'}}\n\n"


@app.route("/api/logs/stream", methods=["GET"])
def log_stream():
    """
    Real-time log stream using Server-Sent Events (SSE)

    Returns a stream of JSON log entries:
        - message: Log message text
        - type: 'info' | 'warning' | 'alert' | 'success'
        - timestamp: ISO timestamp
        - details: Additional context
    """
    return Response(
        stream_with_context(generate_log_stream()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def emit_log(message, log_type="info", details=None):
    """
    Emit a log entry to the SSE stream

    Args:
        message: Log message
        log_type: 'info' | 'warning' | 'alert' | 'success'
        details: Optional additional context
    """
    log_entry = {
        "message": message,
        "type": log_type,
        "timestamp": datetime.now().isoformat(),
        "details": details or {},
    }

    try:
        log_queue.put_nowait(json.dumps(log_entry))
    except queue.Full:
        # Queue full, drop oldest entry
        try:
            log_queue.get_nowait()
            log_queue.put_nowait(json.dumps(log_entry))
        except:
            pass


# ===================== METAMASK WALLET MONITORING =====================

# Store monitored wallets
monitored_wallets = {}


@app.route("/api/wallet/monitor", methods=["POST"])
def monitor_wallet():
    """
    Monitor a wallet address for real-time analysis

    Request body:
        - wallet_address: Ethereum wallet address
        - auto_analyze: Whether to automatically analyze (default: true)

    Returns:
        - wallet_address: The monitored address
        - analysis_result: Risk analysis if auto_analyze is true
        - status: Monitoring status
    """
    try:
        data = request.get_json()
        wallet_address = data.get("wallet_address")
        auto_analyze = data.get("auto_analyze", True)

        if not wallet_address:
            return jsonify({"error": "wallet_address is required"}), 400

        # Validate wallet address format (basic check)
        if not wallet_address.startswith("0x") or len(wallet_address) != 42:
            return jsonify({"error": "Invalid Ethereum wallet address format"}), 400

        # Add to monitored wallets
        monitored_wallets[wallet_address] = {
            "added_at": datetime.now().isoformat(),
            "last_checked": datetime.now().isoformat(),
            "analysis_count": 0,
        }

        response = {
            "wallet_address": wallet_address,
            "status": "monitoring",
            "message": "Wallet added to monitoring list",
        }

        # Perform immediate analysis if requested
        if auto_analyze:
            # Simulate transaction data analysis
            # In production, this would fetch real blockchain data
            suspicion_score = 0.3 + np.random.random() * 0.7  # 0.3 to 1.0

            # Determine risk level
            if suspicion_score >= 0.85:
                risk_level = "critical"
            elif suspicion_score >= 0.70:
                risk_level = "high"
            elif suspicion_score >= 0.40:
                risk_level = "medium"
            else:
                risk_level = "low"

            # Generate realistic transaction metrics
            total_received = int(10000 + np.random.random() * 200000)
            total_sent = int(total_received * (0.80 + np.random.random() * 0.15))
            counterparties = int(5 + np.random.random() * 50)

            analysis_result = {
                "wallet_address": wallet_address,
                "suspicion_score": float(suspicion_score),
                "risk_level": risk_level,
                "classification": "positive" if suspicion_score > 0.5 else "negative",
                "total_received": total_received,
                "total_sent": total_sent,
                "unique_counterparties": counterparties,
                "centrality_score": 0.03 + np.random.random() * 0.08,
                "timestamp": datetime.now().isoformat(),
            }

            # Add to dashboard cache for live feed
            wallet_data = {
                "wallet_address": wallet_address,
                "suspicion_score": suspicion_score,
                "risk_level": risk_level,
                "classification": analysis_result["classification"],
                "total_received": total_received,
                "total_sent": total_sent,
                "unique_counterparties": counterparties,
                "centrality_score": analysis_result["centrality_score"],
                "timestamp": time.time(),
                "source": "metamask",  # Tag as user-submitted
            }

            # Add to live wallets for dashboard display
            if not hasattr(dashboard_cache, "live_wallets"):
                dashboard_cache["live_wallets"] = []

            dashboard_cache["live_wallets"].append(wallet_data)
            dashboard_cache["live_wallets"] = dashboard_cache["live_wallets"][-100:]

            # Update dashboard metrics
            dashboard_cache["total_wallets_analyzed"] += 1
            if risk_level in ["critical", "high"]:
                dashboard_cache["active_alerts"] = (
                    dashboard_cache.get("active_alerts", 0) + 1
                )

            # Emit log event
            emit_log(
                f"MetaMask wallet {wallet_address[:10]}... analyzed",
                "info" if risk_level == "low" else "alert",
                {
                    "wallet": wallet_address,
                    "risk": risk_level,
                    "score": f"{int(suspicion_score * 100)}%",
                },
            )

            response["analysis_result"] = analysis_result
            monitored_wallets[wallet_address]["analysis_count"] += 1
            monitored_wallets[wallet_address]["last_analysis"] = analysis_result

        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/wallet/monitored", methods=["GET"])
def get_monitored_wallets():
    """Get list of all monitored wallets"""
    try:
        wallets = [
            {
                "wallet_address": addr,
                "monitoring_info": info,
                "last_analysis": info.get("last_analysis"),
            }
            for addr, info in monitored_wallets.items()
        ]

        return jsonify({"monitored_wallets": wallets, "total": len(wallets)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/visualization/patterns", methods=["GET"])
def get_pattern_statistics():
    """
    Get detailed pattern statistics from analyzed wallets

    Returns:
        - smurfing_patterns: Count and details of smurfing patterns
        - layering_chains: Transaction layering detected
        - rapid_movement: High-velocity transaction patterns
        - mixing_hubs: Central mixing nodes
        - total_patterns: Total patterns detected
    """
    try:
        wallets = dashboard_cache.get("analyzed_wallets", [])

        if not wallets:
            return jsonify(
                {
                    "smurfing_patterns": 0,
                    "layering_chains": 0,
                    "rapid_movement": 0,
                    "mixing_hubs": 0,
                    "circular_flows": 0,
                    "total_patterns": 0,
                    "pattern_details": [],
                }
            )

        smurfing_count = 0
        layering_count = 0
        rapid_movement_count = 0
        mixing_hub_count = 0
        circular_flow_count = 0
        pattern_details = []

        for wallet in wallets:
            wallet_addr = wallet.get("wallet_address", "")
            laundering = wallet.get("laundering_pattern", {})

            # Detect smurfing (fan-out/fan-in patterns)
            sources = laundering.get("sources", [])
            destinations = laundering.get("destinations", [])

            if len(sources) > 5 or len(destinations) > 5:
                smurfing_count += 1
                if len(sources) > 5:
                    pattern_details.append(
                        {
                            "type": "smurfing_fanin",
                            "wallet": wallet_addr,
                            "count": len(sources),
                            "description": f"{len(sources)} sources funneling to this wallet",
                        }
                    )
                if len(destinations) > 5:
                    pattern_details.append(
                        {
                            "type": "smurfing_fanout",
                            "wallet": wallet_addr,
                            "count": len(destinations),
                            "description": f"{len(destinations)} destinations dispersing from this wallet",
                        }
                    )

            # Detect layering (multiple transaction hops)
            distance = wallet.get("distance_to_illicit")
            if distance is not None and 1 <= distance <= 3:
                layering_count += 1
                pattern_details.append(
                    {
                        "type": "layering",
                        "wallet": wallet_addr,
                        "hops": distance,
                        "description": f"{distance} hops from known illicit wallet",
                    }
                )

            # Detect rapid movement (high transaction velocity)
            wallet_metrics = wallet.get("wallet_metrics", {})
            total_tx = wallet_metrics.get("unique_senders", 0) + wallet_metrics.get(
                "unique_receivers", 0
            )
            if total_tx > 20:
                rapid_movement_count += 1
                pattern_details.append(
                    {
                        "type": "rapid_movement",
                        "wallet": wallet_addr,
                        "transactions": total_tx,
                        "description": f"{total_tx} unique transaction counterparties",
                    }
                )

            # Detect mixing hubs (high centrality)
            centrality = wallet.get("centrality_score", 0)
            if centrality > 0.6:
                mixing_hub_count += 1
                pattern_details.append(
                    {
                        "type": "mixing_hub",
                        "wallet": wallet_addr,
                        "centrality": round(centrality, 3),
                        "description": "High centrality score indicates mixing hub",
                    }
                )

            # Detect circular flows (similar in/out amounts)
            total_received = wallet_metrics.get("total_received", 0)
            total_sent = wallet_metrics.get("total_sent", 0)
            if total_received > 0 and total_sent > 0:
                ratio = min(total_received, total_sent) / max(
                    total_received, total_sent
                )
                if ratio > 0.85:
                    circular_flow_count += 1
                    pattern_details.append(
                        {
                            "type": "circular_flow",
                            "wallet": wallet_addr,
                            "ratio": round(ratio, 3),
                            "description": "Balanced in/out flow indicates layering",
                        }
                    )

        total_patterns = (
            smurfing_count
            + layering_count
            + rapid_movement_count
            + mixing_hub_count
            + circular_flow_count
        )

        return jsonify(
            {
                "smurfing_patterns": smurfing_count,
                "layering_chains": layering_count,
                "rapid_movement": rapid_movement_count,
                "mixing_hubs": mixing_hub_count,
                "circular_flows": circular_flow_count,
                "total_patterns": total_patterns,
                "pattern_details": pattern_details[:50],  # Limit to 50 most recent
                "timestamp": datetime.now().isoformat(),
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/visualization/network-stats", methods=["GET"])
def get_network_statistics():
    """
    Get comprehensive network statistics for visualization

    Returns detailed network metrics including:
        - Network density
        - Average degree
        - Clustering coefficient
        - Connected components
        - Risk distribution
    """
    try:
        wallets = dashboard_cache.get("analyzed_wallets", [])

        if not wallets:
            return jsonify(
                {
                    "network_density": 0,
                    "average_degree": 0,
                    "clustering_coefficient": 0,
                    "connected_components": 0,
                    "risk_distribution": {
                        "critical": 0,
                        "high": 0,
                        "medium": 0,
                        "low": 0,
                    },
                    "total_volume": 0,
                    "average_suspicion": 0,
                }
            )

        # Calculate risk distribution
        critical_count = sum(1 for w in wallets if w.get("suspicion_score", 0) >= 0.85)
        high_count = sum(
            1 for w in wallets if 0.70 <= w.get("suspicion_score", 0) < 0.85
        )
        medium_count = sum(
            1 for w in wallets if 0.40 <= w.get("suspicion_score", 0) < 0.70
        )
        low_count = sum(1 for w in wallets if w.get("suspicion_score", 0) < 0.40)

        # Calculate total volume
        total_volume = sum(
            w.get("wallet_metrics", {}).get("total_received", 0)
            or w.get("total_received", 0)
            for w in wallets
        )

        # Calculate average suspicion score
        avg_suspicion = sum(w.get("suspicion_score", 0) for w in wallets) / len(wallets)

        # Calculate network metrics
        total_edges = sum(
            len(w.get("laundering_pattern", {}).get("sources", []))
            + len(w.get("laundering_pattern", {}).get("destinations", []))
            for w in wallets
        )

        # Average degree (average connections per node)
        avg_degree = total_edges / len(wallets) if len(wallets) > 0 else 0

        # Network density (actual edges / possible edges)
        possible_edges = len(wallets) * (len(wallets) - 1) / 2
        network_density = total_edges / possible_edges if possible_edges > 0 else 0

        # Approximate clustering coefficient based on patterns
        clustering_coefficient = min(avg_degree / 10, 1.0)  # Rough approximation

        # Estimate connected components (groups of connected wallets)
        # Wallets with similar risk levels or close proximity are likely connected
        connected_components = max(1, len(wallets) // 5)

        return jsonify(
            {
                "network_density": round(network_density, 4),
                "average_degree": round(avg_degree, 2),
                "clustering_coefficient": round(clustering_coefficient, 3),
                "connected_components": connected_components,
                "risk_distribution": {
                    "critical": critical_count,
                    "high": high_count,
                    "medium": medium_count,
                    "low": low_count,
                },
                "total_volume": round(total_volume, 2),
                "average_suspicion": round(avg_suspicion, 4),
                "total_nodes": len(wallets),
                "total_edges": total_edges,
                "timestamp": datetime.now().isoformat(),
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/debug/cache-status", methods=["GET"])
def get_cache_status():
    """
    Debug endpoint to check cache status
    """
    try:
        return jsonify(
            {
                "analyzed_wallets_count": len(
                    dashboard_cache.get("analyzed_wallets", [])
                ),
                "total_wallets_analyzed": dashboard_cache.get(
                    "total_wallets_analyzed", 0
                ),
                "active_alerts": dashboard_cache.get("active_alerts", 0),
                "open_cases": dashboard_cache.get("open_cases", 0),
                "volume_24h": dashboard_cache.get("volume_24h", 0),
                "smurfing_patterns": dashboard_cache.get("smurfing_patterns", 0),
                "sample_wallets": [
                    {
                        "address": w.get("wallet_address", "")[:16] + "...",
                        "score": w.get("suspicion_score", 0),
                        "risk": w.get("risk_level", "unknown"),
                    }
                    for w in dashboard_cache.get("analyzed_wallets", [])[:5]
                ],
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/fan-out-fan-in/detect", methods=["GET"])
def detect_fan_out_fan_in_structures():
    """
    Detect fan-out/fan-in structures in analyzed wallets using GNN/graph analysis

    Returns:
        - structures: List of detected fan-out/fan-in patterns
        - statistics: Summary metrics
        - graph_metrics: Network analysis results
    """
    try:
        # Get analyzed wallets from cache
        wallets = dashboard_cache.get("analyzed_wallets", [])

        if len(wallets) == 0:
            return jsonify(
                {
                    "structures": [],
                    "statistics": {
                        "total_structures": 0,
                        "high_risk_structures": 0,
                        "total_wallets_involved": 0,
                        "avg_fan_out": 0,
                        "avg_fan_in": 0,
                    },
                    "graph_metrics": {
                        "network_density": 0,
                        "avg_clustering": 0,
                        "connected_components": 0,
                    },
                    "message": "No analyzed wallets available. Please run wallet analysis first from the Overview page.",
                }
            )

        detected_structures = []
        wallets_involved = set()
        total_fan_out = 0
        total_fan_in = 0
        high_risk_count = 0

        # Analyze each wallet for fan-out/fan-in patterns
        for wallet_data in wallets:
            wallet_addr = wallet_data.get("wallet_address", "")
            suspicion_score = wallet_data.get("suspicion_score", 0)
            laundering_pattern = wallet_data.get("laundering_pattern", {})

            # Extract fan-out/fan-in scores from laundering pattern components
            fan_out_component = laundering_pattern.get("components", {}).get(
                "fan_out_score", {}
            )
            fan_in_component = laundering_pattern.get("components", {}).get(
                "fan_in_score", {}
            )

            fan_out_value = (
                fan_out_component.get("score", 0)
                if isinstance(fan_out_component, dict)
                else 0
            )
            fan_in_value = (
                fan_in_component.get("score", 0)
                if isinstance(fan_in_component, dict)
                else 0
            )

            # Get sources and destinations
            sources = laundering_pattern.get("sources", [])[:10]  # Top 10 sources
            destinations = laundering_pattern.get("destinations", [])[
                :10
            ]  # Top 10 destinations

            # Get counts from component details
            fan_out_details = (
                fan_out_component.get("details", {})
                if isinstance(fan_out_component, dict)
                else {}
            )
            fan_in_details = (
                fan_in_component.get("details", {})
                if isinstance(fan_in_component, dict)
                else {}
            )
            destination_count = fan_out_details.get(
                "destination_count", len(destinations)
            )
            source_count = fan_in_details.get("source_count", len(sources))

            # ADJUSTED THRESHOLDS: The suspicion_breakdown uses max 0.35 for fan_out and 0.28 for fan_in
            # Detect significant patterns with realistic thresholds
            is_significant = (
                (
                    fan_out_value >= 0.15 and destination_count >= 5
                )  # Fan-out with multiple destinations
                or (
                    fan_in_value >= 0.12 and source_count >= 5
                )  # Fan-in with multiple sources
                or (fan_out_value >= 0.10 and fan_in_value >= 0.10)  # Combined pattern
                or (destination_count >= 10 or source_count >= 10)  # High degree nodes
                or (suspicion_score >= 0.6)  # High suspicion wallets
            )

            if is_significant:
                # Normalize scores to 0-1 range for display (max fan_out is 0.35, max fan_in is 0.28)
                normalized_fan_out = (
                    min(fan_out_value / 0.35, 1.0) if fan_out_value > 0 else 0
                )
                normalized_fan_in = (
                    min(fan_in_value / 0.28, 1.0) if fan_in_value > 0 else 0
                )

                # Determine structure type based on normalized scores
                if normalized_fan_out > normalized_fan_in and normalized_fan_out >= 0.4:
                    structure_type = "Fan-Out (Smurfing)"
                    primary_metric = normalized_fan_out
                    description = (
                        f"Wallet distributes funds to {destination_count} destinations"
                    )
                elif (
                    normalized_fan_in > normalized_fan_out and normalized_fan_in >= 0.4
                ):
                    structure_type = "Fan-In (Aggregation)"
                    primary_metric = normalized_fan_in
                    description = f"Wallet collects funds from {source_count} sources"
                elif destination_count >= 5 and source_count >= 5:
                    structure_type = "Fan-Out + Fan-In (Layering)"
                    primary_metric = (normalized_fan_out + normalized_fan_in) / 2
                    description = f"Wallet receives from {source_count} sources and sends to {destination_count} destinations"
                elif destination_count >= 10:
                    structure_type = "Fan-Out (Smurfing)"
                    primary_metric = max(normalized_fan_out, 0.5)
                    description = f"High fan-out: Wallet sends to {destination_count} destinations"
                elif source_count >= 10:
                    structure_type = "Fan-In (Aggregation)"
                    primary_metric = max(normalized_fan_in, 0.5)
                    description = (
                        f"High fan-in: Wallet receives from {source_count} sources"
                    )
                else:
                    structure_type = "Suspicious Activity"
                    primary_metric = max(
                        normalized_fan_out, normalized_fan_in, suspicion_score
                    )
                    description = f"Suspicious wallet with {source_count} sources and {destination_count} destinations"

                # Calculate risk level based on normalized metrics and suspicion score
                if primary_metric >= 0.8 or suspicion_score >= 0.8:
                    risk_level = "critical"
                    high_risk_count += 1
                elif primary_metric >= 0.6 or suspicion_score >= 0.6:
                    risk_level = "high"
                    high_risk_count += 1
                elif primary_metric >= 0.4:
                    risk_level = "medium"
                else:
                    risk_level = "low"

                # Get transaction volume
                total_received = wallet_data.get("total_received", 0)
                total_sent = wallet_data.get("total_sent", 0)

                structure = {
                    "wallet_address": wallet_addr,
                    "structure_type": structure_type,
                    "risk_level": risk_level,
                    "suspicion_score": suspicion_score,
                    "fan_out_score": normalized_fan_out,  # Use normalized score for display
                    "fan_in_score": normalized_fan_in,  # Use normalized score for display
                    "primary_metric": primary_metric,
                    "description": description,
                    "sources_count": source_count,
                    "destinations_count": destination_count,
                    "sources": [
                        {
                            "wallet": src.get("wallet", ""),
                            "amount": src.get("amount", 0),
                            "transaction_count": src.get("transaction_count", 0),
                        }
                        for src in sources
                    ],
                    "destinations": [
                        {
                            "wallet": dest.get("wallet", ""),
                            "amount": dest.get("amount", 0),
                            "transaction_count": dest.get("transaction_count", 0),
                        }
                        for dest in destinations
                    ],
                    "total_received": total_received,
                    "total_sent": total_sent,
                    "volume": total_received + total_sent,
                    "unique_counterparties": wallet_data.get(
                        "unique_counterparties", 0
                    ),
                    "distance_to_illicit": wallet_data.get("distance_to_illicit", None),
                }

                detected_structures.append(structure)
                wallets_involved.add(wallet_addr)
                total_fan_out += normalized_fan_out  # Use normalized for average
                total_fan_in += normalized_fan_in

        # Sort by primary metric (highest risk first)
        detected_structures = sorted(
            detected_structures,
            key=lambda x: (x["primary_metric"], x["suspicion_score"]),
            reverse=True,
        )

        # Calculate statistics
        num_structures = len(detected_structures)
        avg_fan_out = total_fan_out / num_structures if num_structures > 0 else 0
        avg_fan_in = total_fan_in / num_structures if num_structures > 0 else 0

        # Calculate graph metrics using NetworkX
        try:
            import networkx as nx

            G = nx.DiGraph()

            # Build graph from detected structures
            for structure in detected_structures:
                wallet = structure["wallet_address"]
                for src in structure["sources"]:
                    G.add_edge(src["wallet"], wallet, weight=src["amount"])
                for dest in structure["destinations"]:
                    G.add_edge(wallet, dest["wallet"], weight=dest["amount"])

            # Calculate graph metrics
            if len(G.nodes()) > 0:
                network_density = nx.density(G)
                # Clustering coefficient for directed graphs
                try:
                    avg_clustering = nx.average_clustering(G.to_undirected())
                except:
                    avg_clustering = 0
                connected_components = nx.number_weakly_connected_components(G)
            else:
                network_density = 0
                avg_clustering = 0
                connected_components = 0
        except:
            network_density = 0
            avg_clustering = 0
            connected_components = 0

        return jsonify(
            {
                "structures": detected_structures,
                "statistics": {
                    "total_structures": num_structures,
                    "high_risk_structures": high_risk_count,
                    "total_wallets_involved": len(wallets_involved),
                    "avg_fan_out": round(avg_fan_out, 3),
                    "avg_fan_in": round(avg_fan_in, 3),
                    "total_volume": sum(s["volume"] for s in detected_structures),
                },
                "graph_metrics": {
                    "network_density": round(network_density, 4),
                    "avg_clustering": round(avg_clustering, 4),
                    "connected_components": connected_components,
                    "total_nodes": len(G.nodes()) if "G" in locals() else 0,
                    "total_edges": len(G.edges()) if "G" in locals() else 0,
                },
            }
        )

    except Exception as e:
        print(f"[ERROR] Fan-out/fan-in detection failed: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ===================== PEELING CHAIN DETECTION ENDPOINT =====================


@app.route("/api/peeling-chains/detect", methods=["GET"])
def detect_peeling_chains():
    """
    Detect peeling chain patterns in analyzed wallets.

    Peeling chains are a money laundering technique where:
    - Small amounts are "peeled off" at each hop (typically for gas fees)
    - Time delays are introduced between transactions to hide the trail

    Returns:
        - chains: List of detected peeling chain patterns
        - statistics: Summary metrics
        - time_analysis: Time delay patterns
    """
    try:
        # Get analyzed wallets from cache
        wallets = dashboard_cache.get("analyzed_wallets", [])

        if len(wallets) == 0:
            return jsonify(
                {
                    "chains": [],
                    "statistics": {
                        "total_chains": 0,
                        "high_risk_chains": 0,
                        "avg_chain_length": 0,
                        "total_peeled_amount": 0,
                        "avg_peel_percentage": 0,
                    },
                    "time_analysis": {
                        "avg_delay_hours": 0,
                        "max_delay_hours": 0,
                        "chains_with_delays": 0,
                    },
                    "message": "No analyzed wallets available. Please run wallet analysis first from the Overview page.",
                }
            )

        detected_chains = []
        total_peeled = 0
        high_risk_count = 0
        all_delays = []
        chain_lengths = []
        peel_percentages = []

        # Build a combined graph from all analyzed wallets
        analyzer = CryptoGraphAnalyzer()

        # Collect all transactions from analyzed wallets to build graph
        all_transactions = []
        for wallet_data in wallets:
            # Get wallet metrics to build transaction patterns
            wallet_addr = wallet_data.get("wallet_address", "")
            wallet_metrics = wallet_data.get("wallet_metrics", {})
            total_received = wallet_metrics.get("total_received", 0)
            total_sent = wallet_metrics.get("total_sent", 0)

            # Get sources and destinations from laundering pattern
            laundering_pattern = wallet_data.get("laundering_pattern", {})
            sources = laundering_pattern.get("sources", [])
            destinations = laundering_pattern.get("destinations", [])

            # Create synthetic transactions for graph building
            base_time = datetime.now()

            for i, src in enumerate(sources):
                src_wallet = src.get("wallet", f"src_{i}")
                amount = src.get("amount", 0)
                if amount > 0:
                    all_transactions.append(
                        {
                            "source_wallet": src_wallet,
                            "dest_wallet": wallet_addr,
                            "amount": amount,
                            "timestamp": base_time - timedelta(hours=i * 2),
                            "token_type": get_crypto_for_wallet(src_wallet)["symbol"],
                        }
                    )

            for i, dest in enumerate(destinations):
                dest_wallet = dest.get("wallet", f"dest_{i}")
                amount = dest.get("amount", 0)
                if amount > 0:
                    all_transactions.append(
                        {
                            "source_wallet": wallet_addr,
                            "dest_wallet": dest_wallet,
                            "amount": amount,
                            "timestamp": base_time + timedelta(hours=i * 3),
                            "token_type": get_crypto_for_wallet(dest_wallet)["symbol"],
                        }
                    )

        # Load transactions into analyzer
        if all_transactions:
            analyzer.load_transactions(all_transactions)

        # Mark illicit wallets
        illicit_wallets = [
            w.get("wallet_address", "")
            for w in wallets
            if w.get("suspicion_score", 0) >= 0.7
        ]
        analyzer.mark_illicit_wallets(illicit_wallets)

        # Detect peeling chains for each wallet
        for wallet_data in wallets:
            wallet_addr = wallet_data.get("wallet_address", "")
            suspicion_score = wallet_data.get("suspicion_score", 0)
            peeling_data = wallet_data.get("peeling_chains", [])

            # Get actual peeling chains from the wallet analysis
            for chain_info in peeling_data:
                chain = chain_info.get("chain", [])
                amounts = chain_info.get("amounts", [])
                chain_score = chain_info.get("suspicion_score", 0)

                if len(chain) >= 3 and len(amounts) >= 2:
                    # Calculate peeling metrics
                    initial_amount = amounts[0] if amounts else 0
                    final_amount = amounts[-1] if amounts else 0
                    total_chain_peeled = (
                        initial_amount - final_amount
                        if initial_amount > final_amount
                        else 0
                    )
                    peel_percentage = (
                        (total_chain_peeled / initial_amount * 100)
                        if initial_amount > 0
                        else 0
                    )

                    # Calculate time delays (simulate based on chain length)
                    avg_delay = len(chain) * 2.5  # Average 2.5 hours between hops
                    total_delay = avg_delay * (len(chain) - 1)

                    # Generate hop details
                    hops = []
                    for i in range(len(chain) - 1):
                        hop_amount = amounts[i] if i < len(amounts) else 0
                        next_amount = (
                            amounts[i + 1] if i + 1 < len(amounts) else hop_amount
                        )
                        peeled = (
                            hop_amount - next_amount if hop_amount > next_amount else 0
                        )

                        # Determine crypto for this hop
                        crypto = get_crypto_for_wallet(chain[i])
                        crypto_amount = hop_amount * crypto["conversion_rate"]
                        peeled_crypto = peeled * crypto["conversion_rate"]

                        hops.append(
                            {
                                "from_wallet": chain[i],
                                "to_wallet": chain[i + 1],
                                "amount": hop_amount,
                                "amount_formatted": format_crypto_amount(
                                    hop_amount, chain[i]
                                ),
                                "peeled_amount": peeled,
                                "peeled_formatted": (
                                    format_crypto_amount(peeled, chain[i])
                                    if peeled > 0
                                    else "0"
                                ),
                                "delay_hours": avg_delay
                                + (i * 0.5),  # Increasing delays
                                "hop_number": i + 1,
                                "crypto_symbol": crypto["symbol"],
                            }
                        )

                    # Determine risk level
                    combined_score = (chain_score + suspicion_score) / 2
                    if combined_score >= 0.8 or len(chain) >= 10:
                        risk_level = "critical"
                        high_risk_count += 1
                    elif combined_score >= 0.6 or len(chain) >= 7:
                        risk_level = "high"
                        high_risk_count += 1
                    elif combined_score >= 0.4 or len(chain) >= 5:
                        risk_level = "medium"
                    else:
                        risk_level = "low"

                    detected_chains.append(
                        {
                            "chain_id": f"PC-{len(detected_chains) + 1:04d}",
                            "source_wallet": chain[0],
                            "destination_wallet": chain[-1],
                            "chain_length": len(chain),
                            "chain_wallets": chain,
                            "hops": hops,
                            "initial_amount": initial_amount,
                            "initial_amount_formatted": format_crypto_amount(
                                initial_amount, chain[0]
                            ),
                            "final_amount": final_amount,
                            "final_amount_formatted": format_crypto_amount(
                                final_amount, chain[-1]
                            ),
                            "total_peeled": total_chain_peeled,
                            "total_peeled_formatted": format_crypto_amount(
                                total_chain_peeled, chain[0]
                            ),
                            "peel_percentage": round(peel_percentage, 2),
                            "suspicion_score": round(chain_score, 3),
                            "risk_level": risk_level,
                            "avg_delay_hours": round(avg_delay, 2),
                            "total_delay_hours": round(total_delay, 2),
                            "time_pattern": (
                                "delayed"
                                if total_delay > 24
                                else "rapid" if total_delay < 6 else "normal"
                            ),
                            "description": f"Peeling chain with {len(chain)} hops, {peel_percentage:.1f}% peeled over {total_delay:.1f} hours",
                        }
                    )

                    # Accumulate statistics
                    total_peeled += total_chain_peeled
                    chain_lengths.append(len(chain))
                    peel_percentages.append(peel_percentage)
                    all_delays.append(total_delay)

        # If no peeling chains found from wallet data, generate synthetic examples for demo
        if len(detected_chains) == 0 and len(wallets) > 0:
            # Generate demo peeling chains based on analyzed wallets
            import random

            for i, wallet_data in enumerate(wallets[:5]):  # Top 5 wallets
                wallet_addr = wallet_data.get("wallet_address", "")
                suspicion_score = wallet_data.get("suspicion_score", 0)

                if suspicion_score >= 0.4:
                    # Generate a synthetic peeling chain
                    chain_length = random.randint(5, 12)
                    initial_amount = random.uniform(10000, 100000)
                    peel_rate = random.uniform(0.02, 0.08)  # 2-8% peel per hop

                    chain = [wallet_addr]
                    amounts = [initial_amount]
                    hops = []

                    current_amount = initial_amount
                    for j in range(chain_length - 1):
                        # Generate next wallet
                        next_wallet = f"0x{random.randint(0x1000000000000000, 0xFFFFFFFFFFFFFFFF):016x}"
                        chain.append(next_wallet)

                        # Peel amount (gas fee simulation)
                        peeled = current_amount * peel_rate
                        next_amount = current_amount - peeled
                        amounts.append(next_amount)

                        crypto = get_crypto_for_wallet(chain[j])
                        delay_hours = random.uniform(1, 8)

                        hops.append(
                            {
                                "from_wallet": chain[j],
                                "to_wallet": next_wallet,
                                "amount": current_amount,
                                "amount_formatted": format_crypto_amount(
                                    current_amount, chain[j]
                                ),
                                "peeled_amount": peeled,
                                "peeled_formatted": format_crypto_amount(
                                    peeled, chain[j]
                                ),
                                "delay_hours": round(delay_hours, 2),
                                "hop_number": j + 1,
                                "crypto_symbol": crypto["symbol"],
                            }
                        )

                        current_amount = next_amount

                    final_amount = amounts[-1]
                    total_chain_peeled = initial_amount - final_amount
                    peel_percentage = total_chain_peeled / initial_amount * 100
                    total_delay = sum(h["delay_hours"] for h in hops)

                    # Determine risk level
                    if suspicion_score >= 0.7 or chain_length >= 10:
                        risk_level = "critical" if suspicion_score >= 0.8 else "high"
                        high_risk_count += 1
                    elif suspicion_score >= 0.5 or chain_length >= 7:
                        risk_level = "medium"
                    else:
                        risk_level = "low"

                    detected_chains.append(
                        {
                            "chain_id": f"PC-{len(detected_chains) + 1:04d}",
                            "source_wallet": chain[0],
                            "destination_wallet": chain[-1],
                            "chain_length": chain_length,
                            "chain_wallets": chain,
                            "hops": hops,
                            "initial_amount": initial_amount,
                            "initial_amount_formatted": format_crypto_amount(
                                initial_amount, chain[0]
                            ),
                            "final_amount": final_amount,
                            "final_amount_formatted": format_crypto_amount(
                                final_amount, chain[-1]
                            ),
                            "total_peeled": total_chain_peeled,
                            "total_peeled_formatted": format_crypto_amount(
                                total_chain_peeled, chain[0]
                            ),
                            "peel_percentage": round(peel_percentage, 2),
                            "suspicion_score": round(suspicion_score, 3),
                            "risk_level": risk_level,
                            "avg_delay_hours": round(
                                total_delay / (chain_length - 1), 2
                            ),
                            "total_delay_hours": round(total_delay, 2),
                            "time_pattern": (
                                "delayed"
                                if total_delay > 24
                                else "rapid" if total_delay < 6 else "normal"
                            ),
                            "description": f"Peeling chain with {chain_length} hops, {peel_percentage:.1f}% peeled over {total_delay:.1f} hours",
                        }
                    )

                    total_peeled += total_chain_peeled
                    chain_lengths.append(chain_length)
                    peel_percentages.append(peel_percentage)
                    all_delays.append(total_delay)

        # Sort by suspicion score
        detected_chains = sorted(
            detected_chains, key=lambda x: x["suspicion_score"], reverse=True
        )

        # Calculate statistics
        num_chains = len(detected_chains)
        avg_chain_length = sum(chain_lengths) / num_chains if num_chains > 0 else 0
        avg_peel_percentage = (
            sum(peel_percentages) / num_chains if num_chains > 0 else 0
        )
        avg_delay = sum(all_delays) / num_chains if num_chains > 0 else 0
        max_delay = max(all_delays) if all_delays else 0
        chains_with_delays = sum(1 for d in all_delays if d > 12)  # More than 12 hours

        return jsonify(
            {
                "chains": detected_chains,
                "statistics": {
                    "total_chains": num_chains,
                    "high_risk_chains": high_risk_count,
                    "avg_chain_length": round(avg_chain_length, 1),
                    "total_peeled_amount": round(total_peeled, 2),
                    "total_peeled_formatted": format_crypto_amount(
                        total_peeled, "aggregate"
                    ),
                    "avg_peel_percentage": round(avg_peel_percentage, 2),
                },
                "time_analysis": {
                    "avg_delay_hours": round(avg_delay, 2),
                    "max_delay_hours": round(max_delay, 2),
                    "chains_with_delays": chains_with_delays,
                    "rapid_chains": sum(
                        1 for c in detected_chains if c.get("time_pattern") == "rapid"
                    ),
                    "delayed_chains": sum(
                        1 for c in detected_chains if c.get("time_pattern") == "delayed"
                    ),
                },
            }
        )

    except Exception as e:
        print(f"[ERROR] Peeling chain detection failed: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ===================== GATHER-SCATTER / CYCLIC PATTERN DETECTION =====================


@app.route("/api/gather-scatter/detect", methods=["GET"])
def detect_gather_scatter_patterns():
    """
    Detect Gather-Scatter (Cyclic) patterns in analyzed wallets

    Pattern: Wallet A → {B,C,D,E} (Scatter) → {F,G,H} (Intermediate) → Wallet Z (Gather)

    This is a multi-layer money laundering technique where:
    1. Source wallet scatters funds to multiple intermediaries (Fan-Out)
    2. Intermediaries may pass through additional layers
    3. Funds reconverge at a destination wallet (Fan-In)

    Returns:
        - patterns: List of detected gather-scatter patterns
        - statistics: Summary metrics
        - layers_analysis: Breakdown by layer depth
    """
    try:
        # Get analyzed wallets from cache
        wallets = dashboard_cache.get("analyzed_wallets", [])

        if len(wallets) == 0:
            return jsonify(
                {
                    "patterns": [],
                    "statistics": {
                        "total_patterns": 0,
                        "high_risk_patterns": 0,
                        "total_wallets_involved": 0,
                        "avg_layers": 0,
                        "total_volume": 0,
                    },
                    "layers_analysis": {
                        "two_layer_patterns": 0,
                        "three_layer_patterns": 0,
                        "complex_patterns": 0,
                    },
                    "message": "No analyzed wallets available. Please run wallet analysis first from the Overview page.",
                }
            )

        detected_patterns = []
        wallets_involved = set()
        high_risk_count = 0
        layer_counts = {"2": 0, "3": 0, "4+": 0}

        # Build a graph from all wallet connections
        import networkx as nx

        G = nx.DiGraph()

        # Create wallet lookup
        wallet_lookup = {}
        for wallet_data in wallets:
            wallet_addr = wallet_data.get("wallet_address", "")
            wallet_lookup[wallet_addr] = wallet_data

            # Add edges from sources
            laundering_pattern = wallet_data.get("laundering_pattern", {})
            sources = laundering_pattern.get("sources", [])
            destinations = laundering_pattern.get("destinations", [])

            for src in sources:
                src_addr = src.get("wallet", "")
                if src_addr:
                    G.add_edge(
                        src_addr,
                        wallet_addr,
                        amount=src.get("amount", 0),
                        tx_count=src.get("transaction_count", 0),
                    )

            for dest in destinations:
                dest_addr = dest.get("wallet", "")
                if dest_addr:
                    G.add_edge(
                        wallet_addr,
                        dest_addr,
                        amount=dest.get("amount", 0),
                        tx_count=dest.get("transaction_count", 0),
                    )

        # Find Gather-Scatter patterns
        # Look for wallets with high fan-out that eventually connect to wallets with high fan-in

        # Identify scatter points (high out-degree)
        scatter_wallets = []
        for wallet_addr, wallet_data in wallet_lookup.items():
            out_degree = G.out_degree(wallet_addr) if wallet_addr in G else 0
            if out_degree >= 3:  # At least 3 outgoing connections
                scatter_wallets.append(
                    {
                        "wallet": wallet_addr,
                        "out_degree": out_degree,
                        "data": wallet_data,
                    }
                )

        # Identify gather points (high in-degree)
        gather_wallets = []
        for wallet_addr, wallet_data in wallet_lookup.items():
            in_degree = G.in_degree(wallet_addr) if wallet_addr in G else 0
            if in_degree >= 3:  # At least 3 incoming connections
                gather_wallets.append(
                    {"wallet": wallet_addr, "in_degree": in_degree, "data": wallet_data}
                )

        # Find paths from scatter to gather points
        pattern_id = 0
        for scatter in scatter_wallets[:20]:  # Limit to top 20 scatter points
            scatter_addr = scatter["wallet"]

            for gather in gather_wallets[:20]:  # Limit to top 20 gather points
                gather_addr = gather["wallet"]

                if scatter_addr == gather_addr:
                    continue

                # Find paths between scatter and gather
                try:
                    # Find up to 3 simple paths with max length 5
                    paths = list(
                        nx.all_simple_paths(G, scatter_addr, gather_addr, cutoff=5)
                    )[:3]

                    if len(paths) >= 2:  # At least 2 paths = gather-scatter pattern
                        # Calculate pattern metrics
                        all_intermediaries = set()
                        total_volume = 0
                        path_lengths = []

                        for path in paths:
                            path_lengths.append(len(path))
                            for node in path[1:-1]:  # Exclude source and destination
                                all_intermediaries.add(node)
                            # Calculate volume along path
                            for i in range(len(path) - 1):
                                if G.has_edge(path[i], path[i + 1]):
                                    total_volume += G[path[i]][path[i + 1]].get(
                                        "amount", 0
                                    )

                        avg_path_length = sum(path_lengths) / len(path_lengths)
                        num_layers = int(avg_path_length) - 1  # Number of hops

                        # Categorize by layers
                        if num_layers <= 2:
                            layer_counts["2"] += 1
                            layer_category = "Two-Layer"
                        elif num_layers == 3:
                            layer_counts["3"] += 1
                            layer_category = "Three-Layer"
                        else:
                            layer_counts["4+"] += 1
                            layer_category = "Complex Multi-Layer"

                        # Calculate suspicion score
                        scatter_suspicion = scatter["data"].get("suspicion_score", 0)
                        gather_suspicion = gather["data"].get("suspicion_score", 0)
                        base_suspicion = max(scatter_suspicion, gather_suspicion)

                        # Increase suspicion based on pattern characteristics
                        pattern_suspicion = base_suspicion
                        if len(paths) >= 3:
                            pattern_suspicion += 0.1  # Multiple convergent paths
                        if len(all_intermediaries) >= 5:
                            pattern_suspicion += 0.1  # Many intermediaries
                        if num_layers >= 3:
                            pattern_suspicion += 0.1  # Deep layering

                        pattern_suspicion = min(pattern_suspicion, 1.0)

                        # Determine risk level
                        if pattern_suspicion >= 0.7:
                            risk_level = "critical"
                            high_risk_count += 1
                        elif pattern_suspicion >= 0.5:
                            risk_level = "high"
                            high_risk_count += 1
                        elif pattern_suspicion >= 0.3:
                            risk_level = "medium"
                        else:
                            risk_level = "low"

                        # Check for cyclic patterns (funds returning to near source)
                        is_cyclic = False
                        for node in all_intermediaries:
                            if G.has_edge(gather_addr, node) or G.has_edge(
                                gather_addr, scatter_addr
                            ):
                                is_cyclic = True
                                break

                        pattern_id += 1
                        pattern = {
                            "pattern_id": f"GS-{pattern_id:04d}",
                            "scatter_wallet": scatter_addr,
                            "gather_wallet": gather_addr,
                            "intermediaries": list(all_intermediaries)[:10],
                            "intermediary_count": len(all_intermediaries),
                            "path_count": len(paths),
                            "avg_path_length": round(avg_path_length, 1),
                            "num_layers": num_layers,
                            "layer_category": layer_category,
                            "total_volume": round(total_volume, 2),
                            "volume_formatted": format_crypto_amount(
                                total_volume, scatter_addr
                            ),
                            "scatter_out_degree": scatter["out_degree"],
                            "gather_in_degree": gather["in_degree"],
                            "suspicion_score": round(pattern_suspicion, 3),
                            "risk_level": risk_level,
                            "is_cyclic": is_cyclic,
                            "pattern_type": (
                                "Cyclic Gather-Scatter"
                                if is_cyclic
                                else "Gather-Scatter"
                            ),
                            "description": f"Funds scattered from {scatter_addr[:10]}... through {len(all_intermediaries)} intermediaries, reconverging at {gather_addr[:10]}...",
                            "sample_paths": [
                                {
                                    "path": path,
                                    "length": len(path),
                                    "formatted": " → ".join(
                                        [f"{p[:8]}..." for p in path]
                                    ),
                                }
                                for path in paths[:3]
                            ],
                            "scatter_wallet_data": {
                                "suspicion_score": scatter_suspicion,
                                "total_sent": scatter["data"].get("total_sent", 0),
                            },
                            "gather_wallet_data": {
                                "suspicion_score": gather_suspicion,
                                "total_received": gather["data"].get(
                                    "total_received", 0
                                ),
                            },
                        }

                        detected_patterns.append(pattern)
                        wallets_involved.add(scatter_addr)
                        wallets_involved.add(gather_addr)
                        wallets_involved.update(all_intermediaries)

                except nx.NetworkXNoPath:
                    continue
                except Exception as e:
                    continue

        # If no patterns found, generate mock patterns from existing data
        if len(detected_patterns) == 0 and len(wallets) > 0:
            # Create synthetic patterns from high-suspicion wallets
            high_suspicion_wallets = sorted(
                wallets, key=lambda x: x.get("suspicion_score", 0), reverse=True
            )[:10]

            for i in range(0, min(6, len(high_suspicion_wallets)), 2):
                if i + 1 < len(high_suspicion_wallets):
                    scatter_wallet = high_suspicion_wallets[i]
                    gather_wallet = high_suspicion_wallets[i + 1]

                    scatter_addr = scatter_wallet.get(
                        "wallet_address", f"0x{i}a{i}b{i}c"
                    )
                    gather_addr = gather_wallet.get("wallet_address", f"0x{i}d{i}e{i}f")

                    # Generate intermediaries
                    num_intermediaries = random.randint(3, 7)
                    intermediaries = [
                        f"0x{random.randint(1000000, 9999999):07x}{random.randint(1000, 9999):04x}"
                        for _ in range(num_intermediaries)
                    ]

                    num_layers = random.choice([2, 3, 3, 4])
                    if num_layers <= 2:
                        layer_counts["2"] += 1
                        layer_category = "Two-Layer"
                    elif num_layers == 3:
                        layer_counts["3"] += 1
                        layer_category = "Three-Layer"
                    else:
                        layer_counts["4+"] += 1
                        layer_category = "Complex Multi-Layer"

                    volume = random.uniform(50000, 500000)
                    suspicion = max(
                        scatter_wallet.get("suspicion_score", 0.5),
                        gather_wallet.get("suspicion_score", 0.5),
                    ) + random.uniform(0.05, 0.15)
                    suspicion = min(suspicion, 0.98)

                    if suspicion >= 0.7:
                        risk_level = "critical"
                        high_risk_count += 1
                    elif suspicion >= 0.5:
                        risk_level = "high"
                        high_risk_count += 1
                    elif suspicion >= 0.3:
                        risk_level = "medium"
                    else:
                        risk_level = "low"

                    is_cyclic = random.choice([True, False])

                    pattern_id += 1
                    detected_patterns.append(
                        {
                            "pattern_id": f"GS-{pattern_id:04d}",
                            "scatter_wallet": scatter_addr,
                            "gather_wallet": gather_addr,
                            "intermediaries": intermediaries,
                            "intermediary_count": num_intermediaries,
                            "path_count": random.randint(2, 5),
                            "avg_path_length": num_layers + 1,
                            "num_layers": num_layers,
                            "layer_category": layer_category,
                            "total_volume": round(volume, 2),
                            "volume_formatted": format_crypto_amount(
                                volume, scatter_addr
                            ),
                            "scatter_out_degree": random.randint(4, 12),
                            "gather_in_degree": random.randint(4, 12),
                            "suspicion_score": round(suspicion, 3),
                            "risk_level": risk_level,
                            "is_cyclic": is_cyclic,
                            "pattern_type": (
                                "Cyclic Gather-Scatter"
                                if is_cyclic
                                else "Gather-Scatter"
                            ),
                            "description": f"Funds scattered from {scatter_addr[:10]}... through {num_intermediaries} intermediaries, reconverging at {gather_addr[:10]}...",
                            "sample_paths": [
                                {
                                    "path": [
                                        scatter_addr,
                                        intermediaries[0],
                                        intermediaries[-1],
                                        gather_addr,
                                    ],
                                    "length": 4,
                                    "formatted": f"{scatter_addr[:8]}... → {intermediaries[0][:8]}... → {intermediaries[-1][:8]}... → {gather_addr[:8]}...",
                                }
                            ],
                            "scatter_wallet_data": {
                                "suspicion_score": scatter_wallet.get(
                                    "suspicion_score", 0.5
                                ),
                                "total_sent": scatter_wallet.get("total_sent", volume),
                            },
                            "gather_wallet_data": {
                                "suspicion_score": gather_wallet.get(
                                    "suspicion_score", 0.5
                                ),
                                "total_received": gather_wallet.get(
                                    "total_received", volume * 0.9
                                ),
                            },
                        }
                    )

                    wallets_involved.add(scatter_addr)
                    wallets_involved.add(gather_addr)
                    wallets_involved.update(intermediaries)

        # Sort by suspicion score
        detected_patterns = sorted(
            detected_patterns, key=lambda x: x["suspicion_score"], reverse=True
        )

        # Calculate statistics
        num_patterns = len(detected_patterns)
        total_volume = sum(p.get("total_volume", 0) for p in detected_patterns)
        avg_layers = (
            sum(p.get("num_layers", 0) for p in detected_patterns) / num_patterns
            if num_patterns > 0
            else 0
        )

        return jsonify(
            {
                "patterns": detected_patterns,
                "statistics": {
                    "total_patterns": num_patterns,
                    "high_risk_patterns": high_risk_count,
                    "total_wallets_involved": len(wallets_involved),
                    "avg_layers": round(avg_layers, 1),
                    "avg_intermediaries": round(
                        (
                            sum(
                                p.get("intermediary_count", 0)
                                for p in detected_patterns
                            )
                            / num_patterns
                            if num_patterns > 0
                            else 0
                        ),
                        1,
                    ),
                    "total_volume": round(total_volume, 2),
                    "total_volume_formatted": format_crypto_amount(
                        total_volume, "aggregate"
                    ),
                    "cyclic_patterns": sum(
                        1 for p in detected_patterns if p.get("is_cyclic", False)
                    ),
                },
                "layers_analysis": {
                    "two_layer_patterns": layer_counts["2"],
                    "three_layer_patterns": layer_counts["3"],
                    "complex_patterns": layer_counts["4+"],
                },
                "risk_breakdown": {
                    "critical": sum(
                        1
                        for p in detected_patterns
                        if p.get("risk_level") == "critical"
                    ),
                    "high": sum(
                        1 for p in detected_patterns if p.get("risk_level") == "high"
                    ),
                    "medium": sum(
                        1 for p in detected_patterns if p.get("risk_level") == "medium"
                    ),
                    "low": sum(
                        1 for p in detected_patterns if p.get("risk_level") == "low"
                    ),
                },
            }
        )

    except Exception as e:
        print(f"[ERROR] Gather-scatter detection failed: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ===================== END NEW ENDPOINTS =====================

if __name__ == "__main__":
    app.run(debug=True)
