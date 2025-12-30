import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib

data = pd.read_csv('chicago_crimes.csv', usecols=['Date', 'Latitude', 'Longitude'])
data = data.dropna()

data['Date'] = pd.to_datetime(data['Date'], format='%m/%d/%Y %I:%M:%S %p')
data['Hour'] = data['Date'].dt.hour

crime_data = data[['Latitude', 'Longitude', 'Hour']].copy()
crime_data['Target'] = 1

num_safe = len(crime_data)

safe_data = pd.DataFrame({
    'Latitude': np.random.uniform(data['Latitude'].min(), data['Latitude'].max(), num_safe),
    'Longitude': np.random.uniform(data['Longitude'].min(), data['Longitude'].max(), num_safe),
    'Hour': np.random.randint(0, 24, num_safe),
    'Target': 0
})

data_final = pd.concat([crime_data, safe_data]).sample(frac=1).reset_index(drop=True)

X = data_final[['Latitude', 'Longitude', 'Hour']]
y = data_final['Target']

model = RandomForestClassifier(n_estimators=100, n_jobs=-1, random_state=42)
model.fit(X, y)

joblib.dump(model, 'model_risk.pkl')