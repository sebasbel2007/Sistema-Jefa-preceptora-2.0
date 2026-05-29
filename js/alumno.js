requireAuth();

const params  = new URLSearchParams(window.location.search);
const alumnoId = params.get('id');
const hoy = new Date();
const mesKey  = getMesKey(hoy);
const periodoActual = getPeriodoKey(hoy);
const intensificaActivo = esSemanaIntensificacion(hoy);
const mesEsIntens       = esMesIntensificacion(hoy);

const PERIODOS = [
  { key: '04', label: 'Mayo'    },
  { key: '05', label: 'Junio'   },
  { key: '07', label: 'Agosto'  },
  { key: '09', label: 'Octubre' },
];

let alumnoData = null;

document.addEventListener('DOMContentLoaded', async () => {
  buildNav('');
  if (!alumnoId) { window.location.href = 'alumnos.html'; return; }
  await recargar();
});

async function recargar() {
  const doc = await db.collection('alumnos').doc(alumnoId).get();
  if (!doc.exists) { window.location.href = 'alumnos.html'; return; }
  alumnoData = { id: doc.id, ...doc.data() };
  renderPerfil(alumnoData);
}

function renderPerfil(a) {
  document.getElementById('perfil-nombre').textContent = `${a.nombre}, ${a.apellido}`;
  document.getElementById('perfil-anio').textContent   = `${a.anio}° año · División ${a.division}`;
  document.title = `${a.nombre} ${a.apellido}`;

  renderAsistencia(a);
  renderNotas(a);
  renderRecursa(a);
  renderIntensificacion(a);

  document.getElementById('btn-editar').href = `formulario.html?id=${a.id}`;
}

// ── RENDER SECCIONES ──

function renderAsistencia(a) {
  const asist = a.asistencia?.[mesKey];
  const cont  = document.getElementById('asist-cont');
  if (!asist) { cont.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Sin datos de asistencia este mes</p>'; return; }
  const pct = Math.round((asist.presentes / 20) * 100);
  const cls = pct >= 80 ? '' : pct >= 60 ? 'warn' : 'danger';
  cont.innerHTML = `
    <div class="asist-bar-wrap">
      <div class="asist-bar-bg">
        <div class="asist-bar-fill ${cls}" style="width:${pct}%"></div>
      </div>
      <div class="asist-nums">
        <span>${asist.presentes} presentes · ${asist.ausentes} ausentes</span>
        <span>${pct}%</span>
      </div>
    </div>`;
}

function renderNotas(a) {
  const cont = document.getElementById('notas-cont');
  const materiasActuales = a.materias?.filter(m => !m.recursa) || [];
  if (!materiasActuales.length) { cont.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Sin materias del año actual</p>'; return; }
  cont.innerHTML = tablaNotas(materiasActuales);
}

function renderRecursa(a) {
  const materiasRec = a.materias?.filter(m => m.recursa) || [];
  const section = document.getElementById('section-recursa');
  if (!materiasRec.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  document.getElementById('recursa-cont').innerHTML = `
    ${tablaNotas(materiasRec, true)}
    <p style="font-size:11px;color:var(--text-muted);margin-top:8px">📌 Materia del año anterior cursada en reemplazo del año actual</p>`;
}

function tablaNotas(materias, mostrarAnio = false) {
  return `
    <table class="notas-table">
      <thead>
        <tr>
          <th>Materia</th>
          ${mostrarAnio ? '<th>Año</th>' : ''}
          <th>Inf.1</th><th>NF1</th><th>Inf.2</th><th>NF2</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${materias.map(m => {
          const idxReal = alumnoData.materias.indexOf(m);
          return `
          <tr>
            <td>${m.nombre}</td>
            ${mostrarAnio ? `<td><span class="badge badge-warning">${m.anio}°</span></td>` : ''}
            ${['inf1','nf1','inf2','nf2'].map(k => {
              const v = m[k];
              if (v === null || v === undefined || v === '') return `<td><span class="nota-empty">—</span></td>`;
              return `<td><span class="nota-val ${colorNota(v)}">${v}</span></td>`;
            }).join('')}
            <td><button class="section-edit-btn" style="margin:0" onclick="editarMateria(${idxReal})"><img src="img/editar.png" style="width:13px;height:13px;object-fit:contain"></button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function renderIntensificacion(a) {
  const intens = a.intensifica || [];
  const section = document.getElementById('section-intens');
  if (!intens.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  const cont = document.getElementById('intens-cont');
  cont.innerHTML = intens.map((item, idx) => {
    const notasHtml = PERIODOS.map(p => {
      const nota = item.notas?.[p.key];
      const esCurrent = mesEsIntens && periodoActual === p.key;
      const notaHtml = nota !== undefined
        ? `<span class="nota-val ${colorNota(nota)}">${nota}</span>`
        : (esCurrent && intensificaActivo ? '<span class="badge badge-warning">En curso</span>' : '<span class="nota-empty">—</span>');
      return `
        <div class="periodo-item ${esCurrent ? 'periodo-activo' : ''}">
          <span class="periodo-label">${p.label}</span>
          ${notaHtml}
        </div>`;
    }).join('');

    return `
      <div class="intens-item">
        <div class="intens-item-header">
          <span class="intens-materia">${item.materia}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge badge-warning">${item.anio_origen}° año</span>
            <button class="section-edit-btn" onclick="editarIntensificacion(${idx})">
              <img src="img/editar.png" style="width:14px;height:14px;object-fit:contain">
            </button>
          </div>
        </div>
        <div class="periodos-grid">${notasHtml}</div>
      </div>`;
  }).join('');
}

// ── EDICIÓN INLINE POR SECCIÓN ──

function editarSeccion(seccion) {
  const a = alumnoData;
  let html = '';

  if (seccion === 'asistencia') {
    const asist = a.asistencia?.[mesKey];
    const presentes = asist?.presentes ?? '';
    html = `
      <div class="edit-modal-overlay" onclick="cerrarModal()">
        <div class="edit-modal" onclick="event.stopPropagation()">
          <div class="edit-modal-titulo">
            <img src="img/calendario.png" style="width:18px;height:18px;object-fit:contain"> Asistencia del mes
          </div>
          <div class="form-group">
            <label>Días asistidos (sobre 20)</label>
            <input type="number" id="edit-presentes" value="${presentes}" min="0" max="20" placeholder="Ej: 17">
          </div>
          <div class="edit-modal-btns">
            <button class="btn-primary" onclick="guardarAsistencia()">Guardar</button>
            <button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>
          </div>
        </div>
      </div>`;

  } else if (seccion === 'materias') {
    // ya no se usa — reemplazado por editarMateria(idx)
    return;
  } else if (seccion === 'recursa') {
    // ya no se usa — reemplazado por editarMateria(idx)
    return;
  } else if (seccion === 'intensificacion') {
    // ya no se usa — reemplazado por editarIntensificacion(idx)
    return;
  } else if (seccion === 'datos_personales') {
    html = `
      <div class="edit-modal-overlay" onclick="cerrarModal()">
        <div class="edit-modal" onclick="event.stopPropagation()">
          <div class="edit-modal-titulo">
            <img src="img/editar.png" style="width:18px;height:18px;object-fit:contain"> Datos personales
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Nombre</label>
              <input type="text" id="edit-nombre" value="${a.nombre || ''}">
            </div>
            <div class="form-group">
              <label>Apellido</label>
              <input type="text" id="edit-apellido" value="${a.apellido || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Año actual</label>
              <select id="edit-anio">
                ${[1,2,3,4,5,6,7].map(n => `<option value="${n}" ${a.anio === n ? 'selected' : ''}>${n}°</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>División</label>
              <select id="edit-division">
                ${[1,2,3].map(n => `<option value="${n}" ${a.division === n ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="edit-modal-btns">
            <button class="btn-primary" onclick="guardarDatosPersonales()">Guardar</button>
            <button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>
          </div>
        </div>
      </div>`;

  } else if (seccion === 'intensificacion') {
    const intens = a.intensifica || [];
    html = `
      <div class="edit-modal-overlay" onclick="cerrarModal()">
        <div class="edit-modal edit-modal-wide" onclick="event.stopPropagation()">
          <div class="edit-modal-titulo">
            <img src="img/multitud.png" style="width:18px;height:18px;object-fit:contain"> Notas — Intensificación
          </div>
          ${intens.map((item, idx) => `
            <div style="margin-bottom:16px">
              <div style="font-weight:700;font-size:13px;margin-bottom:8px;display:flex;align-items:center;gap:6px">
                <img src="img/multitud.png" style="width:16px;height:16px;object-fit:contain">
                ${item.materia} <span class="badge badge-warning">${item.anio_origen}°</span>
              </div>
              <div class="materia-notas-grid">
                ${PERIODOS.map(p => `
                  <div class="form-group" style="margin:0">
                    <label>${p.label}</label>
                    <input type="number" id="ei-${idx}-${p.key}" value="${item.notas?.[p.key] ?? ''}" placeholder="1-10" min="1" max="10">
                  </div>`).join('')}
              </div>
            </div>`).join('')}
          <div class="edit-modal-btns">
            <button class="btn-primary" onclick="guardarIntensificacion()">Guardar</button>
            <button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>
          </div>
        </div>
      </div>`;
  }

  const overlay = document.createElement('div');
  overlay.id = 'edit-overlay-root';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

function cerrarModal() {
  document.getElementById('edit-overlay-root')?.remove();
}

// ── GUARDAR CAMBIOS ──

function editarMateria(idx) {
  const m = alumnoData.materias[idx];
  const icono = m.recursa ? 'ciclo.png' : 'materias.png';
  const overlay = document.createElement('div');
  overlay.id = 'edit-overlay-root';
  overlay.innerHTML = `
    <div class="edit-modal-overlay" onclick="cerrarModal()">
      <div class="edit-modal" onclick="event.stopPropagation()">
        <div class="edit-modal-titulo">
          <img src="img/${icono}" style="width:18px;height:18px;object-fit:contain">
          ${m.nombre} ${m.recursa ? `<span class="badge badge-warning">${m.anio}°</span>` : ''}
        </div>
        <div class="materia-notas-grid">
          <div class="form-group" style="margin:0">
            <label>Informe 1</label>
            <input type="number" id="em-inf1" value="${m.inf1 ?? ''}" placeholder="1-10" min="1" max="10">
          </div>
          <div class="form-group" style="margin:0">
            <label>Nota Final 1</label>
            <input type="number" id="em-nf1" value="${m.nf1 ?? ''}" placeholder="1-10" min="1" max="10">
          </div>
          <div class="form-group" style="margin:0">
            <label>Informe 2</label>
            <input type="number" id="em-inf2" value="${m.inf2 ?? ''}" placeholder="1-10" min="1" max="10">
          </div>
          <div class="form-group" style="margin:0">
            <label>Nota Final 2</label>
            <input type="number" id="em-nf2" value="${m.nf2 ?? ''}" placeholder="1-10" min="1" max="10">
          </div>
        </div>
        <div class="edit-modal-btns">
          <button class="btn-primary" onclick="guardarMateria(${idx})">Guardar</button>
          <button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function guardarMateria(idx) {
  const materias = [...alumnoData.materias];
  materias[idx] = {
    ...materias[idx],
    inf1: parseFloat(document.getElementById('em-inf1').value) || null,
    nf1:  parseFloat(document.getElementById('em-nf1').value)  || null,
    inf2: parseFloat(document.getElementById('em-inf2').value) || null,
    nf2:  parseFloat(document.getElementById('em-nf2').value)  || null,
  };
  await db.collection('alumnos').doc(alumnoId).update({ materias });
  showToast('Notas guardadas');
  cerrarModal();
  await recargar();
}

function editarIntensificacion(idx) {
  const item = alumnoData.intensifica[idx];
  const overlay = document.createElement('div');
  overlay.id = 'edit-overlay-root';
  overlay.innerHTML = `
    <div class="edit-modal-overlay" onclick="cerrarModal()">
      <div class="edit-modal" onclick="event.stopPropagation()">
        <div class="edit-modal-titulo">
          <img src="img/multitud.png" style="width:18px;height:18px;object-fit:contain">
          ${item.materia} <span class="badge badge-warning">${item.anio_origen}°</span>
        </div>
        <div class="materia-notas-grid">
          ${PERIODOS.map(p => `
            <div class="form-group" style="margin:0">
              <label>${p.label}</label>
              <input type="number" id="ei-${p.key}" value="${item.notas?.[p.key] ?? ''}" placeholder="1-10" min="1" max="10">
            </div>`).join('')}
        </div>
        <div class="edit-modal-btns">
          <button class="btn-primary" onclick="guardarUnaIntensificacion(${idx})">Guardar</button>
          <button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function guardarUnaIntensificacion(idx) {
  const intens = [...alumnoData.intensifica];
  intens[idx] = {
    ...intens[idx],
    notas: PERIODOS.reduce((acc, p) => {
      const v = parseFloat(document.getElementById(`ei-${p.key}`)?.value);
      if (!isNaN(v)) acc[p.key] = v;
      return acc;
    }, {}),
  };
  await db.collection('alumnos').doc(alumnoId).update({ intensifica: intens });
  showToast('Notas guardadas');
  cerrarModal();
  await recargar();
}

async function guardarDatosPersonales() {
  const nombre   = document.getElementById('edit-nombre').value.trim();
  const apellido = document.getElementById('edit-apellido').value.trim();
  const anio     = parseInt(document.getElementById('edit-anio').value);
  const division = parseInt(document.getElementById('edit-division').value);
  if (!nombre || !apellido) { showToast('Completá nombre y apellido'); return; }
  await db.collection('alumnos').doc(alumnoId).update({ nombre, apellido, anio, division });
  showToast('Datos guardados');
  cerrarModal();
  await recargar();
}

async function guardarAsistencia() {
  const presentes = parseInt(document.getElementById('edit-presentes').value);
  if (isNaN(presentes) || presentes < 0 || presentes > 20) { showToast('Ingresá un valor entre 0 y 20'); return; }
  await db.collection('alumnos').doc(alumnoId).update({
    [`asistencia.${mesKey}`]: { presentes, ausentes: 20 - presentes }
  });
  showToast('Asistencia guardada');
  cerrarModal();
  await recargar();
}

