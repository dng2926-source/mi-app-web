# 🎉 Mi App Web - Social Network Instagram-Like

Aplicación social network moderna construida con Node.js, Express, MongoDB y tecnología profesional de frontend.

## 🚀 Características

✅ **Autenticación Segura**

- Registro e inicio de sesión con validación robusta
- Tokens JWT con Access Token (15min) y Refresh Token (7d)
- Middleware de autenticación con manejo de tokens expirados

✅ **Gestión de Publicaciones**

- Crear, leer, eliminar publicaciones
- Soporte para upload de imágenes (validación MIME + tamaño)
- Likes y comentarios en tiempo real

✅ **Seguridad**

- Prevención de XSS (sanitización HTML)
- Rate limiting contra brute force
- Helmet para headers HTTP seguros
- CORS configurado
- Validación de entrada con express-validator

✅ **Performance**

- Compresión de respuestas (gzip)
- Agregación MongoDB optimizada
- Índices en base de datos
- Paginación eficiente

✅ **Observabilidad**

- Logging centralizado con Winston
- HTTP logging con Morgan
- Graceful shutdown

✅ **Testing**

- Jest configurado
- Ejemplos de tests unitarios
- Supertest para tests de integración

## 📋 Requisitos Previos

- **Node.js**: v14+
- **MongoDB**: v4.4+ (local o remoto)
- **npm**: v6+

## ⚙️ Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repo>
cd mi-app-web
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/prueba
JWT_SECRET=tu_clave_secreta_aqui_minimo_32_caracteres_aleatorios
JWT_REFRESH_SECRET=tu_clave_refresh_secreta_aqui_minimo_32_caracteres_aleatorios
CORS_ORIGIN=http://localhost:4000
NODE_ENV=development
LOG_LEVEL=info

# Firebase Admin credentials para backend
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
# FIREBASE_SERVICE_ACCOUNT={...json string...}
# GOOGLE_APPLICATION_CREDENTIALS=./ruta/a/tu/credencial.json
```

Para el frontend, edita `public/firebase-config.js` con los datos de tu app web de Firebase.

### 4. Iniciar el servidor

**Desarrollo:**

```bash
npm run dev
```

**Producción:**

```bash
npm start
```

El servidor estará disponible en: `http://localhost:4000`

## 📁 Estructura del Proyecto

```
mi-app-web/
├── config/
│   └── db.js                 # Conexión MongoDB
├── controllers/
│   ├── userController.js      # Lógica de autenticación
│   └── publicationController.js # Lógica de publicaciones
├── middleware/
│   ├── authMiddleware.js      # Verificación JWT
│   └── validators.js          # Validación de entrada
├── models/
│   ├── User.js                # Esquema de usuario
│   └── Publication.js         # Esquema de publicación
├── routes/
│   ├── userRoutes.js          # Rutas de auth
│   └── publicationRoutes.js   # Rutas de publicaciones
├── utils/
│   ├── logger.js              # Logger centralizado
│   ├── setupDirs.js           # Setup de directorios
│   └── tokenManager.js        # Gestión de tokens
├── public/
│   ├── auth.js                # Lógica de frontend auth
│   ├── script.js              # Lógica del dashboard
│   ├── styles.css             # Estilos
│   ├── login.html             # Página de login
│   ├── register.html          # Página de registro
│   ├── dashboard.html         # Página principal
│   └── uploads/               # Carpeta de imágenes subidas
├── logs/                      # Logs de la aplicación
├── test/                      # Tests unitarios e integración
├── .env                       # Variables de entorno
├── .env.example               # Ejemplo de .env
├── jest.config.js             # Configuración de Jest
└── server.js                  # Punto de entrada
```

## 🔌 API Endpoints

### Autenticación

```
POST   /api/users/register        # Registrar usuario
POST   /api/users/login           # Iniciar sesión
POST   /api/users/refresh-token   # Refrescar access token
```

### Publicaciones

```
GET    /api/publications          # Obtener publicaciones (paginadas)
POST   /api/publications          # Crear publicación
DELETE /api/publications/:id      # Eliminar publicación (solo autor)
POST   /api/publications/like/:id # Like/Unlike
POST   /api/publications/comment/:id # Agregar comentario
```

## 🧪 Testing

### Ejecutar tests

```bash
npm test
```

### Tests con watch mode

```bash
npm run test:watch
```

### Coverage

```bash
npm test -- --coverage
```

Ejemplos de tests en: `test/controllers/userController.test.js`

## 🔐 Seguridad

### Implementado

- ✅ Validación de entrada completa
- ✅ Sanitización HTML (XSS prevention)
- ✅ Rate limiting (5 req/15min para auth, 100 req/15min global)
- ✅ Helmet para headers HTTP
- ✅ CORS configurado
- ✅ Compresión gzip
- ✅ Multer con validación MIME y tamaño

### Mejores Prácticas

- Las contraseñas se hashean con bcryptjs (salt: 10)
- Tokens JWT con expiración
- Refresh tokens para mantener sesiones
- Solo el autor puede eliminar sus publicaciones
- Validación de ObjectId MongoDB

## 📊 Base de Datos

### Índices creados

```javascript
// User
- email (único, sparse)
- username (único)
- createdAt

// Publication
- createdAt (descendente, para sorting)
- author
- likes._id
- comments.user
```

## 🚀 Optimizaciones Implementadas

### Backend

1. **Agregación MongoDB** en lugar de populate para queries complejas
2. **Índices** para búsquedas rápidas
3. **Paginación** de 10 publicaciones por página
4. **Compresión** gzip de respuestas
5. **Connection pooling** en MongoDB

### Frontend

1. **Loading states** para prevenir clicks múltiples
2. **Token refresh** automático antes de expiración
3. **XSS prevention** con escaping HTML
4. **Error handling** mejorado

## 📝 Logs

Ubicación: `logs/` (se crea automáticamente)

- `combined.log` - Todos los logs
- `error.log` - Solo errores

Formato: JSON con timestamp

## 🛠️ Variables de Entorno

| Variable           | Descripción                      | Valor por defecto                |
| ------------------ | -------------------------------- | -------------------------------- |
| PORT               | Puerto del servidor              | 4000                             |
| MONGO_URI          | URL de MongoDB                   | mongodb://localhost:27017/prueba |
| JWT_SECRET         | Clave para firmar access tokens  | -                                |
| JWT_REFRESH_SECRET | Clave para refresh tokens        | -                                |
| CORS_ORIGIN        | Origen permitido                 | http://localhost:4000            |
| NODE_ENV           | Entorno (development/production) | development                      |
| LOG_LEVEL          | Nivel de logs (error/info/debug) | info                             |

## 🐛 Troubleshooting

### "Demasiados intentos de login"

- Esperar 15 minutos o limpiar cookies

### "Token expirado"

- El sistema intenta refrescar automáticamente
- Si falla, volver a iniciar sesión

### Carpeta uploads no existe

- Se crea automáticamente al iniciar

### MongoDB no conecta

- Verificar MONGO_URI en .env
- Asegurar que MongoDB está corriendo

## 📚 Recursos

- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [JWT](https://jwt.io/)
- [Jest](https://jestjs.io/)
- [Winston Logger](https://github.com/winstonjs/winston)

## 📄 Licencia

MIT

## 👨‍💻 Autor

Desarrollado como proyecto profesional de social network.

---

**Última actualización:** Abril 2026
