
import React, { useState } from 'react'
import {
  ingresarCuenta,
  mensajeErrorAuth,
  recuperarContrasena,
  registrarCuenta
} from './accountAuth'

export default function AuthForm({ onSuccess, onGuest }) {
  const [modo, setModo] = useState('login')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [cargando, setCargando] = useState(false)

  async function enviar(event) {
    event.preventDefault()
    setError('')
    setAviso('')
    setCargando(true)

    try {
      if (modo === 'reset') {
        await recuperarContrasena(email)
        setAviso(
          'Si existe una cuenta con ese correo, recibirás instrucciones para recuperar tu contraseña.'
        )
      } else if (modo === 'register') {
        const usuario = await registrarCuenta({
          nombre,
          email,
          password
        })
        onSuccess?.(usuario)
      } else {
        const usuario = await ingresarCuenta({
          email,
          password
        })
        onSuccess?.(usuario)
      }
    } catch (err) {
      setError(mensajeErrorAuth(err))
    } finally {
      setCargando(false)
    }
  }

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo)
    setError('')
    setAviso('')
  }

  return (
    <section className="morf-auth-page">
      <div className="morf-auth-card">
        <span className="eyebrow">BIENVENIDO A MORF.</span>

        <h1>
          {modo === 'register'
            ? 'CREÁ TU CUENTA.'
            : modo === 'reset'
              ? 'RECUPERÁ TU CLAVE.'
              : 'HOLA DE NUEVO.'}
        </h1>

        <p>
          {modo === 'register'
            ? 'Guardá tus planes y reservas para volver cuando quieras.'
            : modo === 'reset'
              ? 'Te mandamos un correo para recuperar el acceso.'
              : 'Ingresá para encontrar tus planes y favoritos.'}
        </p>

        <form onSubmit={enviar} className="morf-auth-form">
          {modo === 'register' && (
            <label>
              Tu nombre
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                autoComplete="name"
                placeholder="¿Cómo te llamás?"
                required
              />
            </label>
          )}

          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="hola@ejemplo.com"
              required
            />
          </label>

          {modo !== 'reset' && (
            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={
                  modo === 'register'
                    ? 'new-password'
                    : 'current-password'
                }
                minLength={modo === 'register' ? 6 : undefined}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </label>
          )}

          {error && (
            <p className="morf-auth-error" role="alert">
              {error}
            </p>
          )}

          {aviso && (
            <p className="morf-auth-success" role="status">
              {aviso}
            </p>
          )}

          <button
            className="btn primary full"
            type="submit"
            disabled={cargando}
          >
            {cargando
              ? 'UN MOMENTO...'
              : modo === 'register'
                ? 'CREAR CUENTA'
                : modo === 'reset'
                  ? 'ENVIAR CORREO'
                  : 'INICIAR SESIÓN'}
          </button>
        </form>

        <div className="morf-auth-links">
          {modo === 'login' && (
            <button
              type="button"
              onClick={() => cambiarModo('reset')}
            >
              Olvidé mi contraseña
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              cambiarModo(
                modo === 'register' ? 'login' : 'register'
              )
            }
          >
            {modo === 'register'
              ? 'Ya tengo cuenta'
              : 'Crear una cuenta'}
          </button>

          {modo === 'reset' && (
            <button
              type="button"
              onClick={() => cambiarModo('login')}
            >
              Volver a iniciar sesión
            </button>
          )}

          {onGuest && (
            <button type="button" onClick={onGuest}>
              Continuar como invitado
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
