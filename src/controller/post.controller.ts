import { NextFunction, Request, Response } from "express";
import Post from "../Models/post.schema";
import User from "../Models/user.schema";
import AppError from "../Utils/appError";
import fs from 'fs/promises';
import { v2 as cloudinaryV2 } from 'cloudinary';
import mongoose, { Types } from 'mongoose';
import Notification from "../Models/notification.schema";




interface CreatePostRequest extends Request {
    params: {
        friendId: string;
    };
    query: {
        postId: string;
    };
    file?: Express.Multer.File;
    body: {
        caption: string;
        comment: string;
        image: {
            public_id?: string;
            secure_url?: string;
        };
    };
}

//function to create a post
const createPost = async (req: CreatePostRequest, res: Response, next: NextFunction) => {

    try {
        //Getting userId from the jwtAuth middleware
        const userId = req.user?.id
        //Getting caption from the body
        const { caption } = req.body;
        //Get the new image as photoURL from body
        let image = req.body.image;


        //If caption is not present--throw an erroe
        if (!caption) {
            return next(new AppError("You must atleast write the caption to proceed", 400));
        }

        // Check if the user exists
        const user = await User.findById(userId);
        const userIdObject = new Types.ObjectId(userId);
        const userPublicId = user?.photoURL?.public_id;
        const userSecureUrl = user?.photoURL?.secure_url;
        const userDisplayName = user?.displayName;

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

                image = {
                    public_id: file.public_id,
                    secure_url: file.secure_url
                };

                //Delete the local file after uploading
                await fs.rm(`./uploads/${req.file.filename}`);

                //Push the caption and image to the post collection
                post.posts.push({
                    postOwnerId:userIdObject,
                    postOwnerDisplayName:userDisplayName,
                    postOwnerProfilePicture:{
                        public_id: userPublicId,
                        secure_url: userSecureUrl,
                    },
                    caption,
                    image: {
                        public_id: file.public_id,
                        secure_url: file.secure_url,
                    },
                })
        } else {
            //If only caption present in request,push that to the collection
            post.posts.push ({
                postOwnerId:userIdObject,
                postOwnerDisplayName:userDisplayName,
                postOwnerProfilePicture:{
                    public_id: userPublicId,
                    secure_url: userSecureUrl,
                },
                caption,

            })
        }


        // Save the post to the database
        await post.save();

        //postCreation notification for myself
        let myPostCreationNotification = await Notification.findOne({userId});

        //postCreation notification for myself
        if (!myPostCreationNotification) {
            myPostCreationNotification = await new Notification ({userId,notifications:[]});
        }

        //postCreation notification for myself
        myPostCreationNotification.notifications.push({
            notifiction:`Your post is created`,
            date:(new Date()).toString()
        })

        //postCreation notification for myself
        await myPostCreationNotification.save();

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
        //Get userId from the jwtAuth middleware
        const userId = req.user?.id

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
        //Get userId from jwtAuth middleware
        const userId = req.user?.id
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
      //get userId from the jwtAuth middleware
      const  userId  = req.user?.id;
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

      
      //postUpdate notification for myself
      let myPostUpdationNotification = await Notification.findOne({userId});

      //postUpdate notification for myself
      if (!myPostUpdationNotification) {
          myPostUpdationNotification = await new Notification ({userId,notifications:[]});
      }

      //postUpdate notification for myself
      myPostUpdationNotification.notifications.push({
          notifiction:`Your post is updated successfully`,
          date:(new Date()).toString()
      })

      //postUpdate notification for myself
      await myPostUpdationNotification.save();
  
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
            //Get userId from the jwtAuth middleware
            const userId = req.user?.id
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

            //postDeletion notification for myself
            let myPostDeletionNotification = await Notification.findOne({userId});

            //postDeletion notification for myself
            if (!myPostDeletionNotification) {
                myPostDeletionNotification = await new Notification ({userId,notifications:[]});
            }

            //postDeletion notification for myself
            myPostDeletionNotification.notifications.push({
                notifiction:`Your post is now updated`,
                date:(new Date()).toString()
            })

            //postDeletion notification for myself
            await myPostDeletionNotification.save();

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


//like a post
const likePost = async (req: CreatePostRequest, res: Response, next: NextFunction) => {
    try {
    //get userid from the jwtAuth middleware
    const userId = req.user?.id;
    //get friendid from the params
    const { friendId } = req.params;
    //get postid from query
    const { postId } = req.query;

    // Ensure that the IDs are converted to ObjectId type
    const userIdObject = new mongoose.Types.ObjectId(userId);
    const postIdObject = new mongoose.Types.ObjectId(postId);
    const friendIdObject =new mongoose.Types.ObjectId(friendId);

    //find the user who will like the post and get his username & image
     const user = await User.findById(userId);
     let likedUserName = user?.displayName
     let likedUserImage = user?.photoURL?.secure_url

    //To know that is he already liked the post or not
    const isAlreadyLiked = await Post.findOne(
        {userId:friendIdObject,"posts._id":postIdObject,"posts.likes.userId":userIdObject},
        {"posts.$":1}
    )

    //if he already liked the post--throw an error
    if (isAlreadyLiked) {
        return next(new AppError("You have already liked the post",200))
    }

    //now update the result---with the details of who liked the post
    const updatedResult = await Post.updateOne(
        { userId: friendIdObject, "posts._id": postIdObject },
        {
          $push: {
            "posts.$.likes": {
              userId: userIdObject,
              userName: likedUserName,
              isLiked: true,
              userImage:likedUserImage
            }
          }
        }
      );

      //if result is not modified---throw an error
      if (updatedResult.modifiedCount === 0) {
        return next(new AppError("Post not found",404));
      }
      
      //Fetch the updated post
      const postResult = await Post.findOne(
        { userId: friendIdObject, "posts._id": postIdObject },
        { "posts.$": 1 }
      );
      
      //if no updated post found---throw an error
      if (!postResult) {
        return next(new AppError("Post not found after update",404));
      }

      //post like notification for post owner
      let likeNotificationForFriend = await Notification.findOne({userId:friendIdObject});

      //post like notification for post owner
      if (!likeNotificationForFriend) {
          likeNotificationForFriend = await new Notification ({userId:friendId,notifications:[]});
      }

      //post like notification for post owner
      likeNotificationForFriend.notifications.push({
          notifiction:`${likedUserName} liked your post`,
          date:(new Date()).toString()
      })

      //post like notification for post owner
      await likeNotificationForFriend.save();
      
    res.status(200).json({
        success:true,
        message:"You have liked the post",
        data:postResult.posts[0],
    })
    } catch (error:any) {
        //error handling
        console.error("Error deleting post a:", error.message);
        return next(new AppError("Internal server error", 500));

    }
}
       
//Remove the like
const removeLike = async (req:CreatePostRequest,res:Response,next:NextFunction) => {
    try {
    //get userid from the jwtAuth middleware
    const userId = req.user?.id;
    //get friendid from the params
    const { friendId } = req.params;
    //get postid from query
    const { postId } = req.query;

    //Ensure that the IDs are converted to ObjectId type
    const userIdObject = new mongoose.Types.ObjectId(userId);
    const postIdObject = new mongoose.Types.ObjectId(postId);
    const friendIdObject =new mongoose.Types.ObjectId(friendId);

    //find that if the user has already liked the post or not
    const isLiked = await Post.findOne(
        {userId:friendIdObject,"posts._id":postIdObject,"posts.likes.userId":userIdObject},
        {"posts.$":1}
    )

    //if he have not liked yet---throw an error
    if (!isLiked) {
        return next(new AppError("You have not liked the post",200))
    }

    //function to remove the like
    const removeLike = await Post.updateOne(
        {userId:friendIdObject,"posts._id":postIdObject},
        {$pull:{"posts.$.likes": { userId: userIdObject }}}
    )

    //if the result is nodified---throw an error
    if (removeLike.modifiedCount === 0) {
        return next(new AppError("Post not founf or like not removed",404));
      }

    //Fetch the updated post
    const postResult = await Post.findOne(
        { userId: friendIdObject, "posts._id": postIdObject },
        { "posts.$": 1 }
      );
      
     //if no updated post found---throw an error 
    if (!postResult) {
        return res.status(404).json({
          success: false,
          message: "Post not found after update"
        });
      }

      res.status(200).json({
        success:true,
        message:"Like removed",
        data:postResult.posts[0]
      })

    } catch (error:any) {
        //error handling
        console.error("Error deleting post a:", error.message);
        return next(new AppError("Internal server error", 500));
    }
}


//add a comment to a post
const createComment = async (req:CreatePostRequest,res:Response,next:NextFunction) => {
    try {
        //get the comment from the body
        const {comment} = req.body;
        //get userid from the jwtAuth middleware
        const userId = req.user?.id;
        //get friendid from the params
        const { friendId } = req.params;
        //get postid from query
        const { postId } = req.query;

        //Ensure that the IDs are converted to ObjectId type
        const userIdObject = new mongoose.Types.ObjectId(userId);
        const postIdObject = new mongoose.Types.ObjectId(postId);
        const friendIdObject =new mongoose.Types.ObjectId(friendId);

        //get the user who will comment and get his displayName & image
        const user = await User.findById(userId);
        let commentedUserName = user?.displayName
        let commendtedUserImage = user?.photoURL?.secure_url

        //now update the post with the comment from that user
        const updatedResult = await Post.updateOne(
            { userId: friendIdObject, "posts._id": postIdObject },
            {
            $push: {
                "posts.$.comments": {
                comment: comment,
                userId: userIdObject,
                userName: commentedUserName,
                userImage: commendtedUserImage
                }
            }
            }
        );

        //if the post is not modified---throw an error
        if (updatedResult.modifiedCount === 0) {
            return next(new AppError("Post not found",404));
        }
        
        //Fetch the updated post
        const postResult = await Post.findOne(
            { userId: friendIdObject, "posts._id": postIdObject },
            { "posts.$": 1 }
        );
        
        //if no updated post found---throw an error
        if (!postResult) {
            return next(new AppError("Post not found after update",404))
        }
        
        //post comment notification for post owner
        let commentNotificationForFriend = await Notification.findById(friendId);

        //post comment notification for post owner
        if (!commentNotificationForFriend) {
            commentNotificationForFriend = await new Notification ({userId:friendId,notifications:[]});
        }

        //post comment notification for post owner
        commentNotificationForFriend.notifications.push({
            notifiction:`${commentedUserName} liked your post`,
            date:(new Date()).toString()
        })

        //post comment notification for post owner
        await commentNotificationForFriend.save();

        res.status(200).json({
            success:true,
            message:"You have commented on this post",
            data:postResult.posts[0],
        })


    } catch (error:any) {
        //error handling
        console.error("Error deleting post a:", error.message);
        return next(new AppError("Internal server error", 500));
    }
}

//delete a comment
const deleteComment = async (req:CreatePostRequest,res:Response,next:NextFunction) => {
    try {
       
        //get userid from the jwtAuth middleware
        const userId = req.user?.id;
        //get friendid from the params
        const { friendId } = req.params;
        //get postid from query
        const { postId } = req.query;

        //Ensure that the IDs are converted to ObjectId type
        const userIdObject = new mongoose.Types.ObjectId(userId);
        const postIdObject = new mongoose.Types.ObjectId(postId);
        const friendIdObject =new mongoose.Types.ObjectId(friendId);
    
        //find that has he commented on the post or not 
        const isCommented = await Post.findOne(
            {userId:friendIdObject,"posts._id":postIdObject,"posts.comments.userId":userIdObject},
            {"posts.$":1}
        )
    
        //if not,then throw an error
        if (!isCommented) {
            return next(new AppError("You have not commented on the post",200))
        }
    
        //remove the comment
        const removeComment = await Post.updateOne(
            {userId:friendIdObject,"posts._id":postIdObject},
            {$pull:{"posts.$.comments": { userId: userIdObject }}}
        )
    
        //if after comment removal post is not modified---throw an error
        if (removeComment.modifiedCount === 0) {
            return next(new AppError("Post not found or comment not removed",404));
          }
    
          //find the post 
          const postResult = await Post.findOne(
            { userId: friendIdObject, "posts._id": postIdObject },
            { "posts.$": 1 }
          );
          
          //if no post result is found
          if (!postResult) {
            return next(new AppError("Post not found after update",404));
          }
    
          res.status(200).json({
            success:true,
            message:"Here is your like page",
            data:postResult.posts[0]
          })
    
        } catch (error:any) {
            //error handling
            console.error("Error deleting post a:", error.message);
            return next(new AppError("Internal server error", 500));
        }
}


//get all likes
const getLikeScreen = async (req:CreatePostRequest,res:Response,next:NextFunction) => {
    try {
        //get friendId and postId
        const { friendId } = req.params;
        const { postId } = req.query;

        const postIdObject = new mongoose.Types.ObjectId(postId);
        const friendIdObject =new mongoose.Types.ObjectId(friendId);

        //find the post
        const post = await Post.findOne(
            { userId: friendId, "posts._id": postIdObject },
            { "posts.$": 1 }
          );
          
          //if no posts found
          if (!post) {
            return next(new AppError("No posts found",200))
          }

          //get all the likes
          const likes = post?.posts[0].likes;

          res.status(200).json({
            success:true,
            message:"Comment removed",
            data:likes
          })

    } catch (error:any) {
        //error handling
        console.error("Error occured in getting the page", error.message);
        return next(new AppError("Internal server error", 500));
    }

}


//get all likes
const getCommentScreen = async (req:CreatePostRequest,res:Response,next:NextFunction) => {
    try {
        //get friendId and postId
        const { friendId } = req.params;
        const { postId } = req.query;

        const postIdObject = new mongoose.Types.ObjectId(postId);
        const friendIdObject =new mongoose.Types.ObjectId(friendId);

        //find the post
        const post = await Post.findOne(
            { userId: friendId, "posts._id": postIdObject },
            { "posts.$": 1 }
          );
          
          //if no posts found
          if (!post) {
            return next(new AppError("No posts found",200))
          }

          //get all the comments
          const comments = post?.posts[0].comments;

          res.status(200).json({
            success:true,
            message:"Here is your like page",
            data:comments
          })

    } catch (error:any) {
        //error handling
        console.error("Error occured in getting the page", error.message);
        return next(new AppError("Internal server error", 500));
    }

}


export  {
    createPost,
    getPost,
    getOnePost,
    updateOnePost,
    deleteOnePost,
    likePost,
    removeLike,
    createComment,
    deleteComment,
    getLikeScreen,
    getCommentScreen
};