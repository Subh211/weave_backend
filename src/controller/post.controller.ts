import { NextFunction, Request, Response  } from "express";
import Post from "../Models/post.schema";
import User from "../Models/user.schema";
import AppError from "../Utils/appError";

interface CreatePostRequest extends Request {
    params: {
        userId: string;
    };
    query: {
        postId: string;
    };
    body: {
        image?: {
            public_id: string;
            secure_url: string;
        };
        caption: string;
    };
}



// Create Post function
const createPost = async (req: CreatePostRequest, res: Response, next: NextFunction) => {

    try {
        const {userId} = req.params
        const { caption } = req.body;

        // Check if the user exists
        const user = await User.findById(userId);
        if (!user) {
            return next(new AppError("User not found", 400));
        }

        // find the post for this user
        let post = await Post.findOne({ userId});

        if (!post) {
            // Create a new post
            post = await Post.create({
                userId,
                posts: [{
                   caption, 
                }]
            });
        }

        //if there alreay a post by that userId 
         post.posts.push({
                caption,
            });
        

        // Save the post to the database
        await post.save();


        return res.status(200).json({
            success: true,
            message: `post created`,
            data: post,
        });
    } catch (error: any) {
        console.error("Error creating post:", error.message);
        return next(new AppError("Internal server error", 500)) as unknown as Response;
    }
};

//get every post of that user
const getPost = async (req: CreatePostRequest, res: Response, next: NextFunction) => {
    try {
        const {userId} = req.params

        const post = await Post.findOne({ userId});

        if (!post) {
            return res.status(200).json({  // this should be true we can not give A Error if they have no posts
                success: true,
                message: `no post yet`,
            });
        }

        return res.status(200).json({
            success: true,
            message: `here is your posts`,
            data: post,
        });

    } catch (error: any) {
        console.error("Error creating post:", error.message);
        return next(new AppError("Internal server error", 500)) as unknown as Response;
    }
}

//get one particular post of that user
const getOnePost = async (req: CreatePostRequest, res: Response, next: NextFunction) => {
    try {
        const {userId} = req.params
        const {postId} = req.query
        console.log(postId);

         // Find the post by postId associated with the userId
         const post = await Post.findOne(
            { userId, "posts._id": postId }, // Query to find the document with matching userId and postId
            { "posts.$": 1 } // Projection to return only the first matching subdocument
        );
        
         if (!post) {
             return next(new AppError("this Post not found", 404));
         }

         return res.status(200).json({
            success: true,
            message: "Post found",
            data: post,
        });

    } catch (error: any) {
        console.error("Error creating post:", error.message);
        return next(new AppError("Internal server error", 500)) as unknown as Response;
    }
}


export  {
    createPost,
    getPost,
    getOnePost
};