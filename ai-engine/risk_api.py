from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import os

app = FastAPI(title="AI Risk Engine API", description="Evaluates transaction requests based on contextual ABAC factors.")

# Enable CORS so the React frontend can talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to http://localhost:5174
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variable
model = None

@app.on_event("startup")
def load_model():
    global model
    model_path = os.path.join(os.path.dirname(__file__), 'risk_model.pkl')
    if not os.path.exists(model_path):
        raise RuntimeError(f"Model file not found at {model_path}. Please run train_model.py first.")
    
    model = joblib.load(model_path)
    print(f"Successfully loaded Risk Model from {model_path}")

class TransactionRequest(BaseModel):
    role_level: int
    asset_sensitivity: int
    hour_of_day: int
    is_known_device: int
    recent_transfers_count: int
    failed_login_attempts: int

@app.post("/evaluate")
def evaluate_risk(req: TransactionRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model is not loaded.")

    # Convert request payload into DataFrame matching training feature names
    features_dict = {
        'role_level': req.role_level,
        'asset_sensitivity': req.asset_sensitivity,
        'hour_of_day': req.hour_of_day,
        'is_known_device': req.is_known_device,
        'recent_transfers_count': req.recent_transfers_count,
        'failed_login_attempts': req.failed_login_attempts
    }
    
    df = pd.DataFrame([features_dict])
    
    # Predict the raw score
    predicted_score = model.predict(df)[0]
    score = int(round(predicted_score))
    
    # Ensure score bounds 0-100
    score = max(0, min(100, score))
    
    # Evaluate decision logic
    if score <= 29:
        level = "LOW"
        decision = "ALLOW"
    elif score <= 69:
        level = "MEDIUM"
        decision = "ALLOW + AUDIT"
    elif score <= 89:
        level = "HIGH"
        decision = "REQUIRE_APPROVAL"
    else:
        level = "CRITICAL"
        decision = "BLOCK + ALERT"
        
    return {
        "risk_score": score,
        "risk_level": level,
        "decision": decision,
        "factors": features_dict
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": model is not None}
