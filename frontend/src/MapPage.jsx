import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Map from './Map';
import './styles/MapPage.css'; 

const HomePage = () => {
  const [markers, setMarkers] = useState([]);
  const [route, setRoute] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [hour, setHour] = useState(23);
  const [type, setType] = useState('walk'); 
  const [safe, setSafe] = useState(6); 
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/get-hotspots', {
          params: { hour }
        });
        setHotspots(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchHotspots();
  }, [hour]);

  const handleMapClick = (latlng) => {
    if (markers.length >= 2) {
      setMarkers([latlng]);
      setRoute([]);
    } else {
      setMarkers([...markers, latlng]);
    }
  };

  const handleRoute = async () => {
    if (markers.length < 2) {
      setErrorMsg("Select start and destination on the map");
      return;
    }
    setErrorMsg("");

    const start = markers[0];
    const end = markers[1];

    try {
      const response = await axios.get('http://127.0.0.1:8000/get-route', {
        params: {
          start_lat: start.lat,
          start_lon: start.lng,
          end_lat: end.lat,
          end_lon: end.lng,
          hour: hour,
          type: type,
          safe: safe
        }
      });

      if (response.data.status === "success") {
        const polyline = response.data.route.map(
          ([lon, lat]) => [lat, lon]
        );
        setRoute(polyline);
      }
    } catch (error) {
      console.error("Error calling the backend:", error);
      setErrorMsg("Error calculating route");
    }
  };

  return (
    <div className="page-container">

      <div className="floating-card">
        <h2 className="card-title">Route Planner</h2>

        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        <div className="control-group">
          <label>Time: <strong>{hour}:00</strong></label>
          <input
            type="range"
            min="0"
            max="23"
            step="1"
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label>Mode</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="walk">Walk</option>
            <option value="drive">Drive</option>
          </select>
        </div>

        <div className="control-group">
          <label>Preference</label>
          <select value={safe} onChange={(e) => setSafe(Number(e.target.value))}>
            <option value={0}>Fastest (Short)</option>
            <option value={6}>Safest</option>
          </select>
        </div>

        <button className="action-btn" onClick={handleRoute}>
          Generate Route
        </button>
      </div>

      <div className="map-container">
        <Map
          route={route}
          markers={markers}
          hotspots={hotspots}
          onMapClick={handleMapClick}
        />
      </div>

    </div>
  );
};

export default HomePage;
