package com.pgh.api_practice.service;

import java.nio.file.Path;
import java.util.Locale;

/**
 * 업로드 파일명을 콘텐츠 타입에서만 만들고, 저장 경로가 업로드 디렉터리 밖으로 나가지 않게 한다.
 */
public final class ImageFiles {

    private ImageFiles() {
    }

    public static String extensionFor(String contentType) {
        if (contentType == null) {
            return null;
        }
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/jpeg", "image/jpg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            default -> null;
        };
    }

    public static boolean looksLikeImage(byte[] header, String contentType) {
        if (header == null || contentType == null) {
            return false;
        }
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/jpeg", "image/jpg" -> startsWith(header, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});
            case "image/png" -> startsWith(header, new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47});
            case "image/gif" -> startsWith(header, new byte[]{'G', 'I', 'F', '8'});
            case "image/webp" -> header.length >= 12
                    && startsWith(header, new byte[]{'R', 'I', 'F', 'F'})
                    && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
            default -> false;
        };
    }

    public static Path resolveInside(Path uploadDir, String filename) {
        if (filename == null || filename.isBlank()
                || filename.contains("..")
                || filename.contains("/")
                || filename.contains("\\")
                || filename.indexOf('\0') >= 0) {
            throw new IllegalArgumentException("잘못된 파일명입니다.");
        }
        Path root = uploadDir.toAbsolutePath().normalize();
        Path resolved = root.resolve(filename).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("잘못된 파일명입니다.");
        }
        return resolved;
    }

    private static boolean startsWith(byte[] value, byte[] prefix) {
        if (value.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (value[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
