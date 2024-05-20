import express, { Application, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { Request, Response } from 'express';
import dotenv from 'dotenv';
import errorMiddleware from './MiddleWare/error.middleware';
import AppError from './Utils/appError';
import userRouter from './Router/user.Router';
import session from 'express-session';
import cookieParser from "cookie-parser";


dotenv.config();


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

// Routes

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


//if page not found
app.all('*',(req: Request, res: Response) => {
    res.status(404).send('OOPS! 404 NOT FOUND');
})


app.use(errorMiddleware)

export default app;
