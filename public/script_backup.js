// ============= TOKEN HELPER =============
class TokenHelper {
  static getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  static async fetchWithAuth(url, options = {}) {
    try {
      let accessToken = this.getAccessToken();
      if (!accessToken) {
        window.location.href = 'login.html';
        return null;
      }

      let response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'x-auth-token': accessToken
        }
      });

      // Si token expiró (401), intentar refrescar
      if (response.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshRes = await fetch('/api/users/refresh-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken })
            });

            if (refreshRes.ok) {
              const data = await refreshRes.json();
              localStorage.setItem('accessToken', data.accessToken);
              
              response = await fetch(url, {
                ...options,
                headers: {
                  ...options.headers,
                  'x-auth-token': data.accessToken
                }
              });
            }
          } catch (error) {
            console.error('Error refreshing token:', error);
            window.location.href = 'login.html';
          }
        }
      }

      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      return null;
    }
  }
}

// ============= UTILITIES =============
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function parseJwt(token) {
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

// ============= GLOBAL STATE =============
let currentUser = null;

// ============= MAIN FUNCTIONS =============
async function loadPosts() {
  try {
    const res = await TokenHelper.fetchWithAuth('/api/publications');
    if (!res || !res.ok) throw new Error('Error al cargar publicaciones');
    
    const data = await res.json();
    const posts = Array.isArray(data.publications) ? data.publications : [];
    
    const pubList = document.getElementById('publicationsList');
    if (!pubList) return;
    
    if (posts.length === 0) {
      pubList.innerHTML = '<p style="text-align:center; padding: 40px; color: #8e8e8e;">No hay publicaciones aún. ¡Sé el primero!</p>';
      return;
    }
    
    pubList.innerHTML = posts.map(p => renderPostCard(p)).join('');
  } catch (e) { 
    console.error("Error loading posts:", e);
    const pubList = document.getElementById('publicationsList');
    if (pubList) {
      pubList.innerHTML = '<p style="text-align:center; color: red;">Error al conectar con el servidor.</p>';
    }
  }
}

function renderPostCard(p) {
  const hasLike = currentUser && p.likes && p.likes.includes(currentUser.id);
  const likesCount = p.likesCount || 0;
  const commentsCount = p.commentsCount || 0;
  const authorUsername = escapeHtml(p.author?.username || 'Usuario');
  const content = escapeHtml(p.content);
  const isAuthor = currentUser && p.author._id === currentUser.id;

  return `
    <div class="post-card">
      <div class="post-header">
        <div class="post-header-left">
          <div class="post-avatar">
            <div class="post-avatar-img">
              <img src="https://i.pravatar.cc/40?u=${escapeHtml(p.author?._id || 'user')}" alt="avatar">
            </div>
          </div>
          <div class="post-username">${authorUsername}</div>
        </div>
        ${isAuthor ? `<button class="delete-btn" onclick="deletePost('${p._id}')" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
      </div>
      
      ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" class="post-image" alt="Publicación">` : ''}
      
      <div class="post-content">
        <strong>${authorUsername}</strong> ${content}
      </div>
      
      <div class="post-actions">
        <i class="${hasLike ? 'fas liked' : 'far'} fa-heart" onclick="handleLike('${p._id}')" title="Like" style="cursor: pointer;"></i>
        <span style="font-size: 14px; color: #262626; margin-left: 5px;">${likesCount}</span>
        <i class="far fa-comment" style="margin-left: 10px; cursor: pointer;" title="Comentar"></i>
        <span style="font-size: 14px; color: #262626; margin-left: 5px;">${commentsCount}</span>
      </div>
      
      <div class="comments-section">
        <div class="comments-list">
          ${p.comments ? p.comments.map(c => `
            <div class="comment-item">
              <strong>${escapeHtml(c.username)}</strong> ${escapeHtml(c.text)}
            </div>
          `).join('') : ''}
        </div>
        <div class="comment-add">
          <input type="text" id="comment-${p._id}" placeholder="Añadir comentario..." maxlength="200">
          <button onclick="handleComment('${p._id}')">Publicar</button>
        </div>
      </div>
    </div>
  `;
}

function showSection(section) {
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  
  const mainView = document.getElementById('main-view');
  if (!mainView) return;

  if (section === 'feed') {
    // Mark as active
    document.querySelector('[data-section="feed"]')?.classList.add('active');
    
    mainView.innerHTML = `
      <div class="stories-container">
        <div class="story">
          <div class="story-circle">
            <div class="story-inner">
              <img src="https://i.pravatar.cc/150?u=${currentUser?.id || 'user1'}" alt="Tu historia">
            </div>
          </div>
          <span>Tu historia</span>
        </div>
        <div class="story">
          <div class="story-circle">
            <div class="story-inner">
              <img src="https://i.pravatar.cc/150?u=user2" alt="Profe Web">
            </div>
          </div>
          <span>profe_web</span>
        </div>
      </div>
      
      <div class="create-post">
        <textarea id="publicationText" placeholder="¿Qué estás pensando?" maxlength="500"></textarea>
        <input type="file" id="publicationImage" accept="image/*">
        <button id="publishButton" class="publish-button">
          <i class="fas fa-paper-plane"></i> Publicar
        </button>
      </div>
      
      <div id="publicationsList">
        <div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando publicaciones...</div>
      </div>
    `;
    setupFeedLogic();
  } else if (section === 'explore') {
    document.querySelector('[data-section="explore"]')?.classList.add('active');
    mainView.innerHTML = `
      <div style="text-align:center; padding: 60px 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px; color: white; margin-bottom: 30px;">
          <i class="fas fa-compass" style="font-size: 48px; margin-bottom: 20px; display: block;"></i>
          <h2>Explorar</h2>
          <p style="margin: 0; opacity: 0.9;">Descubre contenido de otros usuarios</p>
        </div>
        <p style="color: #8e8e8e; font-size: 18px;">Pronto podrás explorar publicaciones de toda la comunidad 🚀</p>
        <button onclick="showSection('feed')" style="background: #0095f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 20px; font-weight: 600;">Volver al Feed</button>
      </div>
    `;
  } else if (section === 'profile') {
    document.querySelector('[data-section="profile"]')?.classList.add('active');
    renderProfile();
  } else if (section === 'messages') {
    document.querySelector('[data-section="messages"]')?.classList.add('active');
    mainView.innerHTML = `
      <div style="display: flex; height: calc(100vh - 160px);">
        <div style="width: 300px; background: white; border-right: 1px solid #dbdbdb; display: flex; flex-direction: column;">
          <div style="padding: 16px; border-bottom: 1px solid #dbdbdb;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 700;">Mensajes</h2>
          </div>
          <div style="flex: 1; overflow-y: auto; padding: 10px;">
            <div style="padding: 12px; border-radius: 8px; background: #f0f0f0; margin-bottom: 10px; cursor: pointer;">
              <div style="font-weight: 600; margin-bottom: 4px;">Usuario 1</div>
              <div style="font-size: 13px; color: #8e8e8e;">Último mensaje...</div>
            </div>
            <div style="padding: 12px; border-radius: 8px; background: #f0f0f0; margin-bottom: 10px; cursor: pointer;">
              <div style="font-weight: 600; margin-bottom: 4px;">Usuario 2</div>
              <div style="font-size: 13px; color: #8e8e8e;">Último mensaje...</div>
            </div>
          </div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #fafafa;">
          <i class="fas fa-envelope" style="font-size: 64px; color: #dbdbdb; margin-bottom: 20px;"></i>
          <h3 style="color: #8e8e8e; margin: 0;">Selecciona una conversación</h3>
          <p style="color: #8e8e8e; font-size: 14px; margin-top: 8px;">o comienza una nueva conversación</p>
        </div>
      </div>
    `;
  }
}

function renderProfile() {
  const mainView = document.getElementById('main-view');
  if (!mainView || !currentUser) return;

  const profileHTML = `
    <div style="background: white; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
      <!-- Header del perfil -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 200px; position: relative;">
        <div style="position: absolute; bottom: -50px; left: 50%; transform: translateX(-50%); width: 100px; height: 100px; border-radius: 50%; background: white; border: 4px solid white; display: flex; align-items: center; justify-content: center;">
          <img src="https://i.pravatar.cc/100?u=${currentUser.id}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="Avatar">
        </div>
      </div>
      
      <!-- Info del perfil -->
      <div style="padding: 60px 20px 20px 20px; text-align: center;">
        <h2 style="margin: 0 0 5px 0; font-size: 24px; font-weight: 700;">${escapeHtml(currentUser.name || 'Usuario')}</h2>
        <p style="margin: 0; color: #8e8e8e; font-size: 14px;">${escapeHtml(currentUser.email || 'Sin email')}</p>
        
        <div style="display: flex; justify-content: center; gap: 40px; margin: 20px 0; padding: 20px 0; border-top: 1px solid #dbdbdb; border-bottom: 1px solid #dbdbdb;">
          <div>
            <div style="font-size: 20px; font-weight: 700;">0</div>
            <div style="font-size: 12px; color: #8e8e8e;">Publicaciones</div>
          </div>
          <div>
            <div style="font-size: 20px; font-weight: 700;">0</div>
            <div style="font-size: 12px; color: #8e8e8e;">Seguidores</div>
          </div>
          <div>
            <div style="font-size: 20px; font-weight: 700;">0</div>
            <div style="font-size: 12px; color: #8e8e8e;">Seguidos</div>
          </div>
        </div>
        
        <button onclick="alert('Funcionalidad de editar perfil próximamente')" style="background: #0095f6; color: white; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-top: 10px;">Editar perfil</button>
      </div>
    </div>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 15px 0; font-weight: 700;">Mis Publicaciones</h3>
      <div id="userPublications" style="text-align: center; color: #8e8e8e; padding: 40px;">
        <i class="fas fa-image" style="font-size: 48px; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
        <p>Aún no has publicado nada</p>
      </div>
    </div>
  `;

  mainView.innerHTML = profileHTML;
}

function setupFeedLogic() {
  const publishBtn = document.getElementById('publishButton');
  const pubText = document.getElementById('publicationText');
  const pubImage = document.getElementById('publicationImage');

  if (!publishBtn) return;

  loadPosts();

  publishBtn.onclick = async () => {
    const content = pubText.value.trim();
    if (!content) {
      alert('Por favor escribe algo antes de publicar');
      return;
    }

    publishBtn.disabled = true;
    const originalHTML = publishBtn.innerHTML;
    publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';

    const formData = new FormData();
    formData.append('content', content);
    if (pubImage.files[0]) formData.append('image', pubImage.files[0]);

    try {
      const res = await TokenHelper.fetchWithAuth('/api/publications', {
        method: 'POST',
        body: formData
      });

      if (res && res.ok) {
        pubText.value = '';
        pubImage.value = '';
        await loadPosts();
      } else {
        const error = res ? await res.json() : {};
        alert('Error al publicar: ' + (error.message || 'Intenta de nuevo'));
      }
    } catch (e) { 
      console.error('Error:', e);
      alert('Error de conexión. Intenta de nuevo.');
    } finally {
      publishBtn.disabled = false;
      publishBtn.innerHTML = originalHTML;
    }
  };
}

// ============= GLOBAL HANDLERS =============
async function handleLike(postId) {
  if (!postId) {
    console.error('Error: postId no definido');
    alert('Error al procesar like');
    return;
  }
  
  try {
    const res = await TokenHelper.fetchWithAuth(`/api/publications/like/${postId}`, {
      method: 'POST'
    });
    if (res && res.ok) {
      await loadPosts();
    } else {
      const error = res ? await res.json() : {};
      console.error('Error en like:', error);
      alert('Error al procesar like: ' + (error.message || 'Intenta de nuevo'));
    }
  } catch (e) { 
    console.error('Error:', e);
    alert('Error de conexión');
  }
}

async function handleComment(postId) {
  if (!postId) {
    console.error('Error: postId no definido');
    alert('Error al procesar comentario');
    return;
  }

  const input = document.getElementById(`comment-${postId}`);
  if (!input) {
    console.error(`Input no encontrado: comment-${postId}`);
    return;
  }
  
  const text = input.value.trim();
  if (!text) {
    alert('Por favor escribe un comentario');
    return;
  }

  try {
    const res = await TokenHelper.fetchWithAuth(`/api/publications/comment/${postId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (res && res.ok) {
      input.value = '';
      await loadPosts();
    } else {
      const error = res ? await res.json() : {};
      alert('Error: ' + (error.message || 'No se pudo comentar'));
    }
  } catch (e) { 
    console.error('Error:', e);
    alert('Error de conexión');
  }
}

async function deletePost(postId) {
  if (!postId) {
    console.error('Error: postId no definido');
    alert('Error al procesar eliminación');
    return;
  }

  if (!confirm('¿Estás seguro de que quieres eliminar esta publicación?')) {
    return;
  }

  try {
    const res = await TokenHelper.fetchWithAuth(`/api/publications/${postId}`, {
      method: 'DELETE'
    });
    if (res && res.ok) {
      await loadPosts();
      alert('Publicación eliminada ✓');
    } else {
      const error = res ? await res.json() : {};
      alert('Error: ' + (error.message || 'No se pudo eliminar'));
    }
  } catch (e) { 
    console.error('Error:', e);
    alert('Error de conexión');
  }
}

// ============= INITIALIZATION =============
document.addEventListener('DOMContentLoaded', () => {
  const accessToken = localStorage.getItem('accessToken');
  
  // Verificar autenticación
  if (window.location.pathname.includes('dashboard.html') && !accessToken) {
    window.location.href = 'login.html';
    return;
  }

  // Extraer datos del usuario actual del JWT
  if (accessToken) {
    const decoded = parseJwt(accessToken);
    if (decoded && decoded.id) {
      currentUser = {
        id: decoded.id,
        name: decoded.username || 'Usuario',
        email: decoded.email || ''
      };
    }
  }

  // Si estamos en dashboard, setup eventos
  if (window.location.pathname.includes('dashboard.html')) {
    // Marcas activos los nav items
    const feedNav = document.querySelector('[data-section="feed"]');
    const exploreNav = document.querySelector('[data-section="explore"]');
    const profileNav = document.querySelector('[data-section="profile"]');
    const messagesNav = document.querySelector('[data-section="messages"]');

    if (feedNav) feedNav.addEventListener('click', (e) => {
      e.preventDefault();
      showSection('feed');
    });
    if (exploreNav) exploreNav.addEventListener('click', (e) => {
      e.preventDefault();
      showSection('explore');
    });
    if (profileNav) profileNav.addEventListener('click', (e) => {
      e.preventDefault();
      showSection('profile');
    });
    if (messagesNav) messagesNav.addEventListener('click', (e) => {
      e.preventDefault();
      showSection('messages');
    });

    // Marcar primero como activo y cargar feed
    const firstNavItem = document.querySelector('.nav-item');
    if (firstNavItem) firstNavItem.classList.add('active');
    showSection('feed');
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutButton');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = 'login.html';
    };
  }
});