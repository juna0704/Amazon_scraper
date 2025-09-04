import mongoose from "mongoose";
import colors from "colors";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(
      `Mongodb has been connected to ${conn.connection.host}`.cyan.underline
    );
  } catch (err) {
    console.error("❌ Connection Failed. MongoDB connection error:", err);
    process.exit(1);
  }
};

export default connectDB;
