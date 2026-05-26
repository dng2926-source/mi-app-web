// auth.js - Manejo de autenticación con Firebase y backend

const APP_USER_STORAGE_KEY = "miapp_user";
const useFirebaseAuth = typeof FireAuth !== "undefined" && FireAuth;

// Detectar URL del backend (producción vs desarrollo)
const API_URL = (() => {
  if (typeof window !== "undefined") {
    const currentHost = window.location.hostname;
    // Si estamos en Firebase Hosting (producción)
    if (currentHost.includes("web.app") || currentHost.includes("firebaseapp.com")) {
      return "https://mi-app-web-backend.onrender.com";
    }
  }
  // Desarrollo local
  return "http://localhost:4000";
})();

console.log("🔗 API URL:", API_URL);

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    handleLoginForm(loginForm);
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    handleRegisterForm(registerForm);
  }
});

function persistAppUser(user) {
  if (!user) return;
  localStorage.setItem(APP_USER_STORAGE_KEY, JSON.stringify(user));
}

function clearAppUser() {
  localStorage.removeItem(APP_USER_STORAGE_KEY);
}

async function signOutFirebase() {
  if (useFirebaseAuth) {
    try {
      await FireAuth.signOut();
    } catch (error) {
      console.warn("Error al cerrar sesión en Firebase:", error);
    }
  }
  clearAppUser();
  window.location.href = "login.html";
}

function handleLoginForm(form) {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginBtn = document.getElementById("loginBtn");
  const messageDiv = document.getElementById("message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginBtn.disabled) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage(messageDiv, "Por favor completa todos los campos", "error");
      return;
    }

    setLoadingState(loginBtn, true);
    messageDiv.textContent = "";

    try {
      let backendResponse;
      if (useFirebaseAuth) {
        const firebaseUser = await FireAuth.signIn(email, password);
        const idToken = await firebaseUser.user.getIdToken();
        backendResponse = await fetch(`${API_URL}/api/users/firebase-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
      } else {
        backendResponse = await fetch(`${API_URL}/api/users/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      }

      const data = await parseApiResponse(backendResponse);
      if (!backendResponse.ok) {
        showMessage(
          messageDiv,
          data.message || "Error al iniciar sesión",
          "error",
        );
        return;
      }

      persistAppUser(data.user);
      showMessage(messageDiv, "✅ Iniciando sesión...", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);
    } catch (error) {
      console.error("Login error:", error);
      showMessage(messageDiv, "Error de conexión. Intenta de nuevo.", "error");
    } finally {
      setLoadingState(loginBtn, false);
    }
  });
}

function handleRegisterForm(form) {
  const emailInput = document.getElementById("email");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const registerBtn = document.getElementById("registerBtn");
  const messageDiv = document.getElementById("message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Prevenir múltiples clics
    if (registerBtn.disabled) return;

    const email = emailInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!email || !username || !password) {
      showMessage(messageDiv, "Por favor completa todos los campos", "error");
      return;
    }

    setLoadingState(registerBtn, true);
    messageDiv.textContent = "";

    try {
      let backendResponse;
      if (useFirebaseAuth) {
        try {
          const firebaseUser = await FireAuth.createUser(email, password);
          const idToken = await firebaseUser.user.getIdToken();
          backendResponse = await fetch(`${API_URL}/api/users/firebase-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        } catch (firebaseError) {
          if (firebaseError.code === "auth/configuration-not-found") {
            showMessage(
              messageDiv,
              "⚠️ Autenticación Firebase no está habilitada. Usa registro local.",
              "error",
            );
            console.error("❌ Firebase Auth no configurado. Error:", firebaseError);
            setLoadingState(registerBtn, false);
            return;
          }
          throw firebaseError;
        }
      } else {
        backendResponse = await fetch(`${API_URL}/api/users/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password }),
        });
      }

      const data = await parseApiResponse(backendResponse);
      if (!backendResponse.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const errorMsg = data.errors.map((e) => e.message).join(". ");
          showMessage(messageDiv, errorMsg, "error");
        } else {
          showMessage(data.message || "Error al registrarse", "error");
        }
        return;
      }

      persistAppUser(data.user);
      showMessage(messageDiv, "✅ Cuenta creada correctamente", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);
    } catch (error) {
      console.error("Register error:", error);
      showMessage(messageDiv, "Error de conexión. Intenta de nuevo.", "error");
    } finally {
      setLoadingState(registerBtn, false);
    }
  });
}

// Funciones auxiliares
function setLoadingState(button, isLoading) {
  const btnText = button.querySelector("#btnText");
  const btnLoader = button.querySelector("#btnLoader");

  if (isLoading) {
    button.disabled = true;
    btnText.style.display = "none";
    btnLoader.style.display = "inline";
    button.style.opacity = "0.6";
  } else {
    button.disabled = false;
    btnText.style.display = "inline";
    btnLoader.style.display = "none";
    button.style.opacity = "1";
  }
}

async function parseApiResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    return { message: text || "Error del servidor" };
  }
}

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `message ${type}`;

  if (type === "error") {
    element.style.color = "#ed4956";
  } else if (type === "success") {
    element.style.color = "#31a24c";
  }
}
