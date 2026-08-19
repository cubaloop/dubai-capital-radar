import uuid
import random
from datetime import datetime, timedelta
from typing import List
from ..models.schemas import LiquiditySignal, SignalType

REALTIME_FEED_TEMPLATES = [
    {
        "signal_type": SignalType.TECH_EXIT,
        "title": "FinTech Unicorn Acquisition ($140M M&A Exit)",
        "entity_name": "KitePay Global",
        "source_country": "United Kingdom",
        "estimated_liquidity_usd": 18500000.0,
        "confidence_score": 0.94,
        "description": "Founder and early executive equity payout closed via cash and liquid equity tranche following UK Non-Dom changes.",
        "tags": ["M&A Exit", "FinTech", "UK Capital Flight", "High Net Worth"],
        "target_prospect_role": "Co-Founder & Chief Product Officer"
    },
    {
        "signal_type": SignalType.CRYPTO_WHALE,
        "title": "Layer-1 Foundation 50M Token Unlock & OTC Liquidations",
        "entity_name": "Aetheria Protocol Foundation",
        "source_country": "Canada",
        "estimated_liquidity_usd": 12000000.0,
        "confidence_score": 0.89,
        "description": "Core contributor multi-sig wallet unlocked 50M tokens with $12M transferred to regulated off-ramp desks.",
        "tags": ["Crypto Whale", "OTC Desks", "Vesting Cliff", "USDT Liquidity"],
        "target_prospect_role": "Core Lead Developer / Protocol Angel"
    },
    {
        "signal_type": SignalType.TAX_REFORM,
        "title": "Spanish Solidarity Wealth Tax Increase Announced",
        "entity_name": "Catalunya & Madrid Tech Executives",
        "source_country": "Spain",
        "estimated_liquidity_usd": 8500000.0,
        "confidence_score": 0.96,
        "description": "Impuesto a las Grandes Fortunas enforcement prompts high-earning tech founders to seek 0% tax residency in UAE.",
        "tags": ["Wealth Tax", "Golden Visa Focus", "European Outflow", "Relocation"],
        "target_prospect_role": "CEO & Principal Shareholder"
    },
    {
        "signal_type": SignalType.VENTURE_FUNDING,
        "title": "Series B Secondary Share Sale ($35M Liquidity)",
        "entity_name": "Nexus AI Robotics",
        "source_country": "France",
        "estimated_liquidity_usd": 6200000.0,
        "confidence_score": 0.91,
        "description": "Secondary shares tendered to sovereign wealth fund, releasing liquid cash to founding executives in Paris.",
        "tags": ["Secondary Tender", "AI Startup", "Paris Outbound", "HNWI"],
        "target_prospect_role": "Founding CTO"
    },
    {
        "signal_type": SignalType.HNWI_RELOCATION,
        "title": "German Wegzugsbesteuerung Exit Tax Spike",
        "entity_name": "Munich Venture Partners Network",
        "source_country": "Germany",
        "estimated_liquidity_usd": 9400000.0,
        "confidence_score": 0.93,
        "description": "German family offices expediting asset reallocation to tax-free jurisdictions with strong escrow protection.",
        "tags": ["Family Office", "German Capital", "Escrow Priority", "Off-Plan Villas"],
        "target_prospect_role": "Managing Director / Family Office Principal"
    }
]

class RadarWorker:
    def __init__(self):
        self.cached_signals: List[LiquiditySignal] = []
        self._initialize_default_signals()

    def _initialize_default_signals(self):
        now = datetime.now()
        for i, item in enumerate(REALTIME_FEED_TEMPLATES):
            sig = LiquiditySignal(
                id=f"sig-{uuid.uuid4().hex[:8]}",
                signal_type=item["signal_type"],
                title=item["title"],
                entity_name=item["entity_name"],
                source_country=item["source_country"],
                estimated_liquidity_usd=item["estimated_liquidity_usd"],
                confidence_score=item["confidence_score"],
                description=item["description"],
                detected_at=now - timedelta(minutes=i * 18 + 5),
                tags=item["tags"],
                source_url=f"https://bloomberg.com/news/articles/{uuid.uuid4().hex[:6]}",
                target_prospect_role=item.get("target_prospect_role")
            )
            self.cached_signals.append(sig)

    def get_latest_signals(self) -> List[LiquiditySignal]:
        return self.cached_signals

    def trigger_live_scan(self) -> LiquiditySignal:
        """Simulates finding a new hot signal or triggers live API scanner."""
        template = random.choice(REALTIME_FEED_TEMPLATES)
        variance = random.uniform(0.85, 1.25)
        new_sig = LiquiditySignal(
            id=f"sig-{uuid.uuid4().hex[:8]}",
            signal_type=template["signal_type"],
            title=f"[LIVE DETECTED] {template['title']}",
            entity_name=f"{template['entity_name']} {random.randint(10, 99)}",
            source_country=template["source_country"],
            estimated_liquidity_usd=round(template["estimated_liquidity_usd"] * variance, 2),
            confidence_score=round(min(0.99, template["confidence_score"] + random.uniform(-0.03, 0.04)), 2),
            description=template["description"],
            detected_at=datetime.now(),
            tags=template["tags"],
            source_url=f"https://reuters.com/markets/{uuid.uuid4().hex[:6]}",
            target_prospect_role=template.get("target_prospect_role")
        )
        self.cached_signals.insert(0, new_sig)
        if len(self.cached_signals) > 25:
            self.cached_signals.pop()
        return new_sig

radar_engine = RadarWorker()
