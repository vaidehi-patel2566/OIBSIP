const jwt = require("jsonwebtoken");
const { appConfig } = require("../utils/config");

function signToken(payload) {
  return jwt.sign(payload, appConfig().jwtSecret, { expiresIn: "7d" });
}

function requireAuth(role) {
  return function (req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ message: "Sign in required" });
    try {
      const payload = jwt.verify(token, appConfig().jwtSecret);
      if (role && payload.role !== role) {
        return res.status(403).json({ message: "You do not have access to this area" });
      }
      req.auth = payload;
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Session expired. Sign in again." });
    }
  };
}

module.exports = { signToken, requireAuth };
