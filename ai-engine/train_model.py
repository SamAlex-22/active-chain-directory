import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

def generate_synthetic_data(num_samples=1500):
    np.random.seed(42)
    
    # role_level (1=User, 2=Auditor, 3=Manager, 4=Admin)
    role_level = np.random.choice([1, 2, 3, 4], size=num_samples, p=[0.6, 0.1, 0.2, 0.1])
    
    # asset_sensitivity (1-10)
    asset_sensitivity = np.random.randint(1, 11, size=num_samples)
    
    # hour_of_day (0-23)
    hour_of_day = np.random.randint(0, 24, size=num_samples)
    
    # is_known_device (0 or 1)
    is_known_device = np.random.choice([0, 1], size=num_samples, p=[0.2, 0.8])
    
    # recent_transfers_count (0-20)
    recent_transfers_count = np.random.randint(0, 21, size=num_samples)
    
    # failed_login_attempts (0-10)
    failed_login_attempts = np.random.randint(0, 11, size=num_samples)
    
    df = pd.DataFrame({
        'role_level': role_level,
        'asset_sensitivity': asset_sensitivity,
        'hour_of_day': hour_of_day,
        'is_known_device': is_known_device,
        'recent_transfers_count': recent_transfers_count,
        'failed_login_attempts': failed_login_attempts
    })
    
    # Calculate Risk Score (0-100) based on contextual factors
    # Base risk driven by asset sensitivity
    base_risk = df['asset_sensitivity'] * 4 
    
    # Unknown devices are suspicious
    device_risk = (1 - df['is_known_device']) * 25
    
    # Activity during off-hours (midnight to 5 AM, or 11 PM) adds risk
    hour_risk = df['hour_of_day'].apply(lambda h: 15 if h < 6 or h > 22 else 0)
    
    # Failed logins heavily penalize the score
    login_risk = df['failed_login_attempts'] * 6
    
    # High velocity transfers adds some risk
    velocity_risk = df['recent_transfers_count'] * 1.5
    
    # Higher roles reduce base risk slightly (trusted insiders)
    role_reduction = df['role_level'] * 5
    
    # Compute total
    risk_score = base_risk + device_risk + hour_risk + login_risk + velocity_risk - role_reduction
    
    # Clip between 0 and 100
    df['risk_score'] = np.clip(risk_score, 0, 100)
    
    return df

if __name__ == "__main__":
    print("Generating synthetic transaction data...")
    df = generate_synthetic_data(1500)
    
    X = df.drop(columns=['risk_score'])
    y = df['risk_score']
    
    print("Training RandomForestRegressor model...")
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X, y)
    
    # Evaluate loosely on training set to verify it learned
    score = model.score(X, y)
    print(f"Model R^2 Score on Training Data: {score:.3f}")
    
    model_path = os.path.join(os.path.dirname(__file__), 'risk_model.pkl')
    joblib.dump(model, model_path)
    print(f"Model successfully saved to {model_path}")
