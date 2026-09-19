import { v4 as uuidv4 } from "uuid";
import { Lead, Customer, Contact, Pipeline, PipelineStage, Task, Activity } from "../db/models/index.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";

// ================= LEADS =================
export const getLeads = async (req, res) => {
  try {
    const { status } = req.query;
    const where = { tenantId: req.tenantId };
    if (status) where.status = status;

    const leads = await Lead.findAll({
      where,
      order: [["value", "DESC"]],
    });

    return httpResponse.SUCCESS(res, leads);
  } catch (error) {
    console.error("getLeads error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const createLead = async (req, res) => {
  try {
    const { name, email, company, status = "NEW", value = 0, source, assignedTo } = req.body;
    if (!name) return httpResponse.BAD_REQUEST(res, {}, "Lead name is required.");

    const lead = await Lead.create({
      id: uuidv4(),
      tenantId: req.tenantId,
      name,
      email,
      company,
      status,
      value: parseFloat(value || 0),
      source,
      assignedTo: assignedTo || req.user?.name,
    });

    await Activity.create({
      id: uuidv4(),
      tenantId: req.tenantId,
      type: "LEAD_CREATED",
      description: `New lead '${name}' added with value $${value}`,
      entityType: "LEAD",
      entityId: lead.id,
      performedBy: req.user?.name || "CRM Admin",
    });

    return httpResponse.CREATED(res, lead, "Lead created successfully.");
  } catch (error) {
    console.error("createLead error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const updateLeadStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const lead = await Lead.findOne({ where: { id, tenantId: req.tenantId } });
    if (!lead) return httpResponse.NOT_FOUND(res, {}, "Lead not found.");

    const oldStatus = lead.status;
    await lead.update({ status });

    await Activity.create({
      id: uuidv4(),
      tenantId: req.tenantId,
      type: "STAGE_CHANGE",
      description: `Lead '${lead.name}' moved from ${oldStatus} to ${status}`,
      entityType: "LEAD",
      entityId: lead.id,
      performedBy: req.user?.name || "CRM User",
    });

    return httpResponse.SUCCESS(res, lead, "Stage updated successfully.");
  } catch (error) {
    console.error("updateLeadStage error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({ where: { id, tenantId: req.tenantId } });
    if (!lead) return httpResponse.NOT_FOUND(res, {}, "Lead not found.");

    await lead.destroy();
    return httpResponse.SUCCESS(res, {}, "Lead deleted successfully.");
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

// ================= PIPELINES & KANBAN =================
export const getPipeline = async (req, res) => {
  try {
    let pipeline = await Pipeline.findOne({
      where: { tenantId: req.tenantId },
      include: [{ model: PipelineStage, as: "stages", order: [["order", "ASC"]] }],
    });

    const leads = await Lead.findAll({
      where: { tenantId: req.tenantId },
      order: [["createdAt", "DESC"]],
    });

    const defaultStages = ["New", "Contacted", "Qualified", "Proposal", "Won"];
    const stages = pipeline?.stages?.map(s => s.name) || defaultStages;

    // Group leads by stage
    const grouped = {};
    stages.forEach(st => { grouped[st] = []; });

    leads.forEach(lead => {
      const matchedStage = stages.find(s => s.toLowerCase() === lead.status.toLowerCase()) || stages[0];
      if (!grouped[matchedStage]) grouped[matchedStage] = [];
      grouped[matchedStage].push(lead);
    });

    return httpResponse.SUCCESS(res, {
      stages,
      columns: grouped,
      totalLeads: leads.length,
      totalPipelineValue: leads.reduce((sum, l) => sum + parseFloat(l.value || 0), 0),
    });
  } catch (error) {
    console.error("getPipeline error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

// ================= CUSTOMERS & CONTACTS =================
export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      where: { tenantId: req.tenantId },
      include: [{ model: Contact, as: "contacts" }],
      order: [["totalSpend", "DESC"]],
    });

    return httpResponse.SUCCESS(res, customers);
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, company, status = "ACTIVE", totalSpend = 0, contactName, contactEmail, contactRole } = req.body;
    if (!name) return httpResponse.BAD_REQUEST(res, {}, "Customer name is required.");

    const customer = await Customer.create({
      id: uuidv4(),
      tenantId: req.tenantId,
      name,
      email,
      phone,
      company,
      status,
      totalSpend: parseFloat(totalSpend || 0),
    });

    if (contactName) {
      await Contact.create({
        id: uuidv4(),
        tenantId: req.tenantId,
        customerId: customer.id,
        name: contactName,
        email: contactEmail || email,
        phone,
        role: contactRole || "Primary Contact",
      });
    }

    return httpResponse.CREATED(res, customer, "Customer created successfully.");
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

// ================= TASKS =================
export const getTasks = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const where = { tenantId: req.tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await Task.findAll({
      where,
      order: [
        [Task.sequelize.literal(`CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END`), "ASC"],
        ["dueDate", "ASC"],
      ],
    });

    return httpResponse.SUCCESS(res, tasks);
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const createTask = async (req, res) => {
  try {
    const { title, description, priority = "MEDIUM", dueDate, assignedTo } = req.body;
    if (!title) return httpResponse.BAD_REQUEST(res, {}, "Task title is required.");

    const task = await Task.create({
      id: uuidv4(),
      tenantId: req.tenantId,
      title,
      description,
      status: "TODO",
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || req.user?.name,
    });

    return httpResponse.CREATED(res, task, "Task created successfully.");
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'TODO', 'IN_PROGRESS', 'DONE'

    const task = await Task.findOne({ where: { id, tenantId: req.tenantId } });
    if (!task) return httpResponse.NOT_FOUND(res, {}, "Task not found.");

    await task.update({ status });
    return httpResponse.SUCCESS(res, task, "Task status updated.");
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({ where: { id, tenantId: req.tenantId } });
    if (!task) return httpResponse.NOT_FOUND(res, {}, "Task not found.");

    await task.destroy();
    return httpResponse.SUCCESS(res, {}, "Task deleted.");
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

// ================= ACTIVITIES =================
export const getActivities = async (req, res) => {
  try {
    const activities = await Activity.findAll({
      where: { tenantId: req.tenantId },
      order: [["createdAt", "DESC"]],
      limit: 30,
    });
    return httpResponse.SUCCESS(res, activities);
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};
