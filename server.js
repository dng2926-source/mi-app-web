const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const path = require("path");

// Setup de directorios
require("./utils/setupDirs");

// Logger
const logger = require("./utils/logger");

// Cargar variables de entorno
require("dotenv").config();

// Verificar variables críticas
if (!process.env.MONGO_URI) {
  logger.error("❌ ERROR: MONGO_URI no está configurado");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  logger.error("❌ ERROR: JWT_SECRET no está configurado");
  process.exit(1);
}

logger.info("✅ Variables de entorno cargadas correctamente");

// Confiar en proxies (importante para Render)
const app = express();
app.set("trust proxy", 1);

// DB
const conectarDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const publicationRoutes = require("./routes/publicationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const storyRoutes = require("./routes/storyRoutes");

// Conectar a MongoDB antes de iniciar el servidor
conectarDB().catch((error) => {
  logger.warn("⚠️ MongoDB no disponible, pero continuando...", error.message);
});

// Seguridad: Headers HTTP
// En desarrollo: CSP más permisivo para trabajar con IPs locales
// En producción: configurar específicamente los orígenes permitidos
const isProduction = process.env.NODE_ENV === "production";

app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              "https://cdnjs.cloudflare.com",
            ],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              "https://cdnjs.cloudflare.com",
              "https://fonts.googleapis.com",
            ],
            imgSrc: [
              "'self'",
              "data:",
              "https://i.pravatar.cc",
              "https://via.placeholder.com",
            ],
            fontSrc: [
              "'self'",
              "https://fonts.gstatic.com",
              "https://cdnjs.cloudflare.com",
            ],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        }
      : {
          directives: {
            defaultSrc: ["*"],
            scriptSrc: ["*", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["*", "'unsafe-inline'"],
            imgSrc: ["*", "data:"],
            fontSrc: ["*"],
            connectSrc: ["*"],
            objectSrc: ["'none'"],
          },
        },
  }),
);

// Compresión de respuestas
app.use(compression());

// CORS configurado - permitir Firebase Hosting y localhost
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones desde Firebase Hosting, localhost y cualquier origen en desarrollo
      const allowedOrigins = [
        "https://mi-app-web-221fa.web.app",
        "http://localhost:4000",
        "http://localhost:3000",
      ];
      
      // En desarrollo, permitir todos los orígenes
      if (process.env.NODE_ENV === "development") {
        callback(null, true);
      } else if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  }),
);

// Logger HTTP (Morgan)
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }),
);

// Middleware de parseo
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Rate limiting global para APIs, pero sin contar respuestas exitosas
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Demasiadas solicitudes, intenta más tarde",
  keyGenerator: (req) => {
    // En Render, usar X-Forwarded-For si está disponible
    return req.get('X-Forwarded-For') || req.ip;
  },
  skip: (req) => {
    // Saltar rate limit en desarrollo
    return process.env.NODE_ENV === "development";
  }
});
app.use(limiter);

app.use(express.static("public"));
app.use("/uploads", express.static("public/uploads"));

app.use("/api/users", userRoutes);
app.use("/api/publications", publicationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stories", storyRoutes);

// Manejo global de errores
app.use((err, req, res, next) => {
  logger.error("Error no manejado:", err);
  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor",
  });
});

const PORT = process.env.PORT || 4000;
// Escuchar en 0.0.0.0 para que funcione en Render/producción
const HOST = "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  logger.info(`✅ Servidor Pro corriendo en http://0.0.0.0:${PORT}`);
  logger.info(
    `🌐 Accesible desde: http://localhost:${PORT} (local) o desde internet`,
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM recibido, cerrando servidor gracefully...");
  server.close(() => {
    logger.info("Servidor cerrado");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT recibido, cerrando servidor...");
  server.close(() => {
    logger.info("Servidor cerrado");
    process.exit(0);
  });
});

module.exports = server;
