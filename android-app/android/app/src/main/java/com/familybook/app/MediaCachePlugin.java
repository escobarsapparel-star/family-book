package com.familybook.app;

import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "MediaCache")
public class MediaCachePlugin extends Plugin {
    private static final long MAX_CACHE_BYTES = 400L * 1024L * 1024L;
    private static final long MAX_ITEM_BYTES = 25L * 1024L * 1024L;
    private static final Set<String> IMAGE_EXTENSIONS = new HashSet<>(Arrays.asList(
            "jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif", "bmp"
    ));
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private File cacheRoot() {
        File root = new File(getContext().getFilesDir(), "familybook-media-cache-v1");
        if (!root.exists()) root.mkdirs();
        return root;
    }

    private String extensionFor(String path) {
        if (path == null) return "";
        String clean = path;
        int query = clean.indexOf('?');
        if (query >= 0) clean = clean.substring(0, query);
        int slash = clean.lastIndexOf('/');
        int dot = clean.lastIndexOf('.');
        if (dot <= slash || dot >= clean.length() - 1) return "";
        String ext = clean.substring(dot + 1).toLowerCase();
        return ext.matches("[a-z0-9]{1,5}") ? ext : "";
    }

    private boolean isCacheableImage(String path) {
        return IMAGE_EXTENSIONS.contains(extensionFor(path));
    }

    private String sha256(String value) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] bytes = digest.digest(value.getBytes("UTF-8"));
        StringBuilder out = new StringBuilder();
        for (byte b : bytes) out.append(String.format("%02x", b));
        return out.toString();
    }

    private File fileForPath(String path) throws Exception {
        String ext = extensionFor(path);
        return new File(cacheRoot(), sha256(path) + (ext.isEmpty() ? ".bin" : "." + ext));
    }

    private String fileUri(File file) {
        return Uri.fromFile(file).toString();
    }

    private long cacheSize() {
        File[] files = cacheRoot().listFiles();
        if (files == null) return 0L;
        long total = 0L;
        for (File file : files) if (file.isFile() && !file.getName().endsWith(".tmp")) total += file.length();
        return total;
    }

    private void prune() {
        File[] files = cacheRoot().listFiles();
        if (files == null) return;
        long total = 0L;
        for (File file : files) if (file.isFile() && !file.getName().endsWith(".tmp")) total += file.length();
        if (total <= MAX_CACHE_BYTES) return;

        Arrays.sort(files, Comparator.comparingLong(File::lastModified));
        for (File file : files) {
            if (total <= MAX_CACHE_BYTES) break;
            if (!file.isFile() || file.getName().endsWith(".tmp")) continue;
            long size = file.length();
            if (file.delete()) total -= size;
        }
    }

    private File existing(String path) {
        try {
            if (!isCacheableImage(path)) return null;
            File file = fileForPath(path);
            if (!file.exists() || file.length() <= 0) return null;
            file.setLastModified(System.currentTimeMillis());
            return file;
        } catch (Exception ignored) {
            return null;
        }
    }

    private File download(String path, String signedUrl) {
        if (!isCacheableImage(path) || signedUrl == null || signedUrl.isEmpty()) return null;
        File existing = existing(path);
        if (existing != null) return existing;

        HttpURLConnection connection = null;
        File temp = null;
        try {
            File dest = fileForPath(path);
            temp = new File(dest.getAbsolutePath() + ".tmp");
            if (temp.exists()) temp.delete();

            connection = (HttpURLConnection) new URL(signedUrl).openConnection();
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(30000);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestMethod("GET");

            int code = connection.getResponseCode();
            if (code < 200 || code >= 300) return null;
            long length = connection.getContentLengthLong();
            if (length > MAX_ITEM_BYTES) return null;

            long written = 0L;
            try (InputStream in = connection.getInputStream();
                 FileOutputStream out = new FileOutputStream(temp)) {
                byte[] buffer = new byte[32768];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    written += read;
                    if (written > MAX_ITEM_BYTES) {
                        out.close();
                        temp.delete();
                        return null;
                    }
                    out.write(buffer, 0, read);
                }
            }

            if (written <= 0) {
                temp.delete();
                return null;
            }
            if (dest.exists()) dest.delete();
            if (!temp.renameTo(dest)) {
                try (FileInputStream in = new FileInputStream(temp);
                     FileOutputStream out = new FileOutputStream(dest)) {
                    byte[] buffer = new byte[32768];
                    int read;
                    while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
                }
                temp.delete();
            }
            dest.setLastModified(System.currentTimeMillis());
            prune();
            return dest;
        } catch (Exception ignored) {
            if (temp != null) temp.delete();
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    @PluginMethod
    public void getCached(PluginCall call) {
        JSArray paths = call.getArray("paths");
        executor.execute(() -> {
            JSObject urls = new JSObject();
            if (paths != null) {
                for (int i = 0; i < paths.length(); i++) {
                    try {
                        String path = paths.getString(i);
                        File file = existing(path);
                        if (file != null) urls.put(path, fileUri(file));
                    } catch (Exception ignored) {}
                }
            }
            JSObject result = new JSObject();
            result.put("urls", urls);
            result.put("bytes", cacheSize());
            call.resolve(result);
        });
    }

    @PluginMethod
    public void cacheUrls(PluginCall call) {
        JSArray entries = call.getArray("entries");
        executor.execute(() -> {
            JSObject urls = new JSObject();
            if (entries != null) {
                for (int i = 0; i < entries.length(); i++) {
                    try {
                        JSONObject entry = entries.getJSONObject(i);
                        String path = entry.optString("path", "");
                        String url = entry.optString("url", "");
                        File file = download(path, url);
                        if (file != null) urls.put(path, fileUri(file));
                    } catch (Exception ignored) {}
                }
            }
            JSObject result = new JSObject();
            result.put("urls", urls);
            result.put("bytes", cacheSize());
            call.resolve(result);
        });
    }

    @PluginMethod
    public void remove(PluginCall call) {
        JSArray paths = call.getArray("paths");
        executor.execute(() -> {
            if (paths != null) {
                for (int i = 0; i < paths.length(); i++) {
                    try {
                        String path = paths.getString(i);
                        File file = fileForPath(path);
                        if (file.exists()) file.delete();
                    } catch (Exception ignored) {}
                }
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void clearAll(PluginCall call) {
        executor.execute(() -> {
            File[] files = cacheRoot().listFiles();
            if (files != null) {
                for (File file : files) {
                    try { file.delete(); } catch (Exception ignored) {}
                }
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void stats(PluginCall call) {
        executor.execute(() -> {
            JSObject result = new JSObject();
            result.put("bytes", cacheSize());
            result.put("limitBytes", MAX_CACHE_BYTES);
            call.resolve(result);
        });
    }
}
