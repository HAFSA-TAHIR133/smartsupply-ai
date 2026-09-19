import os
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("agent-orchestrator.memory")

try:
    from mem0 import Memory
except ImportError:
    Memory = None

try:
    import newrelic.agent
except ImportError:
    newrelic = None


class MemoryService:
    """
    Unified, tenant-isolated memory service using Mem0 with a resilient local store fallback.
    Guarantees strict user_id scoping, consistent normalization, metadata tagging, and New Relic telemetry.
    """
    def __init__(self):
        self.memory = None
        self._local_store: Dict[str, List[Dict[str, Any]]] = {}

        if Memory and os.getenv("MEM0_API_KEY"):
            try:
                self.memory = Memory()
                logger.info("✅ Mem0 Memory client initialized via API key.")
            except Exception as e:
                logger.warning(f"⚠️ Mem0 API initialization failed: {e}")

        if not self.memory and Memory:
            try:
                config = {
                    "llm": {
                        "provider": "xai",
                        "config": {
                            "model": "grok-beta",
                            "temperature": 0.1,
                            "api_key": os.getenv("XAI_API_KEY", "dummy_key")
                        }
                    },
                    "embedder": {
                        "provider": "huggingface",
                        "config": {
                            "model": "all-MiniLM-L6-v2"
                        }
                    }
                }
                self.memory = Memory.from_config(config)
                logger.info("✅ Mem0 Memory initialized via local config.")
            except Exception as e:
                logger.warning(f"⚠️ Mem0 local config fallback: {e}")
                self.memory = None

    @staticmethod
    def normalize_user_id(user_id: str) -> str:
        """Ensures identical string formatting and exact casing across add and search."""
        if not user_id:
            return "user_default"
        return str(user_id).strip().lower()

    def remember(
        self,
        text: str,
        user_id: str,
        tenant_id: Optional[str] = None,
        category: str = "general",
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Adds a memory scoped strictly to the real, stable user id.
        Always tags tenant_id, category, and metadata.
        """
        stable_user_id = self.normalize_user_id(user_id)
        meta = {
            "tenant_id": str(tenant_id or "default_tenant"),
            "category": str(category),
            **(metadata or {})
        }

        # 1. Update in-memory local store for deterministic multi-tenant isolation
        if stable_user_id not in self._local_store:
            self._local_store[stable_user_id] = []

        self._local_store[stable_user_id].append({
            "memory": text,
            "metadata": meta,
        })

        # 2. Delegate to Mem0 if active
        if self.memory:
            try:
                self.memory.add(text, user_id=stable_user_id, metadata=meta)
                logger.info(f"🧠 [Memory Remembered] User: {stable_user_id} | Text: '{text[:40]}...'")
            except Exception as e:
                logger.warning(f"⚠️ Mem0 add failed ({e}), saved to local memory store.")

        return True

    def recall(
        self,
        query: str,
        user_id: str,
        limit: int = 10
    ) -> List[str]:
        """
        Retrieves memories scoped identically to user_id, with an explicit, sane limit.
        Logs telemetry { userId, query, resultsCount } to New Relic.
        """
        stable_user_id = self.normalize_user_id(user_id)
        results: List[str] = []

        # 1. Try Mem0
        if self.memory:
            try:
                mem_res = self.memory.search(query=query, user_id=stable_user_id, limit=limit)
                if isinstance(mem_res, dict) and "results" in mem_res:
                    results = [m["memory"] for m in mem_res["results"] if isinstance(m, dict) and "memory" in m]
                elif isinstance(mem_res, list):
                    for item in mem_res:
                        if isinstance(item, dict) and "memory" in item:
                            results.append(item["memory"])
                        elif isinstance(item, str):
                            results.append(item)
            except Exception as e:
                logger.warning(f"⚠️ Mem0 search failed: {e}")

        # 2. If Mem0 returned empty or is unconfigured, check local user store
        if not results and stable_user_id in self._local_store:
            q_lower = query.lower()
            keywords = [w for w in q_lower.split() if len(w) > 2] or q_lower.split()
            user_mems = [m["memory"] for m in self._local_store[stable_user_id]]
            matching = [m for m in user_mems if any(w in m.lower() for w in keywords)]
            non_matching = [m for m in user_mems if m not in matching]
            results = (matching + non_matching)[:limit]

        results_count = len(results)

        # 3. Telemetry Log & New Relic Custom Event
        logger.info(f"🔍 [Memory Recall] User: {stable_user_id} | Query: '{query}' | Results Count: {results_count}")

        if newrelic and hasattr(newrelic, "agent"):
            try:
                newrelic.agent.record_custom_event("AgentRecallMemory", {
                    "userId": stable_user_id,
                    "query": query,
                    "resultsCount": results_count
                })
            except Exception:
                pass

        return results

    # Backward compatibility helpers
    def add_preference(self, tenant_id: str, text: str, metadata: Optional[Dict[str, Any]] = None, user_id: Optional[str] = None) -> None:
        target_id = user_id or tenant_id
        self.remember(text=text, user_id=target_id, tenant_id=tenant_id, category="preference", metadata=metadata)

    def get_tenant_context(self, tenant_id: str, query: str, user_id: Optional[str] = None, limit: int = 10) -> List[str]:
        target_id = user_id or tenant_id
        return self.recall(query=query, user_id=target_id, limit=limit)


# Singleton instances
memory_service = MemoryService()
TenantMemoryManager = MemoryService  # Alias for backward compatibility