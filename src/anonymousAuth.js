
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth } from './firebase'

export function iniciarSesionAnonima() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        unsubscribe()

        if (user) {
          resolve(user)
          return
        }

        try {
          const resultado = await signInAnonymously(auth)
          resolve(resultado.user)
        } catch (error) {
          reject(error)
        }
      },
      (error) => {
        unsubscribe()
        reject(error)
      }
    )
  })
}
