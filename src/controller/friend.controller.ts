import { NextFunction, Request, Response } from "express";
import mongoose from 'mongoose';
import User from "../Models/user.schema";
import AppError from "../Utils/appError";
import Friend from "../Models/friend.schema";
import Notification from "../Models/notification.schema";


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

    //Get the displayName of the user
    let myUserDetails = await User.findById(userId)
    let myName = myUserDetails?.displayName

    //Get the displayName of the friend
    let friendUserDetails = await User.findById(friendId)
    let friendName = friendUserDetails?.displayName

    //find the friend of the user
    let myFriends = await Friend.findOne({ userId });

    //if user have no friends create one
    if (!myFriends) {
        myFriends = await new Friend ({userId,following:[],followers:[]})
    }

    // Ensure that the IDs are converted to ObjectId type
    const userIdObject = new mongoose.Types.ObjectId(userId);
    const friendIdObject =new mongoose.Types.ObjectId(friendId);

    // Find the document and project only the matching friend element
    const areAlreadyFriends = await Friend.findOne(
    { userId: userIdObject, "following.friendId": friendIdObject },
    { "friends.$": 1 }
    );
 
    //if any result found (i.e. if they are already friends) ---restrict them
    if (areAlreadyFriends) {
        return next(new AppError("You are already friends",200))
    }

    //find details of the friend from user collection
    let friendDetails = await User.findOne({_id : friendId});

    //if any friend details is there---push into user's following array
    if (friendDetails) {
        //if that friend have a profile picture do this
        if (friendDetails.photoURL) {
        myFriends.following.push({
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
            myFriends.following.push({
                friendId:friendDetails._id,
            friendName:friendDetails.displayName,
            date:Date.now(),
            })
        }
    }

    //wait until myFriend details gets saved
    await myFriends.save();

    //find the 'friends' of the friend
    let friendsFriends = await Friend.findOne({ friendId });

    //if friend have no friends create one
    if (!friendsFriends) {
        friendsFriends = await new Friend ({userId:friendId,following:[],followers:[]})
    }
    
    //find details of user from user collection
    let myDetails = await User.findOne({_id : userId});

    //if any details is there---push into friend's followers array
    if (myDetails) {
        //if user have a profile picture do this
        if (myDetails.photoURL) {
        friendsFriends.followers.push({
            friendId:myDetails._id,
            friendName:myDetails.displayName,
            friendImage:{
                public_id:myDetails.photoURL?.public_id,
                secure_url:myDetails.photoURL?.secure_url
            },
            date:Date.now(),
        })} 
        //if userdo not have a profile picture do this
        else {
            friendsFriends.followers.push({
                friendId:myDetails._id,
            friendName:myDetails.displayName,
            date:Date.now(),
            })
        }
    }

    //wait until friends friend details get saved
    await friendsFriends.save()

    //Following notification for myself
    let myNotification = await Notification.findOne({userId});

    //Following notification for myself
    if (!myNotification) {
        myNotification = await new Notification ({userId,notifications:[]});
    }

    //Following notification for myself
    myNotification.notifications.push({
        notifiction:`You are following ${friendName}`,
        date:(new Date()).toString()
    })

    //Following notification for myself
    await myNotification.save();

    //Following notification for friend
    let friendNotification = await Notification.findOne({ userId: friendId });

    //Following notification for friend
    if (!friendNotification) {
        friendNotification = await new Notification ({ userId: friendId, notifications: [] });
    }

    //Following notification for friend
    friendNotification.notifications.push({
        notifiction:`${myName} started following you`,
        date:(new Date()).toString()
    })

    //Following notification for friend
    await friendNotification.save();

    return res.status(200).json({
        success:true,
        message:`You are now friends ${myFriends}`
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
    
    //Get the displayName of the user
    let myUserDetails = await User.findById(userId)
    let myName = myUserDetails?.displayName

    //Get the displayName of the friend
    let friendUserDetails = await User.findById(friendId)
    let friendName = friendUserDetails?.displayName


    // Ensure that the IDs are converted to ObjectId type
    const userIdObject = new mongoose.Types.ObjectId(userId);
    const friendIdObject =new mongoose.Types.ObjectId(friendId);

    //Serach through the myFriend collection and delete friend's details from my 'following' array
    await Friend.updateOne(
        { userId: userIdObject },
        { $pull: { following: { friendId: friendIdObject } } }
    )

    //Serach through the friends 'friends' collection and delete users details from my 'followers' array
    await Friend.updateOne(
        { userId: userIdObject },
        { $pull: { followers: { friendId: friendIdObject } } }
    )

    //unfollowing notification for myself
    let myNotification = await Notification.findOne({userId});

    //unfollowing notification for myself
    if (!myNotification) {
        myNotification = await new Notification ({userId,notifications:[]});
    }

    //unfollowing notification for myself
    myNotification.notifications.push({
        notifiction:`You unfollowed ${friendName}`,
        date:(new Date()).toString()   
    })

    //unfollowing notification for myself
    await myNotification.save();

    //unfollowing notification for friend
    let friendNotification = await Notification.findOne({ userId: friendId });

    //unfollowing notification for friend
    if (!friendNotification) {
        friendNotification = await new Notification ({ userId: friendId, notifications: [] });
    }

    //unfollowing notification for friend
    friendNotification.notifications.push({
        notifiction:`${myName} unfollowed you`,
        date:(new Date()).toString()
    })

    
    //unfollowing notification for friend
    await friendNotification.save()

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