import { Schema, Document, model } from "mongoose";
import bcrypt from 'bcrypt';
import JWT from "jsonwebtoken";
import crypto from 'crypto';


//Interface named IUser for defining schema
interface IUser extends Document {
    jwtToken(): string;
    comparePassword(plainPassword: string): Promise<boolean>;
    generateEmailRegisterToken(): Promise<string>;
    generateResetPasswordToken(): Promise<string>;
    googleId?: string;
    displayName: string;
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
    resetPasswordToken?:string;
    resetPasswordExpiry?:number;
}


//Defining schema for creating user
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
        joinedDate: Date,
        emailRegistrationToken: String,
        emailRegistrationExpiry: Date,
        resetPasswordToken: String,
        resetPasswordExpiry: Date
    },
    { timestamps: true }
);

//Pre method before user gets created
userSchema.pre("save", async function (next) {
    //if the password is not modified
    if (!this.isModified("password")) {
      return next();
    }
  
    this.password = await bcrypt.hash(this.password, 10);
  });

// Method to compare password
userSchema.methods.comparePassword = async function (plainPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, this.password);
};


//JWTtoken generation for login purpose
export const jwtToken = (user: IUser): string => {
    return JWT.sign(
        { id: user._id, email: user.email },
        process.env.SECRET as string,
        { expiresIn: '24h' }
    );
};


//Token generation for registration through email purpose
userSchema.methods.generateEmailRegisterToken = async function (): Promise<string> {
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.emailRegistrationToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.emailRegistrationExpiry = Date.now() + 15 * 60 * 1000;

    await this.save(); // Save the user document with the new token

    return resetToken;
};

//Token generation for reset password purpose
userSchema.methods.generateResetPasswordToken = async function (): Promise<string> {
    const resetPassToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetPassToken)
        .digest('hex');

    this.resetPasswordExpiry = Date.now() + 15 * 60 * 1000;

    await this.save(); // Save the user document with the new token

    return resetPassToken;
};

//Creating the user by userSchema
const User = model<IUser>("User", userSchema);

//Exporting user and { IUser }
export default User ;
export { IUser };

