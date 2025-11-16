const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id: ..., iat: ..., exp: ... }
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired", code: "token_expired" });
    }
    return res.status(401).json({ message: "Token invalid" });
  }
}

module.exports = auth;
