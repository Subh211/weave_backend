import { Schema, Document, model } from "mongoose";

interface IUser extends Document {
    googleId?: string;
    displayName?: string;
    email: string;
    photoURL?: string;
    isEmailVerified?: boolean;
    password: string;
    role: "USER" | "ADMIN";
    joinedDate?: Date;
    bio?: string;
}

const userSchema: Schema<IUser> = new Schema(
    {
        googleId: String,
        displayName: String,
        email: { type: String, required: true },
        photoURL: String,
        isEmailVerified: Boolean,
        password: {
            type: String,
            select: false,
        },
        role: {
            type: String,
            enum: ["USER", "ADMIN"],
            default: "USER",
        },
        bio: String,
        joinedDate: Date
    },
    { timestamps: true }
);

const User = model<IUser>("User", userSchema);

export default User;
