import { Request, Response, NextFunction } from 'express';
import JWT from 'jsonwebtoken';

//Declaring interface for jwtPayload
interface JwtPayload {
    id: string;
    email: string;
    displayName: string;
}

// Extend the Request interface to include the user property
declare module 'express-serve-static-core' {
    interface Request {
        user?: JwtPayload;
    }
}

const jwtAuth = (req: Request, res: Response, next: NextFunction): void => {
    const token = (req.cookies && req.cookies.token) || null;

    //If token dont exist throw an error
    if (!token) {
        res.status(400).json({
            success: false,
            message: "Unable to authorize you"
        });

        //If token dont exists return from here
        return;
    }

    try {
        //Defining payload as jwtPayload
        const payload = JWT.verify(token, process.env.SECRET as string) as JwtPayload;

        //Injecting id and email to req.user
        req.user = { id: payload.id, email: payload.email, displayName: payload.displayName };
    } catch (error) {
        res.status(400).json({
            success: false,
            message: (error as Error).message
        });
        return;
    }

    //After completion of all these please go to the next() defined on the route
    next();
}

//Exporting { jwtAuth }
export { jwtAuth };
