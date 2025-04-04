const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("./config/cloudinary");
const Product = require("./models/Product");
require("dotenv").config();
const productRoutes = require("./routes/productRoutes");

const app = express();
const PORT = process.env.PORT || 5001;

// Update MONGO_CONFIG
const MONGO_CONFIG = {
  uri:
    process.env.MONGODB_URI,
  options: {
    serverSelectionTimeoutMS: 30000, // Increase timeout
    socketTimeoutMS: 45000,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: "majority",
  },
};

// Log the URI being used (remove sensitive info before committing)
console.log(
  "MongoDB URI:",
  MONGO_CONFIG.uri.replace(/\/\/[^@]+@/, "//<credentials>@")
);

// Multer configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware with more permissive CORS
app.use(
  cors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Cache-Control",
      "Pragma",
    ],
    exposedHeaders: ["Content-Length", "Content-Type"],
  })
);

// Add this right after CORS middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use(express.json());

// Update connectDB function
const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");

    // Clear any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    const conn = await mongoose.connect(MONGO_CONFIG.uri, MONGO_CONFIG.options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Add connection error handler
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    // Add disconnection handler
    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

    return true;
  } catch (error) {
    console.error("MongoDB connection error:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      host: mongoose.connection.host,
      readyState: mongoose.connection.readyState,
    });
    return false;
  }
};

// Ensure database connection before starting server
const startServer = async () => {
  const isConnected = await connectDB();

  if (!isConnected) {
    console.error("Failed to connect to database. Exiting...");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
  });
};

app.use("/api/products", productRoutes);

// Add this before your routes
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});

// Add this before your routes
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongoConnection: mongoose.connection.readyState === 1,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    message: "Internal server error",
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Start the server
startServer();
