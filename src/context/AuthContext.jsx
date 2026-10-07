import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';
import { auth, isAllowedEmail, ALLOWED_DOMAIN } from '../firebase.js';
import { checkIsAdmin, deleteUserData, ensureUserProfile, updateProfile, watchProfile } from '../lib/db.js';
import { deleteAllUserImages } from '../lib/images.js';

const AuthContext = createContext(null);

const ERRORS = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
  'auth/requires-recent-login': 'Por seguridad, cierra sesión y vuelve a entrar antes de cambiar la contraseña.',
  'auth/missing-password': 'Escribe tu contraseña actual.',
};

export function authErrorMessage(err) {
  return ERRORS[err?.code] || err?.message || 'Ocurrió un error inesperado.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => onIdTokenChanged(auth, (u) => setUser(u || null)), []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    let unsub = () => {};
    let cancelled = false;
    ensureUserProfile(user)
      .then(() => {
        if (!cancelled) unsub = watchProfile(user.uid, setProfile);
      })
      .catch((e) => console.error('Perfil:', e));
    if (user.emailVerified) {
      setIsAdmin(null); // null = verificando
      checkIsAdmin(user.email).then(setIsAdmin);
    } else setIsAdmin(false);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [user?.uid, user?.emailVerified]);

  const value = {
    user,
    profile,
    isAdmin,
    loading: user === undefined,
    async register({ name, email, password }) {
      if (!isAllowedEmail(email)) throw new Error(`Solo se permiten correos @${ALLOWED_DOMAIN}.`);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await ensureUserProfile(cred.user, { displayName: name?.trim() });
      if (name) {
        await updateAuthProfile(cred.user, { displayName: name.trim() });
        await updateProfile(cred.user.uid, { displayName: name.trim() });
      }
      await sendEmailVerification(cred.user);
      return cred.user;
    },
    async login({ email, password }) {
      if (!isAllowedEmail(email)) throw new Error(`Solo se permiten correos @${ALLOWED_DOMAIN}.`);
      return signInWithEmailAndPassword(auth, email.trim(), password);
    },
    logout: () => signOut(auth),
    resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
    resendVerification: () => sendEmailVerification(auth.currentUser),
    // Firebase exige confirmar la contraseña actual antes de cambiarla
    // Borra la cuenta: confirma la contraseña, elimina imágenes, datos personales y el usuario
    async deleteAccount(password) {
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
      await deleteAllUserImages(u.uid);
      await deleteUserData(u.uid);
      await deleteUser(u);
    },
    async changePassword(currentPassword, newPassword) {
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, currentPassword));
      await updatePassword(u, newPassword);
    },
    async refreshVerification() {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true); // fuerza token con email_verified actualizado
      setUser(auth.currentUser);
      return auth.currentUser.emailVerified;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
