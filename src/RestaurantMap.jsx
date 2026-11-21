
import React, { useEffect, useState, useRef } from 'react'
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader
} from '@react-google-maps/api'


const centroBuenosAires = {
  lat: -34.6037,
  lng: -58.3816
}

const estiloMapa = {
  width: '100%',
  height: '500px',
  borderRadius: '20px'
}

async function obtenerCoordenadas(restaurantes) {
  const geocoder = new window.google.maps.Geocoder()

  const resultados = await Promise.all(
    restaurantes.map(async restaurante => {
      try {
        const respuesta = await geocoder.geocode({
          address: restaurante.mapsQuery,
          region: 'AR'
        })

        const ubicacion = respuesta.results[0]?.geometry?.location

        if (!ubicacion) {
          console.warn('Sin ubicación:', restaurante.name)
          return null
        }

        return {
          ...restaurante,
          lat: ubicacion.lat(),
          lng: ubicacion.lng()
        }
      } catch (error) {
        console.error(
          `No se pudo ubicar ${restaurante.name}:`,
          error
        )
        return null
      }
    })
  )

  return resultados.filter(Boolean)
}

export default function RestaurantMap({
  restaurants,
  selectedRestaurant,
  onSelectRestaurant
}) {
  const [seleccionado, setSeleccionado] = useState(null)
  const [ubicados, setUbicados] = useState([])
  const [cargandoUbicaciones, setCargandoUbicaciones] = useState(true)
const mapRef = useRef(null)
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'morf-google-map',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  })

  useEffect(() => {
    if (!isLoaded) return

    let activo = true

    async function cargarUbicaciones() {
      setCargandoUbicaciones(true)

      try {
        const resultados = await obtenerCoordenadas(restaurants)

        if (activo) {
          setUbicados(resultados)
          console.log('Restaurantes ubicados:', resultados)
        }
      } catch (error) {
        console.error('Error al cargar ubicaciones:', error)
      } finally {
        if (activo) {
          setCargandoUbicaciones(false)
        }
      }
    }

    cargarUbicaciones()

    return () => {
      activo = false
    }
}, [isLoaded, restaurants])

useEffect(() => {
  if (!selectedRestaurant || !mapRef.current || ubicados.length === 0) {
    return
  }

  const restaurante = ubicados.find(
    r => r.id === selectedRestaurant.id
  )

  if (!restaurante) return

  mapRef.current.panTo({
    lat: restaurante.lat,
    lng: restaurante.lng
  })

  mapRef.current.setZoom(15)
  setSeleccionado(restaurante)

}, [selectedRestaurant, ubicados])

  if (loadError) {
    return <p>No se pudo cargar Google Maps.</p>
  }

  if (!isLoaded) {
    return <p>Cargando mapa...</p>
  }

  return (
    <div className="morf-map-container">
      <p>
        {cargandoUbicaciones
          ? 'Buscando restaurantes en el mapa...'
          : `${ubicados.length} de ${restaurants.length} restaurantes ubicados`}
      </p>

      <GoogleMap
  mapContainerStyle={estiloMapa}
  center={centroBuenosAires}
  zoom={12}
  onLoad={map => {
    mapRef.current = map
  }}
  onUnmount={() => {
    mapRef.current = null
  }}
>
       {ubicados.map(restaurante => (
  <Marker
    key={restaurante.id}
    position={{
      lat: restaurante.lat,
      lng: restaurante.lng
    }}
    title={restaurante.name}
    icon={{
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
  fillColor: '#FF4B1F',
  fillOpacity: 1,
  strokeColor: '#21458F',
  strokeWeight: 1,
  scale: 1.7,
  anchor: new window.google.maps.Point(12, 22)
}}
    onClick={() => setSeleccionado(restaurante)}
  />
))}

        {seleccionado && (
          <InfoWindow
            position={{
              lat: seleccionado.lat,
              lng: seleccionado.lng
            }}
            onCloseClick={() => setSeleccionado(null)}
          >
            <div className="morf-map-info">
  <div className="morf-map-info-header">
    <svg
      className="morf-map-info-pin"
      viewBox="0 0 24 32"
      aria-hidden="true"
    >
      <path
        d="M12 1C5.9 1 1 5.9 1 12c0 8 11 19 11 19s11-11 11-19C23 5.9 18.1 1 12 1Z"
        fill="#FF401A"
      />
      <circle cx="12" cy="12" r="4.5" fill="#FFF7EA" />
    </svg>

    <h3>{seleccionado.name}</h3>
  </div>

  <p>
    {seleccionado.cuisine} · {seleccionado.zone}
  </p>

  <button
    type="button"
    onClick={() => onSelectRestaurant(seleccionado)}
  >
    VER RESTAURANTE →
  </button>
</div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
