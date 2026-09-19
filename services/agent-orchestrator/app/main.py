import asyncio
import logging
import os
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import settings
from app.consumers.inventory_consumer import start_consumer

# 1. Setup Logging first so it's available for initialization steps
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent-orchestrator")

# 2. Initialize New Relic Python Agent if configured
if settings.NEW_RELIC_LICENSE_KEY:
    try:
        import newrelic.agent
        newrelic.agent.initialize('newrelic.ini')
        logger.info("✅ New Relic Python Agent initialized.")
    except Exception as e:
        logger.warning(f"⚠️ Could not initialize New Relic: {e}")

# 3. Define Modern Lifespan Manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger.info("🚀 Starting Agent Orchestrator service...")
    
    # If start_consumer is a blocking/synchronous Pika consumer loop,
    # run it in a separate daemon thread so Uvicorn isn't blocked:
    consumer_thread = threading.Thread(target=start_consumer, daemon=True)
    consumer_thread.start()
    
    yield
    
    # Shutdown logic
    logger.info("🛑 Shutting down Agent Orchestrator service...")

# 4. Initialize FastAPI Application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# 5. Define Endpoints
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "agent-orchestrator",
        "llm": "Groq llama-3.3-70b-versatile",
        "vector_store": "Pinecone"
    }
