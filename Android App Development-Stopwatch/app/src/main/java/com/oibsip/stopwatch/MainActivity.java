package com.oibsip.stopwatch;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.AppCompatButton;

import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final long TICK_MS = 10L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ArrayList<String> laps = new ArrayList<>();
    private final Runnable ticker = new Runnable() {
        @Override
        public void run() {
            renderTime();
            handler.postDelayed(this, TICK_MS);
        }
    };

    private TextView timeView;
    private TextView emptyView;
    private AppCompatButton startButton;
    private AppCompatButton pauseButton;
    private AppCompatButton resetButton;
    private AppCompatButton lapButton;
    private ArrayAdapter<String> lapAdapter;

    private long accumulated;
    private long startedAt;
    private boolean running;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        timeView = findViewById(R.id.timeView);
        emptyView = findViewById(R.id.emptyView);
        startButton = findViewById(R.id.startButton);
        pauseButton = findViewById(R.id.pauseButton);
        resetButton = findViewById(R.id.resetButton);
        lapButton = findViewById(R.id.lapButton);
        ListView lapList = findViewById(R.id.lapList);

        if (savedInstanceState != null) {
            accumulated = savedInstanceState.getLong("accumulated");
            startedAt = savedInstanceState.getLong("startedAt");
            running = savedInstanceState.getBoolean("running");
            ArrayList<String> savedLaps = savedInstanceState.getStringArrayList("laps");
            if (savedLaps != null) {
                laps.addAll(savedLaps);
            }
        }

        lapAdapter = new ArrayAdapter<>(this, R.layout.item_lap, laps);
        lapList.setAdapter(lapAdapter);

        startButton.setOnClickListener(v -> start());
        pauseButton.setOnClickListener(v -> pause());
        resetButton.setOnClickListener(v -> reset());
        lapButton.setOnClickListener(v -> lap());

        renderTime();
        renderLaps();
        renderButtons();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (running) {
            handler.removeCallbacks(ticker);
            handler.post(ticker);
        }
        renderTime();
        renderButtons();
    }

    @Override
    protected void onPause() {
        super.onPause();
        handler.removeCallbacks(ticker);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(ticker);
        super.onDestroy();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putLong("accumulated", accumulated);
        outState.putLong("startedAt", startedAt);
        outState.putBoolean("running", running);
        outState.putStringArrayList("laps", laps);
    }

    private void start() {
        if (running) {
            return;
        }
        startedAt = SystemClock.elapsedRealtime();
        running = true;
        handler.removeCallbacks(ticker);
        handler.post(ticker);
        renderButtons();
    }

    private void pause() {
        if (!running) {
            return;
        }
        accumulated += SystemClock.elapsedRealtime() - startedAt;
        running = false;
        handler.removeCallbacks(ticker);
        renderTime();
        renderButtons();
    }

    private void reset() {
        running = false;
        accumulated = 0L;
        startedAt = 0L;
        handler.removeCallbacks(ticker);
        laps.clear();
        lapAdapter.notifyDataSetChanged();
        renderTime();
        renderLaps();
        renderButtons();
    }

    private void lap() {
        if (!running) {
            return;
        }
        int number = laps.size() + 1;
        String label = getString(R.string.lap_label, number, formatElapsed(elapsedMillis()));
        lapAdapter.insert(label, 0);
        renderLaps();
    }

    private long elapsedMillis() {
        long elapsed = accumulated;
        if (running) {
            elapsed += SystemClock.elapsedRealtime() - startedAt;
        }
        return Math.max(elapsed, 0L);
    }

    private void renderTime() {
        timeView.setText(formatElapsed(elapsedMillis()));
    }

    private void renderLaps() {
        emptyView.setVisibility(laps.isEmpty() ? android.view.View.VISIBLE : android.view.View.GONE);
    }

    private void renderButtons() {
        boolean hasProgress = elapsedMillis() > 0L || !laps.isEmpty();
        startButton.setEnabled(!running);
        pauseButton.setEnabled(running);
        lapButton.setEnabled(running);
        resetButton.setEnabled(running || hasProgress);
    }

    private String formatElapsed(long millis) {
        long centiseconds = (millis / 10L) % 100L;
        long totalSeconds = millis / 1000L;
        long seconds = totalSeconds % 60L;
        long minutes = (totalSeconds / 60L) % 60L;
        long hours = totalSeconds / 3600L;
        return String.format(Locale.US, "%02d:%02d:%02d.%02d", hours, minutes, seconds, centiseconds);
    }
}
