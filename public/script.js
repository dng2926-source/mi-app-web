// ============= GLOBAL STATE =============
let currentUser = null;
let viewingUserId = null;

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

// ============= UTILITIES =============
function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

function parseJwt(token) {
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    console.error("JWT parse error:", e);
    return null;
  }
}

// ============= TOKEN HELPER =============
class TokenHelper {
  static async getIdToken(forceRefresh = false) {
    if (typeof FireAuth === "undefined" || !FireAuth) {
      throw new Error("Firebase Auth no configurado");
    }
    return await FireAuth.getIdToken(forceRefresh);
  }

  static async fetchWithAuth(url, options = {}) {
    try {
      const accessToken = await this.getIdToken();
      if (!accessToken) {
        window.location.href = "/login.html";
        return null;
      }

      const headers = {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      };
      if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }

      let response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        try {
          const refreshedToken = await this.getIdToken(true);
          const refreshedHeaders = {
            ...options.headers,
            Authorization: `Bearer ${refreshedToken}`,
          };
          if (options.body && !(options.body instanceof FormData)) {
            refreshedHeaders["Content-Type"] = "application/json";
          }
          response = await fetch(url, {
            ...options,
            headers: refreshedHeaders,
          });
        } catch (e) {
          window.location.href = "/login.html";
          return null;
        }
      }

      return response;
    } catch (e) {
      console.error("Fetch error:", e);
      window.location.href = "/login.html";
      return null;
    }
  }
}

// ============= INITIALIZATION =============
async function initializeSession() {
  try {
    if (typeof FireAuth === "undefined" || !FireAuth) {
      window.location.href = "/login.html";
      return;
    }

    const savedUser = localStorage.getItem("miapp_user");
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
    }

    const firebaseUser =
      FireAuth.getCurrentUser() ||
      (await new Promise((resolve) => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      }));

    if (!firebaseUser) {
      window.location.href = "/login.html";
      return;
    }

    if (!currentUser || !currentUser.id) {
      const token = await FireAuth.getIdToken();
      const profileResponse = await fetch(`${API_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!profileResponse.ok) {
        window.location.href = "/login.html";
        return;
      }
      const data = await profileResponse.json();
      currentUser = data.user;
      localStorage.setItem("miapp_user", JSON.stringify(currentUser));
    }

    await loadCurrentUser();
    console.log(
      "Session OK:",
      currentUser.username || currentUser.name || "User",
    );
    updateUserUI();
  } catch (e) {
    console.error("Init error:", e);
    window.location.href = "/login.html";
  }
}

function updateUserUI() {
  try {
    const el = document.querySelector("[data-user-name]");
    if (el && currentUser) el.textContent = currentUser.name;
  } catch (e) {
    console.error("UI error:", e);
  }
}

async function loadCurrentUser() {
  try {
    const res = await TokenHelper.fetchWithAuth(
      `/api/users/profile/${currentUser.id}`,
    );
    if (!res || !res.ok) return;
    const data = await res.json();
    if (data.user) {
      currentUser.name = data.user.username || currentUser.name;
      currentUser.email = data.user.email || currentUser.email;
    }
  } catch (e) {
    console.error("Current user load error:", e);
  }
}

function showToast(message, type = "success") {
  let toast = document.getElementById("appToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "999px";
    toast.style.color = "#fff";
    toast.style.fontSize = "14px";
    toast.style.zIndex = "2000";
    toast.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
    document.body.appendChild(toast);
  }
  toast.style.background = type === "error" ? "#ed4956" : "#262626";
  toast.textContent = message;
  toast.style.opacity = "1";
  clearTimeout(toast.toastTimeout);
  toast.toastTimeout = setTimeout(() => {
    toast.style.opacity = "0";
  }, 2000);
}

// ============= LOAD PUBLICATIONS =============
async function loadPosts() {
  try {
    const res = await TokenHelper.fetchWithAuth("/api/publications");
    if (!res || !res.ok) throw new Error("Error loading posts");

    const data = await res.json();
    const posts = data.publications || [];
    const pubList = document.getElementById("publicationsList");

    if (!pubList) return;

    if (posts.length === 0) {
      pubList.innerHTML =
        '<p style="text-align:center; padding: 40px; color: #8e8e8e;">No posts yet</p>';
      return;
    }

    pubList.innerHTML = posts.map((p) => renderPostCard(p)).join("");
  } catch (e) {
    console.error("Load posts error:", e);
    const pubList = document.getElementById("publicationsList");
    if (pubList)
      pubList.innerHTML =
        '<p style="color: red; padding: 20px;">Error loading posts</p>';
  }
}

async function loadUserPosts(userId) {
  try {
    const res = await TokenHelper.fetchWithAuth(
      `/api/publications/user/${userId}`,
    );
    if (!res || !res.ok) throw new Error("Error loading user posts");
    return await res.json();
  } catch (e) {
    console.error("Load user posts error:", e);
    throw e;
  }
}

async function searchUsers(query) {
  try {
    const res = await TokenHelper.fetchWithAuth(
      `/api/users/search?q=${encodeURIComponent(query)}`,
    );
    if (!res || !res.ok) throw new Error("Search error");
    return await res.json();
  } catch (e) {
    console.error("Search error:", e);
    throw e;
  }
}

// ============= RENDER FUNCTIONS =============
function renderPostCard(p) {
  try {
    if (!p || !p.author) return "";

    const authorId = String(p.author._id || p.author.id || "");
    const authorName = escapeHtml(p.author.username || "User");
    const content = escapeHtml(p.content || "");
    const likes = p.likesCount || 0;
    const comments = p.commentsCount || 0;

    const hasLike =
      currentUser &&
      p.likes &&
      p.likes.some((id) => String(id) === String(currentUser.id));
    const isAuthor = currentUser && String(authorId) === String(currentUser.id);

    return `
      <div class="post-card" data-post-id="${p._id}">
        <div class="post-header">
          <div class="post-header-left" onclick="visitUserProfile('${authorId}', '${authorName}')" style="cursor: pointer;">
            <div class="post-avatar">
              <img src="https://i.pravatar.cc/32?u=${authorId}" alt="">
            </div>
            <span class="post-username">${authorName}</span>
          </div>
          ${isAuthor ? `<button class="delete-btn" onclick="deletePost('${p._id}')"><i class="fas fa-ellipsis-h"></i></button>` : ""}
        </div>
        
        ${p.imageUrl ? `<img class="post-image" src="${escapeHtml(p.imageUrl)}" alt="">` : ""}
        
        <div class="post-actions">
          <i class="${hasLike ? "fas" : "far"} fa-heart ${hasLike ? "liked" : ""}" onclick="handleLike('${p._id}')"></i>
          <i class="far fa-comment" onclick="document.getElementById('comment-${p._id}').focus()"></i>
          <i class="far fa-paper-plane" style="margin-left: auto;"></i>
        </div>
        
        <div class="post-content">
          <strong>${authorName}</strong> ${content}
        </div>
        
        <div class="comments-section">
          <div class="comments-list">
            ${
              Array.isArray(p.comments)
                ? p.comments
                    .slice(0, 2)
                    .map(
                      (c) =>
                        `<div class="comment-item"><strong>${escapeHtml(c.username)}</strong> ${escapeHtml(c.text)}</div>`,
                    )
                    .join("")
                : ""
            }
          </div>
          <div class="comment-add">
            <input type="text" id="comment-${p._id}" placeholder="Añade un comentario..." maxlength="200">
            <button onclick="handleComment('${p._id}')">Publicar</button>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error("Render card error:", e);
    return "";
  }
}

// ============= SECTIONS =============
function showSection(section) {
  try {
    viewingUserId = null;
    document
      .querySelectorAll(".nav-item")
      .forEach((item) => item.classList.remove("active"));

    const mainView = document.getElementById("main-view");
    if (!mainView) return;

    if (section === "feed") {
      document.querySelector('[data-section="feed"]')?.classList.add("active");
      mainView.innerHTML = `
        <div style="background: white; padding: 16px; border: 1px solid #dbdbdb; border-radius: 4px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; margin-bottom: 12px;">Crea una Historia</h3>
          <input type="file" id="storyMedia" accept="image/*,video/*" style="margin: 12px 0; display: block;">
          <button id="publishStoryButton" style="width: 100%; background: #00a8e8; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: 600;"><i class="fas fa-images"></i> Publicar Historia</button>
        </div>
        <div id="storiesContainer" style="display: flex; gap: 12px; overflow-x: auto; padding: 0 0 12px 0; margin-bottom: 24px; background: white; border: 1px solid #dbdbdb; border-radius: 4px; padding: 12px;">
          <div style="text-align: center; padding: 20px; flex: 0 0 auto; color: #8e8e8e;"><i class="fas fa-spinner fa-spin"></i></div>
        </div>
        <div style="background: white; padding: 16px; border: 1px solid #dbdbdb; border-radius: 4px; margin-bottom: 24px;">
          <textarea id="publicationText" placeholder="¿Qué estás pensando?" maxlength="500" style="width: 100%; padding: 12px; border: 1px solid #dbdbdb; border-radius: 4px; resize: vertical; min-height: 80px;"></textarea>
          <input type="file" id="publicationImage" accept="image/*" style="margin: 12px 0; display: block;">
          <button id="publishButton" style="width: 100%; background: #0095f6; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: 600;">Publicar</button>
        </div>
        <div id="publicationsList"><div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i></div></div>
      `;
      setupFeedLogic();
      loadStories();
    } else if (section === "explore") {
      document
        .querySelector('[data-section="explore"]')
        ?.classList.add("active");
      showExploreSection();
    } else if (section === "profile") {
      document
        .querySelector('[data-section="profile"]')
        ?.classList.add("active");
      if (currentUser) renderProfile(currentUser.id);
    } else if (section === "messages") {
      document
        .querySelector('[data-section="messages"]')
        ?.classList.add("active");
      showMessagesSection();
    }
  } catch (e) {
    console.error("Section error:", e);
  }
}

function showExploreSection() {
  try {
    const mainView = document.getElementById("main-view");
    mainView.innerHTML = `<div style="padding: 20px;"><input type="text" id="searchInput" placeholder="Search..." style="width: 100%; max-width: 400px; padding: 10px; border: 1px solid #dbdbdb; border-radius: 4px;"><div id="searchResults" style="margin-top: 20px; display: none;"></div><div id="exploreContent" style="text-align: center; padding: 60px; color: #8e8e8e;"><i class="fas fa-compass" style="font-size: 48px; opacity: 0.5; display: block; margin-bottom: 20px;"></i><h2>Search users</h2></div></div>`;

    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");
    const exploreContent = document.getElementById("exploreContent");

    let timeout;
    searchInput.addEventListener("input", async (e) => {
      clearTimeout(timeout);
      const query = e.target.value.trim();

      if (!query) {
        searchResults.style.display = "none";
        exploreContent.style.display = "block";
        return;
      }

      timeout = setTimeout(async () => {
        try {
          const data = await searchUsers(query);
          const users = data.users || [];

          searchResults.innerHTML =
            users.length === 0
              ? "<p>No users found</p>"
              : users
                  .map(
                    (u) => `
            <div onclick="visitUserProfile('${u._id}', '${escapeHtml(u.username)}')" style="padding: 12px; cursor: pointer; border-bottom: 1px solid #dbdbdb; display: flex; gap: 10px;">
              <img src="https://i.pravatar.cc/40?u=${u._id}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
              <div><div style="font-weight: 600;">${escapeHtml(u.username)}</div><div style="font-size: 12px; color: #8e8e8e;">${u.followers?.length || 0} followers</div></div>
            </div>
          `,
                  )
                  .join("");

          searchResults.style.display = "block";
          exploreContent.style.display = "none";
        } catch (e) {
          console.error("Search error:", e);
          searchResults.innerHTML = '<p style="color: red;">Search error</p>';
          searchResults.style.display = "block";
        }
      }, 300);
    });
  } catch (e) {
    console.error("Explore error:", e);
  }
}

function showMessagesSection() {
  try {
    const mainView = document.getElementById("main-view");
    mainView.innerHTML = `<div style="display: flex; height: 100%; background: white;"><div style="width: 300px; border-right: 1px solid #dbdbdb; display: flex; flex-direction: column; overflow: hidden;"><div style="padding: 16px; border-bottom: 1px solid #dbdbdb;"><h2 style="margin: 0; font-size: 24px; font-weight: 700;">Messages</h2></div><div id="conversationsList" style="flex: 1; overflow-y: auto; padding: 10px;"><div style="text-align: center; padding: 20px; color: #8e8e8e;"><i class="fas fa-spinner fa-spin"></i></div></div></div><div style="flex: 1; display: flex; flex-direction: column;" id="chatPanel"><div style="flex: 1; display: flex; align-items: center; justify-content: center; background: #fafafa; color: #8e8e8e;"><i class="fas fa-envelope" style="font-size: 64px; opacity: 0.5; margin-bottom: 20px; display: block;"></i><div>Select a conversation</div></div></div></div>`;
    loadConversations();
  } catch (e) {
    console.error("Messages error:", e);
  }
}

async function renderProfile(userId) {
  try {
    const mainView = document.getElementById("main-view");
    mainView.innerHTML =
      '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    const [profileRes, pubData] = await Promise.all([
      TokenHelper.fetchWithAuth(`/api/users/profile/${userId}`),
      loadUserPosts(userId),
    ]);

    if (!profileRes || !profileRes.ok) throw new Error("Profile error");

    const { user } = await profileRes.json();
    const pubs = pubData.publications || [];
    viewingUserId = userId;
    const isOwn = currentUser && String(userId) === String(currentUser.id);

    mainView.innerHTML = `
      <div style="max-width: 630px; margin: 0 auto;">
        <div style="background: white; border: 1px solid #dbdbdb; border-radius: 4px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <img src="https://i.pravatar.cc/100?u=${user.id}" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 20px; object-fit: cover;">
          <h2 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 700;">${escapeHtml(user.username)}</h2>
          <div style="display: flex; justify-content: center; gap: 40px; margin: 20px 0;">
            <div><div style="font-size: 20px; font-weight: 700;">${pubs.length}</div><div style="font-size: 12px; color: #8e8e8e;">Posts</div></div>
            <div><div style="font-size: 20px; font-weight: 700;">${user.followersCount || 0}</div><div style="font-size: 12px; color: #8e8e8e;">Followers</div></div>
            <div><div style="font-size: 20px; font-weight: 700;">${user.followingCount || 0}</div><div style="font-size: 12px; color: #8e8e8e;">Following</div></div>
          </div>
          ${!isOwn ? `<div style="display: flex; gap: 10px; justify-content: center;"><button onclick="toggleFollow('${user.id}')" style="background: ${user.isFollowing ? "#ed4956" : "#0095f6"}; color: white; border: none; padding: 8px 32px; border-radius: 4px; cursor: pointer; font-weight: 600;">${user.isFollowing ? "Unfollow" : "Follow"}</button><button onclick="openConversation('${user.id}', '${escapeHtml(user.username)}')" style="background: #f0f0f0; color: #000; border: 1px solid #dbdbdb; padding: 8px 32px; border-radius: 4px; cursor: pointer; font-weight: 600;">Message</button></div>` : ""}
        </div>
        <div style="background: white; border: 1px solid #dbdbdb; border-radius: 4px; padding: 20px;">
          <h3 style="margin: 0 0 20px 0; font-weight: 700;">Posts</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px;">
            ${
              pubs.length === 0
                ? '<p style="text-align: center; color: #8e8e8e; padding: 40px; grid-column: span 3;">No posts</p>'
                : pubs
                    .map(
                      (p) => `
              <div style="aspect-ratio: 1; overflow: hidden; background: #f0f0f0;">
                ${p.imageUrl ? `<img src="${p.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">` : '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #8e8e8e;">Text</div>'}
              </div>
            `,
                    )
                    .join("")
            }
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error("Profile error:", e);
    const mainView = document.getElementById("main-view");
    if (mainView)
      mainView.innerHTML =
        '<p style="color: red; padding: 20px;">Profile error</p>';
  }
}

// ============= SOCIAL HANDLERS =============
async function handleLike(postId) {
  try {
    if (!postId) return;
    const res = await TokenHelper.fetchWithAuth(
      `/api/publications/like/${postId}`,
      { method: "POST" },
    );
    if (res && res.ok) {
      viewingUserId ? renderProfile(viewingUserId) : loadPosts();
    } else {
      const err = res ? await res.json() : {};
      showToast(err.message || "Error al dar like", "error");
    }
  } catch (e) {
    console.error("Like error:", e);
    showToast("Error al dar like", "error");
  }
}

async function handleComment(postId) {
  try {
    if (!postId) return;
    const input = document.getElementById(`comment-${postId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) {
      showToast("Escribe un comentario antes de enviar", "error");
      return;
    }

    const res = await TokenHelper.fetchWithAuth(
      `/api/publications/comment/${postId}`,
      {
        method: "POST",
        body: JSON.stringify({ text }),
      },
    );
    if (res && res.ok) {
      input.value = "";
      showToast("Comentario publicado");
      viewingUserId ? renderProfile(viewingUserId) : loadPosts();
    } else {
      const err = res ? await res.json() : {};
      showToast(err.message || "Error al comentar", "error");
    }
  } catch (e) {
    console.error("Comment error:", e);
    showToast("Error al comentar", "error");
  }
}

async function deletePost(postId) {
  try {
    if (!postId || !confirm("¿Eliminar publicación?")) return;
    const res = await TokenHelper.fetchWithAuth(`/api/publications/${postId}`, {
      method: "DELETE",
    });
    if (res && res.ok) {
      showToast("Publicación eliminada");
      viewingUserId ? renderProfile(viewingUserId) : loadPosts();
    } else {
      const err = res ? await res.json() : {};
      showToast(err.message || "Error al eliminar", "error");
    }
  } catch (e) {
    console.error("Delete error:", e);
    showToast("Error al eliminar publicación", "error");
  }
}

async function toggleFollow(userId) {
  try {
    const res = await TokenHelper.fetchWithAuth(`/api/users/${userId}/follow`, {
      method: "POST",
    });
    if (res && res.ok) {
      const data = await res.json();
      showToast(data.message);
      renderProfile(userId);
    } else {
      const err = res ? await res.json() : {};
      showToast(err.message || "Error al seguir", "error");
    }
  } catch (e) {
    console.error("Follow error:", e);
    showToast("Error al cambiar seguimiento", "error");
  }
}

function visitUserProfile(userId, username) {
  viewingUserId = userId;
  renderProfile(userId);
}

async function loadConversations() {
  try {
    const res = await TokenHelper.fetchWithAuth("/api/messages");
    if (!res || !res.ok) throw new Error("Conversations error");
    const data = await res.json();
    const convList = document.getElementById("conversationsList");
    if (!convList) return;
    const convs = data.conversations || [];
    convList.innerHTML =
      convs.length === 0
        ? '<p style="text-align: center; color: #8e8e8e; padding: 20px;">No conversations</p>'
        : convs
            .map(
              (conv) => `
      <div onclick="openConversation('${conv.userId}', '${escapeHtml(conv.username)}')" style="padding: 12px; cursor: pointer; border-radius: 4px; margin-bottom: 8px; background: #f0f0f0;">
        <div style="font-weight: 600; color: #000;">${escapeHtml(conv.username)}</div>
        <div style="font-size: 12px; color: #8e8e8e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(conv.lastMessage || "")}</div>
      </div>
    `,
            )
            .join("");
  } catch (e) {
    console.error("Conversations error:", e);
  }
}

async function openConversation(userId, username) {
  try {
    if (!userId || !currentUser) {
      console.warn("Invalid user ID or current user not set");
      return;
    }

    // Primero, asegurarse que la sección de mensajes está visible
    // Esto crea el chatPanel si no existe
    viewingUserId = null;
    document
      .querySelectorAll(".nav-item")
      .forEach((item) => item.classList.remove("active"));
    document
      .querySelector('[data-section="messages"]')
      ?.classList.add("active");

    const mainView = document.getElementById("main-view");
    if (!mainView) {
      console.warn("Main view not found");
      return;
    }

    // Crear estructura de mensajes si no existe
    mainView.innerHTML = `
      <div style="display: flex; height: 100%; background: white;">
        <div style="width: 300px; border-right: 1px solid #dbdbdb; display: flex; flex-direction: column; overflow: hidden;">
          <div style="padding: 16px; border-bottom: 1px solid #dbdbdb;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 700;">Mensajes</h2>
          </div>
          <div id="conversationsList" style="flex: 1; overflow-y: auto; padding: 10px;">
            <div style="text-align: center; padding: 20px; color: #8e8e8e;">
              <i class="fas fa-spinner fa-spin"></i>
            </div>
          </div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column;" id="chatPanel"></div>
      </div>
    `;

    // Ahora sí, cargar la conversación
    const chatPanel = document.getElementById("chatPanel");
    const escapedUserId = String(userId).replace(/'/g, "\\'");
    const escapedUsername = escapeHtml(username || "User");

    chatPanel.innerHTML = `
      <div style="flex: 1; overflow-y: auto; padding: 20px; background: #fafafa;" id="messagesContainer">
        <div style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Cargando mensajes...</div>
      </div>
      <div style="padding: 16px; border-top: 1px solid #dbdbdb; display: flex; flex-direction: column; gap: 10px;">
        <input type="file" id="messageFile" accept="image/*,audio/*,video/*" style="width: 100%; padding: 10px; border: 1px solid #dbdbdb; border-radius: 4px;" title="Adjuntar archivo">
        <input type="text" id="messageInput" placeholder="Escribe un mensaje..." style="width: 100%; padding: 10px; border: 1px solid #dbdbdb; border-radius: 4px;">
        <button onclick="sendMessage('${escapedUserId}')" style="background: #0095f6; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: 600;">Enviar</button>
      </div>
    `;

    await loadMessages(userId);
    await loadConversations();
  } catch (e) {
    console.error("Open conversation error:", e);
    showToast("Error al abrir conversación", "error");
  }
}

async function loadMessages(userId) {
  try {
    if (!userId) throw new Error("User ID required");

    const res = await TokenHelper.fetchWithAuth(`/api/messages/${userId}`);
    if (!res) throw new Error("Server not responding");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const msgs = data.messages || [];
    const container = document.getElementById("messagesContainer");
    if (!container) return;

    if (msgs.length === 0) {
      container.innerHTML =
        '<div style="text-align: center; color: #8e8e8e; padding: 40px;">Comienza la conversación</div>';
      return;
    }

    container.innerHTML = msgs
      .map((msg) => {
        const isOwn = String(msg.sender._id) === String(currentUser.id);
        const contentHtml = msg.content
          ? `<div>${escapeHtml(msg.content)}</div>`
          : "";
        const mediaHtml = msg.mediaUrl
          ? `
        <div style="margin-top: 8px;">
          ${msg.mediaType === "image" ? `<img src="${escapeHtml(msg.mediaUrl)}" style="width: 100%; border-radius: 12px; max-height: 300px; object-fit: cover;">` : ""}
          ${msg.mediaType === "video" ? `<video controls src="${escapeHtml(msg.mediaUrl)}" style="width: 100%; max-height: 280px; border-radius: 12px;"></video>` : ""}
          ${msg.mediaType === "audio" ? `<audio controls src="${escapeHtml(msg.mediaUrl)}" style="width: 100%; margin-top: 8px;"></audio>` : ""}
          ${msg.mediaType === "file" ? `<a href="${escapeHtml(msg.mediaUrl)}" target="_blank" style="color: ${isOwn ? "white" : "#0095f6"}; text-decoration: underline;">${escapeHtml(msg.mediaName || "Descargar archivo")}</a>` : ""}
        </div>
      `
          : "";

        return `
        <div style="margin: 10px 0; display: flex; ${isOwn ? "justify-content: flex-end" : "justify-content: flex-start"};">
          <div style="background: ${isOwn ? "#0095f6" : "#e4e6eb"}; color: ${isOwn ? "white" : "black"}; padding: 10px 15px; border-radius: 18px; max-width: 70%; word-wrap: break-word;">
            ${contentHtml}
            ${mediaHtml}
          </div>
        </div>
      `;
      })
      .join("");
  } catch (e) {
    console.error("Load messages error:", e);
    const container = document.getElementById("messagesContainer");
    if (container) {
      container.innerHTML = `<div style="color: #ed4956; padding: 20px; text-align: center;">Error: ${escapeHtml(e.message)}</div>`;
    }
  }
}

async function sendMessage(userId) {
  try {
    const input = document.getElementById("messageInput");
    const fileInput = document.getElementById("messageFile");
    if (!input || !fileInput) return;

    const content = input.value.trim();
    const file = fileInput.files[0];

    if (!content && !file) {
      showToast("Escribe un mensaje o agrega un archivo", "error");
      return;
    }

    const formData = new FormData();
    formData.append("content", content);
    if (file) {
      formData.append("media", file);
    }

    const res = await TokenHelper.fetchWithAuth(`/api/messages/${userId}`, {
      method: "POST",
      body: formData,
    });

    if (!res) {
      showToast("Error de conexión", "error");
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || `Error: ${res.status}`, "error");
      return;
    }

    input.value = "";
    fileInput.value = "";
    await loadMessages(userId);
    showToast("Mensaje enviado");
  } catch (e) {
    console.error("Send message error:", e);
    showToast("Error al enviar mensaje", "error");
  }
}

// ============= STORIES FUNCTIONS =============
async function loadStories() {
  try {
    const res = await TokenHelper.fetchWithAuth("/api/stories");
    if (!res || !res.ok) throw new Error("Error loading stories");

    const data = await res.json();
    const storyGroups = data.stories || [];
    const container = document.getElementById("storiesContainer");

    if (!container) return;

    if (storyGroups.length === 0) {
      container.innerHTML =
        '<div style="text-align: center; padding: 20px; color: #8e8e8e; flex: 1;">No hay historias</div>';
      return;
    }

    container.innerHTML = storyGroups
      .map((group) => {
        const author = group.author;
        const storyCount = group.stories.length;
        const firstStory = group.stories[0];
        const hasViewed = firstStory.viewers.some(
          (v) => String(v._id || v) === String(currentUser.id),
        );

        return `
        <div onclick="openStoryViewer('${author._id}', '${escapeHtml(author.username)}')" style="
          flex: 0 0 auto;
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          cursor: pointer;
          position: relative;
          border: ${hasViewed ? "2px solid #dbdbdb" : "3px solid #0095f6"};
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2px;
        ">
          <img src="https://i.pravatar.cc/80?u=${author._id}" style="
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 3px solid white;
            object-fit: cover;
          ">
          <div style="
            position: absolute;
            bottom: -5px;
            font-size: 10px;
            background: white;
            padding: 2px 4px;
            border-radius: 10px;
            color: #000;
          ">${storyCount}</div>
        </div>
      `;
      })
      .join("");
  } catch (e) {
    console.error("Load stories error:", e);
    const container = document.getElementById("storiesContainer");
    if (container) {
      container.innerHTML =
        '<div style="color: #ed4956; padding: 20px;">Error al cargar historias</div>';
    }
  }
}

async function openStoryViewer(userId, username) {
  try {
    const res = await TokenHelper.fetchWithAuth(`/api/stories/user/${userId}`);
    if (!res || !res.ok) throw new Error("Error loading stories");

    const data = await res.json();
    const stories = data.stories || [];

    if (stories.length === 0) {
      showToast("No hay historias", "info");
      return;
    }

    // Crear modal de historias
    const modal = document.createElement("div");
    modal.id = "storyViewerModal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: black;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    let currentStoryIndex = 0;
    const updateStory = () => {
      const story = stories[currentStoryIndex];
      const isVideo = story.imageType === "video";

      modal.innerHTML = `
        <div style="
          width: 100%;
          max-width: 500px;
          height: 100%;
          max-height: 800px;
          position: relative;
          background: black;
        ">
          <div style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${
              isVideo
                ? `<video src="${escapeHtml(story.imageUrl)}" style="max-width: 100%; max-height: 100%; object-fit: contain;" autoplay></video>`
                : `<img src="${escapeHtml(story.imageUrl)}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`
            }
          </div>
          
          <div style="
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            z-index: 10001;
          ">
            <div style="display: flex; gap: 10px; align-items: center;">
              <img src="https://i.pravatar.cc/32?u=${userId}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
              <div>
                <div style="font-weight: 600;">${escapeHtml(username)}</div>
                <div style="font-size: 12px;">${formatTimeAgo(new Date(story.createdAt))}</div>
              </div>
            </div>
            <button onclick="document.getElementById('storyViewerModal').remove()" style="
              background: none;
              border: none;
              color: white;
              font-size: 24px;
              cursor: pointer;
            ">×</button>
          </div>
          
          <div style="
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            color: white;
            font-size: 12px;
          ">
            Visto por ${story.viewers.length} personas
          </div>
          
          <div style="
            position: absolute;
            top: 50%;
            left: 10px;
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.3);
            border: none;
            color: white;
            cursor: pointer;
            display: ${currentStoryIndex > 0 ? "flex" : "none"};
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transform: translateY(-50%);
          " onclick="document.getElementById('prevStory').click()">
            ‹
          </div>
          
          <div style="
            position: absolute;
            top: 50%;
            right: 10px;
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.3);
            border: none;
            color: white;
            cursor: pointer;
            display: ${currentStoryIndex < stories.length - 1 ? "flex" : "none"};
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transform: translateY(-50%);
          " onclick="document.getElementById('nextStory').click()">
            ›
          </div>
          
          <button id="prevStory" style="display: none;"></button>
          <button id="nextStory" style="display: none;"></button>
        </div>
      `;
    };

    document.body.appendChild(modal);

    // Agregar event listeners para navegación de historias
    const prevBtn = document.getElementById("prevStory");
    const nextBtn = document.getElementById("nextStory");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (currentStoryIndex > 0) {
          currentStoryIndex--;
          updateStory();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (currentStoryIndex < stories.length - 1) {
          currentStoryIndex++;
          updateStory();
        }
      });
    }

    updateStory();
  } catch (e) {
    console.error("Error opening story viewer:", e);
    showToast("Error al abrir historias", "error");
  }
}

async function publishStory() {
  try {
    const fileInput = document.getElementById("storyMedia");
    if (!fileInput || !fileInput.files[0]) {
      showToast("Selecciona una imagen o video", "error");
      return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("media", file);

    const btn = document.getElementById("publishStoryButton");
    const origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const res = await TokenHelper.fetchWithAuth("/api/stories", {
      method: "POST",
      body: formData,
    });

    if (!res || !res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Error al publicar historia", "error");
      return;
    }

    fileInput.value = "";
    showToast("Historia publicada");
    await loadStories();
  } catch (e) {
    console.error("Publish story error:", e);
    showToast("Error al publicar historia", "error");
  } finally {
    const btn = document.getElementById("publishStoryButton");
    btn.disabled = false;
    btn.innerHTML = origHTML;
  }
}

// ============= FEED SETUP =============
function setupFeedLogic() {
  try {
    const publishBtn = document.getElementById("publishButton");
    const pubText = document.getElementById("publicationText");
    const pubImage = document.getElementById("publicationImage");
    const publishStoryBtn = document.getElementById("publishStoryButton");

    if (!publishBtn) return;
    loadPosts();

    // Setup para publicar post
    publishBtn.onclick = async () => {
      try {
        const content = pubText.value.trim();
        if (!content) {
          showToast("Escribe algo antes de publicar", "error");
          return;
        }
        publishBtn.disabled = true;
        const origHTML = publishBtn.innerHTML;
        publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const formData = new FormData();
        formData.append("content", content);
        if (pubImage.files[0]) formData.append("image", pubImage.files[0]);
        const res = await TokenHelper.fetchWithAuth("/api/publications", {
          method: "POST",
          body: formData,
        });
        if (res && res.ok) {
          pubText.value = "";
          pubImage.value = "";
          await loadPosts();
          showToast("Publicado con éxito");
        } else {
          const err = res ? await res.json() : {};
          showToast(err.message || "Error al publicar", "error");
        }
      } catch (e) {
        console.error("Publish error:", e);
        showToast("Error de conexión", "error");
      } finally {
        publishBtn.disabled = false;
        publishBtn.innerHTML = origHTML;
      }
    };

    // Setup para publicar historia
    if (publishStoryBtn) {
      publishStoryBtn.onclick = publishStory;
    }
  } catch (e) {
    console.error("Feed setup error:", e);
  }
}

// ============= DOM READY =============
document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!window.location.pathname.includes("dashboard.html")) return;
    await initializeSession();

    document
      .querySelector('[data-section="feed"]')
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        showSection("feed");
      });
    document
      .querySelector('[data-section="explore"]')
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        showSection("explore");
      });
    document
      .querySelector('[data-section="profile"]')
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        showSection("profile");
      });
    document
      .querySelector('[data-section="messages"]')
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        showSection("messages");
      });

    const logoutBtn = document.getElementById("logoutButton");
    if (logoutBtn)
      logoutBtn.onclick = async () => {
        if (typeof FireAuth !== "undefined" && FireAuth) {
          try {
            await FireAuth.signOut();
          } catch (e) {
            console.warn("Firebase logout failed:", e);
          }
        }
        localStorage.removeItem("miapp_user");
        window.location.href = "/login.html";
      };

    const notificationsBtn = document.getElementById("notificationsButton");
    if (notificationsBtn) notificationsBtn.onclick = showNotificationsModal;

    setTimeout(() => {
      const first = document.querySelector(".nav-item");
      if (first) first.classList.add("active");
      showSection("feed");
    }, 100);

    // Cargar conteo de notificaciones no leídas
    loadNotificationCount();

    console.log("Dashboard ready");
  } catch (e) {
    console.error("Init error:", e);
  }
});

// ===================== NOTIFICATIONS FUNCTIONS =====================
async function showNotificationsModal() {
  const modal = document.getElementById("notificationsModal");
  if (!modal) {
    console.warn("Notifications modal not found");
    return;
  }

  modal.style.display = "flex";
  await loadNotifications();
}

function closeNotificationsModal() {
  const modal = document.getElementById("notificationsModal");
  if (modal) modal.style.display = "none";
}

async function loadNotifications() {
  const list = document.getElementById("notificationsList");
  const loading = document.getElementById("notificationsLoading");
  const noNotifications = document.getElementById("noNotifications");

  if (!list || !loading || !noNotifications) return;

  loading.style.display = "block";
  list.innerHTML = "";
  noNotifications.style.display = "none";

  try {
    const response = await TokenHelper.fetchWithAuth("/api/notifications");
    if (!response) throw new Error("No response from server");

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    loading.style.display = "none";

    if (!data.notifications || data.notifications.length === 0) {
      noNotifications.style.display = "block";
      updateNotificationBadge(0);
      return;
    }

    const unreadCount = data.notifications.filter((n) => !n.read).length;
    updateNotificationBadge(unreadCount);

    data.notifications.forEach((notification) => {
      const item = createNotificationItem(notification);
      list.appendChild(item);
    });
  } catch (error) {
    console.error("Error loading notifications:", error);
    loading.style.display = "none";
    list.innerHTML =
      '<div style="color: #ed4956; padding: 20px; text-align: center;">Error al cargar notificaciones</div>';
  }
}

function createNotificationItem(notification) {
  const item = document.createElement("div");
  item.className = `notification-item ${!notification.read ? "unread" : ""}`;
  item.style.cursor = "pointer";
  item.style.transition = "background-color 0.2s";
  item.onmouseover = () => {
    item.style.backgroundColor = "#f0f0f0";
  };
  item.onmouseout = () => {
    item.style.backgroundColor = notification.read ? "transparent" : "#e8f5fe";
  };

  // Navegar al hacer click en la notificación
  item.onclick = async (e) => {
    e.stopPropagation();
    await handleNotificationClick(notification);
  };

  const avatar = document.createElement("div");
  avatar.className = "notification-avatar";
  avatar.textContent = notification.sender.username.charAt(0).toUpperCase();

  const content = document.createElement("div");
  content.className = "notification-content";

  const text = document.createElement("div");
  text.className = "notification-text";

  let message = "";
  let icon = "";
  switch (notification.type) {
    case "like":
      message = `<strong>${escapeHtml(notification.sender.username)}</strong> le dio like a tu publicación`;
      icon = "❤️";
      break;
    case "comment":
      message = `<strong>${escapeHtml(notification.sender.username)}</strong> comentó en tu publicación`;
      icon = "💬";
      break;
    case "follow":
      message = `<strong>${escapeHtml(notification.sender.username)}</strong> comenzó a seguirte`;
      icon = "👤";
      break;
  }
  text.innerHTML = `<span>${icon}</span> ${message}`;

  const time = document.createElement("div");
  time.className = "notification-time";
  time.textContent = formatTimeAgo(new Date(notification.createdAt));

  content.appendChild(text);
  content.appendChild(time);

  item.appendChild(avatar);
  item.appendChild(content);

  return item;
}

// Manejo de click en notificación
async function handleNotificationClick(notification) {
  try {
    closeNotificationsModal();

    // Marcar como leída
    if (!notification.read) {
      await markNotificationAsRead(notification._id);
    }

    // Navegar según el tipo de notificación
    if (notification.type === "follow") {
      // Ir al perfil del usuario que nos sigue
      await visitUserProfile(
        notification.sender._id,
        notification.sender.username,
      );
    } else if (
      notification.type === "like" ||
      notification.type === "comment"
    ) {
      // Ir al post donde nos dieron like o comentaron
      if (notification.post) {
        viewingUserId = notification.post.author
          ? notification.post.author._id
          : null;
        if (viewingUserId) {
          await renderProfile(viewingUserId);
          // Scroll al post específico
          setTimeout(() => {
            const postElement = document.querySelector(
              `[data-post-id="${notification.post._id}"]`,
            );
            if (postElement) {
              postElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              postElement.style.animation = "pulse 0.5s ease-in-out";
            }
          }, 300);
        }
      }
    }
  } catch (e) {
    console.error("Error handling notification click:", e);
    showToast("Error al procesar notificación", "error");
  }
}

async function markNotificationAsRead(notificationId) {
  try {
    const response = await TokenHelper.fetchWithAuth(
      `/api/notifications/${notificationId}/read`,
      {
        method: "PUT",
      },
    );

    if (response && response.ok) {
      await loadNotifications();
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

async function markAllNotificationsAsRead() {
  try {
    const response = await TokenHelper.fetchWithAuth(
      "/api/notifications/read-all",
      {
        method: "PUT",
      },
    );

    if (response && response.ok) {
      await loadNotifications();
    }
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
}

function updateNotificationBadge(count) {
  const badge = document.getElementById("notificationBadge");
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${days}d`;
}

async function loadNotificationCount() {
  try {
    const response = await TokenHelper.fetchWithAuth("/api/notifications");
    if (!response || !response.ok)
      throw new Error("Failed to load notifications");

    const data = await response.json();
    if (data.notifications && Array.isArray(data.notifications)) {
      const unreadCount = data.notifications.filter((n) => !n.read).length;
      updateNotificationBadge(unreadCount);
    }
  } catch (error) {
    console.error("Error loading notification count:", error);
  }
}
