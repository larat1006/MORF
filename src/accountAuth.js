
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth'
import { auth } from './firebase'

export function observarSesion(callback) {
  return onAuthStateChanged(auth, callback)
}

export async function registrarCuenta({ nombre, email, password }) {
  const correo = email.trim()
  const actual = auth.currentUser
  let usuario

  if (actual?.isAnonymous) {
    const credencial = EmailAuthProvider.credential(correo, password)
    const resultado = await linkWithCredential(actual, credencial)
    usuario = resultado.user
  } else {
    const resultado = await createUserWithEmailAndPassword(auth, correo, password)
    usuario = resultado.user
  }

  if (nombre.trim()) {
    await updateProfile(usuario, { displayName: nombre.trim() })
  }

  return usuario
}

export async function ingresarCuenta({ email, password }) {
  const resultado = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  )
  return resultado.user
}

export function recuperarContrasena(email) {
  return sendPasswordResetEmail(auth, email.trim())
}

export function cerrarSesion() {
  return signOut(auth)
}

export function mensajeErrorAuth(error) {
  switch (error?.code) {
    case 'auth/email-already-in-use':
      return 'Ese correo ya tiene una cuenta. Probá iniciar sesión.'
    case 'auth/invalid-email':
      return 'Revisá el correo electrónico.'
    case 'auth/weak-password':
      return 'Elegí una contraseña de al menos 6 caracteres.'
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Probá nuevamente más tarde.'
    case 'auth/network-request-failed':
      return 'No se pudo conectar. Revisá tu conexión.'
    case 'auth/credential-already-in-use':
      return 'Esa cuenta ya está vinculada a otro usuario.'
    default:
      return 'No pudimos completar la operación. Intentá nuevamente.'
  }
}
