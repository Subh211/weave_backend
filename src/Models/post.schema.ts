import { Schema, Document, model } from "mongoose";

interface IPost extends Document {
    userId: Schema.Types.ObjectId;
    posts: Array<{
        image?: {
            public_id: string;
            secure_url: string;
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

const postSchema: Schema<IPost> = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "UserId is required"],
        },
        posts: [
            {
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

const Post = model<IPost>("Post", postSchema);

export default Post;
export { IPost };
