package com.pgh.api_practice.service;

import java.net.URI;
import java.util.regex.Pattern;

/**
 * 프로필 수정 값. 성공 응답 형태는 바꾸지 않고, 저장 전에 길이·스킴만 거절한다.
 */
public final class ProfileFields {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern UPLOAD_PATH = Pattern.compile("^/uploads/[A-Za-z0-9._-]+$");

    private ProfileFields() {
    }

    public static String nickname(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty() || value.length() > 15) {
            throw new IllegalArgumentException("닉네임은 1자 이상 15자 이하여야 합니다.");
        }
        return value;
    }

    public static String email(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.length() > 200 || !EMAIL.matcher(value).matches()) {
            throw new IllegalArgumentException("올바른 이메일 형식이 아닙니다.");
        }
        return value;
    }

    /** 빈 값은 링크를 지운다. */
    public static String githubLink(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty()) {
            return null;
        }
        if (value.length() > 500 || !isHttpUrl(value)) {
            throw new IllegalArgumentException("GitHub 링크는 http 또는 https 주소여야 합니다.");
        }
        return value;
    }

    /** 빈 값은 이미지를 지운다. 업로드 경로 또는 http(s)만 허용한다. */
    public static String profileImageUrl(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty()) {
            return null;
        }
        if (value.length() > 500 || !(UPLOAD_PATH.matcher(value).matches() || isHttpUrl(value))) {
            throw new IllegalArgumentException("프로필 이미지는 업로드된 이미지 주소만 사용할 수 있습니다.");
        }
        return value;
    }

    private static boolean isHttpUrl(String value) {
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            if (Character.isWhitespace(ch) || Character.isISOControl(ch)) {
                return false;
            }
        }
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();
            return ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))
                    && uri.getHost() != null;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
