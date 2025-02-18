const mongoose = require('mongoose');
const products = require('./data/products');
const Product = require('./models/Product');

const MONGO_URI = 'mongodb+srv://ibiwoyeroland:UQIQBbKzyE9sb854@cluster0.aiyak.mongodb.net/ecommerce?retryWrites=true&w=majority&appName=Cluster0';

async function seedDatabase() {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('Connected to MongoDB Atlas');
    console.log('Connection state:', mongoose.connection.readyState);

    // Count existing products
    const existingProducts = await Product.countDocuments();
    console.log(`Found ${existingProducts} existing products`);

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert new products with default values
    const productsToInsert = products.map(product => ({
      ...product,
      rating: product.rating || 0,
      reviews: product.reviews || 0,
      inStock: product.inStock !== undefined ? product.inStock : true,
      features: product.features || [],
      colors: product.colors || []
    }));

    const insertedProducts = await Product.insertMany(productsToInsert);
    console.log(`Successfully seeded ${insertedProducts.length} products`);
    
    // Verify insertion
    const count = await Product.countDocuments();
    console.log(`Final product count: ${count}`);

    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the seed function
seedDatabase()
  .then(success => {
    if (success) {
      console.log('Database seeding completed successfully');
    } else {
      console.error('Database seeding failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error during seeding:', error);
    process.exit(1);
  });