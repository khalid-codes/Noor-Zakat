from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime, timezone, timedelta
import httpx
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Zakat Calculator API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# In-memory cache for rates
rate_cache = {
    "data": None,
    "timestamp": None,
    "ttl_seconds": 300  # 5 minutes cache
}

# Pydantic Models
class AssetInputs(BaseModel):
    gold_24k_grams: float = Field(default=0, ge=0, description="Gold 24K in grams")
    gold_22k_grams: float = Field(default=0, ge=0, description="Gold 22K in grams")
    gold_18k_grams: float = Field(default=0, ge=0, description="Gold 18K in grams")
    silver_grams: float = Field(default=0, ge=0, description="Silver in grams")
    cash_in_hand: float = Field(default=0, ge=0, description="Cash in hand (INR)")
    bank_savings: float = Field(default=0, ge=0, description="Bank savings (INR)")
    business_inventory: float = Field(default=0, ge=0, description="Business inventory value (INR)")
    investments: float = Field(default=0, ge=0, description="Investments/Stocks (INR)")
    receivables: float = Field(default=0, ge=0, description="Money owed to you (INR)")
    other_assets: float = Field(default=0, ge=0, description="Other liquid assets (INR)")

class LiabilityInputs(BaseModel):
    short_term_debts: float = Field(default=0, ge=0, description="Debts due within a year (INR)")
    immediate_expenses: float = Field(default=0, ge=0, description="Immediate necessary expenses (INR)")
    other_liabilities: float = Field(default=0, ge=0, description="Other liabilities (INR)")

class ZakatCalculationRequest(BaseModel):
    assets: AssetInputs
    liabilities: LiabilityInputs
    nisab_basis: str = Field(default="silver", pattern="^(gold|silver)$")

class GoldSilverRates(BaseModel):
    gold_24k_per_gram: float
    gold_22k_per_gram: float
    gold_18k_per_gram: float
    silver_per_gram: float
    currency: str = "INR"
    timestamp: datetime
    source: str

class NisabThresholds(BaseModel):
    gold_grams: float = 87.48  # 7.5 tola
    silver_grams: float = 612.36  # 52.5 tola
    gold_value_inr: float
    silver_value_inr: float
    currency: str = "INR"

class ZakatCalculationResponse(BaseModel):
    total_assets: float
    total_liabilities: float
    net_wealth: float
    nisab_threshold: float
    nisab_basis: str
    is_zakat_applicable: bool
    zakat_amount: float
    zakat_percentage: float = 2.5
    calculation_date: datetime
    rates_used: GoldSilverRates
    asset_breakdown: Dict[str, float]

# Service Functions
async def fetch_gold_silver_rates() -> GoldSilverRates:
    """Fetch live gold and silver rates with caching"""
    # Check cache
    now = datetime.now(timezone.utc)
    if rate_cache["data"] and rate_cache["timestamp"]:
        age = (now - rate_cache["timestamp"]).total_seconds()
        if age < rate_cache["ttl_seconds"]:
            logger.info("Returning cached rates")
            return rate_cache["data"]
    
    api_key = os.environ.get('GOLD_API_KEY')
    if not api_key:
        # Return mock data if no API key
        logger.warning("No API key found, using mock data")
        return GoldSilverRates(
            gold_24k_per_gram=6500.0,
            gold_22k_per_gram=5950.0,
            gold_18k_per_gram=4875.0,
            silver_per_gram=82.0,
            timestamp=now,
            source="mock_data"
        )
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            # Try GoldAPI.io format
            headers = {"x-access-token": api_key}
            response = await http_client.get(
                "https://www.goldapi.io/api/XAU/INR",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                # GoldAPI returns price per troy ounce, convert to grams
                gold_24k_per_oz = data.get('price', 0)
                gold_24k_per_gram = gold_24k_per_oz / 31.1035
                
                # Get silver rate
                silver_response = await http_client.get(
                    "https://www.goldapi.io/api/XAG/INR",
                    headers=headers
                )
                silver_per_gram = 82.0  # default
                if silver_response.status_code == 200:
                    silver_data = silver_response.json()
                    silver_per_oz = silver_data.get('price', 0)
                    silver_per_gram = silver_per_oz / 31.1035
                
                rates = GoldSilverRates(
                    gold_24k_per_gram=round(gold_24k_per_gram, 2),
                    gold_22k_per_gram=round(gold_24k_per_gram * 0.916, 2),  # 22K is 91.6% pure
                    gold_18k_per_gram=round(gold_24k_per_gram * 0.75, 2),   # 18K is 75% pure
                    silver_per_gram=round(silver_per_gram, 2),
                    timestamp=now,
                    source="goldapi.io"
                )
                
                # Cache the rates
                rate_cache["data"] = rates
                rate_cache["timestamp"] = now
                
                logger.info(f"Fetched live rates: Gold 24K = ₹{rates.gold_24k_per_gram}/g")
                return rates
            else:
                logger.warning(f"API returned status {response.status_code}, using fallback")
                raise HTTPException(status_code=503, detail="Unable to fetch live rates")
    
    except Exception as e:
        logger.error(f"Error fetching rates: {str(e)}")
        # Return reasonable fallback rates
        return GoldSilverRates(
            gold_24k_per_gram=6500.0,
            gold_22k_per_gram=5950.0,
            gold_18k_per_gram=4875.0,
            silver_per_gram=82.0,
            timestamp=now,
            source="fallback_data"
        )

def calculate_zakat(request: ZakatCalculationRequest, rates: GoldSilverRates) -> ZakatCalculationResponse:
    """Calculate Zakat according to Hanafi jurisprudence"""
    assets = request.assets
    liabilities = request.liabilities
    
    # Calculate total value of gold holdings
    gold_value = (
        assets.gold_24k_grams * rates.gold_24k_per_gram +
        assets.gold_22k_grams * rates.gold_22k_per_gram +
        assets.gold_18k_grams * rates.gold_18k_per_gram
    )
    
    # Calculate silver value
    silver_value = assets.silver_grams * rates.silver_per_gram
    
    # Calculate total assets
    total_assets = (
        gold_value +
        silver_value +
        assets.cash_in_hand +
        assets.bank_savings +
        assets.business_inventory +
        assets.investments +
        assets.receivables +
        assets.other_assets
    )
    
    # Calculate total liabilities
    total_liabilities = (
        liabilities.short_term_debts +
        liabilities.immediate_expenses +
        liabilities.other_liabilities
    )
    
    # Calculate net wealth
    net_wealth = total_assets - total_liabilities
    
    # Calculate Nisab threshold based on user choice
    nisab_gold_value = 87.48 * rates.gold_24k_per_gram
    nisab_silver_value = 612.36 * rates.silver_per_gram
    
    if request.nisab_basis == "gold":
        nisab_threshold = nisab_gold_value
    else:
        nisab_threshold = nisab_silver_value
    
    # Check if Zakat is applicable
    is_zakat_applicable = net_wealth >= nisab_threshold
    
    # Calculate Zakat amount (2.5% of net wealth if above Nisab)
    zakat_amount = (net_wealth * 0.025) if is_zakat_applicable else 0.0
    
    # Asset breakdown
    asset_breakdown = {
        "gold": round(gold_value, 2),
        "silver": round(silver_value, 2),
        "cash_in_hand": round(assets.cash_in_hand, 2),
        "bank_savings": round(assets.bank_savings, 2),
        "business_inventory": round(assets.business_inventory, 2),
        "investments": round(assets.investments, 2),
        "receivables": round(assets.receivables, 2),
        "other_assets": round(assets.other_assets, 2)
    }
    
    return ZakatCalculationResponse(
        total_assets=round(total_assets, 2),
        total_liabilities=round(total_liabilities, 2),
        net_wealth=round(net_wealth, 2),
        nisab_threshold=round(nisab_threshold, 2),
        nisab_basis=request.nisab_basis,
        is_zakat_applicable=is_zakat_applicable,
        zakat_amount=round(zakat_amount, 2),
        calculation_date=datetime.now(timezone.utc),
        rates_used=rates,
        asset_breakdown=asset_breakdown
    )

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "Zakat Calculator API - Serving Indian Muslims"}

@api_router.get("/rates/current", response_model=GoldSilverRates)
async def get_current_rates():
    """Get current gold and silver rates in INR"""
    try:
        rates = await fetch_gold_silver_rates()
        return rates
    except Exception as e:
        logger.error(f"Error in get_current_rates: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to fetch rates")

@api_router.get("/nisab/thresholds", response_model=NisabThresholds)
async def get_nisab_thresholds():
    """Get Nisab thresholds in grams and INR value"""
    try:
        rates = await fetch_gold_silver_rates()
        
        nisab_gold_value = 87.48 * rates.gold_24k_per_gram
        nisab_silver_value = 612.36 * rates.silver_per_gram
        
        return NisabThresholds(
            gold_value_inr=round(nisab_gold_value, 2),
            silver_value_inr=round(nisab_silver_value, 2)
        )
    except Exception as e:
        logger.error(f"Error in get_nisab_thresholds: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to calculate Nisab")

@api_router.post("/zakat/calculate", response_model=ZakatCalculationResponse)
async def calculate_zakat_endpoint(request: ZakatCalculationRequest):
    """Calculate Zakat based on assets and liabilities"""
    try:
        # Fetch current rates
        rates = await fetch_gold_silver_rates()
        
        # Calculate Zakat
        result = calculate_zakat(request, rates)
        
        return result
    except Exception as e:
        logger.error(f"Error in calculate_zakat: {str(e)}")
        raise HTTPException(status_code=500, detail="Calculation error")

# Include router
app.include_router(api_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    import os

port = int(os.environ.get("PORT", 5000))
app.run(host="0.0.0.0", port=port)
