import { NextFunction, Request, Response } from "express";
import Post from "../Models/post.schema";
import User from "../Models/user.schema";
import AppError from "../Utils/appError";
import fs from 'fs/promises';
import { v2 as cloudinaryV2 } from 'cloudinary';


interface CreatePostRequest extends Request {
    params: {
        userId: string;
    };
    query: {
        postId: string;
    };
    file?: Express.Multer.File;
    body: {
        caption: string;
    };
}

//function to create a post
const createPost = async (req: CreatePostRequest, res: Response, next: NextFunction) => {

    try {
        //Getting userId from the params
        const {userId} = req.params
        //Getting caption from the body
        const { caption } = req.body;

        //If caption is not present--throw an erroe
        if (!caption) {
            return next(new AppError("You must atleast write the caption to proceed", 400));
        }

        // Check if the user exists
        const user = await User.findById(userId);

        //If user dont exists throw an error
        if (!user) {
            return next(new AppError("User not found", 400));
        }

        // find the post for this user
        let post = await Post.findOne({ userId});

        //If the user dont have any post yet,create one
        if (!post) {
            post = await new Post ({userId,posts:[]})
        }
         
        //If any file present with the request
        if (req.file) {
                    const file = await cloudinaryV2.uploader.upload(req.file.path, {
                    folder: "server",
                    gravity: "center",
                    crop: "fill",
                });

                //Delete the local file after uploading
                await fs.rm(`./uploads/${req.file.filename}`);

                //Push the caption and image to the post collection
                post.posts.push({
                    caption,
                    image: {
                        public_id: file.public_id,
                        secure_url: file.secure_url,
                    },
                })
        } else {
            //If only caption present in request,push that to the collection
            post.posts.push ({
                caption
            })
        }


        // Save the post to the database
        await post.save();


        return res.status(200).json({
            success: true,
            message: `post created`,
            data: post,
        });
    } catch (error: any) {
        //Error handling
        console.error("Error creating post:", error.message);
        return next(new AppError("Internal server error", 500)) as unknown as Response;
    }
};


//get every post of that user
const getPost = async (req: CreatePostRequest, res: Response, next: NextFunction) => {
    try {
        //Get userId from the params
        const {userId} = req.params

        //Find post with userId
        const post = await Post.findOne({ userId});

        //If no post found
        if (!post) {
            return res.status(200).json({  // this should be true we can not give A Error if they have no posts
                success: true,
                message: `no post yet`,
            });
        }

        //If posts found--show it to user
        return res.status(200).json({
            success: true,
            message: `here is your posts`,
            data: post,
        });

    } catch (error: any) {
        //Error handling
        console.error("Error creating post:", error.message);
        return next(new AppError("Internal server error", 500)) as unknown as Response;
    }
}


//get one particular post of that user
const getOnePost = async (req: CreatePostRequest, res: Response, next: NextFunction) => {
    try {
        //Get userId from params
        const {userId} = req.params
        //get postId from the query
        const {postId} = req.query

         // Find the post by postId associated with the userId
         const post = await Post.findOne(
            { userId, "posts._id": postId }, // Query to find the document with matching userId and postId
            { "posts.$": 1 } // Projection to return only the first matching subdocument
        );
        
        //If no post found--throw an error
         if (!post) {
             return next(new AppError("this Post not found", 404));
         }

         return res.status(200).json({
            success: true,
            message: "Post found",
            data: post,
        });

    } catch (error: any) {
        //Error handling
        console.error("Error creating post:", error.message);
        return next(new AppError("Internal server error", 500)) as unknown as Response;
    }
}


//update one particular post
const updateOnePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      //Get caption from the body  
      const { caption } = req.body;
      //get userId from the params
      const { userId } = req.params;
      //Get postId from the query
      const { postId } = req.query;
  
      //If no caption found--throw an errror
      if (!caption) {
        return next(new AppError("Please enter the caption", 404));
      }
  
      // Update the nested document using updateOne method
      const result = await Post.updateOne(
        { userId, "posts._id": postId },
        { $set: { "posts.$.caption": caption } }
      );
  
      if (result.matchedCount === 0) {
        return next(new AppError("Post not found", 404));
      }
  
      res.status(200).json({
        status: 'success',
        message: 'Caption updated successfully'
      });
    } catch (error: any) {
      console.error("Error updating post:", error.message);
      return next(new AppError("Internal server error", 500));
    }
  };
  

//delete one particular post of that user
const deleteOnePost = async (req: CreatePostRequest, res: Response, next: NextFunction) => {
        try {
            //Get userId from the params
            const {userId} = req.params
            //Get postId from the query
            const {postId} = req.query

            //Find the post in the database based on userId & postId
            const post = await Post.findOne(
                { userId, 
                "posts._id": postId }, // Query to find the document with matching userId and postId
                { "posts.$": 1 } // Projection to return only the first matching subdocument
            )

            //if no posts found--throw an error
            if (!post) {
                return next(new AppError("Post not found", 404));
            }

            //set an variable named imagePublicId for deletion purpose of profile pic
            const imagePublicId = post.posts[0].image?.public_id;

            //Delete the specific post 
            await Post.updateOne(
                { userId },
                { $pull: { posts: { _id: postId } } }
            );

            //If any profile pic was there---delete it also
            if (imagePublicId) {
                await cloudinaryV2.uploader.destroy(imagePublicId);
            }

            return res.status(200).json({
                success: true,
                message: "Post and associated image deleted successfully"
            });

            } catch (error:any) {
                //Error handling
                console.error("Error deleting post:", error.message);
                return next(new AppError("Internal server error", 500));

            }
}

       

export  {
    createPost,
    getPost,
    getOnePost,
    updateOnePost,
    deleteOnePost
};