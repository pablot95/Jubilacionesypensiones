import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc,
  updateDoc, doc, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyBCZ7q8HOlpzy7OtqdVZNIqiDwVReMRt7o",
  authDomain: "jubilacionesmisiones-76d94.firebaseapp.com",
  projectId: "jubilacionesmisiones-76d94",
  storageBucket: "jubilacionesmisiones-76d94.firebasestorage.app",
  messagingSenderId: "508717125765",
  appId: "1:508717125765:web:cfb9ea5cfb1f1a88db99ec"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

/* ── AUTH GUARD ─────────────────────────────────────────── */
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.replace('index.html');
  } else {
    document.getElementById('userEmail').textContent = user.email;
    loadConsultas();
    loadSlots();
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.replace('index.html');
});

/* ── TABS ───────────────────────────────────────────────── */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* ── CONSULTAS ──────────────────────────────────────────── */
let consultasData = [];
let filtroActivo  = 'todos';

async function loadConsultas() {
  const tbody = document.getElementById('consultasBody');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="7"><span class="spinner-sm"></span>Cargando...</td></tr>';
  try {
    const snap = await getDocs(query(collection(db, 'consultas'), orderBy('creadoEn', 'desc')));
    consultasData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderConsultas();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#dc2626;padding:2rem">Error al cargar. Revisá la conexión y las reglas de Firestore.</td></tr>`;
    console.error(err);
  }
}

function renderConsultas() {
  const tbody = document.getElementById('consultasBody');
  const datos = filtroActivo === 'todos'
    ? consultasData
    : consultasData.filter(c => c.estado === filtroActivo);

  if (!datos.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#6b7280">Sin consultas${filtroActivo !== 'todos' ? ' con estado "' + filtroActivo + '"' : ''}.</td></tr>`;
    return;
  }

  tbody.innerHTML = datos.map(c => `
    <tr>
      <td style="font-size:.78rem;color:#6b7280;white-space:nowrap">${formatFecha(c.creadoEn)}</td>
      <td>
        <strong>${c.diaNombre ?? ''} ${c.fechaCorta ?? ''}</strong>
        <br><span style="font-size:.76rem;color:#6b7280">${c.hora ?? ''} hs &middot; ${c.semanaLabel ?? ''}</span>
      </td>
      <td>${c.nombre ?? '—'}</td>
      <td><a href="tel:${c.telefono}" style="color:#1F3A5F;font-weight:600">${c.telefono ?? '—'}</a></td>
      <td style="font-size:.82rem">${c.motivo ?? '—'}</td>
      <td>${badgeEstado(c.estado)}</td>
      <td>
        <select class="estado-select" data-id="${c.id}" data-current="${c.estado}">
          <option value="pendiente"  ${c.estado === 'pendiente'  ? 'selected' : ''}>Pendiente</option>
          <option value="confirmado" ${c.estado === 'confirmado' ? 'selected' : ''}>Confirmado</option>
          <option value="completado" ${c.estado === 'completado' ? 'selected' : ''}>Completado</option>
          <option value="cancelado"  ${c.estado === 'cancelado'  ? 'selected' : ''}>Cancelado</option>
        </select>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.estado-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const nuevo = sel.value;
      sel.disabled = true;
      try {
        await updateDoc(doc(db, 'consultas', sel.dataset.id), { estado: nuevo });
        const idx = consultasData.findIndex(c => c.id === sel.dataset.id);
        if (idx !== -1) consultasData[idx].estado = nuevo;
        renderConsultas();
      } catch (err) {
        console.error(err);
        sel.value = sel.dataset.current;
        sel.disabled = false;
        alert('Error al actualizar. Intentá de nuevo.');
      }
    });
  });
}

function badgeEstado(estado) {
  const map   = { pendiente: 'badge-pending', confirmado: 'badge-confirm', completado: 'badge-complete', cancelado: 'badge-cancel' };
  const label = { pendiente: 'Pendiente', confirmado: 'Confirmado', completado: 'Completado', cancelado: 'Cancelado' };
  return `<span class="badge ${map[estado] ?? 'badge-pending'}">${label[estado] ?? estado}</span>`;
}

function formatFecha(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

document.getElementById('filtroEstado').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtroActivo = btn.dataset.filtro;
  renderConsultas();
});

document.getElementById('reloadConsultas').addEventListener('click', loadConsultas);

/* ── SLOTS ──────────────────────────────────────────────── */
let slotsData = [];

const DIAS  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORAS = ['07:00', '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function getMondayIso(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().split('T')[0];
}

function semanaLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const lun = new Date(y, m - 1, d);
  const vie = new Date(y, m - 1, d + 4);
  return `Semana del ${lun.getDate()} al ${vie.getDate()} de ${MESES[vie.getMonth()]}`;
}

function fechaCorta(iso, offset) {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(y, m - 1, d + offset);
  return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}`;
}

async function loadSlots() {
  const tbody = document.getElementById('slotsBody');
  tbody.innerHTML = '<tr class="loading-row"><td colspan="6"><span class="spinner-sm"></span>Cargando...</td></tr>';
  try {
    const snap = await getDocs(collection(db, 'slots'));
    slotsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    slotsData.sort((a, b) => {
      if (a.semanaIso !== b.semanaIso) return a.semanaIso < b.semanaIso ? -1 : 1;
      const di = DIAS.indexOf(a.diaNombre) - DIAS.indexOf(b.diaNombre);
      return di !== 0 ? di : a.hora.localeCompare(b.hora);
    });
    renderSlots();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:2rem">Error al cargar turnos.</td></tr>`;
    console.error(err);
  }
}

function renderSlots() {
  const tbody = document.getElementById('slotsBody');
  if (!slotsData.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#6b7280">No hay turnos cargados todavía.</td></tr>`;
    return;
  }
  tbody.innerHTML = slotsData.map(s => `
    <tr>
      <td style="font-size:.82rem;color:#6b7280">${s.semanaLabel ?? s.semanaIso}</td>
      <td>${s.diaNombre}</td>
      <td>${s.fechaCorta}</td>
      <td><strong>${s.hora} hs</strong></td>
      <td>${s.activo
        ? '<span class="badge badge-active">Disponible</span>'
        : '<span class="badge badge-inactive">Reservado</span>'}</td>
      <td style="display:flex;gap:.4rem;flex-wrap:wrap">
        ${!s.activo ? `<button class="btn-admin btn-success btn-sm liberar-btn" data-id="${s.id}">Liberar</button>` : ''}
        <button class="btn-admin btn-danger btn-sm delete-btn" data-id="${s.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este turno? Si está reservado, la consulta asociada quedará sin turno.')) return;
      btn.disabled = true;
      try {
        await deleteDoc(doc(db, 'slots', btn.dataset.id));
        slotsData = slotsData.filter(s => s.id !== btn.dataset.id);
        renderSlots();
      } catch (err) { console.error(err); alert('Error al eliminar.'); btn.disabled = false; }
    });
  });

  tbody.querySelectorAll('.liberar-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Liberar este turno? Quedará disponible nuevamente para nuevas consultas.')) return;
      btn.disabled = true;
      try {
        await updateDoc(doc(db, 'slots', btn.dataset.id), { activo: true });
        const s = slotsData.find(x => x.id === btn.dataset.id);
        if (s) s.activo = true;
        renderSlots();
      } catch (err) { console.error(err); alert('Error al liberar.'); btn.disabled = false; }
    });
  });
}

/* ── AGREGAR TURNO INDIVIDUAL ───────────────────────────── */
document.getElementById('addSlotBtn').addEventListener('click', async () => {
  const isoInput = document.getElementById('slotSemanaIso').value;
  const diaIdx   = Number(document.getElementById('slotDia').value);
  const hora     = document.getElementById('slotHora').value;
  const msgEl    = document.getElementById('slotMsg');
  if (!isoInput) { alert('Seleccioná la semana.'); return; }

  const iso   = getMondayIso(isoInput);
  const label = semanaLabel(iso);
  const datos = { semanaIso: iso, semanaLabel: label, diaNombre: DIAS[diaIdx], fechaCorta: fechaCorta(iso, diaIdx), hora, activo: true, creadoEn: new Date() };

  const btn = document.getElementById('addSlotBtn');
  btn.disabled = true;
  try {
    const ref = await addDoc(collection(db, 'slots'), datos);
    slotsData.push({ id: ref.id, ...datos });
    slotsData.sort((a, b) => a.semanaIso < b.semanaIso ? -1 : 1);
    renderSlots();
    msgEl.textContent = `✓ Turno agregado: ${datos.diaNombre} ${datos.fechaCorta} a las ${hora} hs.`;
    msgEl.style.display = 'block';
    setTimeout(() => { msgEl.style.display = 'none'; }, 4000);
  } catch (err) { console.error(err); alert('Error al agregar turno.'); }
  btn.disabled = false;
});

/* ── CARGAR SEMANA COMPLETA ─────────────────────────────── */
document.getElementById('cargarSemanaBtn').addEventListener('click', async () => {
  const isoInput = document.getElementById('semanaIso').value;
  const msgEl    = document.getElementById('semanaMsg');
  if (!isoInput) { alert('Seleccioná una semana.'); return; }

  const iso   = getMondayIso(isoInput);
  const label = semanaLabel(iso);
  const btn   = document.getElementById('cargarSemanaBtn');
  btn.disabled = true;
  btn.textContent = 'Cargando...';

  try {
    const nuevos = [];
    for (let i = 0; i < 5; i++) {
      for (const hora of HORAS) {
        const datos = { semanaIso: iso, semanaLabel: label, diaNombre: DIAS[i], fechaCorta: fechaCorta(iso, i), hora, activo: true, creadoEn: new Date() };
        const ref = await addDoc(collection(db, 'slots'), datos);
        nuevos.push({ id: ref.id, ...datos });
      }
    }
    slotsData = [...slotsData, ...nuevos].sort((a, b) => a.semanaIso < b.semanaIso ? -1 : 1);
    renderSlots();
    msgEl.textContent = `✓ ${nuevos.length} turnos cargados para ${label}.`;
    msgEl.style.display = 'block';
    setTimeout(() => { msgEl.style.display = 'none'; }, 5000);
  } catch (err) { console.error(err); alert('Error al cargar la semana.'); }
  btn.disabled = false;
  btn.textContent = 'Cargar semana completa';
});

document.getElementById('reloadSlots').addEventListener('click', loadSlots);
