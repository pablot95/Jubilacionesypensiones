import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyBCZ7q8HOlpzy7OtqdVZNIqiDwVReMRt7o",
  authDomain: "jubilacionesmisiones-76d94.firebaseapp.com",
  projectId: "jubilacionesmisiones-76d94",
  storageBucket: "jubilacionesmisiones-76d94.firebasestorage.app",
  messagingSenderId: "508717125765",
  appId: "1:508717125765:web:cfb9ea5cfb1f1a88db99ec"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, user => {
  if (user) window.location.replace('admin/dashboard.html');
});

const MENSAJES = {
  'auth/user-not-found':     'Usuario no encontrado.',
  'auth/wrong-password':     'Contraseña incorrecta.',
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/invalid-email':      'El email no es válido.',
  'auth/too-many-requests':  'Demasiados intentos fallidos. Intentá más tarde.',
};

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn   = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;

  btn.disabled = true;
  btn.textContent = 'Ingresando...';
  errEl.classList.add('hidden');

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    window.location.replace('admin/dashboard.html');
  } catch (err) {
    errEl.textContent = MENSAJES[err.code] || 'Error al iniciar sesión. Intentá de nuevo.';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Ingresar';
  }
});
