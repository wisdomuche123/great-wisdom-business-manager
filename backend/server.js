"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || false
}));
app.use(express.json({ limit: "20kb" }));

app.get("/", (req, res) => {
  res.json({
    name: "Great Wisdom Business Manager API",
    status: "online",
    version: "1.0.0"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found"
  });
});

app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(500).json({
    success: false,
    message: "An internal server error occurred"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Great Wisdom API listening on port ${PORT}`);
});
