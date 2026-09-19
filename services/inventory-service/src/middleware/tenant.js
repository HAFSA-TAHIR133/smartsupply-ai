import { Tenant } from "../db/models/index.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";
import { ErrorCodesMeta } from "../../../../packages/shared/constants/error-codes.js";

export const tenantMiddleware = async (req, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"];

    if (!tenantId) {
      return httpResponse.BAD_REQUEST(res, {}, "x-tenant-id header is required");
    }

    const tenant = await Tenant.findByPk(tenantId);

    if (!tenant) {
      return httpResponse.NOT_FOUND(res, {}, ErrorCodesMeta.TENANT_NOT_FOUND.message);
    }

    if (!tenant.isActive) {
      return httpResponse.FORBIDDEN(res, {}, ErrorCodesMeta.TENANT_INACTIVE.message);
    }

    // Attach full tenant info for later use
    req.tenantId = tenant.id;
    req.tenant = tenant;

    next();
  } catch (error) {
    console.error("tenantMiddleware error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};