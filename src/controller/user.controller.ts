import { Request, Response, NextFunction } from 'express';
import User, { IUser, jwtToken } from "../Models/user.schema";
import AppError from '../Utils/appError';
import emailValidator from 'email-validator';
import sendEmail from '../Utils/registratrionMail';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { v2 as cloudinaryV2 } from 'cloudinary';
import fs from 'fs/promises';
import crypto from 'crypto';



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

//Interface for IRegistrationRequest
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
        //Get email from body
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
        const emailToken = await user.generateEmailRegisterToken();

        // URL for email registration
        const registrationWithEmailURL = `http://localhost:${process.env.PORT}/weave/password/${emailToken}`;

        // Define subject and message for the Mail
        const subject = "Register with Email";
        const message = `You can register with your Email address by clicking here: <a href="${registrationWithEmailURL}" target="_self">Register your Email</a>`;

        // Send the email
        try {
            await sendEmail(subject, message, email);

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
        //Get the emailToken from params
        const { emailToken } = req.params;

        //Hash the emailToken to validate it with dataBase 
        const emailTokenValidator = await crypto
        .createHash('sha256')
        .update(emailToken)
        .digest('hex')

        //Find the user based on the generated token
        const user: IUser | null = await User.findOne({
            emailRegistrationToken: emailTokenValidator,
            emailRegistrationExpiry: { $gt: Date.now() }
        });
        
        //If user does not exists
        if ( !user ) {
            return next(new AppError("User not found", 400)) as unknown as Response;
        }

        //Get password and confirm password from body
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
        let findUserByEmail: IUser | null = await User.findOne({ email });

        // If user not found
        if (!findUserByEmail) {
            return next(new AppError("User not found", 404)) as unknown as Response;
        }

        // Validate passwords
        if (password !== confirmPassword) {
            return next(new AppError("Passwords do not match", 400)) as unknown as Response;
        }

        // Set the password of the user
        findUserByEmail.password=password;

        // Save user
        await findUserByEmail.save();

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


//Function to add profile picture & unique username
const userNameAndUserPicture = async (req: MulterFilesRequest & { session: session.Session }, res: Response, next: NextFunction): Promise<Response | void> => {
  
    try {
        //Get the displayName from body
        const { displayName } = req.body;

        //Get photoURL
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

            //Assinging values of the new profile picture
            photoURL = {
                public_id: result.public_id,
                secure_url: result.secure_url
            };

            //Wait until the local file gets deleted
            await fs.unlink(file.path);
        }

        //Finding the user with email and adding value of profile picture & user name
        const user = await User.findOneAndUpdate({ email }, {
            displayName,
            photoURL
        }, { new: true });

        //If user not created---Give an error
        if (!user) {
            return next(new AppError("User not created", 404)) as unknown as Response;
        }

        //Generate a token 
        const token = jwtToken(user);

        //Setting the user's password value as "" as it dont come in response
        user.password = "";

        //Declaring the cookie options
        const cookieOptions = {
            maxAge:24*60*3600*1000,
            httpOnly:true
        }

        //Generate the cookie in response
        res.cookie("token",token,cookieOptions);
        

        return res.status(200).json({
            success: true,
            message: "Username and picture set successfully",
            data: user,
            photoURL:photoURL
        });

    } catch (error) {
        //Error handling for internal server error
        if (error instanceof Error) {
            next(new AppError(`Internal server error: ${error.message}`, 500));
        } else {
            next(new AppError("Internal server error", 500));
        }
    }
};


//Signin function
const signin = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {

    try {
        //Get email,password from body
        const { email, password } = req.body;

        // Check if user has given both email & password
        if (!email || !password) {
            return next(new AppError("Both fields required", 400)) as unknown as Response;
        }

        // Find the user by their details (email) in the database and select the password
        const user = await User.findOne({ email }).select('+password');

        // If user doesn't exist, give an error
        if (!user) {
            return next(new AppError("Invalid credentials given", 400)) as unknown as Response;
        }

        // If password doesn't match, give an error
        const isPasswordMatching = await user.comparePassword(password);

        //If passwords dont match
        if (!isPasswordMatching) {
            return next(new AppError("Invalid credentials", 401)) as unknown as Response;
        }

        // Generate a token 
        const token = jwtToken(user);

        // Setting the user's password value as an empty string so it doesn't come in response
        user.password = "";

        // Declaring the cookie options
        const cookieOptions = {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            httpOnly: true
        };

        // Generate the cookie in response
        res.cookie("token", token, cookieOptions);

        res.status(200).json({
            success: true,
            data: user
        });
    }   
    catch (error: any) {
        //Error handling for internal server error
        console.error("Error creating post:", error.message);
        return next(new AppError("Internal server error", 500)) as unknown as Response;
    }
};


//User details function
const userDetails = async ( req: Request , res : Response , next :NextFunction ) : Promise <Response | void> => {
    
    //Get the user id from req.user (as user has logged in,so cookie generated,next time req will inclue cookie)
    const userId = req.user?.id;

    try {
        
        //Find the user by unique user ID
        const user = await User.findById(userId);

        //If user dont exists throw an error
        if (!user) {
            return next(new AppError("Both fields required", 400)) ;
        }

        res.status(200).json({
            success:true,
            message:user
        })

    } catch (error) {
        
        //Internal server error handling
        if (error instanceof Error) {
            next(new AppError(`Internal server error: ${error.message}`, 500));
        } else {
            next(new AppError("Internal server error", 500));
        }

    }
}


//Log out function
const logOut = async ( req: Request , res : Response , next :NextFunction ) : Promise <Response | void> =>{

    try {
        //Set the cookie options
        const cookieOptions = {
            expires:new Date(),
            httpOnly:true
        }

        //Set the value of the cookie to null
        res.cookie("token",null,cookieOptions)

        res.status(200).json({
            success:true,
            message:"Logged out"
        })

    } catch (error) {
       
        //Error handling if log out fails
        if (error instanceof Error) {
            next(new AppError(`Internal server error: ${error.message}`, 500));
        } else {
            next(new AppError("Internal server error", 500));
        }

    }

}


//Forget password function
const forgetPassword = async ( req: Request , res : Response , next: NextFunction ) : Promise <Response | void> => {
    try {
        
        //Get the user email from body
        const { email } = req.body;

        //If user dont put the mail
        if ( !email ) {
            return next(new AppError("Please enter your email", 400)) as unknown as Response;
        }

        //Find the user based on email in database
        const user = await User.findOne({email});

        //If user not found throw an error
        if ( !user ) {
            return next(new AppError("This email is not register", 400)) as unknown as Response;
        }

        //Generate token for forget password
        const passwordToken = await user.generateResetPasswordToken();
        console.log(passwordToken)

        //Generate link for forget password
        const resetPasswordURL = `http://localhost:${process.env.PORT}/weave/reset-password/${passwordToken}`;

        // Define subject and message for the Mail
        const subject = "Reset your password";
        const message = `You can reset your password by clicking here: <a href="${resetPasswordURL}" target="_self">Reset Password</a>`;

        try {
            //Send the mail to the user
            await sendEmail(subject, message, email);
            console.log(resetPasswordURL); // Logging for testing purposes

            return res.status(200).json({
                success: true,
                message: `Successfully sent the mail to ${email}`,
                data: resetPasswordURL,
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
}


//Reset password function
const resetPassword = async ( req: Request , res : Response , next: NextFunction ) : Promise <Response | void> => {
    
    try {

        //Get the user given new password from body
        const { password } = req.body;

        //Get the resetToken from params
        const { resetToken } = req.params;

        //If user did not given any password
        if ( !password ) {
            return next(new AppError("Please enter your new password", 400)) as unknown as Response;

        }

        //Regex for password
        const passwordRegex: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,16})/;

        //Validate the regex with user given input
        if (!passwordRegex.test(password)) {
            return next(new AppError("Password should be between 8-16 characters long and should contain atleast one uppercase letter,one lowercase letter and one symbol ", 400)) as unknown as Response;

        }

        //Create a token for the new password
        const resetPasswordToken = await crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

        //Find the user based on the generated token
        const user = await User.findOne ({
            resetPasswordToken,
            resetPasswordExpiry : { $gt:Date.now()}
        })
        
        //If user does not exists
        if ( !user ) {
            return next(new AppError("User not found", 400)) as unknown as Response;
        }

        //Set the new password 
        user.password = password;

        //set resetPasswordToken & resetPasswordExpiry as undefined
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiry = undefined;

        //Save the user
        await user.save();

        res.status(200).json({
            success:true,
            message:"Password updated successfully",
            data:user
        })

    } catch (error) {
        // Internal server error handling
        if (error instanceof Error) {
            next(new AppError(`Internal server error: ${error.message}`, 500));
        } else {
            next(new AppError("Internal server error", 500));
        }
    }

}


//Change password function
const changePassword = async ( req: Request , res : Response , next: NextFunction ) : Promise <Response | void> => {
        
        try {
            
        //Get old and new password from body
        const { oldPassword , newPassword } = req.body;

        //Get the new image as photoURL from body
        const userId = req.user?.id

        //If user dont gave either old password or new password
        if ( !oldPassword || !newPassword ) {
            return next(new AppError("Both fields are required", 400)) as unknown as Response;
        }

        //If old and new password is same
        if ( oldPassword === newPassword ) {
            return next(new AppError("Your old and new password can not be same", 400)) as unknown as Response;
        }

        //Regex for password
        const passwordRegex: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,16})/;

        //Validate the regex with user given input
        if (!passwordRegex.test(newPassword)) {
            return next(new AppError("Password should be between 8-16 characters long and should contain atleast one uppercase letter,one lowercase letter and one symbol ", 400)) as unknown as Response;

        }

        //Find the user by user id and also select the password field
        const user = await User.findById(userId).select('+password')

        //If user dont exists throw an error
        if (!user) {
            return next(new AppError("Unable to find user",400)) as unknown as Response;
        }

        //Check if the password is valid or not
        const isPasswordValid = await user.comparePassword(oldPassword);

        //If the password is not valid
        if (!isPasswordValid) {
            return next(new AppError("Please enter the valid password",400)) as unknown as Response;
        }

        //Set user given newPassword as the new password
        user.password = newPassword;

        //Save the user
        await user.save();

        //Set the password as empty so it dont come as response
        user.password = "";

        res.status(200).json({
            success:true,
            message:"Password updated successfully",
            data:user
        })

        } catch (error) {
            // Internal server error handling
            if (error instanceof Error) {
            next(new AppError(`Internal server error: ${error.message}`, 500));
        }   else {
            next(new AppError("Internal server error", 500));
        }
        }

}


//Update user function
const updateUser = async ( req: Request , res : Response , next: NextFunction ) : Promise <Response | void> => {

    try {
        
        //Get the new username as userName from body
        const { userName } = req.body;

        //Get the new image as photoURL from body
        let photoURL = req.body.photoURL;

        //Get the user id from jwtAuth middleware
        const userId = req.user?.id;

        //If user dont give the username
        if ( !userName ) {
            return next(new AppError("Please enter your new user name", 400)) as unknown as Response;
        }

        //Regex for user name
        const usernameRegex: RegExp = /^[a-z_-]+$/;

        //Validate the regex with user given input
        if (!usernameRegex.test(userName)) {
            return next(new AppError("Username should be in small letter & contains only _ and -", 400)) as unknown as Response;
        }

        //Find the user by user id
        const user =  await User.findById(userId);

        //If user does not exist in the database
        if ( !user ) {
            return next(new AppError("User not found", 400)) as unknown as Response;
        }

        //If user exists,update its displayName value
        if ( userName ) {
            user.displayName = userName;

            //Save the user
            await user.save()
        }
    
        //If user wants to update profile picture
        if (req.file) {

            //If already profile picture exists,then delete it
            if (user.photoURL) {
                await cloudinaryV2.uploader.destroy(user.photoURL.public_id);
            }

            //Uploading the profile picture to clodinary
            const file = req.file;
            const result = await cloudinaryV2.uploader.upload(file.path, {
                folder: 'lms',
                width: 250,
                height: 250,
                gravity: 'faces',
                crop: 'fill'
            });

            //The new values of the photoURL will be---
            photoURL = {
                public_id: result.public_id,
                secure_url: result.secure_url
            };

            //Update the existing value of profile picture with the new one
            user.photoURL = photoURL;

            //Save the user
            await user.save();

            //Wait until the deletion of new profic picture from local
            await fs.unlink(file.path);
        }

        //Save the user again
        await user.save();

        //Show response
        res.status(200).json({
            success:true,
            message:"Username and avatar updated successfully",
            data:user
        })

    } catch (error) {
        // Internal server error handling
        if (error instanceof Error) {
            next(new AppError(`Internal server error: ${error.message}`, 500));
        } else {
            next(new AppError("Internal server error", 500));
        }
    }

}


//Exporting user functions
export { registerUserByEmail, passwordByUser , userNameAndUserPicture , signin , userDetails , logOut , forgetPassword , resetPassword , changePassword , updateUser };
