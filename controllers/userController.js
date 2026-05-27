const User = require("../models/User");
const bcrypt = require("bcryptjs");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/tokenManager");
const {
  verifyIdToken,
  revokeRefreshTokens,
} = require("../utils/firebaseAdmin");
const logger = require("../utils/logger");

// Importar createNotification de forma segura
let createNotification;
try {
  createNotification = require("./notificationController").createNotification;
} catch (e) {
  createNotification = async () => {}; // No-op para pruebas
}

const generateUniqueUsername = async (base) => {
  const normalized = String(base || "user")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .substring(0, 18);

  let username = normalized || "user";
  let suffix = "";
  let attempt = 0;

  while (await User.exists({ username: username + suffix })) {
    attempt += 1;
    suffix = `_${Math.floor(1000 + Math.random() * 9000)}`;
    if (attempt > 10) {
      suffix = `_${Date.now()}`;
      break;
    }
  }

  return username + suffix;
};

// FUNCIÓN DE REGISTRO
exports.registerUser = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Verificar si el usuario ya existe
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res
        .status(400)
        .json({ message: "Email o username ya registrado" });
    }

    // Hash de contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear y guardar usuario
    user = new User({ username, password: hashedPassword, email });
    await user.save();

    // Generar tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      accessToken,
      refreshToken,
      message: "Usuario registrado correctamente",
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    logger.error("Error en registro:", error);
    res.status(500).json({ message: "Error al registrar usuario" });
  }
};

// FUNCIÓN DE LOGIN
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    // Generar tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    logger.error("Error en login:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

exports.firebaseAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Firebase ID token requerido" });
    }

    let decoded;
    try {
      decoded = await verifyIdToken(idToken);
    } catch (tokenError) {
      logger.error("Token verification failed:", tokenError.message);
      return res.status(401).json({ 
        message: "Token inválido o expirado",
        code: tokenError.code 
      });
    }

    const firebaseUid = decoded.uid;
    if (!firebaseUid) {
      return res.status(400).json({ message: "Token Firebase inválido" });
    }

    const email = decoded.email || "";
    let user = await User.findOne({ firebaseUid });

    if (!user && email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        existingUser.firebaseUid = firebaseUid;
        user = await existingUser.save();
      }
    }

    if (!user) {
      const baseUsername = email.split("@")[0] || "user";
      const username = await generateUniqueUsername(baseUsername);
      user = new User({ username, email, firebaseUid, password: "" });
      await user.save();
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firebaseUid: user.firebaseUid,
      },
    });
  } catch (error) {
    logger.error("Firebase auth error:", error.message);
    res.status(500).json({ 
      message: "Error al autenticar con Firebase",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

exports.revokeFirebaseSessions = async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    if (!firebaseUid) {
      return res
        .status(400)
        .json({ message: "No se detectó sesión Firebase en la solicitud" });
    }

    await revokeRefreshTokens(firebaseUid);
    res.json({ message: "Se revocaron sesiones en todos los dispositivos" });
  } catch (error) {
    logger.error("Error revocando sesiones Firebase:", error);
    res
      .status(500)
      .json({ message: "Error al cerrar sesión en todos los dispositivos" });
  }
};

// NUEVA FUNCIÓN: Buscar usuarios
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: "Query de búsqueda vacía" });
    }

    // Búsqueda por username usando regex (case-insensitive)
    const users = await User.find({
      username: { $regex: q, $options: "i" },
    })
      .select("username _id followers following")
      .limit(20);

    res.json({ users });
  } catch (error) {
    logger.error("Error en búsqueda de usuarios:", error);
    res.status(500).json({ message: "Error al buscar usuarios" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user)
      .select("username email firebaseUid createdAt")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firebaseUid: user.firebaseUid,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error("Error al obtener usuario actual:", error);
    res.status(500).json({ message: "Error al obtener usuario actual" });
  }
};

// NUEVA FUNCIÓN: Obtener perfil de usuario
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select("username _id followers following createdAt")
      .populate("followers", "username _id")
      .populate("following", "username _id");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar si el usuario actual sigue a este usuario
    const currentUser = await User.findById(req.user).select("following");
    const isFollowing =
      currentUser.following?.some((id) => id.toString() === userId) || false;

    res.json({
      user: {
        id: user._id,
        username: user.username,
        followers: user.followers,
        following: user.following,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0,
        isFollowing,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error("Error al obtener perfil:", error);
    res.status(500).json({ message: "Error al obtener perfil" });
  }
};

// NUEVA FUNCIÓN: Follow/Unfollow a un usuario
exports.toggleFollow = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user;

    // No se puede seguir a sí mismo
    if (userId === currentUserId.toString()) {
      return res.status(400).json({ message: "No puedes seguirte a ti mismo" });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar si ya está siguiendo
    const isFollowing = currentUser.following?.some(
      (id) => id.toString() === userId,
    );

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== userId,
      );
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUserId.toString(),
      );
    } else {
      // Follow
      if (!currentUser.following) currentUser.following = [];
      if (!targetUser.followers) targetUser.followers = [];

      currentUser.following.push(userId);
      targetUser.followers.push(currentUserId);

      // Crear notificación de follow
      await createNotification(userId, currentUserId, "follow");
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      message: isFollowing ? "Dejar de seguir" : "Siguiendo",
      following: !isFollowing,
    });
  } catch (error) {
    logger.error("Error en toggle follow:", error);
    res.status(500).json({ message: "Error al cambiar estado de seguimiento" });
  }
};
