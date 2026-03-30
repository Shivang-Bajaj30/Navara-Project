import pandas as pd
import numpy as np
import random
from sklearn.utils import shuffle

def clean_and_expand_data(input_path, output_path):
    # Load the excel file, skipping the first 3 rows (Row 0, 1 and the header row is Row 2)
    # The header is on row 2 (0-indexed)
    df = pd.read_excel(input_path, skiprows=2)
    
    # Drop any entirely empty rows/columns if they exist
    df = df.dropna(how='all').dropna(axis=1, how='all')
    
    # Ensure columns are what we expect
    expected_cols = [
        "Edge_ID", "From_Node_ID", "To_Node_ID", "Distance_m", "Surface_Type", 
        "Smoothness", "Incline_Percent", "Path_Width_m", "Kerb_Type", "Has_Obstacle",
        "Obstacle_Type", "Is_Covered", "Lighting", "Weather_Condition", "Traffic_Level",
        "From_POI_Category", "To_POI_Category", "Avg_User_Difficulty", "Num_User_Reports", 
        "Accessibility_Score", "Label"
    ]
    
    # Keep only relevant columns for training (subset for simplicity/reliability)
    # Some columns might have slightly different names due to Unnamed: N
    # Let's just use the ones we found in the analysis
    cols_to_keep = [c for c in expected_cols if c in df.columns]
    df_cleaned = df[cols_to_keep].copy()
    
    # Handle numeric types
    numeric_cols = ["Distance_m", "Incline_Percent", "Path_Width_m", "Accessibility_Score", "Avg_User_Difficulty", "Num_User_Reports"]
    for col in numeric_cols:
        if col in df_cleaned.columns:
            df_cleaned[col] = pd.to_numeric(df_cleaned[col], errors='coerce').fillna(0)

    # Label encoding check
    if 'Label' in df_cleaned.columns:
        df_cleaned['Label'] = df_cleaned['Label'].str.strip().str.lower()
    
    print(f"Original records: {len(df_cleaned)}")
    
    # Data Expansion (Synthetic generation)
    expanded_data = []
    
    # Categories for synthetic data
    surface_types = ["asphalt", "concrete", "paving_stones", "gravel", "fine_gravel", "dirt"]
    smoothness_levels = ["excellent", "good", "intermediate", "bad", "very_bad"]
    kerb_types = ["flush", "lowered", "raised"]
    obstacle_types = ["none", "utility_pole", "parked_car", "street_vendor", "pothole"]
    labels = ["highly_accessible", "moderately_accessible", "not_accessible"]
    
    for _ in range(500):
        # Semi-randomly generate features and a plausible label/score
        surface = random.choice(surface_types)
        smoothness = random.choice(smoothness_levels)
        incline = random.uniform(0, 15)
        width = random.uniform(0.5, 3.0)
        kerb = random.choice(kerb_types)
        has_obs = "yes" if random.random() > 0.7 else "no"
        obs_type = random.choice(obstacle_types) if has_obs == "yes" else "none"
        
        # Heuristic for accessibility score
        score = 100
        if surface in ["gravel", "dirt"]: score -= 20
        if smoothness in ["bad", "very_bad"]: score -= 20
        if incline > 8: score -= 30
        if width < 1.0: score -= 20
        if kerb == "raised": score -= 15
        if has_obs == "yes": score -= 15
        
        score = max(0, min(100, score + random.uniform(-5, 5)))
        
        label = "highly_accessible" if score >= 75 else ("moderately_accessible" if score >= 45 else "not_accessible")
        
        row = {
            "Edge_ID": f"E{1000 + _}",
            "Distance_m": random.uniform(10, 500),
            "Surface_Type": surface,
            "Smoothness": smoothness,
            "Incline_Percent": round(incline, 1),
            "Path_Width_m": round(width, 1),
            "Kerb_Type": kerb,
            "Has_Obstacle": has_obs,
            "Obstacle_Type": obs_type,
            "Accessibility_Score": round(score, 1),
            "Label": label
        }
        expanded_data.append(row)
        
    df_expanded = pd.concat([df_cleaned, pd.DataFrame(expanded_data)], ignore_index=True)
    df_expanded = shuffle(df_expanded)
    
    df_expanded.to_csv(output_path, index=False)
    print(f"Total records after expansion: {len(df_expanded)}")

if __name__ == "__main__":
    clean_and_expand_data(
        "c:/Users/amitv/OneDrive/Documents/GitHub/Navara-Project/wheelchair.xlsx",
        "c:/Users/amitv/OneDrive/Documents/GitHub/Navara-Project/cleaned_dataset.csv"
    )
