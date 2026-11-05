const mongoose = require("mongoose");

async function connectDB() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const memory = await MongoMemoryServer.create();
      global.__fornoMemoryServer = memory;
      uri = memory.getUri();
      console.log("No MONGODB_URI set. Using in-memory MongoDB for this session.");
      console.log(`In-memory MongoDB at ${uri}`);
    } catch (error) {
      console.error("Could not start in-memory MongoDB. Set MONGODB_URI in backend/.env.");
      throw error;
    }
  } else {
    console.log("Connecting to MongoDB from MONGODB_URI.");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

module.exports = { connectDB };
