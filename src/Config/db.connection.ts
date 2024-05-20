import mongoose from 'mongoose';
import dotenv from 'dotenv';

//dotenv configuration
dotenv.config();

const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in .env file");
}

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB connected successfully');
    } catch (error: any) {
        console.error('Error connecting to MongoDB', error.message);
        process.exit(1);
    }
};

export default connectDB;
