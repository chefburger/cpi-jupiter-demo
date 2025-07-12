
export const debug = (message: string, data?: any) => {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
        if (data) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }
};
