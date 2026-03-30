import requests
import json

def test_api():
    url = "http://localhost:8000/predict"
    
    # Test case 1: Highly Accessible
    payload_1 = {
        "Surface_Type": "asphalt",
        "Smoothness": "excellent",
        "Incline_Percent": 1.0,
        "Path_Width_m": 2.5,
        "Kerb_Type": "flush",
        "Has_Obstacle": "no",
        "Obstacle_Type": "none"
    }
    
    # Test case 2: Not Accessible
    payload_2 = {
        "Surface_Type": "gravel",
        "Smoothness": "very_bad",
        "Incline_Percent": 12.0,
        "Path_Width_m": 0.8,
        "Kerb_Type": "raised",
        "Has_Obstacle": "yes",
        "Obstacle_Type": "utility_pole"
    }

    print("Testing Case 1 (Expected: highly_accessible)...")
    try:
        response = requests.post(url, json=payload_1)
        print(response.json())
    except Exception as e:
        print(f"Error: {e}")

    print("\nTesting Case 2 (Expected: not_accessible)...")
    try:
        response = requests.post(url, json=payload_2)
        print(response.json())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
