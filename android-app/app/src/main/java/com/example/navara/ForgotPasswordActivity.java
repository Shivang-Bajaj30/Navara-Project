package com.example.navara;

import android.os.Bundle;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class ForgotPasswordActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_forgot_password);

        View forgotPanel = findViewById(R.id.forgotPanel);
        TextView tvBackToLogin = findViewById(R.id.tvBackToLogin);
        ImageView backgroundImage = findViewById(R.id.backgroundImage);

        ViewCompat.setOnApplyWindowInsetsListener(forgotPanel, (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), systemBars.bottom + 24);
            return insets;
        });

        // Initialize Map Background (Night mode as requested before)
        MapBackgroundManager mapBackgroundManager = new MapBackgroundManager(this, backgroundImage);
        mapBackgroundManager.updateMapBackground();

        // Entrance Animation
        forgotPanel.setTranslationY(500f);
        forgotPanel.animate()
                .translationY(0f)
                .setDuration(800)
                .setInterpolator(new DecelerateInterpolator())
                .start();

        tvBackToLogin.setOnClickListener(v -> {
            finish();
            overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right);
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                finish();
                overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right);
            }
        });
    }
}
