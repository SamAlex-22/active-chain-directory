from fastapi.testclient import TestClient
from risk_api import app

def test_health_check():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "model_loaded": True}

def test_evaluate_risk_low():
    # Simulate an ADMIN (role_level=4) transferring during business hours (hour=14)
    payload = {
        "role_level": 4,
        "asset_sensitivity": 5,
        "hour_of_day": 14,
        "is_known_device": 1,
        "recent_transfers_count": 0,
        "failed_login_attempts": 0
    }
    with TestClient(app) as client:
        response = client.post("/evaluate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "risk_score" in data
        assert data["decision"] in ["ALLOW", "ALLOW + AUDIT"]

def test_evaluate_risk_high():
    # Simulate a USER (role_level=1) transferring a highly sensitive asset (10)
    # during off-hours (3 AM) from an unknown device, with failed logins
    payload = {
        "role_level": 1,
        "asset_sensitivity": 10,
        "hour_of_day": 3,
        "is_known_device": 0,
        "recent_transfers_count": 15,
        "failed_login_attempts": 8
    }
    with TestClient(app) as client:
        response = client.post("/evaluate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "risk_score" in data
        assert data["decision"] in ["REQUIRE_APPROVAL", "BLOCK + ALERT"]
