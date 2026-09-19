import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartSupply AI - Forecasting Service"
    VERSION: str = "1.0.0"
    PORT: int = int(os.getenv("PORT", 8001))
    
    # Telemetry
    NEW_RELIC_LICENSE_KEY: str = os.getenv("NEW_RELIC_LICENSE_KEY", "")
    NEW_RELIC_APP_NAME: str = os.getenv("NEW_RELIC_APP_NAME", "forecasting-service")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()