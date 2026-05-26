# 🚀 Guía de Despliegue en la Nube

## Fase 1: Desplegar Frontend en Firebase Hosting

### Paso 1: Instalar Firebase CLI
```bash
npm install -g firebase-tools
```

### Paso 2: Autenticarse con Firebase
```bash
firebase login
```
- Se abrirá el navegador
- Inicia sesión con tu cuenta de Google
- Autoriza Firebase CLI

### Paso 3: Desplegar el Frontend
```bash
cd c:\Users\maicr\mi-app-web
firebase deploy --only hosting
```

**Resultado**: Tu frontend estará en `https://mi-app-web-221fa.web.app` ✅

---

## Fase 2: Desplegar Backend en Railway

### Paso 1: Crear Cuenta en Railway
1. Ve a https://railway.app
2. Haz clic en **"Start Project"**
3. Elige **"Deploy from GitHub"**
4. Conecta tu cuenta de GitHub
5. Selecciona este repositorio (o crea uno nuevo)

### Paso 2: Crear Variables de Entorno en Railway
En el dashboard de Railway:
1. Abre tu proyecto
2. Ve a **"Variables"**
3. Agrega estas variables:

```
MONGO_URI=mongodb://localhost:27017/prueba
PORT=5000
NODE_ENV=production
JWT_SECRET=7f8a9b2c3d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4
JWT_REFRESH_SECRET=z1x2c3v4b5n6m7l8k9j0h1g2f3d4s5a6q7w8e9r0t1y2u3i4o5p6m7n8b9v0c
CORS_ORIGIN=https://mi-app-web-221fa.web.app
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### Paso 3: Desplegar
- Railway desplegará automáticamente cuando hagas push a GitHub

**Resultado**: Tu backend estará en algo como `https://mi-app-web-prod.up.railway.app` ✅

---

## Fase 3: Conectar Frontend con Backend

### Paso 1: Actualizar la URL del Backend
Edita `public/auth.js` y reemplaza:

```javascript
// Antes (localhost):
fetch("/api/users/login", {...})

// Después (production):
const API_URL = "https://tu-backend-railway.up.railway.app";
fetch(`${API_URL}/api/users/login`, {...})
```

### Paso 2: Re-desplegar Frontend
```bash
firebase deploy --only hosting
```

---

## ✅ Checklist Final

- [ ] Firebase CLI instalado
- [ ] Autenticado con `firebase login`
- [ ] Frontend desplegado en Firebase Hosting
- [ ] Cuenta Railway creada
- [ ] Backend desplegado en Railway
- [ ] Variables de entorno en Railway configuradas
- [ ] Frontend actualizado con URL del backend
- [ ] Acceso desde laptop/pc/phone ✅

---

## 🧪 Pruebas

1. Abre tu app en: `https://mi-app-web-221fa.web.app`
2. Intenta registrarte
3. Intenta iniciar sesión
4. Abre en otro dispositivo/navegador
5. ¡Debería funcionar! 🎉

---

## 🆘 Si Algo Sale Mal

- **Error de CORS**: Verifica `CORS_ORIGIN` en Railway
- **Backend no responde**: Verifica que Railway esté deployado
- **Autenticación falla**: Verifica variables de entorno
- **Contacta**: Revisa logs en Railway dashboard
