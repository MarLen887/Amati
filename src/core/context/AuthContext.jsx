import { createContext, useContext, useEffect, useState } from 'react';
import {
  deleteUser,
  GoogleAuthProvider,
  onIdTokenChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { auth, isAllowedEmail, ALLOWED_DOMAIN } from '../firebase.js';
import { checkIsAdmin, deleteUserData, ensureUserProfile, watchProfile } from '../data/db.js';
import { deleteAllUserImages } from '../lib/images.js';

const AuthContext = createContext(null);

// Inicio de sesión únicamente con Google (cuenta institucional): no hay contraseñas en Amati.
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ hd: ALLOWED_DOMAIN, prompt: 'select_account' }); // sugiere la cuenta institucional

const ERRORS = {
  'auth/popup-closed-by-user': '',
  'auth/cancelled-popup-request': '',
  'auth/user-cancelled': '',
  'auth/account-exists-with-different-credential': 'Ya existe una cuenta con ese correo. Inicia sesión con Google usando el correo institucional.',
  'auth/unauthorized-domain': 'Este sitio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).',
  'auth/operation-not-allowed': 'El inicio de sesión con Google no está activado en Firebase (Authentication → Método de acceso → Google).',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
  'auth/requires-recent-login': 'Por seguridad, cierra sesión y vuelve a entrar con Google antes de continuar.',
  'auth/popup-blocked': 'Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.',
};

// '' = no mostrar mensaje (p. ej. la persona cerró la ventana de Google)
export function authErrorMessage(err) {
  if (err?.code && err.code in ERRORS) return ERRORS[err.code];
  return err?.message || 'Ocurrió un error inesperado.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authNotice, setAuthNotice] = useState('');

  useEffect(
    () => onIdTokenChanged(auth, async (u) => {
      // Solo cuentas institucionales: si entra otra, se elimina la cuenta recién creada y se cierra la sesión
      if (u && !isAllowedEmail(u.email)) {
        setAuthNotice(`Solo se permiten cuentas @${ALLOWED_DOMAIN}. Elige tu cuenta institucional.`);
        try { await deleteUser(u); } catch { /* si no se puede borrar, al menos se cierra la sesión */ }
        await signOut(auth).catch(() => {});
        setUser(null);
        return;
      }
      setUser(u || null);
    }),
    [],
  );

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      return undefined;
    }
    let unsub = () => {};
    let cancelled = false;
    ensureUserProfile(user)
      .then(() => {
        if (!cancelled) unsub = watchProfile(user.uid, setProfile);
      })
      .catch((e) => console.error('Perfil:', e));
    setIsAdmin(null); // null = verificando
    checkIsAdmin(user.email).then(setIsAdmin);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [user?.uid]);

  const value = {
    user,
    profile,
    isAdmin,
    loading: user === undefined,
    authNotice,
    clearAuthNotice: () => setAuthNotice(''),
    // «Continuar con Google». Si el navegador bloquea la ventana, se usa la redirección.
    async loginWithGoogle() {
      setAuthNotice('');
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw err;
      }
    },
    // Al cerrar sesión se olvida qué se mostró en esta sesión (el video de bienvenida vuelve a salir al iniciar otra)
    logout: () => {
      try { Object.keys(sessionStorage).filter((k) => k.startsWith('amati-video-session-')).forEach((k) => sessionStorage.removeItem(k)); } catch { /* sin almacenamiento */ }
      return signOut(auth);
    },
    // Borra la cuenta: pide confirmar con Google, elimina imágenes, datos personales y el usuario
    async deleteAccount() {
      const u = auth.currentUser;
      await reauthenticateWithPopup(u, googleProvider);
      await deleteAllUserImages(u.uid);
      await deleteUserData(u.uid);
      await deleteUser(u);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
