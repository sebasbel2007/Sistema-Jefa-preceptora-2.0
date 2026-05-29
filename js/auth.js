// ── AUTH GUARD ──
// Protege todas las páginas excepto index.html
function requireAuth() {
  auth.onAuthStateChanged(user => {
    if (!user) window.location.href = 'index.html';
  });
}

function showConfirm(mensaje, onConfirmar) {
  const overlay = document.createElement('div');
  overlay.id = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="edit-modal-overlay" onclick="document.getElementById('confirm-overlay').remove()">
      <div class="edit-modal" onclick="event.stopPropagation()" style="max-width:340px">
        <div style="font-size:15px;font-weight:700;margin-bottom:8px">Confirmar</div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:20px">${mensaje}</div>
        <div class="edit-modal-btns">
          <button class="btn-primary" style="background:var(--danger)" id="confirm-si">Eliminar</button>
          <button class="btn-secondary" onclick="document.getElementById('confirm-overlay').remove()">Cancelar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('confirm-si').onclick = () => {
    overlay.remove();
    onConfirmar();
  };
}

function logout() {
  showConfirm('¿Cerrar sesión?', () => {
    auth.signOut().then(() => window.location.href = 'index.html');
  });
}

// ── HELPERS GLOBALES ──

const MATERIAS = ['Literatura', 'Matemáticas', 'Física', 'Química', 'Historia'];

// Meses donde hay intensificación (0-indexed: 4=mayo, 5=junio, 7=agosto, 9=octubre)
const MESES_INTENSIFICACION = [4, 5, 7, 9];

// Devuelve el key del período de intensificación del mes dado (ej: "05" para junio)
function getPeriodoKey(fecha = new Date()) {
  return String(fecha.getMonth() + 1).padStart(2, '0');
}

// Próximo mes de intensificación desde una fecha dada
function getProximoMesIntens(fecha = new Date()) {
  const mes = fecha.getMonth();
  const anio = fecha.getFullYear();
  const futuros = MESES_INTENSIFICACION.filter(m => m > mes);
  if (futuros.length > 0) return new Date(anio, futuros[0], 1);
  return new Date(anio + 1, MESES_INTENSIFICACION[0], 1);
}

function esMesIntensificacion(fecha = new Date()) {
  return MESES_INTENSIFICACION.includes(fecha.getMonth());
}

function esSemanaIntensificacion(fecha = new Date()) {
  if (!esMesIntensificacion(fecha)) return false;
  return fecha.getDate() <= 14;
}

// Devuelve las fechas de inicio y fin de las 2 semanas de intensificación del mes dado
function getFechasIntensificacion(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes  = fecha.getMonth();
  const inicio = new Date(anio, mes, 1);
  const fin    = new Date(anio, mes, 14);
  return { inicio, fin };
}

function formatFecha(date) {
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

function getMesKey(fecha = new Date()) {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}`;
}

function getNombreMes(fecha = new Date()) {
  return fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function colorNota(n) {
  if (n === null || n === undefined || n === '') return '';
  if (n < 6) return 'baja';
  if (n < 8) return 'media';
  return 'alta';
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// Construye el bottom nav y el sidebar, marca el item activo
function buildNav(active) {
  const items = [
    { id: 'alumnos',  icon: 'img/buscar.png',        label: 'Buscar',  href: 'alumnos.html'    },
    { id: 'agregar',  icon: 'img/agregar.png',        label: 'Agregar', href: 'formulario.html' },
    { id: 'tablero',  icon: 'img/calendario.png',     label: 'Tablero', href: 'tablero.html'    },
    { id: 'salir',    icon: 'img/cerrar_sesion.png',  label: 'Salir',   href: '#'               },
  ];

  const logoutAttr = 'onclick="logout();return false;"';

  const nav = document.getElementById('bottom-nav');
  if (nav) {
    nav.innerHTML = items.map(it => `
      <a class="nav-item ${it.id === active ? 'active' : ''}"
         href="${it.href}" id="nav-${it.id}"
         ${it.id === 'salir' ? logoutAttr : ''}>
        <img class="nav-icon-img" src="${it.icon}" alt="${it.label}">
        ${it.label}
      </a>`).join('');
  }

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <img src="img/logo_escuela.png" alt="logo">
        <span>Sistema<br>Preceptora</span>
      </div>
      ${items.map(it => `
        <a class="nav-item ${it.id === active ? 'active' : ''}"
           href="${it.href}" id="snav-${it.id}"
           ${it.id === 'salir' ? logoutAttr : ''}>
          <img class="nav-icon-img" src="${it.icon}" alt="${it.label}">
          ${it.label}
        </a>`).join('')}
    `;
  }
}
