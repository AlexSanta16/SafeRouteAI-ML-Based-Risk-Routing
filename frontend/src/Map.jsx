import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import L from 'leaflet';
import customIcon from './util/marker.png';

const DefaultIcon = L.icon({
  iconUrl: customIcon,
  iconSize: [30, 30],
  iconAnchor: [12, 41],
});

function LocationSelector({ onMapClick }) {
  useMapEvent({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function Map({ markers, onMapClick, route, hotspots }) {
  const [animatedRoute, setAnimatedRoute] = useState([]);

  useEffect(() => {
    if (!route || route.length === 0) {
      setAnimatedRoute([]);
      return;
    }
    let index = 0;
    setAnimatedRoute([]);
    const interval = setInterval(() => {
      index++;
      setAnimatedRoute(route.slice(0, index));

      if (index >= route.length) 
        clearInterval(interval);
      
    }, 2000 / route.length);
    return () => clearInterval(interval);
  }, [route]);

  return (
    <MapContainer
      center={[41.8781,  -87.6298]}
      zoom={14}
      minZoom={15}
      maxZoom={15}
      zoomControl={false}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <LocationSelector onMapClick={onMapClick} />

      {markers?.map((pos, idx) => (
        <Marker key={`marker-${idx}`} position={pos} icon={DefaultIcon}>
          <Popup>{idx === 0 ? '📍 Start' : '🏁 Destination'}</Popup>
        </Marker>
      ))}

      {hotspots?.length > 0 && (
        <HeatmapLayer
          points={hotspots}
          latitudeExtractor={(m) => m[0]}
          longitudeExtractor={(m) => m[1]}
          intensityExtractor={() => 1}
          radius={50}
          blur={25}
          max={1}
          minOpacity={0.2}
          gradient={{
            0.0: 'rgba(0,0,0,0)',
            0.2: '#a3d8ff',
            0.4: '#3399ff',
            0.6: '#f1c40f',
            0.8: '#e67e22',
            1.0: '#d9534f',
          }}
        />
      )}

      <Polyline
        positions={animatedRoute}
        pathOptions={{ color: 'blue', weight: 6, opacity: 0.6 }}
      />
    </MapContainer>
  );
}
