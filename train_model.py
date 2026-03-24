import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score

def train_accessibility_model(data_path, model_path):
    # Load the cleaned and expanded dataset
    df = pd.read_csv(data_path)
    
    # Define features and target
    # We'll use a subset of the most impactful features
    features = [
        "Surface_Type", "Smoothness", "Incline_Percent", 
        "Path_Width_m", "Kerb_Type", "Has_Obstacle", "Obstacle_Type"
    ]
    target = "Label"
    
    # Drop rows with missing target or features
    df = df.dropna(subset=[target] + features)
    
    X = df[features]
    y = df[target]
    
    # Preprocessing for categorical data
    categorical_features = ["Surface_Type", "Smoothness", "Kerb_Type", "Has_Obstacle", "Obstacle_Type"]
    numeric_features = ["Incline_Percent", "Path_Width_m"]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ],
        remainder='passthrough'
    )
    
    # Create the pipeline
    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train the model
    print("Training model...")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    print(f"Accuracy: {accuracy_score(y_test, y_pred)}")
    print(classification_report(y_test, y_pred))
    
    # Save the model
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train_accessibility_model(
        "c:/Users/amitv/OneDrive/Documents/GitHub/Navara-Project/cleaned_dataset.csv",
        "c:/Users/amitv/OneDrive/Documents/GitHub/Navara-Project/accessibility_model.pkl"
    )
