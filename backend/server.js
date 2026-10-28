require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "*"
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Great Wisdom Business Manager API",
    status: "running"
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "healthy", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    res.status(503).json({
      status: "unavailable",
      database: "disconnected"
    });
  }
});

// GET all customers
app.get("/api/customers", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM customers ORDER BY id DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load customers." });
  }
});

// ADD a customer
app.post("/api/customers", async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Customer name is required." });
    }

    const [result] = await pool.query(
      "INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)",
      [
        name.trim(),
        phone || null,
        email || null,
        address || null
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM customers WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not save customer." });
  }
});

// DELETE a customer
app.delete("/api/customers/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid customer ID." });
    }

    const [result] = await pool.query(
      "DELETE FROM customers WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.json({ message: "Customer deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete customer." });
  }
});

// GET all products
app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM products ORDER BY id DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load products." });
  }
});

// ADD a product
app.post("/api/products", async (req, res) => {
  try {
    const { name, sku, quantity, price } = req.body;
    const stock = Number(quantity);
    const cost = Number(price);

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Product name is required." });
    }

    if (!Number.isInteger(stock) || stock < 0 ||
        !Number.isFinite(cost) || cost < 0) {
      return res.status(400).json({
        error: "Quantity must be a non-negative integer and price must be non-negative."
      });
    }

    const [result] = await pool.query(
      "INSERT INTO products (name, sku, quantity, price) VALUES (?, ?, ?, ?)",
      [name.trim(), sku || null, stock, cost]
    );

    const [rows] = await pool.query(
      "SELECT * FROM products WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "That SKU already exists." });
    }

    res.status(500).json({ error: "Could not save product." });
  }
});

// DELETE a product
app.delete("/api/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid product ID." });
    }

    const [result] = await pool.query(
      "DELETE FROM products WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.json({ message: "Product deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete product." });
  }
});

// Record a sale and reduce stock safely
app.post("/api/sales", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { customer_id, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "At least one sale item is required." });
    }

    await connection.beginTransaction();

    const merged = new Map();

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(productId) || productId < 1 ||
          !Number.isInteger(quantity) || quantity < 1) {
        await connection.rollback();
        return res.status(400).json({ error: "Invalid product or quantity." });
      }

      merged.set(productId, (merged.get(productId) || 0) + quantity);
    }

    const saleItems = [];
    let total = 0;

    for (const [productId, quantity] of merged) {
      const [products] = await connection.query(
        "SELECT id, name, quantity, price FROM products WHERE id = ? FOR UPDATE",
        [productId]
      );

      if (products.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "A product was not found." });
      }

      const product = products[0];

      if (product.quantity < quantity) {
        await connection.rollback();
        return res.status(409).json({
          error: `Not enough stock for ${product.name}.`
        });
      }

      const unitPrice = Number(product.price);
      const subtotal = Math.round(unitPrice * quantity * 100) / 100;
      total += subtotal;

      saleItems.push({
        productId,
        quantity,
        unitPrice,
        subtotal
      });
    }

    total = Math.round(total * 100) / 100;

    const customerId = customer_id ? Number(customer_id) : null;

    if (customerId !== null) {
      const [customers] = await connection.query(
        "SELECT id FROM customers WHERE id = ?",
        [customerId]
      );

      if (customers.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: "Customer not found." });
      }
    }

    const [saleResult] = await connection.query(
      "INSERT INTO sales (customer_id, total) VALUES (?, ?)",
      [customerId, total]
    );

    for (const item of saleItems) {
      await connection.query(
        "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)",
        [
          saleResult.insertId,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.subtotal
        ]
      );

      await connection.query(
        "UPDATE products SET quantity = quantity - ? WHERE id = ?",
        [item.quantity, item.productId]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: "Sale recorded successfully.",
      sale_id: saleResult.insertId,
      total
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: "Could not record sale." });
  } finally {
    connection.release();
  }
});

// GET sales history
app.get("/api/sales", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.id,
        s.total,
        s.created_at,
        c.name AS customer_name
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      ORDER BY s.id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load sales." });
  }
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error." });
});

app.get("/api/setup-database", async (req, res) => {
  if (
    !process.env.SETUP_TOKEN ||
    req.query.token !== process.env.SETUP_TOKEN
  ) {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        phone VARCHAR(30),
        email VARCHAR(150),
        address VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        sku VARCHAR(60) UNIQUE,
        quantity INT NOT NULL DEFAULT 0,
        price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NULL,
        total DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id)
          REFERENCES customers(id)
          ON DELETE SET NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        product_id INT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        subtotal DECIMAL(12,2) NOT NULL,
        FOREIGN KEY (sale_id)
          REFERENCES sales(id)
          ON DELETE CASCADE,
        FOREIGN KEY (product_id)
          REFERENCES products(id)
          ON DELETE SET NULL
      )
    `);

    res.json({ success: true, message: "Database tables created" });
  } catch (error) {
    console.error("Database setup failed:", error.message);
    res.status(500).json({ error: "Database setup failed" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Great Wisdom API running on port ${PORT}`);
});
