import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGODB_URL);
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection failed : ", error.message);
        process.exit(1);
    }
};

export default connectDB;