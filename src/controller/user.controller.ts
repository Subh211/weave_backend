import { Request, Response, NextFunction } from 'express';
import User, { IUser, jwtToken } from "../Models/user.schema";
import AppError from '../Utils/appError';
import emailValidator from 'email-validator';
import sendEmail from '../Utils/registratrionMail';
import session from 'express-session';
import Post from "../Models/post.schema";
import { v2 as cloudinaryV2 } from 'cloudinary';
import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import mongoose from 'mongoose';


// Extend the Request interface to include files for array-based uploads
export interface MulterFilesRequest extends Request {
    file?: Express.Multer.File;
    bio?: string;
    name: string;
    displayName: string;
    email: string;
    password: string;
    confirmPassword: string;
    photoURL: {
        public_id?: string;
        secure_url?: string;
    };
}

// SignUp function
const registerUserByEmail = async (req: MulterFilesRequest, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        //get these details from the body
        const { email, name, password, confirmPassword, displayName, bio } = req.body;

        //if email not found throw an error
        if (!email) {
            return next(new AppError("Please enter your email address", 400));
        }

        //check the email is valid or not
        const validEmail = emailValidator.validate(email);
        if (!validEmail) {
            return next(new AppError("Please enter a valid email address", 400));
        }

        //find if user already exists or not
        let user = await User.findOne({ email });
        if (user) {
            return next(new AppError("Email already exists", 400));
        }

        //if password & confirmPassword is not entered
        if (!password || !confirmPassword) {
            return next(new AppError("Please enter password and confirm password", 400));
        }

        //Validate the password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,16})/;
        if (!passwordRegex.test(password)) {
            return next(new AppError("Password should be between 8-16 characters long and should contain at least one uppercase letter, one lowercase letter, and one symbol", 400));
        }

        //if password & confirmPassword dont match
        if (password !== confirmPassword) {
            return next(new AppError("Passwords do not match", 400));
        }

        //get the picture from body
        let photoURL = req.body.photoURL;

        //if user did not give username
        if (!displayName) {
            return next(new AppError("Username is required", 400));
        }

        //validate the username
        const usernameRegex = /^[a-z_-]+$/;
        if (!usernameRegex.test(displayName)) {
            return next(new AppError("Username should be in small letter & contains only _ and -", 400));
        }

        //check if username already exists
        let userName = await User.findOne({ displayName });
        if (userName) {
            return next(new AppError("Username already exists, please try a different username", 400));
        }

        //upload the image file
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

        if (!req.file) {
            const defaultImagePath = path.join(__dirname, '..', 'uploads', 'user.png');
            const result = await cloudinaryV2.uploader.upload(defaultImagePath, {
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
        }

        //create the user
        user = await User.create({ email, name, password, bio, displayName, photoURL });

        //save the user
        await user.save();

        //generate a token
        const token = jwtToken(user);
        user.password = "";

        const cookieOptions = {
            maxAge: 24 * 60 * 3600 * 1000,
            httpOnly: true
        }

        res.cookie("token", token, cookieOptions);

        res.status(200).json({
            success: true,
            message: 'User registered successfully',
            user:user,
            token:token
        });

    } catch (error) {
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
            message:"Sign in successfull",
            token:token,
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
    const userId = req.user?._id;

    try {
        
        //Find the user by unique user ID
        const user = await User.findById(userId);

        //create userIdObject to find user's posts
        const userIdObject = new mongoose.Types.ObjectId(userId);

        //find posts of the user
        const post = await Post.findOne({userId:userIdObject})

        //If user dont exists throw an error
        if (!user) {
            return next(new AppError("Both fields required", 400)) ;
        }

        res.status(200).json({
            success:true,
            message:"Got user successfully",
            user:user,
            post:post
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


//Change password function
const changePassword = async ( req: Request , res : Response , next: NextFunction ) : Promise <Response | void> => {
        
        try {
            
        //Get old and new password from body
        const { oldPassword , newPassword } = req.body;

        //Get the new image as photoURL from body
        const userId = req.user?._id

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
        const userId = req.user?._id;

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


//Delete user function
const deleteUser = async ( req: Request , res : Response , next: NextFunction ) : Promise <Response | void> => {

    try {
        //Get userId from jwtAuth middleware
        const userId = req.user?._id;

        //Find the user based on the userId
        let user = await User.findById (userId).select('+password');

        //Get password from the body
        const { password } = req.body;

        //If no password given---Throw an error
        if (!password) {
            return next(new AppError("You must enter your password to delete account", 400)) as unknown as Response;
        }

        //Check if the given password is valid or not
        const isPasswordValid = await user?.comparePassword(password);

        //If the password is not valid---throw an error
        if (!isPasswordValid) {
            return next(new AppError("Your password is not valid", 400)) as unknown as Response;
        }

        //Find the posts of the user based on userId
        const post = await Post.findOne({userId});

        //Declare posts as all posts of the user
        let posts = post?.posts;

        //Delete each image from the posts
        if (typeof posts === 'object' && posts !== null) {
            for (const key in posts) {
              if (posts.hasOwnProperty(key)) {
                let photoId = posts[key].image?.public_id;
      
                if (photoId) {
                  await cloudinaryV2.uploader.destroy(photoId);
                }
              }
            }
        }

        //Delete the post collection from the database
        await Post.findOneAndDelete({userId})

        //Get the picture public_id of profile pic 
        let profilePictureLink = user?.photoURL?.public_id;

        //Delete the profile pic
        if (profilePictureLink) {
            await cloudinaryV2.uploader.destroy(profilePictureLink);

        }

        //Delete the user
        await User.findByIdAndDelete(userId);

        return res.status(200).json({
            success: true,
            message: "User and associated data deleted successfully",
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
export { registerUserByEmail,  
        signin , 
        userDetails , 
        logOut , 
        changePassword , 
        updateUser ,
        deleteUser};
