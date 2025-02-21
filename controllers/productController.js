const mongoose = require("mongoose");
const Product = require("../models/Product");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

// Multer configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.uploadMiddleware = upload.single("image");

exports.getProducts = async (req, res) => {
  try {
    console.log("GET /products request received");

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error(
        "Database not connected. Connection state:",
        mongoose.connection.readyState
      );
      throw new Error("Database connection not ready");
    }

    const products = await Product.find().sort({ createdAt: -1 });
    console.log(`Successfully retrieved ${products.length} products`);

    // Log a sample of the data being sent
    if (products.length > 0) {
      console.log("Sample product:", {
        id: products[0]._id,
        name: products[0].name,
        // other fields...
      });
    }

    res.json(products);
  } catch (error) {
    console.error("Error in getProducts:", {
      message: error.message,
      stack: error.stack,
      mongoState: mongoose.connection.readyState,
    });

    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
      mongoState: mongoose.connection.readyState,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

exports.createProduct = async (req, res) => {
  try {
    console.log("Creating product with data:", {
      body: req.body,
      file: req.file ? "File present" : "No file",
    });

    let imageUrl = req.body.imageUrl;

    // If a file was uploaded, upload it to Cloudinary
    if (req.file) {
      try {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        const uploadResponse = await cloudinary.uploader.upload(dataURI, {
          folder: "ecommerce_products",
        });
        console.log("Cloudinary upload successful:", uploadResponse.url);
        imageUrl = uploadResponse.url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({
          message: "Failed to upload image",
          error: uploadError.message,
        });
      }
    }

    // Parse string values that should be arrays
    const colors = req.body.colors
      ? typeof req.body.colors === "string"
        ? JSON.parse(req.body.colors)
        : req.body.colors
      : [];

    const features = req.body.features
      ? typeof req.body.features === "string"
        ? JSON.parse(req.body.features)
        : req.body.features
      : [];

    // Create product with validated data
    const product = new Product({
      name: req.body.name,
      description: req.body.description,
      price: Number(req.body.price),
      imageUrl: imageUrl,
      category: req.body.category,
      colors: colors,
      features: features,
      rating: 0,
      reviews: 0,
    });

    console.log("Attempting to save product:", product);
    const newProduct = await product.save();
    console.log("Product saved successfully:", newProduct);

    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(400).json({
      message: "Failed to create product",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    let imageUrl = req.body.imageUrl;

    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const uploadResponse = await cloudinary.uploader.upload(dataURI);
      imageUrl = uploadResponse.url;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        imageUrl: imageUrl,
        category: req.body.category,
        colors: req.body.colors ? JSON.parse(req.body.colors) : undefined,
        features: req.body.features ? JSON.parse(req.body.features) : undefined,
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
