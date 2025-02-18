const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("./config/cloudinary");
const Product = require("./models/Product");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

// Provide fallback URI if environment variable isn't loaded
const MONGO_CONFIG = {
  uri: "mongodb+srv://ibiwoyeroland:UQIQBbKzyE9sb854@cluster0.aiyak.mongodb.net/ecommerce?retryWrites=true&w=majority&appName=Cluster0",
  options: {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
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
    origin: ["http://localhost:3001"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);
app.use(express.json());

// MongoDB Connection with retry logic
const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    const conn = await mongoose.connect(MONGO_CONFIG.uri, MONGO_CONFIG.options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    console.error("Connection details:", {
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
    console.log(`Server is running on port ${PORT}`);
    console.log(`Test the API at: http://localhost:${PORT}/api/debug`);
  });
};

// Routes with better error handling
app.get("/api/products", async (req, res) => {
  console.log("GET /api/products request received");
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error(
        "Database connection state:",
        mongoose.connection.readyState
      );
      throw new Error("Database not connected");
    }

    const products = await Product.find().sort({ createdAt: -1 });
    console.log(`Successfully retrieved ${products.length} products`);
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
      connectionState: mongoose.connection.readyState,
    });
  }
});

app.post("/api/products", upload.single("image"), async (req, res) => {
  try {
    console.log("Received product creation request:", req.body);
    console.log("File upload:", req.file);

    let imageUrl = "";
    if (req.file) {
      try {
        const fileStr = `data:${
          req.file.mimetype
        };base64,${req.file.buffer.toString("base64")}`;
        console.log("Attempting to upload to Cloudinary...");
        const uploadResponse = await cloudinary.uploader.upload(fileStr, {
          folder: "ecommerce_products",
        });
        console.log("Cloudinary upload successful:", uploadResponse.secure_url);
        imageUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({
          message: "Failed to upload image",
          error: uploadError.message,
        });
      }
    }

    const productData = {
      ...req.body,
      imageUrl: imageUrl || req.body.imageUrl,
      price: Number(req.body.price),
    };

    console.log("Creating product with data:", productData);

    const product = new Product(productData);
    const newProduct = await product.save();

    console.log("Product created successfully:", newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(400).json({
      message: "Failed to create product",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

app.put("/api/products/:id", upload.single("image"), async (req, res) => {
  try {
    let imageUrl = req.body.imageUrl;

    if (req.file) {
      const fileStr = `data:${
        req.file.mimetype
      };base64,${req.file.buffer.toString("base64")}`;
      const uploadResponse = await cloudinary.uploader.upload(fileStr, {
        folder: "ecommerce_products",
      });
      imageUrl = uploadResponse.secure_url;
    }

    const productData = {
      ...req.body,
      imageUrl,
      price: Number(req.body.price),
    };

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: error.message });
  }
});

// Debug route to check connection and data
app.get("/api/debug", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const count = await Product.countDocuments();

    res.json({
      serverStatus: "running",
      databaseConnection: dbState,
      databaseState: {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting",
      }[dbState],
      totalProducts: count,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
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
