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

const MONGO_CONFIG = { // Update MONGO_CONFIG
  uri: process.env.MONGODB_URI,
  options: {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: "majority",
  },
};

const storage = multer.memoryStorage(); // Multer configuration for handling file uploads
const upload = multer({ storage });

app.use( // Middleware with more permissive CORS
  cors({
    origin: true,
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

app.use((req, res, next) => { // Request logging middleware (optional, remove if not needed)
  next();
});

app.use(express.json());

const connectDB = async () => { // Updated connectDB function (cleaned)
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    await mongoose.connect(MONGO_CONFIG.uri, MONGO_CONFIG.options);
    console.log("✅ Connected to MongoDB");

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

    return true;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    return false;
  }
};

const startServer = async () => { // Start server only after MongoDB connects
  const isConnected = await connectDB();

  if (!isConnected) {
    console.error("❌ Failed to connect to MongoDB. Exiting...");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}!`);
  });
};

app.use("/api/products", productRoutes);

app.get("/api/test", (req, res) => { // Test route
  res.json({ message: "API is working" });
});

app.use((err, req, res, next) => { // Error handler
  console.error("Unhandled Error:", err);
  res.status(500).json({
    message: "Internal server error",
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

startServer();
