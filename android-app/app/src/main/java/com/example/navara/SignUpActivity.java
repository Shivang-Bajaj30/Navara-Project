package com.example.navara;

import android.os.Bundle;
import android.widget.TextView;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import android.widget.ImageView;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;

public class SignUpActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_signup);

        // Initialize Map Background
        ImageView backgroundImage = findViewById(R.id.backgroundImage);
        MapBackgroundManager mapBackgroundManager = new MapBackgroundManager(this, backgroundImage);
        mapBackgroundManager.updateMapBackground();

        View signupPanel = findViewById(R.id.signupPanel);
        View tvCreateAccount = findViewById(R.id.tvCreateAccount);
        View etEmail = findViewById(R.id.etEmail);
        View passwordContainer = findViewById(R.id.passwordContainer);
        View btnContinue = findViewById(R.id.btnContinue);
        View dividerLayout = findViewById(R.id.dividerLayout);
        View socialButtonsLayout = findViewById(R.id.socialButtonsLayout);

        View loginLinkContainer = null;
        if (signupPanel instanceof androidx.constraintlayout.widget.ConstraintLayout) {
            androidx.constraintlayout.widget.ConstraintLayout sp = (androidx.constraintlayout.widget.ConstraintLayout) signupPanel;
            loginLinkContainer = sp.getChildAt(sp.getChildCount() - 1);
        }

        ViewCompat.setOnApplyWindowInsetsListener(signupPanel, (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), systemBars.bottom + 24);
            return insets;
        });

        // Entrance Animations
        signupPanel.setTranslationY(500f);
        signupPanel.animate()
                .translationY(0f)
                .setDuration(800)
                .setInterpolator(new DecelerateInterpolator())
                .start();

        tvCreateAccount.setAlpha(0f);
        tvCreateAccount.setTranslationY(30f);
        tvCreateAccount.animate().alpha(1f).translationY(0f).setDuration(500).setStartDelay(400).start();

        etEmail.setAlpha(0f);
        etEmail.setTranslationY(30f);
        etEmail.animate().alpha(1f).translationY(0f).setDuration(500).setStartDelay(500).start();

        passwordContainer.setAlpha(0f);
        passwordContainer.setTranslationY(30f);
        passwordContainer.animate().alpha(1f).translationY(0f).setDuration(500).setStartDelay(600).start();

        btnContinue.setAlpha(0f);
        btnContinue.setScaleX(0.8f);
        btnContinue.animate().alpha(1f).scaleX(1f).setDuration(600).setStartDelay(700).setInterpolator(new OvershootInterpolator()).start();

        dividerLayout.setAlpha(0f);
        dividerLayout.animate().alpha(1f).setDuration(500).setStartDelay(800).start();

        socialButtonsLayout.setAlpha(0f);
        socialButtonsLayout.setTranslationY(20f);
        socialButtonsLayout.animate().alpha(1f).translationY(0f).setDuration(500).setStartDelay(900).start();

        if (loginLinkContainer != null) {
            loginLinkContainer.setAlpha(0f);
            loginLinkContainer.animate().alpha(1f).setDuration(500).setStartDelay(1100).start();
        }

        TextView tvLoginLink = findViewById(R.id.tvLoginLink);
        tvLoginLink.setOnClickListener(v -> {
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

    // Removed deprecated onBackPressed
}