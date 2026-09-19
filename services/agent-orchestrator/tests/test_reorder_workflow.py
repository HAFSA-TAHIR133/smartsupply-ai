import pytest
from app.graphs.reorder_workflow import build_reorder_graph
from app.memory.tenant_memory import TenantMemoryManager

@pytest.fixture
def graph():
    return build_reorder_graph()

def test_tenant_memory_isolation():
    memory_mgr = TenantMemoryManager()
    
    tenant_a = "tenant-aaa-111"
    tenant_b = "tenant-bbb-222"

    memory_mgr.add_preference(tenant_a, "Vendor: FastSupply")
    memory_mgr.add_preference(tenant_b, "Vendor: SlowSupply")

    context_a = memory_mgr.get_tenant_context(tenant_a, "Vendor")
    context_b = memory_mgr.get_tenant_context(tenant_b, "Vendor")

    assert context_a != context_b

def test_reorder_workflow_auto_approval(graph):
    initial_state = {
        "tenant_id": "3e6c5a8e-f131-4902-8d80-1c9056f858d4",
        "product_id": "prod-1",
        "sku": "SKU-001",
        "current_quantity": 2,
        "reorder_point": 10,
        "unit_price": 10.0,
        "recommended_quantity": 0,
        "context_memories": [],
        "vendor_preference": None,
        "ai_reasoning": None,
        "needs_hitl_approval": False,
        "hitl_request_id": None,
        "status": "INIT"
    }

    result = graph.invoke(initial_state)

    assert result["recommended_quantity"] == 23
    assert result["needs_hitl_approval"] is False
    assert result["status"] == "AUTO_APPROVED"

def test_reorder_workflow_triggers_hitl(graph):
    initial_state = {
        "tenant_id": "3e6c5a8e-f131-4902-8d80-1c9056f858d4",
        "product_id": "prod-2",
        "sku": "SKU-HIGH-VAL",
        "current_quantity": 1,
        "reorder_point": 20,
        "unit_price": 50.0,
        "recommended_quantity": 0,
        "context_memories": [],
        "vendor_preference": None,
        "ai_reasoning": None,
        "needs_hitl_approval": False,
        "hitl_request_id": None,
        "status": "INIT"
    }

    result = graph.invoke(initial_state)

    assert result["recommended_quantity"] == 49
    assert result["needs_hitl_approval"] is True
    assert result["status"] == "WAITING_HUMAN_APPROVAL"
    assert result["hitl_request_id"].startswith("hitl_")