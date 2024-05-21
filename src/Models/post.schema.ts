import { Schema, Document, model } from "mongoose";


interface Post extends Document {
    image?: {
        public_id : string,
        secure_url : string
    };
    caption : string;
    comments : Array<{
        userId : string,
        userName : string,
        comment : string
    }> ;
    like : Array <{
        userId : string;
        userName : string;
        isLiked : boolean
    }>
}

const postSchema: Schema<Post> = new Schema(
    {
        image : {
            public_id : {
                type : String,
                required : true
            } ,
            secure_url : {
                type : String,
                required : true
            } 
        } ,
        caption : {
            type : String,
            required : true
        } ,
        comments : [
            {
                userId : {
                    type : String,
                    required : true
                } ,
                userName : {
                    type : String,
                    required : true
                } ,
                isLiked : {
                    type : Boolean,
                    required : true
                }
            }
        ] ,
        like : [
            {
                userId : {
                    type : String,
                    required : true
                } ,
                userName : {
                    type : String,
                    required : true
                } ,
                comment : {
                    type : String,
                    required : true
                }
            }
        ]
        
    },
    { timestamps: true }
);

const PostModel = model<Post>("Post", postSchema);

export { PostModel, Post };