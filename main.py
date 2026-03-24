from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI(title="Wheelchair Accessibility API")

# Load the trained model pipeline
model_path = "accessibility_model.pkl"
try:
    model = joblib.load(model_path)
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

class PathFeatures(BaseModel):
    Surface_Type: str
    Smoothness: str
    Incline_Percent: float
    Path_Width_m: float
    Kerb_Type: str
    Has_Obstacle: str
    Obstacle_Type: str

@app.get("/")
def home():
    return {"message": "Wheelchair Accessibility Prediction API is running."}

@app.post("/predict")
def predict_accessibility(features: PathFeatures):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded.")
    
    # Convert input features to DataFrame for the model
    input_df = pd.DataFrame([features.dict()])
    
    try:
        prediction = model.predict(input_df)[0]
        # In a real app, you might also return a confidence score
        return {
            "prediction_label": prediction,
            "input_features": features.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
