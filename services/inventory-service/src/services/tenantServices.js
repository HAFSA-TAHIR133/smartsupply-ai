import { Tenant } from "../db/models/index.js";

export const createTenant = async ({ name, slug, isDemo = false }) => {
  const tenant = await Tenant.create({
    name,
    slug,
    isDemo,
    isActive: true,
  });
  return tenant;
};

export const getAllTenants = async () => {
  return await Tenant.findAll({
    order: [["createdAt", "DESC"]],
  });
};

export const getTenantById = async (id) => {
  return await Tenant.findByPk(id);
};