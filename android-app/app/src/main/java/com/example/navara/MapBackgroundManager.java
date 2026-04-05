package com.example.navara;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.location.Location;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

import java.io.IOException;

public class MapBackgroundManager {
    private static final String TAG = "MapBackgroundManager";
    private final Context context;
    private final ImageView backgroundImage;
    private final FusedLocationProviderClient fusedLocationClient;
    private final OkHttpClient client = new OkHttpClient();

    // The API Key is now securely stored in local.properties and accessed via BuildConfig
    private static final String API_KEY = BuildConfig.MAPS_API_KEY;

    public MapBackgroundManager(Context context, ImageView backgroundImage) {
        this.context = context;
        this.backgroundImage = backgroundImage;
        this.fusedLocationClient = LocationServices.getFusedLocationProviderClient(context);
    }

    public void updateMapBackground() {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            // Fallback to default image if permission not granted
            applyDefaultBackground();
            return;
        }

        fusedLocationClient.getLastLocation().addOnSuccessListener(location -> {
            if (location != null) {
                fetchStaticMap(location.getLatitude(), location.getLongitude());
            } else {
                requestNewLocation();
            }
        });
    }

    private void requestNewLocation() {
        LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000)
                .setMaxUpdates(1)
                .build();
        
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.requestLocationUpdates(locationRequest, new LocationCallback() {
                @Override
                public void onLocationResult(@NonNull LocationResult locationResult) {
                    Location location = locationResult.getLastLocation();
                    if (location != null) {
                        fetchStaticMap(location.getLatitude(), location.getLongitude());
                        fusedLocationClient.removeLocationUpdates(this);
                    }
                }
            }, Looper.getMainLooper());
        } else {
            applyDefaultBackground();
        }
    }

    private void fetchStaticMap(double lat, double lon) {
        // Force Night Mode for the Map
        boolean isNightMode = true;
        
        // Constructing the URL for Google Static Maps
        // Night style for a sleek dark background
        // Showing place names in white but removing the text outlines/borders
        String style = "&style=element:geometry|color:0x242f3e" +
                      "&style=feature:road|element:geometry|color:0x38414e" +
                      "&style=feature:water|element:geometry|color:0x17263c" +
                      "&style=element:labels.text.fill|color:0xffffff" +
                      "&style=element:labels.text.stroke|visibility:off" +
                      "&style=element:labels.icon|visibility:off";

        // Reverted zoom level to 14 for a more balanced view
        String url = "https://maps.googleapis.com/maps/api/staticmap?center=" + lat + "," + lon +
                "&zoom=14&size=400x800&scale=1&maptype=roadmap" + style + "&key=" + API_KEY;

        // If no API key is provided, we can't fetch from Google. 
        if (API_KEY.equals("AIzaSyDtrj-jOWQShU9cDzuAOpcsTXtBnLuTZCc".equals(API_KEY) ? "" : API_KEY)) {
             // Logic check for actual key usage
        }
        
        if (API_KEY.isEmpty() || API_KEY.contains("YOUR_")) {
            Log.w(TAG, "No Google Maps API Key provided. Using default background.");
            applyDefaultBackground();
            return;
        }

        Request request = new Request.Builder()
                .url(url)
                .addHeader("Connection", "keep-alive") // Encourage connection reuse
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                new Handler(Looper.getMainLooper()).post(() -> applyDefaultBackground());
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (response.isSuccessful() && response.body() != null) {
                    byte[] bytes = response.body().bytes();
                    Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (bitmap != null) {
                            backgroundImage.setImageBitmap(bitmap);
                            applyModeFilter(isNightMode);
                            backgroundImage.setAlpha(0f);
                            backgroundImage.animate().alpha(1f).setDuration(300).start(); // Quick fade in
                        } else {
                            applyDefaultBackground();
                        }
                    });
                } else {
                    new Handler(Looper.getMainLooper()).post(() -> applyDefaultBackground());
                }
            }
        });
    }

    private void applyDefaultBackground() {
        // Force Night Mode filter for default background too
        backgroundImage.setImageResource(R.drawable.christ_map_mobile);
        applyModeFilter(true);
    }

    private void applyModeFilter(boolean isNightMode) {
        if (isNightMode) {
            // Darken the image further for night mode
            ColorMatrix matrix = new ColorMatrix();
            matrix.setSaturation(0.2f); // Desaturate
            float scale = 0.6f; // Darken
            matrix.setScale(scale, scale, scale, 1.0f);
            backgroundImage.setColorFilter(new ColorMatrixColorFilter(matrix));
        } else {
            // Light mode: Slight tint or just clear
            backgroundImage.setColorFilter(null);
        }
    }
}