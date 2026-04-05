package com.example.navara;

import android.Manifest;
import android.animation.ArgbEvaluator;
import android.animation.ValueAnimator;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.drawable.ColorDrawable;
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

import org.json.JSONObject;

import java.io.IOException;

public class WeatherManager {
    private static final String TAG = "WeatherManager";
    private final Context context;
    private final View rootLayout;
    private final ImageView weatherOverlay;
    private final FusedLocationProviderClient fusedLocationClient;
    private final OkHttpClient client = new OkHttpClient();

    public WeatherManager(Context context, View rootLayout, ImageView weatherOverlay) {
        this.context = context;
        this.rootLayout = rootLayout;
        this.weatherOverlay = weatherOverlay;
        this.fusedLocationClient = LocationServices.getFusedLocationProviderClient(context);
    }

    public void updateWeather() {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            applyWeatherEffects("Clear");
            return;
        }

        fusedLocationClient.getLastLocation().addOnSuccessListener(location -> {
            if (location != null) {
                fetchWeather(location.getLatitude(), location.getLongitude());
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
                        fetchWeather(location.getLatitude(), location.getLongitude());
                        fusedLocationClient.removeLocationUpdates(this);
                    }
                }
            }, Looper.getMainLooper());
        }
    }

    private void fetchWeather(double lat, double lon) {
        String url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current_weather=true";
        Request request = new Request.Builder().url(url).build();
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                new Handler(Looper.getMainLooper()).post(() -> applyWeatherEffects("Clear"));
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (response.isSuccessful()) {
                    try {
                        String responseData = response.body().string();
                        JSONObject json = new JSONObject(responseData);
                        JSONObject current = json.getJSONObject("current_weather");
                        int weatherCode = current.getInt("weathercode");
                        int isDay = current.optInt("is_day", 1);
                        
                        String condition = "Clear";
                        if (isDay == 0) condition = "Night";
                        else if (weatherCode == 3) condition = "Extremely Cloudy";
                        else if (weatherCode >= 1 && weatherCode <= 2) condition = "Cloudy";
                        else if (weatherCode >= 51 && weatherCode <= 82) condition = "Rainy";
                        
                        final String finalCondition = condition;
                        new Handler(Looper.getMainLooper()).post(() -> applyWeatherEffects(finalCondition));
                    } catch (Exception e) {
                        new Handler(Looper.getMainLooper()).post(() -> applyWeatherEffects("Clear"));
                    }
                }
            }
        });
    }

    private void applyWeatherEffects(String condition) {
        int color;
        int weatherImage = 0;

        switch (condition) {
            case "Extremely Cloudy":
            case "Cloudy":
                color = context.getResources().getColor(R.color.weather_cloudy, null);
                weatherImage = R.drawable.bg_cloudy;
                break;
            case "Rainy":
                color = context.getResources().getColor(R.color.weather_rainy, null);
                weatherImage = R.drawable.bg_rainy;
                break;
            case "Night":
                color = context.getResources().getColor(R.color.weather_night, null);
                weatherImage = R.drawable.bg_cloudy;
                break;
            default:
                color = context.getResources().getColor(R.color.weather_sunny, null);
                weatherImage = R.drawable.bg_sunny;
                break;
        }

        int currentColor = 0xFFBAE1FF;
        if (rootLayout.getBackground() instanceof ColorDrawable) {
            currentColor = ((ColorDrawable) rootLayout.getBackground()).getColor();
        }

        ValueAnimator colorAnimation = ValueAnimator.ofObject(new ArgbEvaluator(), currentColor, color);
        colorAnimation.setDuration(1500);
        colorAnimation.addUpdateListener(anim -> rootLayout.setBackgroundColor((int) anim.getAnimatedValue()));
        colorAnimation.start();

        if (weatherOverlay != null) {
            weatherOverlay.setVisibility(View.VISIBLE);
            if (weatherImage != 0) {
                weatherOverlay.setImageResource(weatherImage);
                weatherOverlay.animate().alpha(0.6f).setDuration(1500).start();
            } else {
                weatherOverlay.animate().alpha(0f).setDuration(1000).start();
            }
        }
    }
}