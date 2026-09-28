import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name:{
            type:String,
            required:true,
            trim:true,
            minlength:2,
            maxlength:50
        },

        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true
        },

        password:{
            type:String,
            required:true,
            minlength:8,
            select:false 
        },

        avatar:{
            url:{
                type:String,
                default:""
            },
            publicId:{
                type:String,
                default:""
            }
        },

        refreshTokenHash:{
            type:String,
            default:null,
            select:false 
        }
    },

    {
        timestamps:true 
    }
)

const User = mongoose.model("User",userSchema);
export default User;