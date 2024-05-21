class AppError extends Error {
    public statusCode: number;

    //Constructor for the apperror
    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        // Ensure the prototype chain is correctly set up
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

//Exporting apperror
export default AppError;
