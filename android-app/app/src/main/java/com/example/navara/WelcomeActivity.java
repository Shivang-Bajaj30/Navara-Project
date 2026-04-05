package com.example.navara;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.AnticipateOvershootInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.ImageView;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

public class WelcomeActivity extends AppCompatActivity {

    private View welcomeRoot;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_welcome);

        welcomeRoot = findViewById(R.id.welcomeRoot);

        View illustrationContainer = findViewById(R.id.illustrationContainer);
        View tagAvatar = findViewById(R.id.tagAvatar);
        View smallCircle = findViewById(R.id.smallCircle);
        View tvTitle = findViewById(R.id.tvTitle);
        View tvSubtitle = findViewById(R.id.tvSubtitle);
        View btnGetStarted = findViewById(R.id.btnGetStarted);
        View indicatorContainer = findViewById(R.id.indicatorContainer);
        View dot1 = findViewById(R.id.dot1);
        View dot2 = findViewById(R.id.dot2);

        setupInitialAnimations(illustrationContainer, tagAvatar, smallCircle, tvTitle, tvSubtitle, btnGetStarted, indicatorContainer, dot1, dot2);
        
        // Initialize Weather for Welcome Page only
        ImageView ivWeatherOverlay = findViewById(R.id.ivWeatherOverlay);
        WeatherManager weatherManager = new WeatherManager(this, welcomeRoot, ivWeatherOverlay);
        weatherManager.updateWeather();

        btnGetStarted.setOnClickListener(v -> {
            Intent intent = new Intent(WelcomeActivity.this, MainActivity.class);
            startActivity(intent);
            overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                finish();
            }
        });
    }

    private void setupInitialAnimations(View illustrationContainer, View tagAvatar, View smallCircle, View tvTitle, View tvSubtitle, View btnGetStarted, View indicatorContainer, View dot1, View dot2) {
        illustrationContainer.setAlpha(0f);
        illustrationContainer.setScaleX(0.8f);
        illustrationContainer.setScaleY(0.8f);
        tagAvatar.setTranslationX(-100f);
        tagAvatar.setAlpha(0f);
        smallCircle.setTranslationY(100f);
        smallCircle.setAlpha(0f);
        tvTitle.setTranslationY(50f);
        tvTitle.setAlpha(0f);
        tvSubtitle.setTranslationY(50f);
        tvSubtitle.setAlpha(0f);
        btnGetStarted.setTranslationY(100f);
        btnGetStarted.setAlpha(0f);
        indicatorContainer.setAlpha(0f);

        illustrationContainer.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(1000).setInterpolator(new AnticipateOvershootInterpolator()).start();
        tagAvatar.animate().translationX(0f).alpha(1f).setDuration(800).setStartDelay(500).setInterpolator(new OvershootInterpolator()).start();
        smallCircle.animate().translationY(0f).alpha(1f).setDuration(800).setStartDelay(700).setInterpolator(new OvershootInterpolator()).start();
        tvTitle.animate().translationY(0f).alpha(1f).setDuration(800).setStartDelay(800).start();
        tvSubtitle.animate().translationY(0f).alpha(1f).setDuration(800).setStartDelay(1000).start();
        indicatorContainer.animate().alpha(1f).setDuration(1000).setStartDelay(1200).start();
        btnGetStarted.animate().translationY(0f).alpha(1f).setDuration(800).setStartDelay(1300).setInterpolator(new AnticipateOvershootInterpolator()).start();
        
        animateFloating(dot1, 2000);
        animateFloating(dot2, 2500);
    }

    private void animateFloating(View view, int duration) {
        view.animate()
                .translationY(30f)
                .setDuration(duration)
                .setInterpolator(new AccelerateDecelerateInterpolator())
                .withEndAction(() -> {
                    view.animate()
                            .translationY(-30f)
                            .setDuration(duration)
                            .setInterpolator(new AccelerateDecelerateInterpolator())
                            .withEndAction(() -> animateFloating(view, duration))
                            .start();
                }).start();
    }
}
