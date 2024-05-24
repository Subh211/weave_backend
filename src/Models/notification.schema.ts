import { Schema, Document, model } from "mongoose";

interface Notifications extends Document {
    userId: Schema.Types.ObjectId;
    notifications: Array<{
        notifiction: string,
        date:string
    }>;
}


const notificationSchema: Schema<Notifications> = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "UserId is required"],
        },
        notifications :[
            {
                notifiction : {
                    type:String
                },
                date: {
                    type:String
                }
           }
        ]
    },
    { timestamps: true }
);

const Notification = model<Notifications>("Notification", notificationSchema);

export default Notification;
export { Notifications };