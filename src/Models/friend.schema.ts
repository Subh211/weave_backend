import { Schema, Document, model } from "mongoose";


interface Friends extends Document {
    userId: Schema.Types.ObjectId;
    following: Array<{
        friendId:unknown;
        friendName:string;
        friendImage?: {
            public_id: string;
            secure_url: string;
        };
        date:number
    }>;
    followers: Array<{
        friendId:unknown;
        friendName:string;
        friendImage?: {
            public_id: string;
            secure_url: string;
        };
        date:number
    }>;
}

const friendSchema: Schema<Friends> = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "UserId is required"],
        },
        following :[
            {
                friendId : {
                    type:Schema.Types.Mixed // Use Mixed type for unknown types
                },
                friendName : {
                    type:String
                },
                friendImage : {
                    public_id : {
                        type : String
                    },
                    secure_url : {
                        type : String
                    }
                },
                date : {
                    type : Number
                }
           }
        ],
        followers :[
            {
                friendId : {
                    type:Schema.Types.Mixed // Use Mixed type for unknown types
                },
                friendName : {
                    type:String
                },
                friendImage : {
                    public_id : {
                        type : String
                    },
                    secure_url : {
                        type : String
                    }
                },
                date : {
                    type : Number
                }
           }
        ]
    },
    { timestamps: true }
);

const Friend = model<Friends>("Friend", friendSchema);

export default Friend;
export { Friends };
