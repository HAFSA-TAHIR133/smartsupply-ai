from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class HITLApprovalManager:
    """
    Manages Human-In-The-Loop approval queues for high-value reorders.
    """
    def __init__(self):
        self.pending_approvals: Dict[str, Dict[str, Any]] = {}

    def create_approval_request(self, tenant_id: str, request_data: Dict[str, Any]) -> str:
        request_id = f"hitl_{tenant_id}_{request_data['sku']}"
        self.pending_approvals[request_id] = {
            "tenant_id": tenant_id,
            "status": "PENDING",
            "data": request_data
        }
        logger.info(f"🚨 [HITL Triggered] Request {request_id} queued for human review.")
        return request_id

    def approve_request(self, request_id: str) -> bool:
        if request_id in self.pending_approvals:
            self.pending_approvals[request_id]["status"] = "APPROVED"
            return True
        return False