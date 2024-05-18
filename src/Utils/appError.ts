class AppError extends Error {
    public statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        // Ensure the prototype chain is correctly set up
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export default AppError;
