import { NextFunction, Request, Response } from "express";
import SavePost from "../Models/savepost.schema";
import Post from "../Models/post.schema";
import User from "../Models/user.schema";
import AppError from "../Utils/appError";
import mongoose, { Types } from 'mongoose';
import SavedPost from "../Models/savepost.schema";

interface SavePostRequest extends Request {
    params: {
        friendId: string;
    };
    query: {
        postId: string;
    };
}

const savePost = async (req: SavePostRequest, res: Response, next: NextFunction) => {
    try {
        // Getting userId from the jwtAuth middleware
        const userId = req.user?.id;
        const { friendId } = req.params;
        const { postId } = req.query;

        // Check if the user exists
        const user = await User.findById(userId);
        if (!user) {
            return next(new AppError("User not found", 400));
        }

        // Convert IDs to ObjectId
        const userIdObject = new Types.ObjectId(userId);
        const friendIdObject = new Types.ObjectId(friendId);
        const postIdObject = new Types.ObjectId(postId);

        // Find or create the savedPosts document for the user
        let savedPosts = await SavedPost.findOne({ userId: userIdObject });
        if (!savedPosts) {
            savedPosts = new SavedPost({ userId: userIdObject, savedPosts: [] });
        }

        // Get friend details
        const friendDetails = await User.findById(friendIdObject);
        if (!friendDetails) {
            return next(new AppError("Friend not found", 400));
        }

        // Get the friend's post
        const friendsThePost = await Post.findOne(
            { userId: friendIdObject, "posts._id": postIdObject },
            { "posts.$": 1 }
        );

        if (!friendsThePost || !friendsThePost.posts || friendsThePost.posts.length === 0) {
            return next(new AppError("Post not found", 400));
        }

        const mainPost = friendsThePost.posts[0];

        // Push the caption and image to the savedPosts collection
        savedPosts.savedPosts.push({
            postOwnerId: friendIdObject,
            postOwnerDisplayName: friendDetails.displayName,
            postOwnerProfilePicture: {
                public_id: friendDetails?.photoURL?.public_id,
                secure_url: friendDetails?.photoURL?.secure_url,
            },
            caption: mainPost.caption,
            image: mainPost.image ? {
                public_id: mainPost.image.public_id,
                secure_url: mainPost.image.secure_url,
            } : undefined,
            comments: mainPost.comments,
            likes: mainPost.likes
        });

        // Save the savedPosts document to the database
        await savedPosts.save();

        return res.status(200).json({
            success: true,
            message: `Post saved`,
        });
    } catch (error: any) {
        // Error handling
        console.error("Error saving post:", error.message);
        return next(new AppError("Internal server error", 500));
    }
};

export { savePost };
