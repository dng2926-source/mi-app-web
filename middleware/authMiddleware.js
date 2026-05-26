const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { verifyIdToken } = require("../utils/firebaseAdmin");

module.exports = async (req, res, next) => {
  try {
    // Soportar ambos formatos: Authorization header y x-auth-token
    let token = req.header("Authorization");

    if (token && token.startsWith("Bearer ")) {
      token = token.substring(7); // Remover "Bearer "
    } else {
      token = req.header("x-auth-token");
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "No hay token, autorización denegada" });
    }

    // Intentar validar JWT interno primero
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = new mongoose.Types.ObjectId(decoded.id);
      req.authProvider = "jwt";
      return next();
    } catch (jwtError) {
      if (
        jwtError.name !== "TokenExpiredError" &&
        jwtError.name !== "JsonWebTokenError"
      ) {
        throw jwtError;
      }
    }

    // Intentar validar token de Firebase si JWT no aplica
    try {
      const decoded = await verifyIdToken(token);
      const user = await User.findOne({ firebaseUid: decoded.uid }).select(
        "_id firebaseUid",
      );
      if (!user) {
        return res
          .status(401)
          .json({ message: "Usuario no encontrado para token Firebase" });
      }
      req.user = user._id;
      req.firebaseUid = decoded.uid;
      req.authProvider = "firebase";
      return next();
    } catch (firebaseError) {
      if (firebaseError.code === "auth/id-token-expired") {
        return res.status(401).json({ message: "Token Firebase expirado" });
      }
      return res.status(401).json({ message: "Token no válido" });
    }
  } catch (error) {
    console.error("Error en autenticación:", error);
    res.status(500).json({ message: "Error al procesar autenticación" });
  }
};
