import { Schema, Document, model, Types } from "mongoose";

interface IPost extends Document {
    userId: Schema.Types.ObjectId;
    posts: Array<{
        _id?: any;
        postOwnerDisplayName:any;
        postOwnerId:Types.ObjectId;
        postOwnerProfilePicture: {
            public_id: any;
            secure_url:any;
        };
        image?: {
            public_id: string;
            secure_url: string;
        };
        caption?: string;
        comments?: Array<{
            userImage: string;
            userId?: string;
            userName?: string;
            comment?: string;
        }>;
        likes?: Array<{
            userImage: string;
            userId?: string;
            userName?: string;
            isLiked?: boolean;
        }>;
    }>;
}

const postSchema: Schema<IPost> = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "UserId is required"],
        },
        posts: [
            {   
                postOwnerDisplayName:String,
                postOwnerId:{
                    type: Types.ObjectId,
                    required: true,
                },
                postOwnerProfilePicture: {
                    public_id: String,
                    secure_url:String
                },
                image: {
                    public_id: {
                        type: String,
                    },
                    secure_url: {
                        type: String,
                    },
                },
                caption: {
                    type: String,
                },
                comments: [
                    {   
                        userImage: {
                            type: String,
                        },
                        userId: {
                            type: String,
                        },
                        userName: {
                            type: String,
                        },
                        comment: {
                            type: String,
                        },
                    },
                ],
                likes: [
                    {
                        userImage: {
                            type: String,
                        },
                        userId: {
                            type: String,
                        },
                        userName: {
                            type: String,
                        },
                        isLiked: {
                            type: Boolean,
                        },
                    },
                ],
            },
        ],
    },
    { timestamps: true }
);

const Post = model<IPost>("Post", postSchema);

export default Post;
export { IPost };
