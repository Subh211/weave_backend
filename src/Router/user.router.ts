import { NextFunction, Request, Response, Router } from "express";
import { IRegistrationRequest , MulterFilesRequest , passwordByUser, registerUserByEmail, userNameAndUserPicture }from "../controller/user.controller";
import upload from "../MiddleWare/multer.middleware";
import session from 'express-session';


declare module 'express-session' {
    interface Session {
        email?: string;
    }
}

const userRouter = Router();

// Route for user registration
userRouter.post('/register', (req: Request & { session: session.Session }, res: Response, next: NextFunction) => {
    // Set the email property in the session
    req.session.email = req.body.email;
    return registerUserByEmail(req as IRegistrationRequest, res, next);
});

// Route for setting password
userRouter.post('/password', (req: Request & { session: session.Session }, res: Response, next: NextFunction) => {
    // Access the email property from the session
    const email = req.session.email;
    if (!email) {
        return next(new Error("Email not found in session"));
    }
    return passwordByUser(req as IRegistrationRequest, res, next);
});

//Route for Username and Profile picture
userRouter.post('/username', upload.single('photoURL'), (req: Request & { session: session.Session }, res: Response, next: NextFunction) => {
    userNameAndUserPicture(req as MulterFilesRequest & { session: session.Session }, res, next);
});


export default userRouter;