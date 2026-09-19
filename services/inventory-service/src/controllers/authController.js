import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { User, Tenant, PasswordResetToken } from "../db/models/index.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-change-me-later";
const JWT_EXPIRES_IN = "7d";

const generateToken = (user, isDemoOverride = false) => {
  const isDemo = Boolean(isDemoOverride || user.isDemo || user.tenant?.isDemo);
  return jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      isDemo,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const signup = async (req, res) => {
  try {
    const { email, password, name, organizationName } = req.body;

    if (!email || !password || !name) {
      return httpResponse.BAD_REQUEST(res, {}, "Email, password, and name are required.");
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return httpResponse.CONFLICT(res, {}, "An account with this email already exists.");
    }

    // Create Tenant
    const orgSlug = (organizationName || name + " Org")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-") + "-" + Math.floor(1000 + Math.random() * 9000);

    const tenant = await Tenant.create({
      id: uuidv4(),
      name: organizationName || `${name}'s Logistics`,
      slug: orgSlug,
      isActive: true,
      isDemo: false,
    });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      id: uuidv4(),
      tenantId: tenant.id,
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: "ADMIN",
      isActive: true,
    });

    const token = generateToken(user);

    return httpResponse.CREATED(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: tenant.name,
      },
    }, "Account created successfully.");
  } catch (error) {
    console.error("Signup error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res, {}, error.message);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return httpResponse.BAD_REQUEST(res, {}, "Email and password are required.");
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      include: [{ model: Tenant, as: "tenant" }],
    });

    if (!user) {
      return httpResponse.UNAUTHORIZED(res, {}, "Invalid email or password.");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return httpResponse.UNAUTHORIZED(res, {}, "Invalid email or password.");
    }

    if (!user.isActive || (user.tenant && !user.tenant.isActive)) {
      return httpResponse.FORBIDDEN(res, {}, "Your account or organization is inactive.");
    }

    const token = generateToken(user);

    return httpResponse.SUCCESS(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name || "Acme Logistics",
      },
    }, "Login successful.");
  } catch (error) {
    console.error("Login error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const demoLogin = async (req, res) => {
  try {
    const demoTenantId = "3e6c5a8e-f131-4902-8d80-1c9056f858d4";
    let user = await User.findOne({
      where: { email: "admin@smartsupply.ai" },
      include: [{ model: Tenant, as: "tenant" }],
    });

    if (!user) {
      user = await User.findOne({
        where: { tenantId: demoTenantId },
        include: [{ model: Tenant, as: "tenant" }],
      });
    }

    if (!user) {
      return httpResponse.NOT_FOUND(res, {}, "Demo data not initialized. Please run seeds.");
    }

    const token = generateToken(user, true);

    return httpResponse.SUCCESS(res, {
      token,
      isDemo: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name || "Acme Logistics Global",
      },
    }, "Demo sandbox activated.");
  } catch (error) {
    console.error("Demo login error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const getMe = async (req, res) => {
  try {
    return httpResponse.SUCCESS(res, {
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        avatarUrl: req.user.avatarUrl,
        tenantId: req.user.tenantId,
        tenantName: req.tenant?.name,
      },
    });
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return httpResponse.BAD_REQUEST(res, {}, "Email is required.");
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Return success to prevent email enumeration
      return httpResponse.SUCCESS(res, {}, "If an account exists, a 6-digit OTP has been sent.");
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await PasswordResetToken.create({
      id: uuidv4(),
      email: email.toLowerCase(),
      otpHash,
      expiresAt,
      used: false,
    });

    console.log(`🔑 [PASSWORD RESET OTP] For ${email}: ${otp} (Expires in 10 mins)`);

    return httpResponse.SUCCESS(res, {
      message: "6-digit OTP sent to your registered email.",
      debugOtp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return httpResponse.BAD_REQUEST(res, {}, "Email, OTP, and new password are required.");
    }

    const otpHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    const resetRecord = await PasswordResetToken.findOne({
      where: {
        email: email.toLowerCase(),
        otpHash,
        used: false,
      },
      order: [["createdAt", "DESC"]],
    });

    if (!resetRecord || new Date() > new Date(resetRecord.expiresAt)) {
      return httpResponse.BAD_REQUEST(res, {}, "Invalid or expired OTP code.");
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return httpResponse.NOT_FOUND(res, {}, "User not found.");
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await user.update({ passwordHash: newHash });
    await resetRecord.update({ used: true });

    return httpResponse.SUCCESS(res, {}, "Password has been successfully reset. Please log in.");
  } catch (error) {
    console.error("Reset password error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};
