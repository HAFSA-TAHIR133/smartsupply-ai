import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartSupply AI - Agent Orchestrator"
    VERSION: str = "1.0.0"
    
    # Infrastructure
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    INVENTORY_SERVICE_URL: str = os.getenv("INVENTORY_SERVICE_URL", "http://localhost:4001")
    
    # AI & Knowledge
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "smartsupply-index")
    MEM0_API_KEY: str = os.getenv("MEM0_API_KEY", "")
    
    # Telemetry
    NEW_RELIC_LICENSE_KEY: str = os.getenv("NEW_RELIC_LICENSE_KEY", "")
    NEW_RELIC_APP_NAME: str = os.getenv("NEW_RELIC_APP_NAME", "agent-orchestrator")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()