// firebase-client.js - Inicializa Firebase en el frontend y expone helpers de auth.
if (typeof firebase === "undefined") {
  throw new Error(
    "Firebase SDK no cargado. Asegúrate de incluir firebase-app-compat.js y firebase-auth-compat.js.",
  );
}

if (!window.firebaseConfig || !window.firebaseConfig.apiKey) {
  console.error(
    "❌ ERROR: Firebase config no encontrado. Verifica que public/firebase-config.js esté correctamente configurado.",
  );
  console.log("Firebase config actual:", window.firebaseConfig);
}

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig || {});
    console.log("✅ Firebase inicializado correctamente");
  }
} catch (error) {
  console.error("❌ Error al inicializar Firebase:", error);
}

window.FireAuth = {
  getCurrentUser: () => firebase.auth().currentUser,
  onAuthStateChanged: (callback) =>
    firebase.auth().onAuthStateChanged(callback),
  getIdToken: async (forceRefresh = false) => {
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error("No hay usuario autenticado en Firebase");
    }
    return await user.getIdToken(forceRefresh);
  },
  signOut: async () => {
    return await firebase.auth().signOut();
  },
  signIn: async (email, password) => {
    return await firebase.auth().signInWithEmailAndPassword(email, password);
  },
  createUser: async (email, password) => {
    return await firebase
      .auth()
      .createUserWithEmailAndPassword(email, password);
  },
};
