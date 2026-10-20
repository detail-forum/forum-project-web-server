package com.pgh.api_practice.config;

import java.util.Arrays;
import java.util.List;

/**
 * 자격 증명 쿠키를 허용하는 출처. 모든 HTTP/HTTPS를 여는 패턴은 넣지 않는다.
 */
public final class CorsOrigins {

    public static final List<String> DEFAULTS = List.of(
            "http://localhost:3000",
            "http://localhost:80",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:80",
            "http://211.110.30.142",
            "http://211.110.30.142:80",
            "https://forum.rjsgud.com",
            "https://www.forum.rjsgud.com"
    );

    private CorsOrigins() {
    }

    public static List<String> parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return DEFAULTS;
        }
        List<String> origins = Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
        return origins.isEmpty() ? DEFAULTS : List.copyOf(origins);
    }
}
