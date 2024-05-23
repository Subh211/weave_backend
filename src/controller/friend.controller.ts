import { NextFunction, Request, Response } from "express";
import mongoose from 'mongoose';
import User from "../Models/user.schema";
import AppError from "../Utils/appError";
import Friend from "../Models/friend.schema";

interface makeFriendRequest extends Request {
    params: {
        friendId: string;
    };
}

//Make a friend
const makeFriend = async (req: makeFriendRequest, res: Response, next: NextFunction) => {
try {
    //get userId from jwtAuth middleware
    const  userId  = req.user?.id;
    //get frriendId from the params
    const { friendId } = req.params;

    //find the friend of the user
    let friend = await Friend.findOne({ userId });

    //if user have no friends create one
    if (!friend) {
        friend = await new Friend ({userId,friends:[]})
    }

    // Ensure that the IDs are converted to ObjectId type
    const userIdObject = new mongoose.Types.ObjectId(userId);
    const friendIdObject =new mongoose.Types.ObjectId(friendId);

    // Find the document and project only the matching friend element
    const result = await Friend.findOne(
    { userId: userIdObject, "friends.friendId": friendIdObject },
    { "friends.$": 1 }
    );
 
    //if any result found (i.e. if they are already friends) ---restrict them
    if (result) {
        return next(new AppError("You are already friends",200))
    }

    //find details of the friend from user collection
    let friendDetails = await User.findOne({_id : friendId});

    //if any friend details is there
    if (friendDetails) {
        //if that friend have a profile picture do this
        if (friendDetails.photoURL) {
        friend.friends.push({
            friendId:friendDetails._id,
            friendName:friendDetails.displayName,
            friendImage:{
                public_id:friendDetails.photoURL?.public_id,
                secure_url:friendDetails.photoURL?.secure_url
            },
            date:Date.now(),
        })} 
        //if that friend do not have a profile picture do this
        else {
            friend.friends.push({
                friendId:friendDetails._id,
            friendName:friendDetails.displayName,
            date:Date.now(),
            })
        }
    }

    //wait until friend gets saved
    await friend.save();

    return res.status(200).json({
        success:true,
        message:`You are now friends ${friend}`
    })    

} catch (error : any) {
        //error handling
        console.error("Error deleting post:", error.message);
        return next(new AppError("Internal server error", 500));
}
}


//Delete a friend
const deleteFriend = async (req: makeFriendRequest, res: Response, next: NextFunction) => {
try {

    //get userId from jwtAuth middleware
    const  userId  = req.user?.id;
    //get friend id from params
    const { friendId } = req.params;

    // Ensure that the IDs are converted to ObjectId type
    const userIdObject = new mongoose.Types.ObjectId(userId);
    const friendIdObject =new mongoose.Types.ObjectId(friendId);

    //Serach through the Friend collection
    await Friend.updateOne(
        { userId: userIdObject },
        { $pull: { friends: { friendId: friendIdObject } } }
      )

      return res.status(200).json({
        success:true,
        message:"You are no more friends"
      })
} catch (error:any) {
        //Error handling
        console.error("Error deleting post:", error.message);
        return next(new AppError("Internal server error", 500));
}

    
}

export {makeFriend,
        deleteFriend
}