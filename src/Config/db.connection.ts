import mongoose from 'mongoose';
import dotenv from 'dotenv';

//dotenv configuration
dotenv.config();

//Get coonection key from process.env
const { MONGODB_URI } = process.env;

//If connection key not present throw an error
if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in .env file");
}

//Definng connectDB function to connect with database
const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB connected successfully');
    } catch (error: any) {
        console.error('Error connecting to MongoDB', error.message);
        process.exit(1);
    }
};

//Exporting connectDB function
export default connectDB;
