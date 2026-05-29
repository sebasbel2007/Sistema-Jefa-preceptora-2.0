requireAuth();

const params   = new URLSearchParams(window.location.search);
const editId   = params.get('id');
const esEditar = !!editId;
const hoy      = new Date();
const mesKey   = getMesKey(hoy);

const PERIODOS = [
  { key: '04', label: 'Mayo'    },
  { key: '05', label: 'Junio'   },
  { key: '07', label: 'Agosto'  },
  { key: '09', label: 'Octubre' },
];

let intensItems = [];

document.addEventListener('DOMContentLoaded', async () => {
  buildNav(esEditar ? '' : 'agregar');
  document.getElementById('form-titulo').innerHTML = esEditar
    ? '<img src="img/editar.png" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px"> Editar alumno'
    : '<img src="img/agregar.png" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px"> Nuevo alumno';
  document.getElementById('btn-guardar').textContent = esEditar ? 'GUARDAR CAMBIOS' : 'GUARDAR ALUMNO';

  document.getElementById('f-anio').addEventListener('change', () => {
    renderMaterias();
    renderIntens();
  });

  if (esEditar) {
    document.getElementById('btn-eliminar').style.display = 'block';
    await cargarDatosEditar();
  } else {
    renderMaterias();
    renderIntens();
  }

  document.getElementById('btn-guardar').addEventListener('click', guardar);
  document.getElementById('btn-eliminar').addEventListener('click', eliminar);
  document.getElementById('btn-add-intens').addEventListener('click', agregarIntens);
});

function getAnioAlumno() {
  return parseInt(document.getElementById('f-anio').value) || 0;
}

// ── MATERIAS ──
// Al crear: solo checkbox de recursa. Al editar: notas completas.
function renderMaterias(materiasData = []) {
  const anio = getAnioAlumno();
  const cont = document.getElementById('materias-cont');
  if (!anio) { cont.innerHTML = '<p style="font-size:13px;color:var(--text-muted)">Seleccioná el año primero</p>'; return; }

  cont.innerHTML = MATERIAS.map((mat, i) => {
    const m = materiasData[i] || {};
    const anioMat = m.anio || anio;
    const recursa = m.recursa || false;

    if (esEditar) {
      const opts = Array.from({ length: anio }, (_, k) => k + 1)
        .map(a => `<option value="${a}" ${anioMat === a ? 'selected' : ''}>${a}°</option>`)
        .join('');
      return `
        <div class="materia-block">
          <div class="materia-block-header">
            <div class="materia-block-title"><img src="img/materias.png" alt="" style="width:35px;height:35px;object-fit:contain;vertical-align:middle;margin-right:6px"> ${mat}</div>
            <div class="form-group" style="margin:0;min-width:80px">
              <label>Año</label>
              <select id="m${i}-anio" class="materia-anio-sel">${opts}</select>
            </div>
          </div>
          <div class="materia-notas-grid">
            <div class="form-group">
              <label>Informe 1</label>
              <input type="number" id="m${i}-inf1" value="${m.inf1 ?? ''}" placeholder="1-10" min="1" max="10">
            </div>
            <div class="form-group">
              <label>Nota Final 1</label>
              <input type="number" id="m${i}-nf1" value="${m.nf1 ?? ''}" placeholder="1-10" min="1" max="10">
            </div>
            <div class="form-group">
              <label>Informe 2</label>
              <input type="number" id="m${i}-inf2" value="${m.inf2 ?? ''}" placeholder="1-10" min="1" max="10">
            </div>
            <div class="form-group">
              <label>Nota Final 2</label>
              <input type="number" id="m${i}-nf2" value="${m.nf2 ?? ''}" placeholder="1-10" min="1" max="10">
            </div>
          </div>
        </div>`;
    } else {
      // Al crear: solo nombre + toggle recursa
      return `
        <div class="materia-block materia-block-simple">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:10px">
              <img src="img/materias.png" alt="" style="width:28px;height:28px;object-fit:contain">
              <span style="font-weight:700;font-size:14px">${mat}</span>
            </div>
            <label class="toggle-recursa">
              <input type="checkbox" id="m${i}-recursa" ${recursa ? 'checked' : ''}>
              <span class="toggle-track"></span>
              <span class="toggle-label">Recursa</span>
            </label>
          </div>
        </div>`;
    }
  }).join('');
}

// ── INTENSIFICACIÓN ──
// Al crear: solo materia + año. Al editar: materia + año + notas por período.
function renderIntens(data = null) {
  if (data) intensItems = data;
  const cont = document.getElementById('intens-cont');
  if (intensItems.length === 0) {
    cont.innerHTML = '<p style="font-size:13px;color:var(--text-muted);margin-bottom:8px">Sin materias de intensificación</p>';
    return;
  }
  const anioAlumno = getAnioAlumno();
  cont.innerHTML = intensItems.map((item, idx) => {
    const matOpts = MATERIAS.map(m => `<option value="${m}" ${item.materia === m ? 'selected' : ''}>${m}</option>`).join('');
    const maxAnio = anioAlumno > 1 ? anioAlumno - 1 : 1;
    const anioOpts = Array.from({ length: maxAnio }, (_, k) => k + 1)
      .map(a => `<option value="${a}" ${item.anio_origen === a ? 'selected' : ''}>${a}°</option>`)
      .join('');

    const notasHtml = esEditar ? PERIODOS.map(p => `
      <div class="form-group">
        <label>${p.label}</label>
        <input type="number" id="intens${idx}-${p.key}" value="${item.notas?.[p.key] ?? ''}" placeholder="1-10" min="1" max="10">
      </div>`).join('') : '';

    return `
      <div class="materia-block" id="intens-block-${idx}">
        <div class="materia-block-header">
          <div class="form-group" style="flex:1;margin:0">
            <label>Materia</label>
            <select id="intens${idx}-materia">${matOpts}</select>
          </div>
          <div class="form-group" style="min-width:80px;margin:0">
            <label>Año origen</label>
            <select id="intens${idx}-anio">${anioOpts}</select>
          </div>
          <button class="btn-remove" onclick="quitarIntens(${idx})">✕</button>
        </div>
        ${esEditar && notasHtml ? `
          <div class="intens-notas-label">Notas por período:</div>
          <div class="materia-notas-grid">${notasHtml}</div>` : ''}
      </div>`;
  }).join('');
}

function agregarIntens() {
  if (intensItems.length >= 4) { showToast('Máximo 4 materias de intensificación'); return; }
  const anioAlumno = getAnioAlumno();
  if (!anioAlumno) { showToast('Seleccioná el año del alumno primero'); return; }
  intensItems.push({ materia: MATERIAS[0], anio_origen: Math.max(1, anioAlumno - 1), notas: {} });
  renderIntens();
}

function quitarIntens(idx) {
  intensItems.splice(idx, 1);
  renderIntens();
}

function leerIntensItems() {
  return intensItems.map((_, idx) => ({
    materia:     document.getElementById(`intens${idx}-materia`)?.value || MATERIAS[0],
    anio_origen: parseInt(document.getElementById(`intens${idx}-anio`)?.value) || 1,
    notas: esEditar ? PERIODOS.reduce((acc, p) => {
      const v = parseFloat(document.getElementById(`intens${idx}-${p.key}`)?.value);
      if (!isNaN(v)) acc[p.key] = v;
      return acc;
    }, {}) : {},
  }));
}

async function cargarDatosEditar() {
  const doc = await db.collection('alumnos').doc(editId).get();
  if (!doc.exists) { window.location.href = 'alumnos.html'; return; }
  const a = doc.data();

  document.getElementById('f-nombre').value   = a.nombre   || '';
  document.getElementById('f-apellido').value = a.apellido || '';
  document.getElementById('f-anio').value     = a.anio     || '';
  document.getElementById('f-division').value = a.division || '';

  const asist = a.asistencia?.[mesKey];
  if (asist) document.getElementById('f-presentes').value = asist.presentes;

  renderMaterias(a.materias || []);
  renderIntens(a.intensifica || []);
}

async function guardar() {
  const nombre    = document.getElementById('f-nombre').value.trim();
  const apellido  = document.getElementById('f-apellido').value.trim();
  const anio      = parseInt(document.getElementById('f-anio').value);
  const division  = parseInt(document.getElementById('f-division').value);
  const presentes = parseInt(document.getElementById('f-presentes').value) || 0;

  if (!nombre || !apellido || !anio || !division) {
    showToast('Completá nombre, apellido, año y división');
    return;
  }

  let materias;
  if (esEditar) {
    materias = MATERIAS.map((mat, i) => {
      const anioMat = parseInt(document.getElementById(`m${i}-anio`)?.value) || anio;
      return {
        nombre:  mat,
        anio:    anioMat,
        recursa: anioMat !== anio,
        inf1:    parseFloat(document.getElementById(`m${i}-inf1`).value) || null,
        nf1:     parseFloat(document.getElementById(`m${i}-nf1`).value)  || null,
        inf2:    parseFloat(document.getElementById(`m${i}-inf2`).value) || null,
        nf2:     parseFloat(document.getElementById(`m${i}-nf2`).value)  || null,
      };
    });
  } else {
    materias = MATERIAS.map((mat, i) => ({
      nombre:  mat,
      anio:    document.getElementById(`m${i}-recursa`)?.checked ? anio - 1 : anio,
      recursa: document.getElementById(`m${i}-recursa`)?.checked || false,
      inf1: null, nf1: null, inf2: null, nf2: null,
    }));
  }

  const intensifica = leerIntensItems();
  const data = {
    nombre, apellido, anio, division,
    asistencia: { [mesKey]: { presentes, ausentes: 20 - presentes } },
    materias,
    intensifica,
  };

  try {
    if (esEditar) {
      await db.collection('alumnos').doc(editId).update(data);
      showToast('Cambios guardados');
      setTimeout(() => window.location.href = `alumno.html?id=${editId}`, 1200);
    } else {
      const ref = await db.collection('alumnos').add(data);
      showToast('Alumno agregado');
      setTimeout(() => window.location.href = `alumno.html?id=${ref.id}`, 1200);
    }
  } catch (e) {
    showToast('Error al guardar. Intentá de nuevo.');
  }
}

async function eliminar() {
  showConfirm('¿Eliminás este alumno? Esta acción no se puede deshacer.', async () => {
    await db.collection('alumnos').doc(editId).delete();
    showToast('Alumno eliminado');
    setTimeout(() => window.location.href = 'alumnos.html', 1200);
  });
}
