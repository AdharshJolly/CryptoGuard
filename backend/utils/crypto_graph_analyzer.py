"""
Cryptocurrency Graph Analyzer for AML Smurfing Detection
Detects fan-out/fan-in patterns in blockchain transaction graphs
"""

import networkx as nx
import pandas as pd
import numpy as np
from collections import defaultdict
from datetime import datetime, timedelta


class CryptoGraphAnalyzer:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.wallet_metadata = {}
        self.illicit_wallets = set()

    def load_transactions(self, transactions):
        """
        Load transaction edge list into graph
        transactions: list of dicts with keys:
            - source_wallet, dest_wallet, timestamp, amount, token_type
        """
        for txn in transactions:
            source = txn["source_wallet"]
            dest = txn["dest_wallet"]
            amount = float(txn["amount"])
            timestamp = txn["timestamp"]
            token_type = txn.get("token_type", "UNKNOWN")

            # Add edge with transaction data
            if self.graph.has_edge(source, dest):
                # Update existing edge with aggregated data
                self.graph[source][dest]["transactions"].append(
                    {"amount": amount, "timestamp": timestamp, "token_type": token_type}
                )
                self.graph[source][dest]["total_amount"] += amount
                self.graph[source][dest]["transaction_count"] += 1
            else:
                self.graph.add_edge(
                    source,
                    dest,
                    transactions=[
                        {
                            "amount": amount,
                            "timestamp": timestamp,
                            "token_type": token_type,
                        }
                    ],
                    total_amount=amount,
                    transaction_count=1,
                )

    def mark_illicit_wallets(self, illicit_wallet_list):
        """Mark known illicit wallets as seeds"""
        self.illicit_wallets = set(illicit_wallet_list)

    def detect_fan_out_fan_in(self, wallet, max_depth=3, min_intermediaries=3):
        """
        Detect fan-out/fan-in (smurfing) patterns from a wallet

        Pattern: Wallet A → {B,C,D,E} → {F,G,H} → Wallet Z

        Returns: List of detected smurfing paths with suspicion scores
        """
        smurfing_patterns = []

        # FIRST: Check for simple direct fan-out from illicit sources (CRITICAL)
        in_edges = list(self.graph.in_edges(wallet, data=True))
        out_edges = list(self.graph.out_edges(wallet, data=True))

        if len(in_edges) > 0 and len(out_edges) >= 5:
            # Check if receiving from illicit wallets
            illicit_sources = [
                src for src, _, _ in in_edges if src in self.illicit_wallets
            ]

            if illicit_sources:
                # DIRECT SMURFING: Illicit → Wallet → Many destinations
                total_received = sum(
                    self.graph[src][wallet]["total_amount"] for src in illicit_sources
                )
                total_sent = sum(data["total_amount"] for _, _, data in out_edges)
                destinations = [dest for _, dest, _ in out_edges]

                # Calculate timestamps for velocity
                all_timestamps = []
                for src in illicit_sources:
                    for txn in self.graph[src][wallet]["transactions"]:
                        all_timestamps.append(txn["timestamp"])
                for _, dest, data in out_edges:
                    for txn in data["transactions"]:
                        all_timestamps.append(txn["timestamp"])

                if all_timestamps:
                    time_span = (
                        max(all_timestamps) - min(all_timestamps)
                    ).total_seconds() / 3600
                else:
                    time_span = 0

                # High suspicion for direct smurfing from illicit source
                suspicion = 0.9  # Base score
                if len(out_edges) > 10:
                    suspicion = 0.95

                smurfing_patterns.append(
                    {
                        "source": illicit_sources[0],
                        "intermediary": wallet,
                        "destinations": destinations,
                        "path": [illicit_sources[0], wallet] + destinations,
                        "intermediaries": [wallet],
                        "suspicion_score": suspicion,
                        "pattern_type": "direct_smurfing_from_illicit",
                        "metrics": {
                            "total_amount": total_received,
                            "transaction_count": sum(
                                data["transaction_count"] for _, _, data in out_edges
                            ),
                            "path_length": 2,
                            "fan_out_count": len(out_edges),
                            "time_span_hours": time_span,
                        },
                    }
                )

        # SECOND: Check complex multi-hop patterns
        for target in self.graph.nodes():
            if target == wallet:
                continue

            # Find all simple paths (no cycles)
            try:
                paths = list(
                    nx.all_simple_paths(self.graph, wallet, target, cutoff=max_depth)
                )
            except:
                continue

            # Analyze paths for fan-out/fan-in structure
            for path in paths:
                if len(path) < 3:  # Need at least source → intermediate → dest
                    continue

                # Count unique intermediaries
                intermediaries = set(path[1:-1])
                if len(intermediaries) >= min_intermediaries:
                    # Calculate pattern metrics
                    pattern_info = self._analyze_pattern(path)
                    if pattern_info["suspicion_score"] > 0.5:
                        smurfing_patterns.append(
                            {
                                "source": wallet,
                                "destination": target,
                                "path": path,
                                "intermediaries": list(intermediaries),
                                "suspicion_score": pattern_info["suspicion_score"],
                                "pattern_type": "multi_hop_smurfing",
                                "metrics": pattern_info,
                            }
                        )

        return sorted(
            smurfing_patterns, key=lambda x: x["suspicion_score"], reverse=True
        )

    def detect_peeling_chain(self, wallet, min_hops=5):
        """
        Detect peeling chain patterns where small amounts are removed at each hop
        Wallet A → B (small peel) → C (small peel) → D ... → Z
        """
        peeling_chains = []

        # BFS to find long chains
        visited = set()
        queue = [(wallet, [wallet], [])]

        while queue:
            current, path, amounts = queue.pop(0)

            if current in visited and len(path) > 1:
                continue
            visited.add(current)

            if len(path) >= min_hops:
                # Check for peeling pattern (decreasing amounts)
                if self._is_peeling_pattern(amounts):
                    peeling_chains.append(
                        {
                            "source": wallet,
                            "chain": path,
                            "amounts": amounts,
                            "total_peeled": (
                                sum(amounts) - amounts[-1] if amounts else 0
                            ),
                            "suspicion_score": self._calculate_peeling_score(amounts),
                        }
                    )

            # Continue exploring
            for neighbor in self.graph.neighbors(current):
                if neighbor not in path:
                    edge_data = self.graph[current][neighbor]
                    new_amounts = amounts + [edge_data["total_amount"]]
                    queue.append((neighbor, path + [neighbor], new_amounts))

        return sorted(peeling_chains, key=lambda x: x["suspicion_score"], reverse=True)

    def calculate_wallet_centrality(self, wallet):
        """
        Calculate centrality scores for a wallet
        Returns dict with multiple centrality measures
        """
        centrality_scores = {}

        try:
            # Degree centrality (how many connections)
            centrality_scores["degree"] = nx.degree_centrality(self.graph).get(
                wallet, 0
            )

            # Betweenness centrality (bridge between communities)
            centrality_scores["betweenness"] = nx.betweenness_centrality(
                self.graph
            ).get(wallet, 0)

            # PageRank (importance based on connections)
            centrality_scores["pagerank"] = nx.pagerank(self.graph).get(wallet, 0)

            # Closeness centrality (how close to all other nodes)
            if nx.is_strongly_connected(self.graph):
                centrality_scores["closeness"] = nx.closeness_centrality(
                    self.graph
                ).get(wallet, 0)
            else:
                centrality_scores["closeness"] = 0

        except:
            centrality_scores = {
                "degree": 0,
                "betweenness": 0,
                "pagerank": 0,
                "closeness": 0,
            }

        return centrality_scores

    def calculate_suspicion_score(self, wallet):
        """
        Calculate overall suspicion score based on:
        - Connection to known illicit wallets
        - Centrality measures
        - Transaction patterns
        - Graph topology
        """
        score = 0.0

        # 1. Connection to illicit wallets (50% weight - INCREASED)
        illicit_distance = self._distance_to_illicit_wallets(wallet)
        illicit_connection_score = 0.0

        if illicit_distance == 0:
            illicit_connection_score = 1.0  # Is illicit
        elif illicit_distance == 1:
            # Direct connection - check if receiving FROM illicit
            in_edges = list(self.graph.in_edges(wallet, data=True))
            illicit_sources = [
                src for src, _, _ in in_edges if src in self.illicit_wallets
            ]

            if illicit_sources:
                # Receiving from illicit wallet = VERY HIGH RISK
                total_from_illicit = sum(
                    self.graph[src][wallet]["total_amount"] for src in illicit_sources
                )
                if total_from_illicit > 100:  # Large amounts
                    illicit_connection_score = 0.9
                else:
                    illicit_connection_score = 0.7
            else:
                illicit_connection_score = 0.5  # Sending to illicit
        elif illicit_distance == 2:
            illicit_connection_score = 0.3  # One hop away
        elif illicit_distance <= 3:
            illicit_connection_score = 0.15  # Close proximity

        score += illicit_connection_score * 0.5

        # 2. Centrality scores (20% weight - DECREASED)
        centrality = self.calculate_wallet_centrality(wallet)
        centrality_score = (
            centrality["degree"] * 0.3
            + centrality["betweenness"] * 0.4
            + centrality["pagerank"] * 0.3
        )
        score += centrality_score * 0.2

        # 3. Transaction pattern anomalies (30% weight)
        pattern_score = self._analyze_transaction_patterns(wallet)
        score += pattern_score * 0.3

        return min(score, 1.0)

    def calculate_suspicion_breakdown(self, wallet):
        """
        Calculate detailed breakdown of suspicion scores with explanations

        Returns dict with individual component scores and total
        """
        breakdown = {"total_suspicion_score": 0.0, "components": {}}

        # Component 1: Fan-out score (splitting funds to many destinations)
        out_edges = list(self.graph.out_edges(wallet, data=True))
        fan_out_count = len(out_edges)
        fan_out_score = 0.0

        if fan_out_count >= 20:
            fan_out_score = 0.35
        elif fan_out_count >= 10:
            fan_out_score = 0.25
        elif fan_out_count >= 5:
            fan_out_score = 0.15

        breakdown["components"]["fan_out_score"] = {
            "score": fan_out_score,
            "details": {
                "destination_count": fan_out_count,
                "description": f"Wallet sends to {fan_out_count} destinations",
            },
        }

        # Component 2: Fan-in score (receiving from many sources)
        in_edges = list(self.graph.in_edges(wallet, data=True))
        fan_in_count = len(in_edges)
        fan_in_score = 0.0

        if fan_in_count >= 20:
            fan_in_score = 0.28
        elif fan_in_count >= 10:
            fan_in_score = 0.20
        elif fan_in_count >= 5:
            fan_in_score = 0.12

        breakdown["components"]["fan_in_score"] = {
            "score": fan_in_score,
            "details": {
                "source_count": fan_in_count,
                "description": f"Wallet receives from {fan_in_count} sources",
            },
        }

        # Component 3: Temporal burst score (rapid transactions)
        all_timestamps = []
        for _, _, data in in_edges + out_edges:
            for txn in data["transactions"]:
                all_timestamps.append(txn["timestamp"])

        temporal_burst_score = 0.0
        time_span_hours = 0
        if len(all_timestamps) > 0:
            time_span = (
                max(all_timestamps) - min(all_timestamps)
            ).total_seconds() / 3600
            time_span_hours = time_span
            txn_count = len(all_timestamps)

            if time_span < 24 and txn_count > 10:
                temporal_burst_score = 0.17
            elif time_span < 48 and txn_count > 15:
                temporal_burst_score = 0.12
            elif time_span < 168 and txn_count > 25:  # 1 week
                temporal_burst_score = 0.08

        breakdown["components"]["temporal_burst_score"] = {
            "score": temporal_burst_score,
            "details": {
                "transaction_count": len(all_timestamps),
                "time_span_hours": time_span_hours,
                "description": f"{len(all_timestamps)} transactions within {time_span_hours:.1f} hours",
            },
        }

        # Component 4: Path similarity score (similar amounts/patterns)
        path_similarity_score = 0.0
        if out_edges:
            amounts = [data["total_amount"] for _, _, data in out_edges]
            avg_amount = sum(amounts) / len(amounts)

            # Check if amounts are similar (structuring)
            similar_count = sum(
                1 for amt in amounts if abs(amt - avg_amount) < avg_amount * 0.2
            )
            similarity_ratio = similar_count / len(amounts) if amounts else 0

            if similarity_ratio > 0.7 and len(amounts) >= 5:
                path_similarity_score = 0.10
            elif similarity_ratio > 0.5 and len(amounts) >= 5:
                path_similarity_score = 0.06

        breakdown["components"]["path_similarity_score"] = {
            "score": path_similarity_score,
            "details": {
                "description": (
                    "Transaction amounts show structuring pattern"
                    if path_similarity_score > 0
                    else "No clear structuring pattern"
                )
            },
        }

        # Component 5: Illicit proximity score (distance to known bad actors)
        illicit_distance = self._distance_to_illicit_wallets(wallet)
        illicit_proximity_score = 0.0
        proximity_description = "No connection to known illicit wallets"

        if illicit_distance == 0:
            illicit_proximity_score = 0.50
            proximity_description = "Wallet is known illicit"
        elif illicit_distance == 1:
            # Check direction
            illicit_sources = [
                src for src, _, _ in in_edges if src in self.illicit_wallets
            ]
            if illicit_sources:
                total_from_illicit = sum(
                    self.graph[src][wallet]["total_amount"] for src in illicit_sources
                )
                illicit_proximity_score = 0.35 if total_from_illicit > 100 else 0.25
                proximity_description = f"Direct transfer from illicit wallet ({total_from_illicit:.2f} crypto)"
            else:
                illicit_proximity_score = 0.20
                proximity_description = "Direct transfer to illicit wallet"
        elif illicit_distance == 2:
            illicit_proximity_score = 0.10
            proximity_description = "Two hops from illicit wallet"
        elif illicit_distance == 3:
            illicit_proximity_score = 0.05
            proximity_description = "Three hops from illicit wallet"

        breakdown["components"]["illicit_proximity_score"] = {
            "score": illicit_proximity_score,
            "details": {
                "distance_to_illicit": (
                    illicit_distance if illicit_distance != float("inf") else -1
                ),
                "description": proximity_description,
            },
        }

        # Calculate total
        total_score = (
            fan_out_score
            + fan_in_score
            + temporal_burst_score
            + path_similarity_score
            + illicit_proximity_score
        )

        breakdown["total_suspicion_score"] = min(total_score, 1.0)

        return breakdown

    def _analyze_pattern(self, path):
        """Analyze smurfing pattern characteristics"""
        total_amount = 0
        transaction_count = 0
        time_span = None

        for i in range(len(path) - 1):
            edge_data = self.graph[path[i]][path[i + 1]]
            total_amount += edge_data["total_amount"]
            transaction_count += edge_data["transaction_count"]

            # Calculate time span
            timestamps = [t["timestamp"] for t in edge_data["transactions"]]
            if timestamps:
                if time_span is None:
                    time_span = [min(timestamps), max(timestamps)]
                else:
                    time_span = [
                        min(time_span[0], min(timestamps)),
                        max(time_span[1], max(timestamps)),
                    ]

        # Calculate suspicion based on pattern
        suspicion = 0.0

        # Many intermediaries = higher suspicion
        if len(path) >= 5:
            suspicion += 0.3
        elif len(path) >= 3:
            suspicion += 0.2

        # Large amounts through many hops = suspicious
        if total_amount > 10000 and len(path) >= 3:
            suspicion += 0.3

        # High transaction count through intermediaries
        if transaction_count > 20:
            suspicion += 0.2

        # Short time span (rapid layering)
        if time_span:
            duration = (time_span[1] - time_span[0]).total_seconds() / 3600  # hours
            if duration < 24:  # Less than 24 hours
                suspicion += 0.2

        return {
            "suspicion_score": min(suspicion, 1.0),
            "total_amount": total_amount,
            "transaction_count": transaction_count,
            "path_length": len(path),
            "time_span_hours": duration if time_span else 0,
        }

    def _is_peeling_pattern(self, amounts):
        """Check if amounts show peeling pattern (decreasing)"""
        if len(amounts) < 3:
            return False

        # Check if mostly decreasing with small peels
        decreasing_count = 0
        for i in range(1, len(amounts)):
            if amounts[i] < amounts[i - 1] * 0.95:  # 5% threshold
                decreasing_count += 1

        return decreasing_count >= len(amounts) * 0.7  # 70% decreasing

    def _calculate_peeling_score(self, amounts):
        """Calculate suspicion score for peeling pattern"""
        if not amounts:
            return 0.0

        score = 0.0

        # Long chain
        if len(amounts) >= 10:
            score += 0.4
        elif len(amounts) >= 5:
            score += 0.2

        # Consistent peeling (small amounts removed)
        peel_percentage = (
            (amounts[0] - amounts[-1]) / amounts[0] if amounts[0] > 0 else 0
        )
        if 0.1 < peel_percentage < 0.5:  # 10-50% peeled off
            score += 0.3

        # Large initial amount
        if amounts[0] > 10000:
            score += 0.3

        return min(score, 1.0)

    def _distance_to_illicit_wallets(self, wallet):
        """Calculate shortest distance to any known illicit wallet"""
        if wallet in self.illicit_wallets:
            return 0

        min_distance = float("inf")
        for illicit in self.illicit_wallets:
            try:
                if nx.has_path(self.graph, wallet, illicit):
                    distance = nx.shortest_path_length(self.graph, wallet, illicit)
                    min_distance = min(min_distance, distance)
                if nx.has_path(self.graph, illicit, wallet):
                    distance = nx.shortest_path_length(self.graph, illicit, wallet)
                    min_distance = min(min_distance, distance)
            except:
                continue

        return min_distance if min_distance != float("inf") else -1

    def _analyze_transaction_patterns(self, wallet):
        """Analyze transaction patterns for anomalies"""
        score = 0.0

        # Get all transactions involving this wallet
        out_edges = list(self.graph.out_edges(wallet, data=True))
        in_edges = list(self.graph.in_edges(wallet, data=True))

        # Calculate total amounts
        total_received = sum(data["total_amount"] for _, _, data in in_edges)
        total_sent = sum(data["total_amount"] for _, _, data in out_edges)

        # CRITICAL: Detect smurfing/structuring pattern
        # Receiving large amounts and splitting into many small transactions
        if len(in_edges) > 0 and len(out_edges) >= 5:
            # Check if receiving from illicit sources
            illicit_sources = [
                src for src, _, _ in in_edges if src in self.illicit_wallets
            ]

            if illicit_sources:
                # Receiving from illicit AND fanning out = DEFINITE SMURFING
                score += 0.8
            elif total_received > total_sent * 0.8:  # Most money going out
                # Large inflow, many outflows = structuring
                avg_out = total_sent / len(out_edges) if out_edges else 0
                if avg_out < total_received / 10:  # Small splits
                    score += 0.6

        # High fan-out (many destinations)
        if len(out_edges) > 10:
            score += 0.3
        elif len(out_edges) > 5:
            score += 0.15

        # High fan-in (many sources)
        if len(in_edges) > 10:
            score += 0.3
        elif len(in_edges) > 5:
            score += 0.15

        # Round-trip detection (money coming back)
        for _, dest, _ in out_edges:
            if self.graph.has_edge(dest, wallet):
                score += 0.2
                break

        return min(score, 1.0)

    def get_wallet_summary(self, wallet):
        """Get comprehensive summary for a wallet"""
        return {
            "wallet_address": wallet,
            "suspicion_score": self.calculate_suspicion_score(wallet),
            "centrality": self.calculate_wallet_centrality(wallet),
            "total_received": sum(
                data["total_amount"]
                for _, _, data in self.graph.in_edges(wallet, data=True)
            ),
            "total_sent": sum(
                data["total_amount"]
                for _, _, data in self.graph.out_edges(wallet, data=True)
            ),
            "unique_senders": len(list(self.graph.predecessors(wallet))),
            "unique_receivers": len(list(self.graph.successors(wallet))),
            "is_illicit": wallet in self.illicit_wallets,
            "distance_to_illicit": self._distance_to_illicit_wallets(wallet),
        }

    def classify_laundering_pattern(self, wallet):
        """
        Classify the type of money laundering strategy being used

        Returns:
            dict with:
                - type: Pattern type (FAN_OUT_FAN_IN, PEELING_CHAIN, etc.)
                - confidence: Confidence score (0.0 - 1.0)
                - subtype: Specific variant of the pattern
                - evidence: Supporting evidence for the classification
        """
        in_edges = list(self.graph.in_edges(wallet, data=True))
        out_edges = list(self.graph.out_edges(wallet, data=True))

        in_count = len(in_edges)
        out_count = len(out_edges)

        # Collect all patterns with confidence scores
        patterns = []

        # Pattern 1: FAN_OUT_FAN_IN (Smurfing with reaggregation)
        fan_pattern = self._detect_fan_out_fan_in_pattern(wallet, in_edges, out_edges)
        if fan_pattern["confidence"] > 0.3:
            patterns.append(fan_pattern)

        # Pattern 2: PEELING_CHAIN (Gradual withdrawal)
        peel_pattern = self._detect_peeling_pattern(wallet, out_edges)
        if peel_pattern["confidence"] > 0.3:
            patterns.append(peel_pattern)

        # Pattern 3: CYCLIC_WASH (Circular transactions)
        cyclic_pattern = self._detect_cyclic_pattern(wallet)
        if cyclic_pattern["confidence"] > 0.3:
            patterns.append(cyclic_pattern)

        # Pattern 4: TEMPORAL_LAYERING (Time-based obfuscation)
        temporal_pattern = self._detect_temporal_layering(wallet, in_edges, out_edges)
        if temporal_pattern["confidence"] > 0.3:
            patterns.append(temporal_pattern)

        # Determine primary pattern or mixed strategy
        if not patterns:
            return {
                "type": "NORMAL_ACTIVITY",
                "confidence": 0.0,
                "subtype": "NO_SUSPICIOUS_PATTERN",
                "evidence": [],
            }

        # Sort by confidence
        patterns.sort(key=lambda x: x["confidence"], reverse=True)

        # Check for mixed strategy (multiple high-confidence patterns)
        if len(patterns) >= 2 and patterns[1]["confidence"] > 0.5:
            return {
                "type": "MIXED_STRATEGY",
                "confidence": min(
                    patterns[0]["confidence"] + patterns[1]["confidence"] * 0.3, 1.0
                ),
                "subtype": f"{patterns[0]['type']}_{patterns[1]['type']}",
                "evidence": patterns[0]["evidence"] + patterns[1]["evidence"],
                "component_patterns": [patterns[0], patterns[1]],
            }

        # Return highest confidence pattern
        return patterns[0]

    def _detect_fan_out_fan_in_pattern(self, wallet, in_edges, out_edges):
        """Detect fan-out/fan-in (smurfing) pattern"""
        in_count = len(in_edges)
        out_count = len(out_edges)

        confidence = 0.0
        evidence = []
        subtype = "SIMPLE_FAN_OUT"

        # High fan-out is primary indicator
        if out_count >= 10:
            confidence += 0.5
            evidence.append(f"High fan-out: {out_count} destinations")
        elif out_count >= 5:
            confidence += 0.3
            evidence.append(f"Moderate fan-out: {out_count} destinations")

        # Fan-in indicates reaggregation
        if in_count >= 5 and out_count >= 5:
            confidence += 0.3
            subtype = "MULTI_LAYER_REAGGREGATION"
            evidence.append(
                f"Reaggregation detected: {in_count} sources, {out_count} destinations"
            )
        elif in_count >= 3 and out_count >= 5:
            confidence += 0.2
            subtype = "COLLECTION_REDISTRIBUTION"
            evidence.append(
                f"Collection point: {in_count} sources → {out_count} destinations"
            )

        # Check for similar amounts (structuring)
        if out_edges:
            amounts = [data["total_amount"] for _, _, data in out_edges]
            avg_amount = sum(amounts) / len(amounts)
            similar_count = sum(
                1 for amt in amounts if abs(amt - avg_amount) < avg_amount * 0.2
            )

            if similar_count / len(amounts) > 0.7:
                confidence += 0.2
                evidence.append(
                    f"Structured amounts: {similar_count}/{len(amounts)} similar"
                )

        # Check proximity to illicit wallets
        illicit_sources = [src for src, _, _ in in_edges if src in self.illicit_wallets]
        if illicit_sources:
            confidence += 0.3
            evidence.append(
                f"Direct connection to {len(illicit_sources)} illicit wallet(s)"
            )

        return {
            "type": "FAN_OUT_FAN_IN",
            "confidence": min(confidence, 1.0),
            "subtype": subtype,
            "evidence": evidence,
        }

    def _detect_peeling_pattern(self, wallet, out_edges):
        """Detect peeling chain pattern"""
        confidence = 0.0
        evidence = []

        if not out_edges:
            return {
                "type": "PEELING_CHAIN",
                "confidence": 0.0,
                "subtype": "NONE",
                "evidence": [],
            }

        # Find chains from this wallet
        chain_lengths = []

        def find_chain_length(current, depth=0, max_depth=10):
            if depth >= max_depth:
                return depth
            successors = list(self.graph.successors(current))
            if len(successors) == 1:  # Single output (typical of peeling)
                return find_chain_length(successors[0], depth + 1, max_depth)
            return depth

        for _, dest, _ in out_edges:
            chain_length = find_chain_length(dest)
            if chain_length > 0:
                chain_lengths.append(chain_length)

        if chain_lengths:
            max_chain = max(chain_lengths)
            avg_chain = sum(chain_lengths) / len(chain_lengths)

            # Long chains indicate peeling
            if max_chain >= 5:
                confidence += 0.6
                evidence.append(f"Long transaction chain: {max_chain} hops")
            elif max_chain >= 3:
                confidence += 0.3
                evidence.append(f"Medium transaction chain: {max_chain} hops")

            # Check for decreasing amounts (characteristic of peeling)
            if out_edges and len(out_edges) <= 3:  # Peeling typically has few outputs
                amounts = sorted(
                    [data["total_amount"] for _, _, data in out_edges], reverse=True
                )
                if len(amounts) >= 2:
                    # Check if amounts are decreasing
                    decreasing = all(
                        amounts[i] > amounts[i + 1] * 1.1
                        for i in range(len(amounts) - 1)
                    )
                    if decreasing:
                        confidence += 0.3
                        evidence.append(
                            "Sequential peeling: decreasing amounts detected"
                        )

        # Low fan-out is characteristic of peeling
        if len(out_edges) <= 2:
            confidence += 0.2
            evidence.append(f"Linear progression: {len(out_edges)} output(s)")

        subtype = "SEQUENTIAL_PEELING" if confidence > 0.5 else "LINEAR_PROGRESSION"

        return {
            "type": "PEELING_CHAIN",
            "confidence": min(confidence, 1.0),
            "subtype": subtype,
            "evidence": evidence,
        }

    def _detect_cyclic_pattern(self, wallet):
        """Detect cyclic wash trading pattern"""
        confidence = 0.0
        evidence = []

        # Check for cycles involving this wallet
        cycles_found = 0

        # Look for direct round-trips (wallet → dest → wallet)
        out_neighbors = list(self.graph.successors(wallet))
        in_neighbors = list(self.graph.predecessors(wallet))

        round_trips = set(out_neighbors).intersection(set(in_neighbors))
        if round_trips:
            confidence += 0.4
            cycles_found += len(round_trips)
            evidence.append(f"Direct round-trips with {len(round_trips)} wallet(s)")

        # Look for 2-hop cycles (wallet → A → B → wallet)
        for neighbor in out_neighbors:
            second_hop = list(self.graph.successors(neighbor))
            if wallet in second_hop:
                confidence += 0.3
                cycles_found += 1
                evidence.append(f"2-hop cycle detected through {neighbor}")
                break  # Count once

        # Check for repetitive patterns (same counterparties multiple times)
        out_edges = list(self.graph.out_edges(wallet, data=True))
        if out_edges:
            # Count repeated destinations
            destinations = [dest for _, dest, _ in out_edges]
            unique_dest = set(destinations)
            repeat_ratio = 1 - (len(unique_dest) / len(destinations))

            if repeat_ratio > 0.5:  # More than 50% are repeats
                confidence += 0.3
                evidence.append(
                    f"Repetitive transactions: {repeat_ratio:.1%} repeat rate"
                )

        subtype = "CIRCULAR_WASH" if cycles_found > 0 else "REPETITIVE_PATTERN"

        return {
            "type": "CYCLIC_WASH",
            "confidence": min(confidence, 1.0),
            "subtype": subtype,
            "evidence": evidence,
        }

    def _detect_temporal_layering(self, wallet, in_edges, out_edges):
        """Detect temporal layering (time-based obfuscation)"""
        confidence = 0.0
        evidence = []

        # Collect all timestamps
        all_timestamps = []
        for _, _, data in in_edges + out_edges:
            for txn in data["transactions"]:
                all_timestamps.append(txn["timestamp"])

        if len(all_timestamps) < 5:
            return {
                "type": "TEMPORAL_LAYERING",
                "confidence": 0.0,
                "subtype": "INSUFFICIENT_DATA",
                "evidence": [],
            }

        all_timestamps.sort()

        # Calculate time between transactions
        time_deltas = []
        for i in range(1, len(all_timestamps)):
            delta = (all_timestamps[i] - all_timestamps[i - 1]).total_seconds()
            time_deltas.append(delta)

        if not time_deltas:
            return {
                "type": "TEMPORAL_LAYERING",
                "confidence": 0.0,
                "subtype": "NONE",
                "evidence": [],
            }

        avg_delta = sum(time_deltas) / len(time_deltas)

        # Pattern 1: Rapid burst activity
        time_span = (
            all_timestamps[-1] - all_timestamps[0]
        ).total_seconds() / 3600  # hours
        if time_span < 24 and len(all_timestamps) > 10:
            confidence += 0.4
            evidence.append(
                f"Rapid layering: {len(all_timestamps)} txn in {time_span:.1f} hours"
            )

        # Pattern 2: Evenly spaced transactions (automated)
        time_variance = sum((delta - avg_delta) ** 2 for delta in time_deltas) / len(
            time_deltas
        )
        time_std = time_variance**0.5

        if time_std < avg_delta * 0.2 and len(time_deltas) > 5:  # Low variance
            confidence += 0.3
            evidence.append(
                f"Automated timing: consistent {avg_delta/60:.1f}min intervals"
            )

        # Pattern 3: Suspicious timing patterns (e.g., off-hours)
        # Count transactions in suspicious hours (2am-5am)
        suspicious_hours = sum(1 for ts in all_timestamps if 2 <= ts.hour < 5)
        if suspicious_hours / len(all_timestamps) > 0.3:
            confidence += 0.2
            evidence.append(
                f"Off-hours activity: {suspicious_hours}/{len(all_timestamps)} txn at 2-5am"
            )

        # Determine subtype
        if time_span < 6:
            subtype = "RAPID_BURST"
        elif time_std < avg_delta * 0.2:
            subtype = "AUTOMATED_TIMING"
        else:
            subtype = "DISTRIBUTED_LAYERING"

        return {
            "type": "TEMPORAL_LAYERING",
            "confidence": min(confidence, 1.0),
            "subtype": subtype,
            "evidence": evidence,
        }
