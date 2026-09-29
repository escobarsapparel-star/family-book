package com.familybook.app;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;

@CapacitorPlugin(name = "ShareImage")
public class ShareImagePlugin extends Plugin {

    private static final String EXTRA_CACHED_PATHS = "fb_cached_share_paths";
    private static final String EXTRA_CACHED_NAMES = "fb_cached_share_names";
    private static final String EXTRA_CACHED_MIMES = "fb_cached_share_mimes";

    @PluginMethod
    public void getPendingShare(PluginCall call) {
        try {
            Intent intent = getActivity().getIntent();
            if (intent == null || !isSupportedAction(intent.getAction())) {
                call.resolve(noShare());
                return;
            }

            ArrayList<String> cachedPaths = intent.getStringArrayListExtra(EXTRA_CACHED_PATHS);
            ArrayList<String> cachedNames = intent.getStringArrayListExtra(EXTRA_CACHED_NAMES);
            ArrayList<String> cachedMimes = intent.getStringArrayListExtra(EXTRA_CACHED_MIMES);
            if (cachedPaths != null && !cachedPaths.isEmpty()) {
                JSObject cached = resultFromCached(cachedPaths, cachedNames, cachedMimes);
                if (cached.getBool("hasShare")) {
                    call.resolve(cached);
                    return;
                }
            }

            ArrayList<Uri> sources = shareUris(intent);
            if (sources.isEmpty()) {
                call.resolve(noShare());
                return;
            }

            ContentResolver resolver = getContext().getContentResolver();
            File dir = new File(getContext().getCacheDir(), "familybook-shared");
            if (!dir.exists() && !dir.mkdirs()) {
                call.reject("Could not create temporary share storage.");
                return;
            }

            ArrayList<String> paths = new ArrayList<>();
            ArrayList<String> names = new ArrayList<>();
            ArrayList<String> mimes = new ArrayList<>();

            for (Uri source : sources) {
                if (source == null) continue;
                String mime = resolver.getType(source);
                if (mime == null || mime.isEmpty()) mime = intent.getType();
                if (!isSupportedMime(mime)) continue;

                String displayName = queryDisplayName(resolver, source);
                String extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime);
                if (extension == null || extension.isEmpty()) extension = mime.startsWith("video/") ? "mp4" : "jpg";
                if (displayName == null || displayName.trim().isEmpty()) {
                    displayName = "shared-" + (mime.startsWith("video/") ? "video." : "image.") + extension;
                }

                File dest = new File(dir, System.currentTimeMillis() + "-" + paths.size() + "-" + safeName(displayName));
                try (InputStream in = resolver.openInputStream(source);
                     FileOutputStream out = new FileOutputStream(dest)) {
                    if (in == null) continue;
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
                }

                paths.add(dest.getAbsolutePath());
                names.add(displayName);
                mimes.add(mime);
            }

            if (paths.isEmpty()) {
                call.resolve(noShare());
                return;
            }

            intent.putStringArrayListExtra(EXTRA_CACHED_PATHS, paths);
            intent.putStringArrayListExtra(EXTRA_CACHED_NAMES, names);
            intent.putStringArrayListExtra(EXTRA_CACHED_MIMES, mimes);
            getActivity().setIntent(intent);
            call.resolve(resultFromCached(paths, names, mimes));

        } catch (Exception ex) {
            call.reject("Could not receive the shared media.", ex);
        }
    }

    @PluginMethod
    public void clearPendingShare(PluginCall call) {
        try {
            Intent oldIntent = getActivity().getIntent();
            if (oldIntent != null) {
                ArrayList<String> paths = oldIntent.getStringArrayListExtra(EXTRA_CACHED_PATHS);
                if (paths != null) {
                    for (String cached : paths) {
                        if (cached == null || cached.isEmpty()) continue;
                        try { new File(cached).delete(); } catch (Exception ignored) {}
                    }
                }
            }

            Intent clean = new Intent(Intent.ACTION_MAIN);
            clean.setClass(getContext(), getActivity().getClass());
            getActivity().setIntent(clean);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Could not clear the shared media.", ex);
        }
    }

    private boolean isSupportedAction(String action) {
        return Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action);
    }

    private boolean isSupportedMime(String mime) {
        return mime != null && (mime.startsWith("image/") || mime.startsWith("video/"));
    }

    @SuppressWarnings("deprecation")
    private ArrayList<Uri> shareUris(Intent intent) {
        ArrayList<Uri> out = new ArrayList<>();
        if (Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction())) {
            ArrayList<Uri> items = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (items != null) out.addAll(items);
        } else {
            Uri item = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (item != null) out.add(item);
        }
        return out;
    }

    private JSObject noShare() {
        JSObject none = new JSObject();
        none.put("hasShare", false);
        return none;
    }

    private JSObject resultFromCached(ArrayList<String> paths, ArrayList<String> names, ArrayList<String> mimes) {
        JSArray items = new JSArray();
        String firstPath = null, firstName = null, firstMime = null;

        for (int i = 0; i < paths.size(); i++) {
            String path = paths.get(i);
            if (path == null || path.isEmpty()) continue;
            File file = new File(path);
            if (!file.exists()) continue;

            String name = names != null && i < names.size() ? names.get(i) : file.getName();
            String mime = mimes != null && i < mimes.size() ? mimes.get(i) : "image/jpeg";
            JSObject item = new JSObject();
            item.put("path", Uri.fromFile(file).toString());
            item.put("name", name);
            item.put("mimeType", mime);
            items.put(item);

            if (firstPath == null) {
                firstPath = Uri.fromFile(file).toString();
                firstName = name;
                firstMime = mime;
            }
        }

        JSObject result = new JSObject();
        result.put("hasShare", items.length() > 0);
        result.put("items", items);
        result.put("path", firstPath);
        result.put("name", firstName);
        result.put("mimeType", firstMime);
        return result;
    }

    private String queryDisplayName(ContentResolver resolver, Uri uri) {
        Cursor cursor = null;
        try {
            cursor = resolver.query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null);
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
