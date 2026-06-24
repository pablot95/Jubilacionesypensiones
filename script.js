function inicializarHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  const actualizar = () => {
    if (window.scrollY > 80) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  };

  actualizar();
  window.addEventListener('scroll', actualizar, { passive: true });
}

function inicializarMenuMovil() {
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('siteNav');
  const overlay = document.getElementById('navOverlay');
  if (!toggle || !nav || !overlay) return;

  const cerrar = () => {
    nav.classList.remove('is-open');
    overlay.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  const alternar = () => {
    const abierto = nav.classList.toggle('is-open');
    overlay.classList.toggle('is-open', abierto);
    toggle.setAttribute('aria-expanded', String(abierto));
    document.body.style.overflow = abierto ? 'hidden' : '';
  };

  toggle.addEventListener('click', alternar);
  overlay.addEventListener('click', cerrar);
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', cerrar));
}

function inicializarAnimaciones() {
  const elementos = document.querySelectorAll('.anim-up, .anim-row, .anim-right');
  if (!elementos.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  elementos.forEach(el => observer.observe(el));
}

const SEMANAS_AGENDA = [
  {
    titulo: 'Semana del 15 al 19 de junio',
    dias: [
      { nombre: 'Lunes', fecha: '15/06' },
      { nombre: 'Martes', fecha: '16/06' },
      { nombre: 'Miércoles', fecha: '17/06' },
      { nombre: 'Jueves', fecha: '18/06' },
      { nombre: 'Viernes', fecha: '19/06' }
    ],
    ocupados: [1, 4, 7, 10, 14, 18, 21]
  },
  {
    titulo: 'Semana del 22 al 26 de junio',
    dias: [
      { nombre: 'Lunes', fecha: '22/06' },
      { nombre: 'Martes', fecha: '23/06' },
      { nombre: 'Miércoles', fecha: '24/06' },
      { nombre: 'Jueves', fecha: '25/06' },
      { nombre: 'Viernes', fecha: '26/06' }
    ],
    ocupados: [0, 3, 6, 9, 13, 17, 20, 22]
  },
  {
    titulo: 'Semana del 29 de junio al 3 de julio',
    dias: [
      { nombre: 'Lunes', fecha: '29/06' },
      { nombre: 'Martes', fecha: '30/06' },
      { nombre: 'Miércoles', fecha: '01/07' },
      { nombre: 'Jueves', fecha: '02/07' },
      { nombre: 'Viernes', fecha: '03/07' }
    ],
    ocupados: [2, 5, 8, 11, 12, 16, 19]
  }
];

const HORARIOS_AGENDA = ['07:00', '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

function inicializarAgenda() {
  const grid = document.getElementById('agendaGrid');
  const titulo = document.getElementById('agendaSemana');
  const resumen = document.getElementById('agendaResumen');
  const confirmar = document.getElementById('agendaConfirmar');
  const prev = document.getElementById('agendaPrev');
  const next = document.getElementById('agendaNext');
  if (!grid || !titulo || !resumen || !confirmar) return;

  let semanaActual = 0;
  let seleccion = null;

  const renderGrid = () => {
    const semana = SEMANAS_AGENDA[semanaActual];
    titulo.textContent = semana.titulo;
    seleccion = null;
    confirmar.disabled = true;
    confirmar.textContent = 'Confirmar turno';
    resumen.innerHTML = 'Seleccioná un día y un horario disponible para reservar tu consulta.';

    grid.innerHTML = '';

    grid.appendChild(crearCelda('agenda-cell-head', ''));
    semana.dias.forEach(dia => {
      const celda = crearCelda('agenda-cell-head', `${dia.nombre}<span>${dia.fecha}</span>`);
      grid.appendChild(celda);
    });

    HORARIOS_AGENDA.forEach((hora, filaIndex) => {
      grid.appendChild(crearCelda('agenda-time', hora));
      semana.dias.forEach((dia, diaIndex) => {
        const indice = filaIndex * semana.dias.length + diaIndex;
        const ocupado = semana.ocupados.includes(indice);
        const slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'agenda-slot ' + (ocupado ? 'ocupado' : 'disponible');
        slot.textContent = ocupado ? 'Ocupado' : 'Libre';
        slot.disabled = ocupado;
        if (!ocupado) {
          slot.addEventListener('click', () => seleccionarSlot(slot, dia, hora));
        }
        grid.appendChild(slot);
      });
    });
  };

  const crearCelda = (clase, contenido) => {
    const div = document.createElement('div');
    div.className = clase;
    div.innerHTML = contenido;
    return div;
  };

  const seleccionarSlot = (slot, dia, hora) => {
    grid.querySelectorAll('.agenda-slot.selected').forEach(el => {
      el.classList.remove('selected');
      el.textContent = 'Libre';
    });
    slot.classList.add('selected');
    slot.textContent = 'Seleccionado';
    seleccion = { dia, hora };
    resumen.innerHTML = `Elegiste el <strong>${dia.nombre} ${dia.fecha}</strong> a las <strong>${hora} hs</strong>. Confirmá para que un asesor se comunique con vos.`;
    confirmar.disabled = false;
    confirmar.textContent = 'Confirmar turno';
  };

  confirmar.addEventListener('click', () => {
    if (!seleccion) return;
    resumen.innerHTML = `¡Listo! Solicitaste tu turno para el <strong>${seleccion.dia.nombre} ${seleccion.dia.fecha}</strong> a las <strong>${seleccion.hora} hs</strong>. En breve un asesor confirmará tu reserva.`;
    confirmar.disabled = true;
    confirmar.textContent = 'Turno solicitado';
  });

  prev.addEventListener('click', () => {
    semanaActual = (semanaActual - 1 + SEMANAS_AGENDA.length) % SEMANAS_AGENDA.length;
    renderGrid();
  });

  next.addEventListener('click', () => {
    semanaActual = (semanaActual + 1) % SEMANAS_AGENDA.length;
    renderGrid();
  });

  renderGrid();
}

function inicializarFormulario() {
  const form = document.getElementById('formContacto');
  const exito = document.getElementById('formExito');
  if (!form || !exito) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    exito.classList.add('is-visible');
    form.reset();
    setTimeout(() => exito.classList.remove('is-visible'), 6000);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarHeader();
  inicializarMenuMovil();
  inicializarAnimaciones();
  inicializarAgenda();
  inicializarFormulario();
});
