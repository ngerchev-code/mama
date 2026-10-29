package bg.ngerchev.mama;

import android.Manifest;
import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Чете хардуерния брояч на крачки (TYPE_STEP_COUNTER) — крачки от последното рестартиране на телефона. */
@CapacitorPlugin(
    name = "Steps",
    permissions = { @Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION }) }
)
public class StepsPlugin extends Plugin {

    private boolean needsPermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && getPermissionState("activity") != PermissionState.GRANTED;
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && getPermissionState("activity") != PermissionState.GRANTED) {
            requestPermissionForAlias("activity", call, "permCallback");
        } else {
            JSObject r = new JSObject();
            r.put("activity", "granted");
            call.resolve(r);
        }
    }

    @PermissionCallback
    private void permCallback(PluginCall call) {
        JSObject r = new JSObject();
        r.put("activity", getPermissionState("activity") == PermissionState.GRANTED ? "granted" : "denied");
        call.resolve(r);
    }

    @PluginMethod
    public void read(PluginCall call) {
        if (needsPermission()) {
            JSObject r = new JSObject();
            r.put("available", false);
            r.put("reason", "permission");
            call.resolve(r);
            return;
        }
        final SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        final Sensor sensor = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (sensor == null) {
            JSObject r = new JSObject();
            r.put("available", false);
            r.put("reason", "no-sensor");
            call.resolve(r);
            return;
        }
        final Handler handler = new Handler(Looper.getMainLooper());
        final boolean[] done = { false };
        final SensorEventListener[] holder = new SensorEventListener[1];
        holder[0] = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                if (done[0]) return;
                done[0] = true;
                sm.unregisterListener(this);
                JSObject r = new JSObject();
                r.put("available", true);
                r.put("steps", (double) event.values[0]);
                call.resolve(r);
            }

            @Override
            public void onAccuracyChanged(Sensor s, int accuracy) { }
        };
        sm.registerListener(holder[0], sensor, SensorManager.SENSOR_DELAY_NORMAL);
        handler.postDelayed(() -> {
            if (done[0]) return;
            done[0] = true;
            sm.unregisterListener(holder[0]);
            JSObject r = new JSObject();
            r.put("available", false);
            r.put("reason", "timeout");
            call.resolve(r);
        }, 4000);
    }
}
