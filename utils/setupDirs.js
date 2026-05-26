const fs = require('fs');
const path = require('path');

// Crear carpeta de uploads si no existe
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ Carpeta de uploads creada correctamente');
  }
} catch (err) {
  console.error('❌ Error al crear carpeta uploads:', err.message);
}

// Crear carpeta de logs si no existe
const logsDir = path.join(__dirname, '..', 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('✅ Carpeta de logs creada correctamente');
  }
} catch (err) {
  console.error('❌ Error al crear carpeta logs:', err.message);
}
