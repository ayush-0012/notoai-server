import mongoose from "mongoose";
import "dotenv/config";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbname: "NotoAi",
    });
    console.log("connected to database");
  } catch (error) {
    console.log("db connection failed", error);
  }
};

export default connectDB;
