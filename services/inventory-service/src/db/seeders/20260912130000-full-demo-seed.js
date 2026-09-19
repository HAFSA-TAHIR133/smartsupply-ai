import { v4 as uuidv4 } from "uuid";

export async function up(queryInterface, Sequelize) {
  const demoTenantId = "3e6c5a8e-f131-4902-8d80-1c9056f858d4";
  const now = new Date();

  // 1. Check or insert Tenant
  const existingTenants = await queryInterface.rawSelect(
    "tenants",
    { where: { id: demoTenantId } },
    ["id"]
  );

  if (!existingTenants) {
    await queryInterface.bulkInsert("tenants", [
      {
        id: demoTenantId,
        name: "Acme Logistics Global",
        slug: "acme-logistics",
        isActive: true,
        isDemo: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  // 2. Dummy User: admin@smartsupply.ai / Admin@123456
  const existingUser = await queryInterface.rawSelect(
    "users",
    { where: { email: "admin@smartsupply.ai" } },
    ["id"]
  );

  const adminUserId = existingUser || uuidv4();
  if (!existingUser) {
    await queryInterface.bulkInsert("users", [
      {
        id: adminUserId,
        tenantId: demoTenantId,
        email: "admin@smartsupply.ai",
        passwordHash: "$2b$12$O9taHcfPlb3MPRelLkrh1egWDMINKmNYY8Sd3oD.J53pcceRtMpg6", // Admin@123456
        name: "Alex Reynolds (Admin)",
        role: "ADMIN",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        tenantId: demoTenantId,
        email: "demo@smartsupply.ai",
        passwordHash: "$2b$12$O9taHcfPlb3MPRelLkrh1egWDMINKmNYY8Sd3oD.J53pcceRtMpg6", // Admin@123456
        name: "Demo Manager",
        role: "VIEWER",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  // 3. Products: update or seed comprehensive items
  const p1Id = uuidv4();
  const p2Id = uuidv4();
  const p3Id = uuidv4();
  const p4Id = uuidv4();

  await queryInterface.bulkInsert("products", [
    {
      id: p1Id,
      tenantId: demoTenantId,
      sku: "SKU-LOG-101",
      name: "Industrial Barcode Scanner",
      category: "Hardware",
      description: "Wireless handheld 2D QR and barcode scanner with IP65 rugged casing",
      quantity: 4,
      reorderPoint: 12,
      unitPrice: 189.50,
      supplierEmail: "supplier-scanner@apexlogistics.com",
      imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: p2Id,
      tenantId: demoTenantId,
      sku: "SKU-LOG-102",
      name: "Smart Pallet Sensor Hub",
      category: "IoT",
      description: "Temperature, shock, and GPS tracker beacon for fragile cargo pallets",
      quantity: 45,
      reorderPoint: 15,
      unitPrice: 42.00,
      supplierEmail: "sales@sensortrack.io",
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: p3Id,
      tenantId: demoTenantId,
      sku: "SKU-LOG-103",
      name: "Thermal Shipping Label Rolls (Pack of 10)",
      category: "Packaging",
      description: "Direct thermal 4x6 shipping address labels for industrial label printers",
      quantity: 2,
      reorderPoint: 20,
      unitPrice: 28.75,
      supplierEmail: "orders@packpro-supplies.com",
      imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&auto=format&fit=crop",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: p4Id,
      tenantId: demoTenantId,
      sku: "SKU-LOG-104",
      name: "Heavy Duty Hydraulic Pallet Jack",
      category: "Warehouse Equipment",
      description: "5,500 lbs capacity manual pallet truck with polyurethane wheels",
      quantity: 8,
      reorderPoint: 5,
      unitPrice: 380.00,
      supplierEmail: "machinery@industrialdirect.com",
      imageUrl: "https://images.unsplash.com/photo-1586528116493-a029325540fa?w=500&auto=format&fit=crop",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // 4. Stock logs for initial products
  await queryInterface.bulkInsert("stock_logs", [
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      productId: p1Id,
      changeType: "OUT",
      quantityChanged: -6,
      previousQuantity: 10,
      newQuantity: 4,
      reason: "Fulfilled shipment order #ORD-9821 to Apex Cargo",
      performedBy: "Alex Reynolds",
      createdAt: new Date(Date.now() - 3600000 * 24),
      updatedAt: new Date(Date.now() - 3600000 * 24),
    },
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      productId: p3Id,
      changeType: "OUT",
      quantityChanged: -18,
      previousQuantity: 20,
      newQuantity: 2,
      reason: "High fulfillment peak usage",
      performedBy: "Alex Reynolds",
      createdAt: new Date(Date.now() - 3600000 * 12),
      updatedAt: new Date(Date.now() - 3600000 * 12),
    },
  ]);

  // 5. CRM Pipeline & Stages
  const pipelineId = uuidv4();
  await queryInterface.bulkInsert("pipelines", [
    {
      id: pipelineId,
      tenantId: demoTenantId,
      name: "Supply Chain Expansion Pipeline",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await queryInterface.bulkInsert("pipeline_stages", [
    { id: uuidv4(), tenantId: demoTenantId, pipelineId, name: "New", order: 0, createdAt: now, updatedAt: now },
    { id: uuidv4(), tenantId: demoTenantId, pipelineId, name: "Contacted", order: 1, createdAt: now, updatedAt: now },
    { id: uuidv4(), tenantId: demoTenantId, pipelineId, name: "Qualified", order: 2, createdAt: now, updatedAt: now },
    { id: uuidv4(), tenantId: demoTenantId, pipelineId, name: "Proposal", order: 3, createdAt: now, updatedAt: now },
    { id: uuidv4(), tenantId: demoTenantId, pipelineId, name: "Won", order: 4, createdAt: now, updatedAt: now },
  ]);

  // 6. CRM Leads
  await queryInterface.bulkInsert("leads", [
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      name: "Global Freight Systems",
      email: "procurement@globalfreight.com",
      company: "Global Freight Inc.",
      status: "Qualified",
      value: 65000.00,
      source: "Referral",
      assignedTo: "Alex Reynolds",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      name: "Pacific Retailers Co",
      email: "supply@pacificretail.com",
      company: "Pacific Retail Group",
      status: "Proposal",
      value: 38500.00,
      source: "Inbound Web",
      assignedTo: "Alex Reynolds",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      name: "Nordic Goods Distribution",
      email: "elena@nordicgoods.se",
      company: "Nordic Logistics AB",
      status: "Contacted",
      value: 48000.00,
      source: "Trade Show",
      assignedTo: "Alex Reynolds",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      name: "Apex Cargo International",
      email: "contracts@apexcargo.com",
      company: "Apex Cargo Corp",
      status: "Won",
      value: 120000.00,
      source: "Key Account",
      assignedTo: "Alex Reynolds",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      name: "Metro Fresh Logistics",
      email: "dan@metrofresh.org",
      company: "Metro Cold Chain",
      status: "New",
      value: 22000.00,
      source: "Cold Outreach",
      assignedTo: "Alex Reynolds",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // 7. Customers & Contacts
  const cust1Id = uuidv4();
  const cust2Id = uuidv4();
  await queryInterface.bulkInsert("customers", [
    {
      id: cust1Id,
      tenantId: demoTenantId,
      name: "Apex Cargo Corp",
      email: "operations@apexcargo.com",
      phone: "+1 (555) 234-8901",
      company: "Apex Cargo Corp",
      status: "ACTIVE",
      totalSpend: 145000.00,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: cust2Id,
      tenantId: demoTenantId,
      name: "Summit Distribution",
      email: "logistics@summitdist.com",
      phone: "+1 (555) 789-0123",
      company: "Summit Logistics LLC",
      status: "ACTIVE",
      totalSpend: 82400.00,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await queryInterface.bulkInsert("contacts", [
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      customerId: cust1Id,
      name: "Marcus Vance",
      email: "mvance@apexcargo.com",
      phone: "+1 (555) 234-8902",
      role: "VP of Supply Chain",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      customerId: cust2Id,
      name: "Sarah Lindqvist",
      email: "sarah@summitdist.com",
      phone: "+1 (555) 789-0124",
      role: "Procurement Director",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // 8. Tasks
  await queryInterface.bulkInsert("tasks", [
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      title: "Reorder Industrial Barcode Scanners (Low Stock)",
      description: "Current stock is 4 units, minimum threshold is 12 units. Contact supplier-scanner@apexlogistics.com",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 86400000 * 2),
      assignedTo: "Alex Reynolds",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      title: "Finalize $38.5k Proposal for Pacific Retailers Co",
      description: "Include volume discount schedule and delivery SLAs",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 86400000 * 3),
      assignedTo: "Alex Reynolds",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      title: "Verify Q3 freight SLA metrics with Global Freight",
      description: "Review on-time departure and damage incident rate reports",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: new Date(Date.now() + 86400000 * 5),
      assignedTo: "Alex Reynolds",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      title: "Warehouse scanner firmware upgrade completed",
      description: "Updated 15 terminals to version 3.4.1",
      status: "DONE",
      priority: "LOW",
      dueDate: new Date(Date.now() - 86400000 * 1),
      assignedTo: "Alex Reynolds",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // 9. AI Agents Config
  await queryInterface.bulkInsert("agents", [
    {
      id: "inventory-agent",
      tenantId: demoTenantId,
      name: "Inventory Agent",
      description: "Monitors stock levels, detects critical low inventory, and calculates optimal restock orders.",
      role: "Inventory & Warehouse Specialist",
      isEnabled: true,
      allowedTools: JSON.stringify(["get_inventory", "get_low_stock_items", "get_out_of_stock_items", "get_stock_history"]),
      systemPrompt: "You are SmartSupply AI's Inventory Specialist. Provide precise, actionable stock data, warn about low stock items, and calculate recommended order sizes.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "crm-agent",
      tenantId: demoTenantId,
      name: "CRM Agent",
      description: "Manages customer deals, pipeline velocities, lead qualifications, and open sales tasks.",
      role: "CRM & Revenue Specialist",
      isEnabled: true,
      allowedTools: JSON.stringify(["get_leads", "get_customers", "get_pipeline_summary", "get_tasks"]),
      systemPrompt: "You are SmartSupply AI's CRM Agent. Provide deal summaries, identify high-priority sales leads, and suggest timely customer follow-ups.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "document-agent",
      tenantId: demoTenantId,
      name: "Document / RAG Agent",
      description: "Retrieves answers from uploaded logistics contracts, SLAs, supplier guides, and compliance documents.",
      role: "Knowledge & Contract Analyst",
      isEnabled: true,
      allowedTools: JSON.stringify(["search_documents"]),
      systemPrompt: "You are SmartSupply AI's Document Knowledge Specialist. Always cite your sources with document names and page numbers. Never hallucinate terms not in documents.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "supply-chain-agent",
      tenantId: demoTenantId,
      name: "Supply Chain Master Agent",
      description: "Autonomous orchestrator uniting inventory, CRM deals, supplier contracts, and task execution.",
      role: "Chief Supply Chain Strategist",
      isEnabled: true,
      allowedTools: JSON.stringify(["get_inventory", "get_low_stock_items", "get_leads", "get_tasks", "search_documents"]),
      systemPrompt: "You are SmartSupply AI's Master Supply Chain Agent. Provide holistic recommendations uniting inventory demand, client commitments, and vendor contracts.",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // 10. Sample Notifications
  await queryInterface.bulkInsert("notifications", [
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      type: "LOW_STOCK",
      title: "Low Stock Alert: Industrial Barcode Scanner",
      message: "SKU-LOG-101 has 4 units remaining (Threshold: 12). Restock recommended.",
      isRead: false,
      metadata: JSON.stringify({ sku: "SKU-LOG-101", quantity: 4, reorderPoint: 12 }),
      createdAt: new Date(Date.now() - 1800000),
      updatedAt: new Date(Date.now() - 1800000),
    },
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      type: "CRM",
      title: "New Qualified Lead: Global Freight Systems",
      message: "$65,000 deal has advanced to Qualified stage.",
      isRead: false,
      metadata: JSON.stringify({ dealValue: 65000 }),
      createdAt: new Date(Date.now() - 7200000),
      updatedAt: new Date(Date.now() - 7200000),
    },
  ]);

  // 11. Initial Sample Document for RAG
  const docId = uuidv4();
  await queryInterface.bulkInsert("documents", [
    {
      id: docId,
      tenantId: demoTenantId,
      title: "Acme Logistics Master Supplier SLA 2026.pdf",
      fileName: "supplier-sla-2026.pdf",
      filePath: "storage/uploads/demo-supplier-sla.pdf",
      fileType: "application/pdf",
      fileSize: 245000,
      status: "READY",
      metadata: JSON.stringify({ pages: 3, category: "SLA" }),
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await queryInterface.bulkInsert("document_chunks", [
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      documentId: docId,
      chunkIndex: 0,
      content: "Acme Logistics Master Supplier Agreement (Section 2.1): Standard delivery lead time for industrial electronics and scanners is 5 business days upon PO receipt. Expedited shipments require 48 hours notice with a 15% freight surcharge.",
      pageNumber: 1,
      embedding: JSON.stringify([0.024, -0.051, 0.082, 0.015, -0.093]),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      tenantId: demoTenantId,
      documentId: docId,
      chunkIndex: 1,
      content: "Section 4.3 - Minimum Safety Stock and Emergency Reorder: The vendor Shenzhen Electronics guarantees a buffer stock of 50 units reserved for Acme Logistics. Payment terms are Net 30 days with a 2% discount for payments within 10 days.",
      pageNumber: 2,
      embedding: JSON.stringify([0.019, -0.043, 0.076, 0.021, -0.088]),
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

export async function down(queryInterface) {
  const demoTenantId = "3e6c5a8e-f131-4902-8d80-1c9056f858d4";
  await queryInterface.bulkDelete("document_chunks", { tenantId: demoTenantId });
  await queryInterface.bulkDelete("documents", { tenantId: demoTenantId });
  await queryInterface.bulkDelete("notifications", { tenantId: demoTenantId });
  await queryInterface.bulkDelete("agents", { tenantId: demoTenantId });
  await queryInterface.bulkDelete("tasks", { tenantId: demoTenantId });
  await queryInterface.bulkDelete("contacts", { tenantId: demoTenantId });
  await queryInterface.bulkDelete("customers", { tenantId: demoTenantId });
  await queryInterface.bulkDelete("leads", { tenantId: demoTenantId });
  await queryInterface.bulkDelete("pipeline_stages", { tenantId: demoTenantId });
  await queryInterface.bulkDelete("pipelines", { tenantId: demoTenantId });
  await queryInterface.bulkDelete("stock_logs", { tenantId: demoTenantId });
  await queryInterface.bulkDelete("users", { tenantId: demoTenantId });
}
