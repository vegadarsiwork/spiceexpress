import dotenv from 'dotenv';
import app from './app.js';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://vegadarsiwork:vega@cluster0.p2ruof7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => console.error("DB connection error:", err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));