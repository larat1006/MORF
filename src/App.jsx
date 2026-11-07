
import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, ArrowLeft, ArrowUpRight, CalendarDays, Check,
  Heart, MapPin, Menu, Search, Share2, SlidersHorizontal,
  Sparkles, Trash2, X, Plus, Vote, RotateCcw
} from 'lucide-react'

import { restaurants, cuisines, zones } from './data'
import { auth, db } from './firebase'
import { iniciarSesionAnonima } from './anonymousAuth'
import { observarSesion, cerrarSesion, mensajeErrorAuth } from './accountAuth'
import AuthForm from './AuthForm'

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  setDoc,
  getDoc
} from 'firebase/firestore'

const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem('morf-' + key)) ?? fallback
  } catch {
    return fallback
  }
}

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random())

const money = n => '$'.repeat(n)

const prettyDate = date =>
  date
    ? new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : ''

const today = () => {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-')
}

const APP_VERSION = 'v4 · Cuentas opcionales'

const firebaseMessage = error => {
  const code = error?.code || 'error-desconocido'
  if (code === 'permission-denied') return 'Permisos insuficientes. Revisá las reglas de Firestore.'
  if (code === 'unauthenticated') return 'No se pudo autenticar la sesión anónima.'
  if (code === 'unavailable') return 'Firebase no está disponible. Revisá tu conexión.'
  return `${code}: ${error?.message || 'Error sin detalles'}`
}

const sharedPlanUrl = (id) => {
  const url = new URL('https://morf-gamma.vercel.app/')
  url.searchParams.set('plan', id)
  return url
}

const times = [
  '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30'
]

const questions = [
  {
    title: '¿QUÉ PLAN PINTA?',
    subtitle: 'Primero contanos con quién salís.',
    key: 'occasion',
    choices: ['Cita', 'Amigos', 'Celebración', 'Espontáneo']
  },
  {
    title: '¿QUÉ SE TE ANTOJA?',
    subtitle: 'Elegí lo que más te tienta.',
    key: 'cuisine',
    choices: [
      'Hamburguesas', 'Pizzas', 'Pastas',
      'Asiática', 'Parrilla', 'Argentina', 'Sorprendeme'
    ]
  },
  {
    title: '¿POR DÓNDE?',
    subtitle: 'Elegí tu zona preferida.',
    key: 'zone',
    choices: [
      'Palermo', 'Villa Crespo', 'Núñez',
      'Parque Patricios', 'Caballito', 'Me da igual'
    ]
  },
  {
    title: '¿CUÁNTO QUERÉS GASTAR?',
    subtitle: 'Un presupuesto aproximado.',
    key: 'price',
    choices: ['$', '$$', '$$$', 'Me da igual']
  }
]

function App() {
  const [page, setPage] = useState('home')
  const [selected, setSelected] = useState(null)
  const [queryText, setQueryText] = useState('')
  const [cuisine, setCuisine] = useState('Todas')
  const [zone, setZone] = useState('Todas')
  const [price, setPrice] = useState('Todos')

  const [favorites, setFavorites] = useState([])
  const [bookings, setBookings] = useState([])
  const [plans, setPlans] = useState([])
  const [activePlanData, setActivePlanData] = useState(null)
  const [planVotes, setPlanVotes] = useState([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState('')
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)
  const [savingVote, setSavingVote] = useState(false)
  const [closingPlan, setClosingPlan] = useState(false)
  const [userId, setUserId] = useState(null)
  const [sessionUser, setSessionUser] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [accountReturnPage, setAccountReturnPage] = useState('home')
  const [authReason, setAuthReason] = useState('')

  const [activePlan, setActivePlan] = useState(null)
  const [quizStep, setQuizStep] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizDone, setQuizDone] = useState(false)

  const [mobile, setMobile] = useState(false)
  const [toast, setToast] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)

  const [firebaseReady, setFirebaseReady] = useState(false)
  const [firebaseError, setFirebaseError] = useState('')
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [savingBooking, setSavingBooking] = useState(false)

  const [bookingForm, setBookingForm] = useState({
    date: '',
    time: '21:00',
    people: '2',
    name: '',
    email: '',
    notes: ''
  })

  const [editingBooking, setEditingBooking] = useState(null)
  const [planName, setPlanName] = useState('Cena del viernes')
  const [planOptions, setPlanOptions] = useState([])
  const [voterName, setVoterName] = useState('')
  const [voterChoice, setVoterChoice] = useState('')

  // Los favoritos son locales, pero separados por cuenta registrada.
  // No mostramos favoritos de otra persona al cambiar de sesión.

  

  // La sesión puede ser invitada o registrada. Escuchamos cada cambio de cuenta.
  useEffect(() => {
    let active = true
    let unsubscribeBookings = () => {}
    const unsubscribeAuth = observarSesion(async user => {
      unsubscribeBookings()
      unsubscribeBookings = () => {}
      if (!active) return
      if (!user) {
        setUserId(null)
        setSessionUser(null)
        setFavorites([])
        setShowFavorites(false)
        setFirebaseReady(false)
        setBookings([])
        setPlans([])
        setBookingsLoading(true)
        setPlansLoading(true)
        setSessionLoading(true)
        try {
          await iniciarSesionAnonima()
        } catch (error) {
          if (!active) return
          setFirebaseError(error.code || error.message)
          setBookingsLoading(false)
          setPlansLoading(false)
          setSessionLoading(false)
        }
        return
      }
      setSessionUser(user)
      setFavorites(user.isAnonymous ? [] : load(`favorites-${user.uid}`, []))
      setShowFavorites(false)
      setUserId(user.uid)
      setFirebaseReady(true)
      setFirebaseError('')
      setSessionLoading(false)
      setBookings([])
      setBookingsLoading(true)
      unsubscribeBookings = onSnapshot(
        query(collection(db, 'reservas'), where('userId', '==', user.uid)),
        snapshot => {
          if (!active || auth.currentUser?.uid !== user.uid) return
          setBookings(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
          setBookingsLoading(false)
          setFirebaseError('')
        },
        error => {
          if (!active) return
          setFirebaseError(error.code || error.message)
          setBookingsLoading(false)
        }
      )
    })
    return () => {
      active = false
      unsubscribeAuth()
      unsubscribeBookings()
    }
  }, [])

  const openAccount = () => {
    setAuthReason('')
    setAccountReturnPage(page === 'account' ? 'home' : page)
    navigate('account')
  }

  const isRegistered = !!sessionUser && !sessionUser.isAnonymous

  const requireAccount = (action, returnPage = page) => {
    if (auth.currentUser && !auth.currentUser.isAnonymous) return true
    setAuthReason(`Para ${action} necesitás ingresar o crear una cuenta gratuita.`)
    setAccountReturnPage(returnPage === 'account' ? 'home' : returnPage)
    setPage('account')
    setMobile(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return false
  }

  const accountSuccess = user => {
    setSessionUser(user)
    setAuthReason('')
    navigate(accountReturnPage === 'account' ? 'home' : accountReturnPage)
    notify('¡Bienvenido a MORF.!')
  }

  const logout = async () => {
    if (!window.confirm('¿Cerrar sesión? Tus planes y reservas seguirán en tu cuenta.')) return
    try {
      await cerrarSesion()
      navigate('home')
      notify('Sesión cerrada. Podés seguir como invitado.')
    } catch (error) {
      notify(mensajeErrorAuth(error))
    }
  }

  // Las cuentas anónimas se vinculan con email al registrarse, conservando el UID.

  // Escuchar los planes creados por este usuario.
useEffect(() => {
  if (!userId) {
    setPlans([])
    setPlansLoading(true)
    return
  }

  setPlans([])
  setPlansLoading(true)
  const q = query(
    collection(db, 'planes'),
    where('ownerId', '==', userId)
  )

  const unsubscribe = onSnapshot(
    q,
    snapshot => {
      const data = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }))

      setPlans(
        data.sort((a, b) => b.createdAt - a.createdAt)
      )
      setPlansLoading(false)
      setPlansError('')
    },
    error => {
      console.error('Error leyendo planes:', error)
      setPlansLoading(false)
      setPlansError(firebaseMessage(error))
    }
  )

  return unsubscribe
}, [userId])

// Escuchar el plan compartido y sus votos en tiempo real.
useEffect(() => {
  if (!userId || !activePlan) {
    setActivePlanData(null)
    setPlanVotes([])
    return
  }

  setPlanLoading(true)
  setPlanError('')
  setActivePlanData(null)
  setPlanVotes([])

  const unsubscribePlan = onSnapshot(
    doc(db, 'planes', activePlan),
    snapshot => {
      setActivePlanData(
        snapshot.exists()
          ? { id: snapshot.id, ...snapshot.data() }
          : null
      )
      setPlanLoading(false)
    },
    error => {
      console.error('Error leyendo plan:', error)
      setPlanError(error.code || error.message)
      setPlanLoading(false)
    }
  )

  const unsubscribeVotes = onSnapshot(
    collection(db, 'planes', activePlan, 'votos'),
    snapshot => {
      setPlanVotes(
        snapshot.docs.map(item => ({
          id: item.id,
          ...item.data()
        }))
      )
    },
    error => {
      console.error('Error leyendo votos:', error)
      setPlanError(error.code || error.message)
    }
  )

  return () => {
    unsubscribePlan()
    unsubscribeVotes()
  }
}, [userId, activePlan])

  // Recuperar enlace de un plan compartido de Firestore.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('plan')

    if (id) {
      setActivePlan(id)
      setPage('vote')
    }
  }, [])

  const notify = msg => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 3500)
  }

  const navigate = next => {
    if (['plans', 'bookings', 'book'].includes(next) && !requireAccount(
      next === 'plans' ? 'crear y consultar planes' : 'hacer y consultar reservas',
      next
    )) return
    if (next !== 'vote' && window.location.search.includes('plan=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
    setPage(next)
    setMobile(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openRestaurant = restaurant => {
    setSelected(restaurant)
    navigate('detail')
  }

  const filtered = useMemo(
    () =>
      restaurants.filter(r => {
        const matchesSearch =
          !queryText ||
          `${r.name} ${r.cuisine} ${r.zone}`
            .toLowerCase()
            .includes(queryText.toLowerCase())

        return (
          matchesSearch &&
          (cuisine === 'Todas' || r.cuisine === cuisine) &&
          (zone === 'Todas' || r.zone === zone) &&
          (price === 'Todos' || r.price === Number(price)) &&
          (!showFavorites || favorites.includes(r.id))
        )
      }),
    [queryText, cuisine, zone, price, showFavorites, favorites]
  )

  const toggleFavorite = id => {
    if (!requireAccount('guardar favoritos')) return
    const uid = auth.currentUser.uid
    setFavorites(prev => {
      const updated = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      localStorage.setItem(`morf-favorites-${uid}`, JSON.stringify(updated))
      return updated
    })
  }

  const beginBooking = (restaurant, booking = null) => {
    if (!requireAccount('reservar una mesa', 'detail')) return
    setSelected(restaurant)
    setEditingBooking(booking?.id ?? null)

    setBookingForm(
      booking
        ? {
            date: booking.date,
            time: booking.time,
            people: String(booking.people),
            name: booking.name,
            email: booking.email,
            notes: booking.notes ?? ''
          }
        : {
            date: '',
            time: '21:00',
            people: '2',
            name: '',
            email: '',
            notes: ''
          }
    )

    navigate('book')
  }

  // CREATE + UPDATE EN FIRESTORE.
  const saveBooking = async event => {
    event.preventDefault()
    if (!requireAccount('confirmar una reserva', 'book')) return

    if (
      !selected ||
      !bookingForm.date ||
      bookingForm.date < today() ||
      !bookingForm.name.trim() ||
      !/^\S+@\S+\.\S+$/.test(bookingForm.email)
    ) {
      notify('Revisá los datos de la reserva.')
      return
    }

    setSavingBooking(true)

    try {
      const user = auth.currentUser
       if (!user || user.isAnonymous) throw new Error('Se requiere una cuenta registrada.')

      const data = {
        restaurantId: selected.id,
        date: bookingForm.date,
        time: bookingForm.time,
        people: Number(bookingForm.people),
        name: bookingForm.name.trim(),
        email: bookingForm.email.trim(),
        notes: bookingForm.notes.trim(),
        status: 'confirmada',
        userId: user.uid
      }

      if (editingBooking) {
        await updateDoc(
          doc(db, 'reservas', editingBooking),
          data
        )
      } else {
        await addDoc(collection(db, 'reservas'), {
          ...data,
          createdAt: Date.now()
        })
      }

      setEditingBooking(null)
      navigate('bookings')
      notify('¡Reserva guardada en Firebase!')
    } catch (error) {
      console.error('Error guardando reserva:', error)
      notify('No se pudo guardar la reserva. Revisá Firestore.')
    } finally {
      setSavingBooking(false)
    }
  }

  // DELETE EN FIRESTORE.
  const deleteBooking = async bookingId => {
    if (!requireAccount('modificar tus reservas', 'bookings')) return
    if (!window.confirm('¿Eliminar esta reserva?')) return

    try {
      await deleteDoc(doc(db, 'reservas', bookingId))
      notify('Reserva eliminada.')
    } catch (error) {
      console.error('Error eliminando reserva:', error)
      notify('No se pudo eliminar la reserva.')
    }
  }

// CREAR PLAN EN FIRESTORE.
const submitPlan = async event => {
  event.preventDefault()
  if (!requireAccount('crear planes', 'plans')) return

  if (!planName.trim() || planOptions.length < 2) {
    notify('Elegí al menos dos restaurantes.')
    return
  }

  setSavingPlan(true)

  try {
    const user = auth.currentUser
       if (!user || user.isAnonymous) throw new Error('Se requiere una cuenta registrada.')

    const nuevoPlan = await addDoc(
      collection(db, 'planes'),
      {
        name: planName.trim(),
        options: planOptions,
        ownerId: user.uid,
        closed: false,
        createdAt: Date.now()
      }
    )

    // Verificamos la lectura antes de anunciar que el plan fue creado.
    const comprobacion = await getDoc(nuevoPlan)
    if (!comprobacion.exists()) {
      throw new Error('El plan se escribió pero no pudo leerse en Firestore.')
    }
    setActivePlan(nuevoPlan.id)
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}?plan=${encodeURIComponent(nuevoPlan.id)}`
    )
    setPlanOptions([])
    setVoterName('')
    setVoterChoice('')

    navigate('vote')
    setPlansError('')
    notify('¡Plan verificado en Firestore! Ya podés compartirlo.')
  } catch (error) {
    console.error('Error creando plan:', error)
    setPlansError(firebaseMessage(error))
    notify(`No se pudo crear el plan: ${firebaseMessage(error)}`)
  } finally {
    setSavingPlan(false)
  }
}

// Combinar datos del plan con sus votos.
const currentPlan = activePlanData
  ? { ...activePlanData, votes: planVotes }
  : null

const alreadyVoted = planVotes.some(
  item => item.id === userId
)

const isPlanOwner = !!(
  currentPlan &&
  userId &&
  currentPlan.ownerId === userId
)

// VOTAR EN FIRESTORE.
const vote = async event => {
  event.preventDefault()

  if (
    !currentPlan ||
    currentPlan.closed ||
    !voterName.trim() ||
    !currentPlan.options.includes(voterChoice) ||
    alreadyVoted ||
    savingVote
  ) {
    return
  }

  setSavingVote(true)

  try {
    const user = auth.currentUser ?? await iniciarSesionAnonima()

    await setDoc(
      doc(db, 'planes', currentPlan.id, 'votos', user.uid),
      {
        voterId: user.uid,
        name: voterName.trim(),
        restaurantId: voterChoice,
        createdAt: Date.now()
      }
    )

    setVoterChoice('')
    notify('¡Tu voto quedó registrado en Firebase!')
  } catch (error) {
    console.error('Error registrando voto:', error)
    notify(`No se pudo registrar el voto: ${firebaseMessage(error)}`)
  } finally {
    setSavingVote(false)
  }
}

// CERRAR VOTACIÓN: solamente el creador.
const closePlan = async () => {
  if (!requireAccount('cerrar una votación', 'vote')) return
  if (!currentPlan || !isPlanOwner || closingPlan) return

  if (!window.confirm('¿Cerrar esta votación?')) return

  setClosingPlan(true)

  try {
    await updateDoc(
      doc(db, 'planes', currentPlan.id),
      { closed: true }
    )

    notify('Votación cerrada correctamente.')
  } catch (error) {
    console.error('Error cerrando plan:', error)
    notify(`No se pudo cerrar la votación: ${firebaseMessage(error)}`)
  } finally {
    setClosingPlan(false)
  }
}

  const chooseQuiz = choice => {
    const question = questions[quizStep]
    const updated = { ...quizAnswers, [question.key]: choice }

    setQuizAnswers(updated)

    if (quizStep === questions.length - 1) {
      setQuizDone(true)
    } else {
      setQuizStep(step => step + 1)
    }
  }

  const quizResults = useMemo(
    () =>
      [...restaurants]
        .map(r => ({
          r,
          score:
            (quizAnswers.cuisine === r.cuisine ? 4 : 0) +
            (quizAnswers.zone === r.zone ? 3 : 0) +
            (r.tags.includes(
              (quizAnswers.occasion ?? '').toLowerCase()
            ) ? 2 : 0) +
            (quizAnswers.price === money(r.price) ? 2 : 0)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.r),
    [quizAnswers]
  )

  const cards = items =>
    items.length ? (
      <div className="restaurant-grid">
        {items.map(r => (
          <article className="restaurant-card" key={r.id}>
            <button
              className="card-image"
              onClick={() => openRestaurant(r)}
              aria-label={`Ver ${r.name}`}
            >
              <img
                src={r.photo}
                alt={`Plato de ${r.cuisine.toLowerCase()}`}
                loading="lazy"
              />
              <span className="image-tag">
                {r.emoji} {r.cuisine}
              </span>
            </button>

            <button
              className={`heart ${favorites.includes(r.id) ? 'active' : ''}`}
              aria-label="Guardar favorito"
              onClick={() => toggleFavorite(r.id)}
            >
              <Heart
                size={21}
                fill={
                  favorites.includes(r.id)
                    ? 'currentColor'
                    : 'none'
                }
              />
            </button>

            <div className="card-body">
              <div className="card-heading">
                <h3>{r.name}</h3>
                <span className="rating">★ {r.rating}</span>
              </div>

              <p className="card-meta">
                <MapPin size={15} /> {r.zone} · {money(r.price)}
              </p>

              <button
                className="text-link"
                onClick={() => openRestaurant(r)}
              >
                VER RESTAURANTE <ArrowUpRight size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <div className="empty">
        
<img
  src="/images/sin-resultados-morf.png"
  alt=""
  className="sin-resultados-morf-img"
/>

        <h3>No encontramos coincidencias</h3>
        <p>Probá con otros filtros.</p>
      </div>
    )

  return (
    <>
      <header className="site-header">
        <button
          className="wordmark"
          onClick={() => navigate('home')}
        >
          MORF<span>.</span>
        </button>

        <nav
          className={mobile ? 'nav open' : 'nav'}
          aria-label="Navegación principal"
        >
          <button
            className={page === 'explore' ? 'active' : ''}
            onClick={() => navigate('explore')}
          >
            Explorar
          </button>

          <button
            className={page === 'quiz' ? 'active' : ''}
            onClick={() => navigate('quiz')}
          >
            ¿Qué pinta?
          </button>

          <button
            className={page === 'plans' ? 'active' : ''}
            onClick={() => navigate('plans')}
          >
            Planes
          </button>

          <button
            className={page === 'bookings' ? 'active' : ''}
            onClick={() => navigate('bookings')}
          >
            Mis reservas
          </button>
          <button className={page === 'account' ? 'active account-mobile' : 'account-mobile'} onClick={openAccount}>
            {sessionUser && !sessionUser.isAnonymous ? 'Mi cuenta' : 'Ingresar / Registrarse'}
          </button>
        </nav>

        <button
          className="header-cta"
          onClick={() => navigate('explore')}
        >
          ENCONTRÁ TU MESA <ArrowUpRight size={17} />
        </button>

        <button className="account-trigger" onClick={openAccount} type="button">
          {sessionUser && !sessionUser.isAnonymous ? 'MI CUENTA' : 'INGRESAR'}
        </button>

        <button
          className="menu-button"
          aria-label="Abrir menú"
          onClick={() => setMobile(!mobile)}
        >
          {mobile ? <X /> : <Menu />}
        </button>
      </header>

      <main>
        {page === 'account' && (
          sessionLoading ? (
            <section className="morf-auth-page"><p role="status">Cargando sesión...</p></section>
          ) : sessionUser && !sessionUser.isAnonymous ? (
            <section className="morf-auth-page">
              <div className="morf-auth-card">
                <span className="eyebrow">TU ESPACIO EN MORF.</span>
                <h1>¡HOLA, {sessionUser.displayName?.trim() || 'MORFADOR'}!</h1>
                <p>Iniciaste sesión como <strong>{sessionUser.email}</strong>.</p>
                <p>Tus reservas y planes están vinculados a esta cuenta.</p>
                <button className="btn primary full" onClick={() => navigate('bookings')}>MIS RESERVAS</button>
                <button className="btn outline full" onClick={() => navigate('plans')}>MIS PLANES</button>
                <button className="btn dark full" onClick={logout}>CERRAR SESIÓN</button>
              </div>
            </section>
          ) : (
            <>
              {authReason && <p className="morf-auth-reason" role="status">{authReason}</p>}
              <AuthForm onSuccess={accountSuccess} onGuest={() => { setAuthReason(''); navigate('home') }} />
            </>
          )
        )}
        {/* HOME */}
        {page === 'home' && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  BUENOS AIRES · COMER RICO · SALIR MEJOR
                </span>

                <h1>
                  ¿DÓNDE<br />
                  <span>MORFAMOS</span><br />
                  HOY<span className="question">?</span>
                </h1>

                <p>
                  Descubrí restaurantes, armá el plan y reservá tu
                  mesa. <strong>Lo difícil es elegir.</strong>
                </p>

                <div className="hero-actions">
                  <button
                    className="btn primary"
                    onClick={() => navigate('explore')}
                  >
                    EXPLORAR RESTAURANTES <ArrowUpRight />
                  </button>

                  <button
                    className="btn outline"
                    onClick={() => navigate('quiz')}
                  >
                    <Sparkles size={18} /> ¿QUÉ PINTA?
                  </button>
                </div>
              </div>

              
<div className="hero-art hero-collage" aria-hidden="true">

  {/* MANCHAS DE COLOR */}
  <div className="collage-blob blob-yellow"></div>
  <div className="collage-blob blob-green"></div>
  <div className="collage-blob blob-pink"></div>

  {/* FOTOGRAFIAS */}
  <img
    className="collage-food collage-ramen"
    src="https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=85"
    alt=""
  />

  <img
    className="collage-food collage-pizza"
    src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85"
    alt=""
  />

  <img
    className="collage-food collage-pasta"
    src="https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=85"
    alt=""
  />

  <img
    className="collage-food collage-sushi"
    src="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=700&q=85"
    alt=""
  />

  {/* ESTRELLA AZUL */}
  <svg
    className="collage-star"
    viewBox="0 0 100 100"
    fill="none"
  >
    <path
      d="M50 2 L61 36 L94 20 L73 49 L99 67 L65 65 L58 99 L43 67 L10 83 L30 53 L1 35 L37 37 Z"
      fill="#1e4089"
    />
  </svg>

  {/* RAYOS AMARILLOS */}
  <svg
    className="collage-rays rays-yellow"
    viewBox="0 0 130 110"
    fill="none"
  >
    <path
      d="M65 8 V37 M24 24 L43 44 M7 66 L36 67 M106 24 L87 44 M123 66 L94 67"
      stroke="#f7c84b"
      strokeWidth="8"
      strokeLinecap="round"
    />
  </svg>

  {/* RAYOS AZULES */}
  <svg
    className="collage-rays rays-blue"
    viewBox="0 0 130 110"
    fill="none"
  >
    <path
      d="M65 8 V37 M24 24 L43 44 M7 66 L36 67 M106 24 L87 44 M123 66 L94 67"
      stroke="#1e4089"
      strokeWidth="8"
      strokeLinecap="round"
    />
  </svg>

  {/* FLECHA DIBUJADA A MANO */}
  <svg
    className="collage-arrow"
    viewBox="0 0 220 150"
    fill="none"
  >
    <path
      d="M10 15 C100 -5 0 100 95 115 C130 122 155 110 195 95"
      stroke="#1e4089"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M170 78 L198 95 L175 117"
      stroke="#1e4089"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>

  {/* STICKER */}
  <span className="collage-sticker">
    ¡QUÉ<br />HAMBRE!
  </span>

</div>

            </section>

            <div className="ticker">
              <div>
                DESCUBRÍ ✳ RESERVÁ ✳ COMPARTÍ ✳ MORFÁ ✳
                DESCUBRÍ ✳ RESERVÁ ✳ COMPARTÍ ✳ MORFÁ ✳
              </div>
            </div>

            
<section className="section categories morf-categories">

  <div className="section-heading">
    <div>
      <span className="eyebrow">
        PARA TODOS LOS ANTOJOS
      </span>

      <h2>
        ¿QUÉ SE TE <em>ANTOJA?</em>
      </h2>
    </div>
  </div>

  <div className="category-grid morf-category-grid">
    {[
      {
        name: 'Hamburguesas',
        image: '/images/categoria-hamburguesas.png'
      },
      {
        name: 'Pizzas',
        image: '/images/categoria-pizzas.png'
      },
      {
        name: 'Pastas',
        image: '/images/categoria-pastas.png'
      },
      {
        name: 'Asiática',
        image: '/images/categoria-asiatica.png'
      },
      {
        name: 'Parrilla',
        image: '/images/categoria-parrilla.png'
      }
    ].map(c => (
      <button
        type="button"
        className="morf-category-card"
        key={c.name}
        onClick={() => {
          setCuisine(c.name)
          navigate('explore')
        }}
      >
        <span className="category-spark" aria-hidden="true">
          ✳
        </span>

        <span className="category-image-wrap">
          <img
            src={c.image}
            alt=""
            className="category-food-image"
          />
        </span>

        <span className="category-card-bottom">
          <span className="category-name">
            {c.name}
          </span>

          <ArrowUpRight size={24} />
        </span>
      </button>
    ))}
  </div>

  <div className="category-bottom-message">
    <span className="category-accent" aria-hidden="true">
      ✳
    </span>

    <p>Elegí una categoría y arrancá por ahí.</p>

    <span className="category-accent" aria-hidden="true">
      ✳
    </span>
  </div>

</section>

            <section className="section featured">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    LUGARES QUE DAN GANAS
                  </span>
                  <h2>
                    PARA <em>CHUPARSE</em><br />
                    LOS DEDOS.
                  </h2>
                </div>

                <button
                  className="text-link"
                  onClick={() => navigate('explore')}
                >
                  VER TODOS <ArrowUpRight />
                </button>
              </div>

              {cards(restaurants.slice(0, 3))}
            </section>

            <section className="plan-banner">
              <div>
                <span className="eyebrow">
                  DECIDIR EN GRUPO NUNCA FUE TAN FÁCIL
                </span>

                <h2>
                  ¿NADIE SE<br />
                  PONE DE <em>ACUERDO?</em>
                </h2>

                <p>
                  Elegí tres lugares, compartí el plan y que vote
                  la banda.
                </p>

                <button
                  className="btn dark"
                  onClick={() => navigate('plans')}
                >
                  ARMAR UN PLAN <ArrowUpRight />
                </button>
              </div>

              
<div className="banner-illustration morf-character" aria-hidden="true">
  <img
    src="/images/personaje-morf.png"
    alt=""
    className="morf-character-img"
  />
</div>

            </section>
          </>
        )}

        {/* EXPLORAR */}
        {page === 'explore' && (
          <section className="section page-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  TODOS LOS ANTOJOS, UN SOLO LUGAR
                </span>
                <h1 className="page-title">
                  SALÍ A <em>MORFAR.</em>
                </h1>
              </div>
              
            </div>

            <div className="filters">
              <label className="search-field">
                <Search size={19} />
                <input
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                  placeholder="Restaurante, comida o barrio..."
                />
              </label>

              <label>
                <span>COMIDA</span>
                <select
                  value={cuisine}
                  onChange={e => setCuisine(e.target.value)}
                >
                  {cuisines.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>BARRIO</span>
                <select
                  value={zone}
                  onChange={e => setZone(e.target.value)}
                >
                  {zones.map(z => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>PRECIO</span>
                <select
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                >
                  <option value="Todos">Todos</option>
                  <option value="1">$</option>
                  <option value="2">$$</option>
                  <option value="3">$$$</option>
                </select>
              </label>
            </div>

            <div className="results-top">
              <span>
                <SlidersHorizontal size={17} /> {filtered.length}
                {' '}restaurantes
              </span>

              <button
                className={`pill ${showFavorites ? 'selected' : ''}`}
                onClick={() => {
                  if (requireAccount('ver tus favoritos', 'explore')) setShowFavorites(!showFavorites)
                }}
              >
                <Heart size={16} /> Solo favoritos
              </button>
            </div>

            {cards(filtered)}
          </section>
        )}

        {/* DETALLE */}
        {page === 'detail' && selected && (
          <section className="section detail-page">
            <button
              className="back"
              onClick={() => navigate('explore')}
            >
              <ArrowLeft size={18} /> VOLVER A EXPLORAR
            </button>

            <div className="detail-layout">
              <div>
                <img
                  className="detail-photo"
                  src={selected.photo}
                  alt={`Comida de ${selected.name}`}
                />

                <div className="detail-copy">
                  <span className="eyebrow">
                    {selected.cuisine.toUpperCase()} ·
                    {' '}{selected.zone.toUpperCase()}
                  </span>

                  <h1 className="page-title">
                    {selected.name}
                  </h1>

                  <p>{selected.description}</p>

                  <div className="detail-chips">
                    <span>
                      ★ {selected.rating} · Puntuación ilustrativa
                    </span>
                    <span>
                      <MapPin size={16} />
                      {selected.zone}, CABA
                    </span>
                    <span>
                      {money(selected.price)} · Precio orientativo
                    </span>
                  </div>
                </div>
              </div>

              <aside className="booking-panel">
                <span className="eyebrow">
                  TU PRÓXIMA SALIDA
                </span>

                <h2>
                  ¿PINTÓ<br />RESERVAR?
                </h2>

                <p>
                  Probá cómo funcionaría una reserva en MORF.
                </p>

                <button
                  className="btn primary full"
                  onClick={() => beginBooking(selected)}
                >
                  RESERVAR MESA <CalendarDays size={18} />
                </button>

                <button
                  className="btn outline full"
                  onClick={() => toggleFavorite(selected.id)}
                >
                  <Heart
                    size={18}
                    fill={
                      favorites.includes(selected.id)
                        ? 'currentColor'
                        : 'none'
                    }
                  />
                  {favorites.includes(selected.id)
                    ? 'GUARDADO'
                    : 'GUARDAR FAVORITO'}
                </button>

                <small>
                  Las reservas de MORF. son académicas:
                  no se envían a los restaurantes.
                </small>
              </aside>
            </div>
          </section>
        )}

        {/* FORMULARIO DE RESERVA */}
        {page === 'book' && isRegistered && selected && (
          <section className="section form-page">
            <button
              className="back"
              onClick={() => navigate('detail')}
            >
              <ArrowLeft size={18} /> VOLVER AL RESTAURANTE
            </button>

            <span className="eyebrow">
              MORF. · RESERVAS
            </span>

            <h1 className="page-title">
              TU MESA <em>TE ESPERA.</em>
            </h1>

            <div className="two-col">
              <form
                className="form-card"
                onSubmit={saveBooking}
              >
                <h2>
                  {editingBooking
                    ? 'MODIFICAR RESERVA'
                    : 'RESERVAR EN ' + selected.name}
                </h2>

                <div className="form-grid">
                  <label>
                    FECHA
                    <input
                      required
                      type="date"
                      min={today()}
                      value={bookingForm.date}
                      onChange={e =>
                        setBookingForm({
                          ...bookingForm,
                          date: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    PERSONAS
                    <select
                      value={bookingForm.people}
                      onChange={e =>
                        setBookingForm({
                          ...bookingForm,
                          people: e.target.value
                        })
                      }
                    >
                      {Array.from({ length: 8 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? 'persona' : 'personas'}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  HORARIO
                  <div className="time-grid">
                    {times.map(t => (
                      <button
                        key={t}
                        type="button"
                        className={
                          bookingForm.time === t ? 'selected' : ''
                        }
                        onClick={() =>
                          setBookingForm({
                            ...bookingForm,
                            time: t
                          })
                        }
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </label>

                <div className="form-grid">
                  <label>
                    NOMBRE Y APELLIDO
                    <input
                      required
                      placeholder="Tu nombre"
                      value={bookingForm.name}
                      onChange={e =>
                        setBookingForm({
                          ...bookingForm,
                          name: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    EMAIL
                    <input
                      required
                      type="email"
                      placeholder="nombre@correo.com"
                      value={bookingForm.email}
                      onChange={e =>
                        setBookingForm({
                          ...bookingForm,
                          email: e.target.value
                        })
                      }
                    />
                  </label>
                </div>

                <label>
                  OBSERVACIONES (OPCIONAL)
                  <textarea
                    rows="3"
                    placeholder="¿Algo que tengamos que saber?"
                    value={bookingForm.notes}
                    onChange={e =>
                      setBookingForm({
                        ...bookingForm,
                        notes: e.target.value
                      })
                    }
                  />
                </label>

                {firebaseError && (
                  <p role="alert">
                    Error de Firebase: {firebaseError}
                  </p>
                )}

                <button
                  className="btn primary full"
                  type="submit"
                  disabled={savingBooking || !firebaseReady}
                >
                  {savingBooking
                    ? 'GUARDANDO...'
                    : editingBooking
                      ? 'GUARDAR CAMBIOS'
                      : 'CONFIRMAR RESERVA'}
                  <Check size={18} />
                </button>

                <p className="fineprint">
                  Esta reserva se guarda en Firebase,
                  pero no consulta disponibilidad real ni
                  se envía al restaurante.
                </p>
              </form>

              <aside className="side-note">
                <img
  src="/images/sin-resultados-morf.png"
  alt=""
  className="reserva-plato-img"
/>
                <h2>
                  BUEN PLAN.<br />MEJOR MESA.
                </h2>
                <p>
                  {selected.name} · {selected.zone}
                </p>
                <p>
                  Tu reserva se guarda en MORF. y queda vinculada a tu cuenta para que puedas consultarla cuando quieras.
                </p>
              </aside>
            </div>
          </section>
        )}

        {/* MIS RESERVAS: READ + UPDATE + DELETE */}
        {page === 'bookings' && isRegistered && (
          <section className="section page-section">
            <span className="eyebrow">
              TUS PLANES CONFIRMADOS
            </span>

            <h1 className="page-title">
              MIS <em>RESERVAS.</em>
            </h1>

            {bookingsLoading ? (
              <div className="empty">
                <span>⏳</span>
                <h3>Cargando tus reservas...</h3>
              </div>
            ) : firebaseError ? (
              <div className="empty">
                <span>⚠️</span>
                <h3>No pudimos cargar tus reservas</h3>
                <p>Error de Firebase: {firebaseError}</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="empty">
                
<img
  src="/images/calendario-morf.png"
  alt=""
  className="calendario-morf-img"
/>

                <h3>Todavía no tenés reservas</h3>
                <p>¿Buscamos un lugar para salir?</p>

                <button
                  className="btn primary"
                  onClick={() => navigate('explore')}
                >
                  EXPLORAR RESTAURANTES
                  <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <div className="booking-list">
                {bookings.map(b => {
                  const restaurant = restaurants.find(
                    r => r.id === b.restaurantId
                  )

                  return (
                    <article
                      className="booking-item"
                      key={b.id}
                    >
                     <div className="booking-icon">
  <img
    src="/images/reserva-morf.png"
    alt="Reserva confirmada"
    className="reserva-morf-img"
  />
</div>

                      <div>
                        <span className="eyebrow">
                          RESERVA ACADÉMICA · REGISTRADA
                        </span>

                        <h3>
                          {restaurant?.name ?? 'Restaurante'}
                        </h3>

                        <p>
                          <CalendarDays size={16} />
                          {' '}{prettyDate(b.date)} ·
                          {' '}{b.time} hs ·
                          {' '}{b.people} personas
                        </p>

                        <p>A nombre de {b.name}</p>
                      </div>

                      <div className="booking-actions">
                        <button
                          className="btn outline"
                          disabled={!restaurant}
                          onClick={() =>
                            beginBooking(restaurant, b)
                          }
                        >
                          MODIFICAR
                        </button>

                        <button
                          className="icon-button"
                          aria-label="Eliminar reserva"
                          onClick={() => deleteBooking(b.id)}
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* CUESTIONARIO */}
        {page === 'quiz' && (
          <section className="section quiz-page">
            <div className="quiz-card">
              <div className="quiz-top">
                <span>MORF. / ¿QUÉ PINTA?</span>
                <span>
                  {quizDone
                    ? 'LISTO'
                    : `${quizStep + 1} / ${questions.length}`}
                </span>
              </div>

              <div className="progress">
                {questions.map((_, i) => (
                  <span
                    key={i}
                    className={
                      quizDone || i <= quizStep
                        ? 'filled'
                        : ''
                    }
                  />
                ))}
              </div>

              {!quizDone ? (
                <>
                  <div className="quiz-intro">
                    <span className="eyebrow">
                      DESCUBRÍ TU PRÓXIMO ANTOJO
                    </span>

                    <h1>
                      {questions[quizStep].title}
                    </h1>

                    <p>
                      {questions[quizStep].subtitle}
                    </p>
                  </div>

                  <div className="choice-grid">
                    {questions[quizStep].choices.map(c => (
                      <button
                        key={c}
                        onClick={() => chooseQuiz(c)}
                      >
                        {c}
                        <ArrowUpRight size={20} />
                      </button>
                    ))}
                  </div>

                  <button
                    className="back quiz-back"
                    disabled={quizStep === 0}
                    onClick={() =>
                      setQuizStep(step => step - 1)
                    }
                  >
                    <ArrowLeft size={17} /> VOLVER
                  </button>
                </>
              ) : (
                <>
                  <div className="quiz-intro">
                    <span className="eyebrow">
                      TENEMOS UNAS IDEAS PARA VOS
                    </span>

                    <h1>
                      ¡ESTO TE VA A <em>GUSTAR!</em>
                    </h1>

                    <p>
                      Elegimos estos lugares según tus respuestas.
                    </p>
                  </div>

                  <div className="quiz-results">
                    {quizResults.map(r => (
                      <button
                        key={r.id}
                        onClick={() => openRestaurant(r)}
                      >
                        <span>{r.emoji}</span>
                        <strong>{r.name}</strong>
                        
                        <ArrowUpRight />
                      </button>
                    ))}
                  </div>

                  <button
                    className="btn outline"
                    onClick={() => {
                      setQuizStep(0)
                      setQuizDone(false)
                      setQuizAnswers({})
                    }}
                  >
                    <RotateCcw size={17} />
                    VOLVER A EMPEZAR
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {/* CREAR PLAN: FIRESTORE */}
        {page === 'plans' && isRegistered && (
          <section className="section page-section">
            <span className="eyebrow">
              CON AMIGOS TODO ES MEJOR
            </span>

            <h1 className="page-title">
              ARMÁ <em>EL PLAN.</em>
            </h1>

            <p className="intro-text">
              Elegí entre dos y tres restaurantes.
              Compartí el enlace y que vote la banda.
            </p>

            <div className="two-col">
              <form
                className="form-card"
                onSubmit={submitPlan}
              >
                <h2>PLAN NUEVO ✳</h2>

                <label>
                  NOMBRE DEL PLAN
                  <input
                    required
                    value={planName}
                    onChange={e =>
                      setPlanName(e.target.value)
                    }
                    placeholder="Ej: Cena del viernes"
                  />
                </label>

                <label>
                  ELEGÍ 2 O 3 RESTAURANTES
                </label>

                <div className="plan-options">
                  {restaurants.map(r => (
                    <button
                      type="button"
                      key={r.id}
                      className={
                        planOptions.includes(r.id)
                          ? 'chosen'
                          : ''
                      }
                      onClick={() =>
                        setPlanOptions(prev =>
                          prev.includes(r.id)
                            ? prev.filter(id => id !== r.id)
                            : prev.length < 3
                              ? [...prev, r.id]
                              : prev
                        )
                      }
                    >
                      <span>{r.emoji}</span>
                      <strong>{r.name}</strong>
                      <small>{r.zone}</small>

                      {planOptions.includes(r.id)
                        ? <Check size={18} />
                        : <Plus size={18} />}
                    </button>
                  ))}
                </div>

                <button
                  className="btn primary full"
                  type="submit"
                  disabled={savingPlan || !firebaseReady || planOptions.length < 2}
                >
                  {savingPlan ? 'CREANDO PLAN...' : 'CREAR PLAN'}
                  <ArrowRight size={18} />
                </button>
              </form>

              <aside className="side-note">
                
<img
  src="/images/grupo-decide.png"
  alt="Urna de votación con opciones gastronómicas"
  className="grupo-decide-img"
/>


                <h2>
                  EL GRUPO<br />DECIDE.
                </h2>

                <p>
                  Elegí restaurantes, compartí el enlace y voten desde sus celulares.
                </p>

                <p className="fineprint">
                  Los planes y los votos se guardan en Firebase
                  y se actualizan en tiempo real.
                </p>
              </aside>
            </div>

            {plansError && (
              <p role="alert" style={{ color: '#c63816', fontWeight: 700 }}>
                Error de Firestore: {plansError}
              </p>
            )}

            {firebaseError && (
              <p role="alert">Error de autenticación: {firebaseError}</p>
            )}

            {plansLoading && (
              <p role="status">Cargando tus planes...</p>
            )}

            {!plansLoading && plans.length > 0 && (
              <div className="saved-plans">
                <h2>TUS PLANES</h2>

                {plans.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      navigate('vote')
                      setActivePlan(p.id)
                      window.history.replaceState(
                        {},
                        '',
                        `${window.location.pathname}?plan=${encodeURIComponent(p.id)}`
                      )
                    }}
                  >
                    <strong>{p.name}</strong>
                    <span>
                      {p.closed ? 'Votación cerrada' : 'Votación abierta'}
                    </span>
                    <ArrowRight size={18} />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* VOTACIÓN COMPARTIDA: FIRESTORE EN TIEMPO REAL */}
        {page === 'vote' && (
          <section className="section page-section vote-page">
            <button className="back" onClick={() => navigate('plans')}>
              <ArrowLeft size={18} /> VOLVER A PLANES
            </button>

            {planLoading || !userId ? (
              <div className="empty" role="status">
                <span>⏳</span>
                <h2>Cargando la votación...</h2>
              </div>
            ) : planError ? (
              <div className="empty" role="alert">
                <span>⚠️</span>
                <h2>No pudimos abrir el plan</h2>
                <p>Firebase: {planError}</p>
                <p>Revisá las reglas de Firestore y el enlace compartido.</p>
              </div>
            ) : !currentPlan ? (
              <div className="empty">
                <h2>Este plan no existe o ya no está disponible.</h2>
                <button className="btn primary" onClick={() => navigate('plans')}>
                  CREAR UN PLAN
                </button>
              </div>
            ) : (
              <>
                <span className="eyebrow">LA BANDA DECIDE</span>
                <h1 className="page-title">
                  ¿DÓNDE <em>MORFAMOS?</em>
                </h1>
                <p className="intro-text">
                  {currentPlan.name} ·{' '}
                  {currentPlan.closed ? 'Votación cerrada' : 'Elegí tu favorito'}
                </p>

                <div className="two-col">
                  <form className="form-card" onSubmit={vote}>
                    <h2>VOTÁ TU FAVORITO</h2>
                    <div className="vote-options">
                      {currentPlan.options.map(id => {
                        const r = restaurants.find(item => item.id === id)
                        return (
                          <button
                            type="button"
                            key={id}
                            disabled={currentPlan.closed || alreadyVoted || savingVote}
                            className={voterChoice === id ? 'chosen' : ''}
                            onClick={() => setVoterChoice(id)}
                          >
                            <span>{r?.emoji ?? '🍽️'}</span>
                            <strong>{r?.name ?? 'Restaurante'}</strong>
                            <small>{r?.zone ?? ''}</small>
                            {voterChoice === id ? <Check /> : <ArrowUpRight />}
                          </button>
                        )
                      })}
                    </div>

                    <label>
                      TU NOMBRE
                      <input
                        required
                        maxLength={60}
                        value={voterName}
                        disabled={currentPlan.closed || alreadyVoted || savingVote}
                        onChange={e => setVoterName(e.target.value)}
                        placeholder="¿Cómo te llamás?"
                      />
                    </label>

                    {alreadyVoted && (
                      <p role="status">¡Ya votaste! Tu elección quedó guardada.</p>
                    )}

                    <button
                      className="btn primary full"
                      type="submit"
                      disabled={
                        currentPlan.closed ||
                        alreadyVoted ||
                        savingVote ||
                        !voterChoice ||
                        !voterName.trim()
                      }
                    >
                      {currentPlan.closed
                        ? 'VOTACIÓN CERRADA'
                        : alreadyVoted
                          ? 'YA VOTASTE'
                          : savingVote
                            ? 'ENVIANDO VOTO...'
                            : 'ENVIAR MI VOTO'}
                      <Vote size={18} />
                    </button>
                  </form>

                  <aside className="results-panel">
                    <h2>ASÍ VIENE LA VOTACIÓN</h2>
                    {currentPlan.options.map(id => {
                      const r = restaurants.find(item => item.id === id)
                      const count = currentPlan.votes.filter(
                        v => v.restaurantId === id
                      ).length
                      const percent = currentPlan.votes.length
                        ? (count / currentPlan.votes.length) * 100
                        : 0

                      return (
                        <div className="vote-result" key={id}>
                          <div>
                            <strong>{r?.name ?? 'Restaurante'}</strong>
                            <span>{count} {count === 1 ? 'voto' : 'votos'}</span>
                          </div>
                          <div className="bar">
                            <span style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      )
                    })}

                    <p>{currentPlan.votes.length} votos en total · en tiempo real</p>

                    <button
                      className="btn outline full"
                      type="button"
                      onClick={async () => {
                        const url = sharedPlanUrl(currentPlan.id)
                        try {
                          await navigator.clipboard.writeText(url.toString())
                          notify('¡Enlace copiado! Compartilo con la banda.')
                        } catch {
                          window.prompt('Copiá este enlace:', url.toString())
                        }
                      }}
                    >
                      <Share2 size={17} /> COPIAR ENLACE
                    </button>

                    {isPlanOwner && (
                      <button
                        className="btn dark full"
                        type="button"
                        disabled={currentPlan.closed || closingPlan}
                        onClick={closePlan}
                      >
                        {currentPlan.closed
                          ? 'VOTACIÓN CERRADA'
                          : closingPlan
                            ? 'CERRANDO...'
                            : 'CERRAR VOTACIÓN'}
                        <Check size={17} />
                      </button>
                    )}

                    <p className="fineprint">
                      Los votos se sincronizan entre dispositivos mediante Firebase.
                      Cada usuario puede votar una sola vez por plan.
                    </p>
                  </aside>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="footer-top">
          <strong>MORF.</strong>
          <span>
            TODOS LOS ANTOJOS. UN SOLO LUGAR.
          </span>
        </div>

        <div className="footer-bottom">
          <span>
            Hecho con hambre en Buenos Aires · Proyecto académico · {APP_VERSION}
          </span>
          <span>© MORF. 2026</span>
        </div>
      </footer>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  )
}

export default App
