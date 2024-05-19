import { Schema, Document, model } from "mongoose";
import bcrypt from 'bcrypt';
import JWT from "jsonwebtoken";
import crypto from 'crypto';


interface IUser extends Document {
    jwtToken(): unknown;
    googleId?: string;
    displayName?: string;
    email: string;
    photoURL?: {
        public_id: string;
        secure_url: string;
    };
    isEmailVerified?: boolean;
    password: string;
    confirmPassword: string;
    role: "USER" | "ADMIN";
    joinedDate?: Date;
    bio?: string;
    emailRegistrationToken?: string;
    emailRegistrationExpiry?: number;
}

const userSchema: Schema<IUser> = new Schema(
    {
        googleId: String,
        displayName: String,
        email: { type: String, required: true },
        photoURL: {
            public_id: {
                type: String,
            },
            secure_url: {
                type: String,
            },
        },
        isEmailVerified: Boolean,
        password: {
            type: String,
            select: false,
        },
        confirmPassword: String,
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

userSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

const User = model<IUser>("User", userSchema);


//JWTtoken generation for login purpose
export const jwtToken = (user: IUser): string => {
    return JWT.sign(
        { id: user._id, email: user.email },
        process.env.SECRET as string,
        { expiresIn: '24h' }
    );
};


//Token generation for registration through email purpose
export const emailRegisterTokenGenerator = async (user:IUser): Promise<string> => {
    const resetToken = crypto.randomBytes(20).toString('hex');

        user.emailRegistrationToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

        user.emailRegistrationExpiry = Date.now() + 15*60*1000;

        return resetToken;
}

export default User ;
export { IUser };

