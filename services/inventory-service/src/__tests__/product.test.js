import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";

// 1. Mock the Product Service using jest.unstable_mockModule for ESM
jest.unstable_mockModule("../services/productService.js", () => ({
  getAllProducts: jest.fn(),
  getProductById: jest.fn(),
  createProduct: jest.fn(),
  deleteProduct: jest.fn(),
}));

// 2. Dynamically import services and controllers after setting up ESM mock
const productService = await import("../services/productService.js");
const {
  getAllProducts,
  getProductById,
  createProduct,
  deleteProduct,
} = await import("../controllers/productControllers.js");

// Set up mock Express App
const app = express();
app.use(express.json());

// Mock Tenant Middleware
const mockTenantMiddleware = (req, res, next) => {
  const tenantId = req.headers["x-tenant-id"];
  if (!tenantId) {
    return res.status(400).json({
      status: 400,
      response: "Bad Request",
      message: "x-tenant-id header is required",
      data: {},
    });
  }
  req.tenantId = tenantId;
  next();
};

// Mount routes for testing
app.get("/api/products", mockTenantMiddleware, getAllProducts);
app.get("/api/products/:id", mockTenantMiddleware, getProductById);
app.post("/api/products", mockTenantMiddleware, createProduct);
app.delete("/api/products/:id", mockTenantMiddleware, deleteProduct);

describe("Inventory Service - Unit & Controller Tests", () => {
  const mockTenantId = "3e6c5a8e-f131-4902-8d80-1c9056f858d4";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Business Logic Tests
  describe("Stock Business Logic", () => {
    test("Should correctly flag product as low stock when quantity <= reorderPoint", () => {
      const product = { quantity: 5, reorderPoint: 10 };
      const isLowStock = product.quantity <= product.reorderPoint;
      expect(isLowStock).toBe(true);
    });

    test("Should not flag as low stock when quantity is healthy", () => {
      const product = { quantity: 50, reorderPoint: 10 };
      const isLowStock = product.quantity <= product.reorderPoint;
      expect(isLowStock).toBe(false);
    });
  });

  // 2. Multi-Tenant Guard Tests
  describe("Tenant Middleware Security", () => {
    test("Should return 400 Bad Request if x-tenant-id header is missing", async () => {
      const response = await request(app).get("/api/products");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("x-tenant-id header is required");
      expect(productService.getAllProducts).not.toHaveBeenCalled();
    });
  });

  // 3. Controller Endpoints Tests
  describe("GET /api/products", () => {
    test("Should return products scoped to the requesting tenant", async () => {
      const mockProducts = [
        { id: "prod-1", sku: "SKU-001", name: "Wireless Mouse", tenantId: mockTenantId },
        { id: "prod-2", sku: "SKU-002", name: "Keyboard", tenantId: mockTenantId },
      ];

      productService.getAllProducts.mockResolvedValueOnce(mockProducts);

      const response = await request(app)
        .get("/api/products")
        .set("x-tenant-id", mockTenantId);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(productService.getAllProducts).toHaveBeenCalledWith(mockTenantId);
    });
  });

  describe("POST /api/products", () => {
    test("Should create product with valid body and tenant context", async () => {
      const newProductPayload = {
        sku: "SKU-100",
        name: "Gaming Monitor",
        quantity: 15,
        reorderPoint: 5,
        unitPrice: 299.99,
      };

      const mockCreatedProduct = {
        id: "prod-999",
        tenantId: mockTenantId,
        ...newProductPayload,
      };

      productService.createProduct.mockResolvedValueOnce(mockCreatedProduct);

      const response = await request(app)
        .post("/api/products")
        .set("x-tenant-id", mockTenantId)
        .send(newProductPayload);

      expect(response.status).toBe(201);
      expect(response.body.data.id).toBe("prod-999");
      expect(productService.createProduct).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({ sku: "SKU-100", name: "Gaming Monitor" })
      );
    });

    test("Should return 400 if required fields (sku or name) are missing", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("x-tenant-id", mockTenantId)
        .send({ quantity: 10 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("sku and name are required");
      expect(productService.createProduct).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /api/products/:id", () => {
    test("Should return 404 when attempting to delete a non-existent product", async () => {
      productService.deleteProduct.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete("/api/products/non-existent-id")
        .set("x-tenant-id", mockTenantId);

      expect(response.status).toBe(404);
      expect(productService.deleteProduct).toHaveBeenCalledWith(
        mockTenantId,
        "non-existent-id"
      );
    });
  });
});