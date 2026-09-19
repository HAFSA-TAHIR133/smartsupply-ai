import pytest
from app.memory.tenant_memory import MemoryService

def test_mem0_user_and_tenant_memory_isolation():
    """
    Test requirement:
    Add 3 memories for user A, 1 for user B.
    Search as user A.
    Assert only A's 3 come back and B's never leaks in (isolation check).
    """
    memory_svc = MemoryService()

    user_a = "usr_tenantA_owner"
    tenant_a = "tenant-aaa-111"

    user_b = "usr_tenantB_owner"
    tenant_b = "tenant-bbb-222"

    # 1. Add 3 memories for user A
    memory_svc.remember(
        text="Preferred supplier for fasteners is BoltFast Logistics",
        user_id=user_a,
        tenant_id=tenant_a,
        category="supplier_preference"
    )
    memory_svc.remember(
        text="Standard restocking lead time required is 3 days",
        user_id=user_a,
        tenant_id=tenant_a,
        category="operational_rule"
    )
    memory_svc.remember(
        text="Always reorder 50 units when stock drops below 15",
        user_id=user_a,
        tenant_id=tenant_a,
        category="stock_rule"
    )

    # 2. Add 1 memory for user B
    memory_svc.remember(
        text="Preferred supplier is GlobalExpress and requires 10 days buffer",
        user_id=user_b,
        tenant_id=tenant_b,
        category="supplier_preference"
    )

    # 3. Recall as user A
    recalled_a = memory_svc.recall(query="supplier preference and lead time", user_id=user_a, limit=10)

    # 4. Assert only User A's memories return and User B's never leaks
    assert len(recalled_a) == 3, f"Expected exactly 3 memories for User A, got {len(recalled_a)}: {recalled_a}"
    for mem in recalled_a:
        assert "GlobalExpress" not in mem, f"Leak detected! User B memory found in User A recall: {mem}"
        assert "10 days" not in mem, f"Leak detected! User B buffer found in User A recall: {mem}"

    # 5. Recall as user B
    recalled_b = memory_svc.recall(query="supplier", user_id=user_b, limit=10)
    assert len(recalled_b) == 1
    assert "GlobalExpress" in recalled_b[0]
    assert "BoltFast" not in recalled_b[0]

    print("✅ Memory isolation test passed: Zero cross-tenant leakage between User A and User B.")
