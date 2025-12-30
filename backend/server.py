from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import osmnx as ox
import networkx as nx
import joblib
import pandas as pd
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["*"],
    allow_methods=["*"],
)

# Cache risk scores to speed up requests
risk_cache = {}

model = joblib.load('model_risk.pkl')

# Chicago center coordinates and area radius
center_lat, center_lon = 41.8781, -87.6298
dist = 3000  # meters

G_sub_drive = ox.graph_from_point((center_lat, center_lon), dist=dist, network_type='drive')
G_sub_walk = ox.graph_from_point((center_lat, center_lon), dist=dist, network_type='walk')

@app.get("/get-route")
async def get_safe_route(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    hour: int,
    type: str = "walk",
    safe: int = 7
):
    G_sub = G_sub_walk if type == "walk" else G_sub_drive
    cache_key = (hour, type)

    if cache_key in risk_cache:
        risk_scores, edges_list = risk_cache[cache_key]
    else:
        edges_data = []
        edges_list = []
        for u, v, d in G_sub.edges(data=True):
            lat = G_sub.nodes[u]['y']
            lon = G_sub.nodes[u]['x']
            edges_data.append([lat, lon, hour])
            edges_list.append((u, v, d))

        # Predict risk for each edge
        data_edges = pd.DataFrame(edges_data, columns=['Latitude', 'Longitude', 'Hour'])
        risk_scores = model.predict_proba(data_edges)[:, 1]

        # Save to cache
        risk_cache[cache_key] = (risk_scores, edges_list)

    # Apply safety penalty to edge weights
    k = safe
    for idx, (u, v, d) in enumerate(edges_list):
        risk = risk_scores[idx]
        length = d.get('length', 1)
        multiplier = np.exp(k * risk)
        d['weight'] = length * multiplier

    try:
        start_node = ox.distance.nearest_nodes(G_sub, X=start_lon, Y=start_lat)
        end_node = ox.distance.nearest_nodes(G_sub, X=end_lon, Y=end_lat)

        route = nx.shortest_path(G_sub, start_node, end_node, weight='weight')
        route_coords = [[G_sub.nodes[n]['x'], G_sub.nodes[n]['y']] for n in route]

        return {"status": "success", "route": route_coords}
    except Exception as e:
        return {"status": "error", "message": str(e)}

data_crimes = pd.read_csv('chicago_crimes.csv', usecols=['Date', 'Latitude', 'Longitude']).dropna()
try:
    data_crimes['Date'] = pd.to_datetime(data_crimes['Date'], format='%m/%d/%Y %I:%M:%S %p')
except:
    data_crimes['Date'] = pd.to_datetime(data_crimes['Date'], format='mixed')

data_crimes['Hour'] = data_crimes['Date'].dt.hour

@app.get("/get-hotspots")
def get_hotspots(hour: int = 23):
    filtered_crimes = data_crimes[data_crimes['Hour'] == hour]

    sample_size = min(len(filtered_crimes), 15000)

    hotspots = filtered_crimes[['Latitude', 'Longitude']].sample(sample_size).values.tolist()

    return {"status": "success", "data": hotspots}
