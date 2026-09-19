import jwt from "jsonwebtoken";
import { User, Tenant } from "../db/models/index.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-change-me-later";

export const authMiddleware = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.headers["x-tenant-id"] && req.headers["x-internal-secret"] === (process.env.INTERNAL_SERVICE_SECRET || JWT_SECRET)) {
      // Secure fallback only for verified internal service calls
      const tenantId = req.headers["x-tenant-id"];
      const tenant = await Tenant.findByPk(tenantId);
      if (tenant && tenant.isActive) {
        req.tenantId = tenant.id;
        req.tenant = tenant;
        req.user = { id: "00000000-0000-0000-0000-000000000000", email: "system@internal", role: "ADMIN", tenantId: tenant.id, isDemo: false };
        req.userId = req.user.id;
        return next();
      }
    }

    if (!token) {
      return httpResponse.UNAUTHORIZED(res, {}, "Authentication required. Please log in.");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists and is active
    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Tenant, as: "tenant" }],
    });

    if (!user || !user.isActive) {
      return httpResponse.UNAUTHORIZED(res, {}, "User account inactive or not found.");
    }

    if (!user.tenant || !user.tenant.isActive) {
      return httpResponse.FORBIDDEN(res, {}, "Tenant account inactive or suspended.");
    }

    // Attach authenticated identity securely (never trust frontend-provided tenantId)
    req.userId = user.id;
    req.user = user;
    req.user.isDemo = Boolean(decoded.isDemo || user.isDemo || user.tenant?.isDemo);
    req.tenantId = user.tenantId;
    req.tenant = user.tenant;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return httpResponse.UNAUTHORIZED(res, {}, "Session expired. Please log in again.");
    }
    return httpResponse.UNAUTHORIZED(res, {}, "Invalid authentication token.");
  }
};

export const requireRole = (allowedRoles = ["ADMIN", "MANAGER"]) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return httpResponse.FORBIDDEN(res, {}, `Access denied. Requires one of: ${allowedRoles.join(", ")}`);
    }
    next();
  };
};
