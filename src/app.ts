import express, { Application, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { Request, Response } from 'express';
import dotenv from 'dotenv';
import errorMiddleware from './MiddleWare/error.middleware';
import AppError from './Utils/appError';
import userRouter from './Router/user.router';
import session from 'express-session';
import cookieParser from "cookie-parser";


//dotenv configuration
dotenv.config();

//Making app with express()
const app: Application = express();

//Use the session
app.use(session({
    secret: 'SECRET', 
    resave: false,
    saveUninitialized: false
}));

// Middleware
app.use(cookieParser())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes---

//userRoute
app.use('/weave',userRouter)


// Default route
app.use('/', (req: Request, res: Response, next: NextFunction) => {
    try {
        res.status(200).json({
            success: true,
            message: "Welcome to Weave"
        });
    } catch (error: any) {
        return next(new AppError("Internal Server Error", 500));
    }
});


//If page not found route
app.all('*',(req: Request, res: Response) => {
    res.status(404).send('OOPS! 404 NOT FOUND');
})

//Making the app to use errorMiddleware
app.use(errorMiddleware)

//Exporting the app
export default app;
