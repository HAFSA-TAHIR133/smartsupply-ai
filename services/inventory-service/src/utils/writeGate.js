import { sequelize } from "../db/index.js";
import { newrelicHelper } from "./newrelicHelper.js";

/**
 * Unified write gate for all mutating endpoints and agent execute steps.
 *
 * Runs the mutating callback inside a database transaction:
 * - If `user.isDemo` is true: always ROLLBACK so nothing persists to the real database.
 * - If `user.isDemo` is false: COMMIT normally.
 *
 * Guarantees exact same validation, schema constraints, and return shapes for both demo and real users.
 */
export const executeWithWriteGate = async (user, operation, context = {}) => {
  const isDemo = Boolean(user?.isDemo);
  const actionType = context.actionType || "write_operation";
  const userId = user?.id || "anonymous";
  const tenantId = user?.tenantId || context.tenantId || "unknown";

  newrelicHelper.recordWriteGateEvent({ isDemo, actionType, userId, tenantId });

  const transaction = await sequelize.transaction();

  try {
    const result = await operation(transaction);

    if (isDemo) {
      // Always rollback for demo users
      await transaction.rollback();
      console.log(`🛡️ [WriteGate: DEMO] Transaction rolled back for '${actionType}' (User: ${userId}, Tenant: ${tenantId})`);

      if (result && typeof result === "object" && !Array.isArray(result)) {
        return { ...result, _simulated: true, isDemo: true };
      }
      return result;
    } else {
      // Commit for real users
      await transaction.commit();
      console.log(`💾 [WriteGate: REAL] Transaction committed for '${actionType}' (User: ${userId}, Tenant: ${tenantId})`);
      return result;
    }
  } catch (error) {
    if (!transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        // Transaction might already be closed
      }
    }
    newrelicHelper.noticeError(error, { writeGate: true, isDemo, actionType, userId, tenantId });
    throw error;
  }
};

export default executeWithWriteGate;
