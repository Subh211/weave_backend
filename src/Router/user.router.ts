import { NextFunction, Request, Response, Router } from "express";
import {  MulterFilesRequest , changePassword, deleteUser, forgetPassword, logOut, registerUserByEmail, resetPassword, signin, updateUser, userDetails }from "../controller/user.controller";
import upload from "../MiddleWare/multer.middleware";
import session from 'express-session';
import { jwtAuth } from "../MiddleWare/jwtAuth";


//'express-session' module declaration
declare module 'express-session' {
    interface Session {
        email?: string;
    }
}

//Creating router
const userRouter = Router();


// Route for user registration
userRouter.post('/register', upload.single('photoURL'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Type assertion to MulterFilesRequest
        const multerFilesRequest = req as MulterFilesRequest;
        await registerUserByEmail(multerFilesRequest, res, next);
    } catch (error) {
        // Handle errors
        next(error);
    }
});


// // Route for setting password
// userRouter.post('/password/:emailToken', (req: Request & { session: session.Session }, res: Response, next: NextFunction) => {
//     // Access the email property from the session
//     const email = req.session.email;
//     if (!email) {
//         return next(new Error("Email not found in session"));
//     }
//     return passwordByUser(req as IRegistrationRequest, res, next);
// });


// //Route for Username and Profile picture
// userRouter.post('/username', upload.single('photoURL') , (req: Request & { session: session.Session }, res: Response, next: NextFunction) => {
//     userNameAndUserPicture(req as MulterFilesRequest & { session: session.Session }, res, next);
// });


//Route for SignIn
userRouter.post('/signin', (req: Request, res: Response, next: NextFunction) => {
    signin(req , res, next);
});


//Route for User details
userRouter.get('/user', jwtAuth , (req: Request, res: Response, next: NextFunction) => {
    userDetails(req , res, next);
});


//Route for User details
userRouter.get('/logout', jwtAuth , (req: Request, res: Response, next: NextFunction) => {
    logOut(req , res, next);
});


//Route for forget password
userRouter.post('/reset-password', (req: Request, res: Response, next: NextFunction) => {
    forgetPassword(req , res, next);
})


//Route for reset password
userRouter.post('/reset-password/:resetToken', (req: Request, res: Response, next: NextFunction) => {
    resetPassword(req , res, next);
})

//Route for changing password
userRouter.post('/change-password', jwtAuth , (req: Request, res: Response, next: NextFunction) => {
    changePassword(req , res, next);
});


//Route for updating user
userRouter.put('/update-user', jwtAuth , upload.single('photoURL') , (req: Request, res: Response, next: NextFunction) => {
    updateUser(req , res, next);
});


//Delete the user
userRouter.delete('/delete', jwtAuth , (req: Request, res: Response, next: NextFunction) => {
    deleteUser(req,res,next);
})

//Exporting userRouter
export default userRouter;