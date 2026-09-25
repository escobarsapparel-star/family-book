package com.familybook.app;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

@CapacitorPlugin(name = "ShareImage")
public class ShareImagePlugin extends Plugin {

    private static final String EXTRA_CACHED_PATH = "fb_cached_share_path";
    private static final String EXTRA_CACHED_NAME = "fb_cached_share_name";
    private static final String EXTRA_CACHED_MIME = "fb_cached_share_mime";

    @PluginMethod
    public void getPendingShare(PluginCall call) {
        try {
            Intent intent = getActivity().getIntent();
            if (intent == null
                    || !Intent.ACTION_SEND.equals(intent.getAction())
                    || intent.getType() == null
                    || !intent.getType().startsWith("image/")) {
                JSObject none = new JSObject();
                none.put("hasShare", false);
                call.resolve(none);
                return;
            }

            String existingPath = intent.getStringExtra(EXTRA_CACHED_PATH);
            if (existingPath != null && !existingPath.isEmpty()) {
                File existing = new File(existingPath);
                if (existing.exists()) {
                    JSObject result = new JSObject();
                    result.put("hasShare", true);
                    result.put("path", Uri.fromFile(existing).toString());
                    result.put("name", intent.getStringExtra(EXTRA_CACHED_NAME));
                    result.put("mimeType", intent.getStringExtra(EXTRA_CACHED_MIME));
                    call.resolve(result);
                    return;
                }
            }

            @SuppressWarnings("deprecation")
            Uri source = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (source == null) {
                JSObject none = new JSObject();
                none.put("hasShare", false);
                call.resolve(none);
                return;
            }

            ContentResolver resolver = getContext().getContentResolver();
            String mime = resolver.getType(source);
            if (mime == null || mime.isEmpty()) mime = intent.getType();
            if (mime == null || !mime.startsWith("image/")) {
                call.reject("Only shared images are supported.");
                return;
            }

            String displayName = queryDisplayName(resolver, source);
            String extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime);
            if (extension == null || extension.isEmpty()) extension = "jpg";
            if (displayName == null || displayName.trim().isEmpty()) {
                displayName = "shared-image." + extension;
            }

            File dir = new File(getContext().getCacheDir(), "familybook-shared");
            if (!dir.exists() && !dir.mkdirs()) {
                call.reject("Could not create temporary share storage.");
                return;
            }

            File dest = new File(dir, System.currentTimeMillis() + "-" + safeName(displayName));
            try (InputStream in = resolver.openInputStream(source);
                 FileOutputStream out = new FileOutputStream(dest)) {
                if (in == null) {
                    call.reject("Could not open the shared image.");
                    return;
                }
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                }
            }

            intent.putExtra(EXTRA_CACHED_PATH, dest.getAbsolutePath());
            intent.putExtra(EXTRA_CACHED_NAME, displayName);
            intent.putExtra(EXTRA_CACHED_MIME, mime);
            getActivity().setIntent(intent);

            JSObject result = new JSObject();
            result.put("hasShare", true);
            result.put("path", Uri.fromFile(dest).toString());
            result.put("name", displayName);
            result.put("mimeType", mime);
            call.resolve(result);

        } catch (Exception ex) {
            call.reject("Could not receive the shared image.", ex);
        }
    }

    @PluginMethod
    public void clearPendingShare(PluginCall call) {
        try {
            Intent oldIntent = getActivity().getIntent();
            if (oldIntent != null) {
                String cached = oldIntent.getStringExtra(EXTRA_CACHED_PATH);
                if (cached != null && !cached.isEmpty()) {
                    try {
                        new File(cached).delete();
                    } catch (Exception ignored) {}
                }
            }

            Intent clean = new Intent(Intent.ACTION_MAIN);
            clean.setClass(getContext(), getActivity().getClass());
            getActivity().setIntent(clean);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Could not clear the shared image.", ex);
        }
    }

    private String queryDisplayName(ContentResolver resolver, Uri uri) {
        Cursor cursor = null;
        try {
            cursor = resolver.query(uri, new String[]{OpenableColumns.DISPLAY_NAME},
                    null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) return cursor.getString(index);
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        return null;
    }

    private String safeName(String name) {
        return name.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
