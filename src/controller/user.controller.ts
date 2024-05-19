import { Request, Response, NextFunction } from 'express';
import User, { IUser, emailRegisterTokenGenerator } from "../Models/user.schema";
import AppError from '../Utils/appError';
import emailValidator from 'email-validator';
import sendEmail from '../Utils/registratrionMail';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { v2 as cloudinaryV2 } from 'cloudinary';
import fs from 'fs/promises';
import { json } from 'body-parser';





// Extend the Session interface to include a custom email property
declare module 'express-session' {
    interface Session {
        email?: string;
        displayName?:string;
        photoURL?: {
            public_id: string;
            secure_url: string;
        }
    }
}

// Extend the Request interface to include files for array-based uploads
export interface MulterFilesRequest extends Request {
    file?: Express.Multer.File;
}

export interface IRegistrationRequest extends Request {
    body: {
        displayName: string;
        email: string;
        password: string;
        confirmPassword: string;
        photoURL: {
            public_id?: string;
            secure_url?: string;
        };
    };
}

// Register by email function
const registerUserByEmail = async (req: Request & { session: session.Session }, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        const { email } = req.body;

        // If fields are empty
        if (!email) {
            return next(new AppError("Please enter your email address", 400)) as unknown as Response;
        }

        // Validate the email
        const validEmail = emailValidator.validate(email);
        if (!validEmail) {
            return next(new AppError("Please enter a valid email address", 400)) as unknown as Response;
        }

        // Check if the email already exists
        let user: IUser | null = await User.findOne({ email });
        if (user) {
            return next(new AppError("Email already exists", 400)) as unknown as Response;
        }

        // Store email in session
        req.session.email = email;

        // Create user with email
        user = await User.create({ email });

        // Generate token for email registration
        const emailToken = await emailRegisterTokenGenerator(user);

        // URL for email registration
        const registrationWithEmailURL = `http://localhost:${process.env.PORT}/register-email/${emailToken}`;

        // Define subject and message for the Mail
        const subject = "Register with Email";
        const message = `You can register with your Email address by clicking here: <a href="${registrationWithEmailURL}" target="_self">Register your Email</a>`;

        // Send the email
        try {
            await sendEmail(subject, message, email);
            console.log(registrationWithEmailURL); // Logging for testing purposes

            return res.status(200).json({
                success: true,
                message: `Successfully sent the mail to ${email}`,
                data: registrationWithEmailURL,
            });

        } catch (error) {
            // Error handling if email sending fails
            if (error instanceof Error) {
                next(new AppError(`Unable to send the mail: ${error.message}`, 500));
            } else {
                next(new AppError("Unable to send the mail", 500));
            }
        }

    } catch (error) {
        // Internal server error handling
        if (error instanceof Error) {
            next(new AppError(`Internal server error: ${error.message}`, 500));
        } else {
            next(new AppError("Internal server error", 500));
        }
    }
};

// Function for password input from user
const passwordByUser = async (req: Request & { session: session.Session }, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        const { password, confirmPassword } = req.body;

        // If fields are empty
        if (!password || !confirmPassword) {
            return next(new AppError("Please enter password and confirm password", 400)) as unknown as Response;
        }

        //Regex for password
        const passwordRegex: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,16})/;

        //Validate the regex with user given input
        if (!passwordRegex.test(password)) {
            return next(new AppError("Password should be between 8-16 characters long and should contain atleast one uppercase letter,one lowercase letter and one symbol ", 400)) as unknown as Response;

        }


        // Get email from session
        const email = req.session.email;
        if (!email) {
            return next(new AppError("Email not found in session", 404)) as unknown as Response;
        }

        // Find user by email
        let user: IUser | null = await User.findOne({ email });

        // If user not found
        if (!user) {
            return next(new AppError("User not found", 404)) as unknown as Response;
        }

        // Validate passwords
        if (password !== confirmPassword) {
            return next(new AppError("Passwords do not match", 400)) as unknown as Response;
        }

        // Encrypt password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Set password for user
        user.password = hashedPassword;

        // Save user
        await user.save();

        // Return success response
        return res.status(200).json({
            success: true,
            message: "Password set successfully",
            data: user
        });

    } catch (error) {
        // Error handling
        if (error instanceof Error) {
            next(new AppError(`Internal server error: ${error.message}`, 500));
        } else {
            next(new AppError("Internal server error", 500));
        }
};
}

const userNameAndUserPicture = async (req: MulterFilesRequest & { session: session.Session }, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        const { displayName } = req.body;
        let photoURL = req.body.photoURL;

        //If no user name is given
        if (!displayName) {
            return next(new AppError("Username is required", 400)) as unknown as Response;
        }

        //Regex for user name
        const usernameRegex: RegExp = /^[a-z_-]+$/;

        //Validate the regex with user given input
        if (!usernameRegex.test(displayName)) {
            return next(new AppError("Username should be in small letter & contains only _ and -", 400)) as unknown as Response;

        }

        //Getting mail from the session
        const email = req.session.email;

        //Error if email not found in session
        if (!email) {
            return next(new AppError("Email not found in session", 400)) as unknown as Response;
        }

        //Checking the User name if it is unique or not
        let userName = await User.findOne({ displayName });
        if (userName) {
            return next(new AppError("Username already exists, please try a different username", 400)) as unknown as Response;
        }

        //Uploading the profile picture to cloudinary
        if (req.file) {
            const file = req.file;
            const result = await cloudinaryV2.uploader.upload(file.path, {
                folder: 'lms',
                width: 250,
                height: 250,
                gravity: 'faces',
                crop: 'fill'
            });

            photoURL = {
                public_id: result.public_id,
                secure_url: result.secure_url
            };

            await fs.unlink(file.path);
        }

        //Finding the user with email and adding value of profile picture & user name
        const user = await User.findOneAndUpdate({ email }, {
            displayName,
            photoURL
        }, { new: true });

        //If user not created-An error
        if (!user) {
            return next(new AppError("User not created", 404)) as unknown as Response;
        }

        return res.status(200).json({
            success: true,
            message: "Username and picture set successfully",
            data: user,
            photoURL:photoURL
        });

    } catch (error) {
        if (error instanceof Error) {
            next(new AppError(`Internal server error: ${error.message}`, 500));
        } else {
            next(new AppError("Internal server error", 500));
        }
    }
};


export { registerUserByEmail, passwordByUser , userNameAndUserPicture };
