# 🚀 Despliegue Rápido en la Nube

Tu app estará disponible 24/7 desde cualquier dispositivo sin necesidad de la laptop ejecutándose.

## 📋 Pasos Rápidos (5 minutos)

### 1️⃣ Instalar Firebase CLI
```bash
npm install -g firebase-tools
```

### 2️⃣ Autenticarse
```bash
firebase login
```

### 3️⃣ Desplegar Frontend
```bash
cd c:\Users\maicr\mi-app-web
firebase deploy --only hosting
```

**URL pública**: `https://mi-app-web-221fa.web.app`

---

### 4️⃣ Desplegar Backend en Railway

1. Ve a https://railway.app
2. Haz login con GitHub
3. Conecta este repositorio
4. Crea variables de entorno:
   - `MONGO_URI`
   - `PORT=5000`
   - `NODE_ENV=production`
   - `FIREBASE_SERVICE_ACCOUNT={...}`
   - `CORS_ORIGIN=https://mi-app-web-221fa.web.app`

5. Railway desplegará automáticamente

**URL pública backend**: `https://mi-app-web-prod.up.railway.app`

---

### 5️⃣ Actualizar API_URL en el Código

En `public/auth.js` y `public/script.js`, busca:
```javascript
const API_URL = "https://mi-app-web-prod.up.railway.app";
```

Y actualiza con tu URL de Railway (se genera automáticamente).

---

### 6️⃣ Re-desplegar Frontend
```bash
firebase deploy --only hosting
```

---

## ✅ ¡Listo!

Tu app está en la nube. Accede desde:
- 💻 Laptop: https://mi-app-web-221fa.web.app
- 📱 Teléfono: https://mi-app-web-221fa.web.app
- 🖥️ Otra PC: https://mi-app-web-221fa.web.app

---

## 🆘 Solución de Problemas

| Problema | Solución |
|----------|----------|
| Firebase CLI no se reconoce | Instala Node.js, luego `npm install -g firebase-tools` |
| Error CORS | Verifica `CORS_ORIGIN` en Railway |
| Backend no responde | Revisa logs en Railway dashboard |
| Localhost sigue funcionando | Sí, tu backend local en puerto 4000 sigue trabajando |

---

## 📖 Para Más Detalles
Ver: `DEPLOY_GUIDE.md`
