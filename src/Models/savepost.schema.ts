import { Schema, Document, model, Types } from "mongoose";

interface SavePost extends Document {
    userId: Schema.Types.ObjectId;
    savedPosts: Array<{
        _id?: any;
        postOwnerDisplayName:any;
        postOwnerId:Types.ObjectId;
        postOwnerProfilePicture: {
            public_id: any;
            secure_url:any;
        };
        image?: {
            public_id: any;
            secure_url: any;
        };
        caption?: string;
        comments?: Array<{
            userId?: string;
            userName?: string;
            comment?: string;
        }>;
        likes?: Array<{
            userId?: string;
            userName?: string;
            isLiked?: boolean;
        }>;
    }>;
}

const savedPostSchema: Schema<SavePost> = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "UserId is required"],
        },
        savedPosts: [
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

const SavedPost = model<SavePost>("SavedPost", savedPostSchema);

export default SavedPost;
export { SavePost };
