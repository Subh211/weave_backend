import { NextFunction, Request, Response } from "express";
import Friend from "../Models/friend.schema";
import mongoose from 'mongoose';
import Post from "../Models/post.schema";
import { userDetails } from "./user.controller";
import User from "../Models/user.schema";
import AppError from "../Utils/appError";


const feed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //////// get all posts of my followings

        //ger userid from jwtAuth middleware
        const userId = req.user?.id;

        //if no user found---return an error
        if (!userId) {
            return next(new AppError("User ID not found in request", 400));
        }

        //make mongoose objectId for userId
        const mainUserObject = new mongoose.Types.ObjectId(userId);

        // Use aggregation to fetch and extract friendId from following array
        const result = await Friend.aggregate([
            { $match: { userId: mainUserObject } },
            { $unwind: "$following" },
            { $project: { _id: 0, friendId: "$following.friendId" } }
        ]);

        //newResult is created for sorting purpose between my followings and rest of the users
        const newResult = result.map(item => item.friendId);

        //get only the frirndId's by mapping over result array
        const friendIds = result.map(doc => doc.friendId);

        //interface for postdetail array
        type PostDetail = {
            name: string | undefined;
            caption: string | undefined;
            likes: { userId?: string; userName?: string; isLiked?: boolean }[] | undefined;
            comments: { comment: string; userId: string; userName: string }[] | undefined;
            picture_public_id: string | undefined;
            picture_secure_url: string | undefined;
        };

        //define totalPoasts as a empty array
        let totalPosts: PostDetail[] = [];

        //run a for loop for every element of the friendId array
        for (let i = 0; i < friendIds.length; i++) {

            //define the userIdObject as friendId[i]
            const userIdObject = friendIds[i];

            //find the user from User
            const user = await User.findOne({ _id: userIdObject });

            //get his displayname
            const userName = user?.displayName;

            //get the users all posts from Post
            const post = await Post.findOne({ userId: userIdObject });

            //first check if he has any posts or not
            const userPostDetails = post?.posts;

            //if he has any posts
            if (userPostDetails) {

                //now loop through the every post of that user
                for (let j = 0; j < userPostDetails.length; j++) {

                    //define the currentPostId
                    let currentPostId = userPostDetails[j]._id;

                    //if current PostId found---
                    if (currentPostId) {

                            //fill the details 
                            const eachPosts: PostDetail = {
                                name: userName,
                                caption: userPostDetails[j].caption,
                                likes: userPostDetails[j].likes,
                                comments: userPostDetails[j].comments?.map(comment => ({
                                    comment: comment.comment || "",
                                    userId: comment.userId || "",
                                    userName: comment.userName || ""
                                })),
                                picture_public_id: userPostDetails[j]?.image?.public_id,
                                picture_secure_url: userPostDetails[j]?.image?.secure_url
                            };

                            //now push each posts to the totalPost array
                            totalPosts.push(eachPosts);
                        
                    }
                }
            }
        }

        //////// get all posts of my followings




                //////// get all posts for the rest of the users

                // to get rest of the user posts other than my followings fetch all users and project only the _id field
                const users = await User.find({}, { _id: 1 });
                
                // Extract the _id values into an array
                const allUser = users.map(user => user._id);

                // Filter allUser to exclude elements present in newResult
                const restUsersThanMyFollowings = allUser.filter(user => 
                    !newResult.some(result => result.equals(user))
                );
                        
                //run a for loop for every element of the allUser array
                for (let i = 0; i < restUsersThanMyFollowings.length; i++) {

                //define the userIdObject as allUser[i]
                const userIdObject = restUsersThanMyFollowings[i];

                //find the user from User
                const user = await User.findOne({ _id: userIdObject });

                //get his displayname
                const userName = user?.displayName;

                //get the users all posts from Post
                const post = await Post.findOne({ userId: userIdObject });

                //first check if he has any posts or not
                const userPostDetails = post?.posts;

                //if he has any posts
                if (userPostDetails) {

                    //now loop through the every post of that user
                    for (let j = 0; j < userPostDetails.length; j++) {

                        //define the currentPostId
                        let currentPostId = userPostDetails[j]._id;

                        //if current PostId found---
                        if (currentPostId) {

                                //fill the details 
                                const eachPosts: PostDetail = {
                                    name: userName,
                                    caption: userPostDetails[j].caption,
                                    likes: userPostDetails[j].likes,
                                    comments: userPostDetails[j].comments?.map(comment => ({
                                        comment: comment.comment || "",
                                        userId: comment.userId || "",
                                        userName: comment.userName || ""
                                    })),
                                    picture_public_id: userPostDetails[j]?.image?.public_id,
                                    picture_secure_url: userPostDetails[j]?.image?.secure_url
                                };

                                //now push each posts to the totalPost array
                                totalPosts.push(eachPosts);
                            
                        }
                    }
                }
            }


            //////// get all posts for the rest of the users



        //now sort the totalPost array by filling the unlikedPosts with those posts only which are not liked by user 
        let unlikedPosts: PostDetail[] = [];

        //loop through totalpost array
        for (let a = 0; a < totalPosts.length; a++) { // Changed `<=` to `<`
            let likedByUser = totalPosts[a].likes;

            let isLiked = false;
            if (likedByUser) {
                for (let b = 0; b < likedByUser.length; b++) { // Changed `<=` to `<`
                    if (likedByUser[b].userId === userId) {
                        isLiked = true;
                        break; // Exit the loop if the post is liked by the user
                    }
                }
            }

            // Add to unlikedPosts if the post is not liked by the user
            if (!isLiked) {
                unlikedPosts.push(totalPosts[a]);
            }
        }


            res.status(200).json({
                success: true,
                message: "feed",
                data: unlikedPosts,
            });

        } catch (error: any) {
            //error handling
            console.error("Error fetching feed:", error);
            next(new AppError("Internal server error", 500));
        }
    };



export { feed }