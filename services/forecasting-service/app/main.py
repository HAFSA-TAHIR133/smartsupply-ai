import os
import logging
from fastapi import FastAPI
from app.config import settings
from app.api.v1.forecast import router as forecast_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("forecasting-service")

# Initialize New Relic Agent
if settings.NEW_RELIC_LICENSE_KEY:
    try:
        import newrelic.agent
        newrelic.agent.initialize('newrelic.ini')
        logger.info("✅ New Relic Python Agent initialized.")
    except Exception as e:
        logger.warning(f"⚠️ Could not initialize New Relic: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION
)

app.include_router(forecast_router)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "forecasting-service",
        "algorithm": "Holt-Winters Exponential Smoothing"
    }