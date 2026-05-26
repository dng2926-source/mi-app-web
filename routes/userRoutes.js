const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const userController = require("../controllers/userController");
const { validateRegister, validateLogin } = require("../middleware/validators");
const { refreshAccessToken } = require("../utils/tokenManager");
const auth = require("../middleware/authMiddleware");

// Rutas de autenticación
router.post("/register", validateRegister, userController.registerUser);
router.post("/login", validateLogin, userController.loginUser);
router.post("/firebase-session", userController.firebaseAuth);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout-all", auth, userController.revokeFirebaseSessions);
router.get("/me", auth, userController.getCurrentUser);

// Rutas de usuario (búsqueda, perfil, seguimiento)
router.get("/search", auth, userController.searchUsers);
router.get("/profile/:userId", auth, userController.getUserProfile);
router.post("/:userId/follow", auth, userController.toggleFollow);

module.exports = router;
