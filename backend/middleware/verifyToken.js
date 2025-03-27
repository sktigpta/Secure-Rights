import jwt from "jsonwebtoken"

export const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: "unautharized - no token provided" })
    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET)
        if (!decode) return res.status(401).json({ success: false, message: "unautharized -invalid token" })
        req.userId = decode.userId
        req.user = { userId: decode.userId };
        next();
    } catch (error) {
        console.log("Error in verifying token:", error);
        return res.status(500).json({ success: false, message: "Server error" })
    }
}