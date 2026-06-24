import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, getDocs,
  query, where, doc, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBCZ7q8HOlpzy7OtqdVZNIqiDwVReMRt7o",
  authDomain: "jubilacionesmisiones-76d94.firebaseapp.com",
  projectId: "jubilacionesmisiones-76d94",
  storageBucket: "jubilacionesmisiones-76d94.firebasestorage.app",
  messagingSenderId: "508717125765",
  appId: "1:508717125765:web:cfb9ea5cfb1f1a88db99ec"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ── HEADER ─────────────────────────────────────────────── */
function inicializarHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  const actualizarBg = () => header.classList.toggle('is-scrolled', window.scrollY > 80);
  actualizarBg();
  window.addEventListener('scroll', actualizarBg, { passive: true });

  // Brand aparece solo cuando el logo del hero sale del viewport
  const heroBrand = document.querySelector('.logoyeye');
  if (heroBrand) {
    new IntersectionObserver(entries => {
      header.classList.toggle('brand-visible', !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(heroBrand);
  }
}

/* ── MENÚ MÓVIL ─────────────────────────────────────────── */
function inicializarMenuMovil() {
  const toggle  = document.getElementById('menuToggle');
  const nav     = document.getElementById('siteNav');
  const overlay = document.getElementById('navOverlay');
  if (!toggle || !nav || !overlay) return;

  const cerrar = () => {
    nav.classList.remove('is-open');
    overlay.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', () => {
    const abierto = nav.classList.toggle('is-open');
    overlay.classList.toggle('is-open', abierto);
    toggle.setAttribute('aria-expanded', String(abierto));
    document.body.style.overflow = abierto ? 'hidden' : '';
  });
  overlay.addEventListener('click', cerrar);
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', cerrar));
}

/* ── ANIMACIONES ─────────────────────────────────────────── */
function inicializarAnimaciones() {
  const els = document.querySelectorAll('.anim-up, .anim-row, .anim-right');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  els.forEach(el => obs.observe(el));
}

/* ── AGENDA EN 2 PASOS ──────────────────────────────────── */
let datosTurno      = null;
let semanasConSlots = [];
let semanaIdx       = 0;
let slotSeleccionado = null;

function inicializarTurnos() {
  const formDatos = document.getElementById('formTurnoDatos');
  if (!formDatos) return;

  formDatos.addEventListener('submit', async e => {
    e.preventDefault();
    if (!formDatos.checkValidity()) { formDatos.reportValidity(); return; }
    datosTurno = {
      nombre:   document.getElementById('tNombre').value.trim(),
      telefono: document.getElementById('tTelefono').value.trim(),
      email:    document.getElementById('tEmail').value.trim(),
      motivo:   document.getElementById('tMotivo').value
    };
    irAPaso2();
    await cargarSlots();
  });

  document.getElementById('agendaVolver')?.addEventListener('click', irAPaso1);
  document.getElementById('agendaConfirmar')?.addEventListener('click', confirmarTurno);
  document.getElementById('agendaPrev')?.addEventListener('click', () => {
    if (semanaIdx > 0) { semanaIdx--; renderSemana(); }
  });
  document.getElementById('agendaNext')?.addEventListener('click', () => {
    if (semanaIdx < semanasConSlots.length - 1) { semanaIdx++; renderSemana(); }
  });
}

function irAPaso2() {
  document.getElementById('wizardPanel1').classList.add('hidden');
  document.getElementById('wizardPanel2').classList.remove('hidden');
  document.getElementById('step1Ind').classList.replace('active', 'done');
  document.getElementById('step2Ind').classList.add('active');
  const { nombre, telefono, motivo } = datosTurno;
  document.getElementById('turnoResumenDatos').innerHTML =
    `<strong>Tus datos</strong>${nombre} · ${telefono}<br>Motivo: ${motivo}`;
}

function irAPaso1() {
  document.getElementById('wizardPanel2').classList.add('hidden');
  document.getElementById('wizardPanel1').classList.remove('hidden');
  document.getElementById('step2Ind').classList.remove('active');
  document.getElementById('step1Ind').classList.remove('done');
  document.getElementById('step1Ind').classList.add('active');
  slotSeleccionado = null;
}

async function cargarSlots() {
  const loading = document.getElementById('agendaLoading');
  const grid    = document.getElementById('agendaGrid');
  const empty   = document.getElementById('agendaEmpty');

  loading.style.display = 'flex';
  grid.style.display = 'none';
  empty.classList.add('hidden');

  try {
    const snap = await getDocs(query(collection(db, 'slots'), where('activo', '==', true)));
    const slots = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const mapa = {};
    slots.forEach(s => {
      if (!mapa[s.semanaIso]) mapa[s.semanaIso] = { label: s.semanaLabel, iso: s.semanaIso, slots: [] };
      mapa[s.semanaIso].slots.push(s);
    });
    semanasConSlots = Object.values(mapa).sort((a, b) => a.iso < b.iso ? -1 : 1);
    semanaIdx = 0;

    loading.style.display = 'none';
    if (!semanasConSlots.length) {
      empty.classList.remove('hidden');
      document.getElementById('agendaSemana').textContent = 'Sin disponibilidad';
    } else {
      grid.style.display = 'grid';
      renderSemana();
    }
  } catch (err) {
    console.error('Error cargando slots:', err);
    loading.style.display = 'none';
    empty.classList.remove('hidden');
  }
}

function renderSemana() {
  const grid     = document.getElementById('agendaGrid');
  const titulo   = document.getElementById('agendaSemana');
  const confirmar = document.getElementById('agendaConfirmar');
  const resumen  = document.getElementById('agendaResumen');

  const semana = semanasConSlots[semanaIdx];
  titulo.textContent = semana.label;
  slotSeleccionado = null;
  confirmar.disabled = true;
  resumen.textContent = 'Seleccioná un día y horario disponible.';
  document.getElementById('agendaPrev').disabled = semanaIdx === 0;
  document.getElementById('agendaNext').disabled = semanaIdx === semanasConSlots.length - 1;

  const diasMap = {};
  const horasSet = new Set();
  semana.slots.forEach(s => {
    if (!diasMap[s.fechaCorta]) diasMap[s.fechaCorta] = { nombre: s.diaNombre, fecha: s.fechaCorta };
    horasSet.add(s.hora);
  });
  const dias  = Object.values(diasMap);
  const horas = [...horasSet].sort();

  grid.style.gridTemplateColumns = `90px repeat(${dias.length}, 1fr)`;
  grid.innerHTML = '';

  grid.appendChild(Object.assign(document.createElement('div'), { className: 'agenda-cell-head' }));
  dias.forEach(d => {
    const c = document.createElement('div');
    c.className = 'agenda-cell-head';
    c.innerHTML = `${d.nombre}<span>${d.fecha}</span>`;
    grid.appendChild(c);
  });

  horas.forEach(hora => {
    const t = document.createElement('div');
    t.className = 'agenda-time';
    t.textContent = hora;
    grid.appendChild(t);

    dias.forEach(dia => {
      const slot = semana.slots.find(s => s.fechaCorta === dia.fecha && s.hora === hora);
      const btn = document.createElement('button');
      btn.type = 'button';
      if (slot) {
        btn.className = 'agenda-slot disponible';
        btn.textContent = 'Libre';
        btn.addEventListener('click', () => {
          grid.querySelectorAll('.agenda-slot.selected').forEach(el => {
            el.className = 'agenda-slot disponible';
            el.textContent = 'Libre';
          });
          btn.className = 'agenda-slot selected';
          btn.textContent = 'Seleccionado';
          slotSeleccionado = slot;
          resumen.innerHTML = `<strong>${dia.nombre} ${dia.fecha}</strong> a las <strong>${hora} hs</strong>`;
          confirmar.disabled = false;
        });
      } else {
        btn.className = 'agenda-slot ocupado';
        btn.textContent = '—';
        btn.disabled = true;
      }
      grid.appendChild(btn);
    });
  });
}

async function confirmarTurno() {
  if (!slotSeleccionado || !datosTurno) return;
  const btn = document.getElementById('agendaConfirmar');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    await addDoc(collection(db, 'consultas'), {
      ...datosTurno,
      slotId:      slotSeleccionado.id,
      diaNombre:   slotSeleccionado.diaNombre,
      fechaCorta:  slotSeleccionado.fechaCorta,
      hora:        slotSeleccionado.hora,
      semanaLabel: slotSeleccionado.semanaLabel,
      estado:      'pendiente',
      creadoEn:    new Date()
    });
    await updateDoc(doc(db, 'slots', slotSeleccionado.id), { activo: false });

    document.getElementById('wizardPanel2').classList.add('hidden');
    document.getElementById('wizardSuccess').classList.remove('hidden');
    document.getElementById('successMsg').textContent =
      `Reservaste el ${slotSeleccionado.diaNombre} ${slotSeleccionado.fechaCorta} a las ${slotSeleccionado.hora} hs. (${slotSeleccionado.semanaLabel})`;
  } catch (err) {
    console.error('Error al confirmar turno:', err);
    btn.disabled = false;
    btn.textContent = 'Confirmar turno';
    alert('Ocurrió un error. Por favor, intentá de nuevo o contactanos por WhatsApp.');
  }
}

/* ── FORMULARIO DE CONTACTO ─────────────────────────────── */
function inicializarFormulario() {
  const form  = document.getElementById('formContacto');
  const exito = document.getElementById('formExito');
  if (!form || !exito) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const datos = {
      nombre:   form.nombre.value.trim(),
      telefono: form.telefono.value.trim(),
      email:    form.email.value.trim(),
      mensaje:  form.mensaje.value.trim(),
      creadoEn: new Date()
    };

    try { await addDoc(collection(db, 'contactos'), datos); } catch (_) {}

    exito.classList.add('is-visible');
    form.reset();
    setTimeout(() => exito.classList.remove('is-visible'), 6000);
  });
}

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  inicializarHeader();
  inicializarMenuMovil();
  inicializarAnimaciones();
  inicializarTurnos();
  inicializarFormulario();
});
