package com.example.navara;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);
        
        View loginPanel = findViewById(R.id.loginPanel);
        View tvLogin = findViewById(R.id.tvLogin);
        View etEmail = findViewById(R.id.etEmail);
        View passwordContainer = findViewById(R.id.passwordContainer);
        View optionsContainer = findViewById(R.id.optionsContainer);
        View btnLogin = findViewById(R.id.btnLogin);
        View signUpContainer = findViewById(R.id.signUpContainer);

        ViewCompat.setOnApplyWindowInsetsListener(loginPanel, (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), systemBars.bottom + 24);
            return insets;
        });

        // Initialize Map Background
        ImageView backgroundImage = findViewById(R.id.backgroundImage);
        MapBackgroundManager mapBackgroundManager = new MapBackgroundManager(this, backgroundImage);
        mapBackgroundManager.updateMapBackground();

        // Entrance Animations
        loginPanel.setTranslationY(500f);
        loginPanel.animate()
                .translationY(0f)
                .setDuration(800)
                .setInterpolator(new DecelerateInterpolator())
                .start();

        tvLogin.setAlpha(0f);
        tvLogin.setTranslationY(30f);
        tvLogin.animate().alpha(1f).translationY(0f).setDuration(500).setStartDelay(400).start();

        etEmail.setAlpha(0f);
        etEmail.setTranslationY(30f);
        etEmail.animate().alpha(1f).translationY(0f).setDuration(500).setStartDelay(500).start();

        passwordContainer.setAlpha(0f);
        passwordContainer.setTranslationY(30f);
        passwordContainer.animate().alpha(1f).translationY(0f).setDuration(500).setStartDelay(600).start();

        optionsContainer.setAlpha(0f);
        optionsContainer.animate().alpha(1f).setDuration(500).setStartDelay(700).start();

        btnLogin.setAlpha(0f);
        btnLogin.setScaleX(0.8f);
        btnLogin.animate().alpha(1f).scaleX(1f).setDuration(600).setStartDelay(800).setInterpolator(new OvershootInterpolator()).start();

        if (signUpContainer != null) {
            signUpContainer.setAlpha(0f);
            signUpContainer.animate().alpha(1f).setDuration(500).setStartDelay(1000).start();
        }

        TextView tvSignUp = findViewById(R.id.tvSignUp);
        tvSignUp.setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, SignUpActivity.class);
            startActivity(intent);
            overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                finish();
                overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right);
            }
        });
    }

    // Removed deprecated onBackPressed
}