import * as tenantService from "../services/tenantServices.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";
import { ErrorCodesMeta } from "../../../../packages/shared/constants/error-codes.js";

export const createTenant = async (req, res) => {
  try {
    const { name, slug, isDemo } = req.body;

    if (!name || !slug) {
      return httpResponse.BAD_REQUEST(res, {}, "name and slug are required");
    }

    const tenant = await tenantService.createTenant({ name, slug, isDemo });
    return httpResponse.CREATED(res, tenant, "Tenant created successfully");
  } catch (error) {
    console.error("createTenant error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return httpResponse.CONFLICT(res, {}, "Tenant with this slug already exists");
    }

    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const getAllTenants = async (req, res) => {
  try {
    const tenants = await tenantService.getAllTenants();
    return httpResponse.SUCCESS(res, tenants);
  } catch (error) {
    console.error("getAllTenants error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};