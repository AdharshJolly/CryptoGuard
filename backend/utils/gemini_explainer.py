"""
Gemini API Integration for AML Risk Explanation Generation
Generates human-readable explanations of suspicion scores using Google's Gemini AI
"""

import os
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

try:
    import google.generativeai as genai

    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class GeminiExplainer:
    def __init__(self, api_key: str = None):
        """
        Initialize Gemini API client

        Args:
            api_key: Google AI API key (if None, will check GEMINI_API_KEY env variable)
        """
        if not GEMINI_AVAILABLE:
            raise ImportError(
                "google-generativeai package not installed. Run: pip install google-generativeai"
            )

        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Gemini API key not provided. Set GEMINI_API_KEY environment variable or pass api_key parameter"
            )

        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-2.0-flash-exp")

    def generate_suspicion_explanation(
        self, wallet_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Generate human-readable explanation of wallet suspicion scores

        Args:
            wallet_data: Dictionary containing:
                - wallet_address: str
                - total_suspicion_score: float
                - components: dict with fan_out_score, fan_in_score, etc.
                - wallet_summary: dict with transaction details
                - smurfing_patterns: list (optional)

        Returns:
            Dictionary with:
                - executive_summary: Brief 1-2 sentence overview
                - detailed_explanation: Comprehensive analysis
                - risk_level: high/medium/low
                - recommendations: Action items
        """
        # Build detailed context for Gemini
        prompt = self._build_explanation_prompt(wallet_data)

        try:
            response = self.model.generate_content(prompt)
            explanation_text = response.text

            # Parse response into structured format
            parsed = self._parse_gemini_response(explanation_text)

            return parsed

        except Exception as e:
            # Fallback to basic explanation if API fails
            return self._generate_fallback_explanation(wallet_data)

    def _build_explanation_prompt(self, wallet_data: Dict[str, Any]) -> str:
        """Build comprehensive prompt for Gemini"""

        wallet_addr = wallet_data.get("wallet_address", "Unknown")
        total_score = wallet_data.get("total_suspicion_score", 0.0)
        components = wallet_data.get("components", {})
        summary = wallet_data.get("wallet_summary", {})

        # Extract component scores
        fan_out = components.get("fan_out_score", {})
        fan_in = components.get("fan_in_score", {})
        temporal = components.get("temporal_burst_score", {})
        path_sim = components.get("path_similarity_score", {})
        illicit_prox = components.get("illicit_proximity_score", {})

        prompt = f"""You are an expert Anti-Money Laundering (AML) analyst reviewing cryptocurrency transaction patterns. 
Analyze the following wallet and provide a clear, professional explanation of the risk assessment.

WALLET INFORMATION:
- Address: {wallet_addr}
- Total Suspicion Score: {total_score:.2f} (scale: 0.0 = clean, 1.0 = highly suspicious)

RISK COMPONENT BREAKDOWN:
1. Fan-Out Score: {fan_out.get('score', 0):.2f}
   - {fan_out.get('details', {}).get('description', 'N/A')}
   
2. Fan-In Score: {fan_in.get('score', 0):.2f}
   - {fan_in.get('details', {}).get('description', 'N/A')}
   
3. Temporal Burst Score: {temporal.get('score', 0):.2f}
   - {temporal.get('details', {}).get('description', 'N/A')}
   
4. Path Similarity Score: {path_sim.get('score', 0):.2f}
   - {path_sim.get('details', {}).get('description', 'N/A')}
   
5. Illicit Proximity Score: {illicit_prox.get('score', 0):.2f}
   - {illicit_prox.get('details', {}).get('description', 'N/A')}

TRANSACTION SUMMARY:
- Total Received: {summary.get('total_received', 0):.2f} crypto units
- Total Sent: {summary.get('total_sent', 0):.2f} crypto units
- Unique Senders: {summary.get('unique_senders', 0)}
- Unique Receivers: {summary.get('unique_receivers', 0)}

TASK: Provide a structured analysis in the following format:

EXECUTIVE_SUMMARY:
[Write 2-3 sentences explaining the overall risk level and primary concerns. Be direct and factual.]

DETAILED_EXPLANATION:
[Provide a comprehensive 4-6 sentence analysis explaining:
- What behaviors are triggering the suspicion
- How these behaviors relate to known money laundering techniques (smurfing, layering, structuring)
- Why these specific scores contribute to the overall assessment
- Any mitigating or aggravating factors]

RISK_LEVEL:
[State one of: HIGH_RISK, MEDIUM_RISK, or LOW_RISK]

RECOMMENDATIONS:
[Provide 3-4 specific action items for investigators or compliance teams]

Keep the tone professional, technical, and focused on facts. Avoid speculative language.
"""

        return prompt

    def _parse_gemini_response(self, response_text: str) -> Dict[str, str]:
        """Parse structured response from Gemini"""
        result = {
            "executive_summary": "",
            "detailed_explanation": "",
            "risk_level": "MEDIUM_RISK",
            "recommendations": [],
        }

        # Split by sections
        sections = response_text.split("\n\n")
        current_section = None

        for section in sections:
            section = section.strip()

            if "EXECUTIVE_SUMMARY:" in section:
                current_section = "executive_summary"
                result["executive_summary"] = section.replace(
                    "EXECUTIVE_SUMMARY:", ""
                ).strip()

            elif "DETAILED_EXPLANATION:" in section:
                current_section = "detailed_explanation"
                result["detailed_explanation"] = section.replace(
                    "DETAILED_EXPLANATION:", ""
                ).strip()

            elif "RISK_LEVEL:" in section:
                current_section = "risk_level"
                risk = section.replace("RISK_LEVEL:", "").strip().upper()
                if "HIGH" in risk:
                    result["risk_level"] = "HIGH_RISK"
                elif "LOW" in risk:
                    result["risk_level"] = "LOW_RISK"
                else:
                    result["risk_level"] = "MEDIUM_RISK"

            elif "RECOMMENDATIONS:" in section:
                current_section = "recommendations"
                rec_text = section.replace("RECOMMENDATIONS:", "").strip()
                # Split by line and filter empty
                recommendations = [
                    line.strip("- ").strip()
                    for line in rec_text.split("\n")
                    if line.strip()
                ]
                result["recommendations"] = recommendations

            elif current_section:
                # Continue adding to current section
                if current_section == "executive_summary":
                    result["executive_summary"] += " " + section
                elif current_section == "detailed_explanation":
                    result["detailed_explanation"] += " " + section
                elif current_section == "recommendations":
                    result["recommendations"].extend(
                        [
                            line.strip("- ").strip()
                            for line in section.split("\n")
                            if line.strip()
                        ]
                    )

        return result

    def _generate_fallback_explanation(
        self, wallet_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """Generate basic explanation if Gemini API fails"""
        total_score = wallet_data.get("total_suspicion_score", 0.0)
        components = wallet_data.get("components", {})

        if total_score >= 0.7:
            risk_level = "HIGH_RISK"
            exec_summary = f"This wallet exhibits highly suspicious behavior with a total suspicion score of {total_score:.2f}. Multiple indicators suggest potential money laundering activity."
        elif total_score >= 0.4:
            risk_level = "MEDIUM_RISK"
            exec_summary = f"This wallet shows moderately suspicious patterns with a total suspicion score of {total_score:.2f}. Further investigation is recommended."
        else:
            risk_level = "LOW_RISK"
            exec_summary = f"This wallet exhibits relatively normal behavior with a low suspicion score of {total_score:.2f}. Minimal risk indicators detected."

        # Build detailed explanation from components
        details = []
        if components.get("fan_out_score", {}).get("score", 0) > 0.1:
            details.append(
                f"The wallet demonstrates fan-out behavior, sending funds to {components['fan_out_score']['details'].get('destination_count', 0)} destinations, which may indicate smurfing."
            )

        if components.get("illicit_proximity_score", {}).get("score", 0) > 0.1:
            details.append(
                f"Proximity to known illicit wallets detected: {components['illicit_proximity_score']['details'].get('description', '')}"
            )

        if components.get("temporal_burst_score", {}).get("score", 0) > 0.1:
            details.append(
                f"Rapid transaction activity detected: {components['temporal_burst_score']['details'].get('description', '')}"
            )

        detailed_explanation = (
            " ".join(details)
            if details
            else "Standard transaction patterns observed with no significant anomalies."
        )

        recommendations = [
            "Review transaction history for unusual patterns",
            "Verify source of funds",
            "Monitor for continued suspicious activity",
            "Consider enhanced due diligence if risk persists",
        ]

        return {
            "executive_summary": exec_summary,
            "detailed_explanation": detailed_explanation,
            "risk_level": risk_level,
            "recommendations": recommendations,
        }
