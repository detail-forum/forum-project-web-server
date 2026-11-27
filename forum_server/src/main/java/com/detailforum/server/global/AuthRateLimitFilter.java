package com.detailforum.server.global;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 로그인 대입과 메일 폭탄을 막는 IP별 고정 창 제한.
 * shortcut: 서버 메모리에 세므로 replicas가 2 이상이면 인스턴스마다 따로 센다. 그때 Redis 같은 공유 저장소로 옮긴다.
 */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private record Rule(int limit, long windowMillis) {}
    private record Window(long start, int count) {}

    private static final Rule LOGIN = new Rule(10, 60_000);
    // 메일이 나가는 요청은 더 빡빡하게.
    private static final Rule MAIL = new Rule(5, 10 * 60_000);
    private static final Map<String, Rule> RULES = Map.of(
            "/auth/login", LOGIN,
            "/auth/register", MAIL,
            "/auth/resend-verification", MAIL,
            "/auth/password-reset/request", MAIL);
    private static final long LONGEST_WINDOW = MAIL.windowMillis();
    private static final int CLEANUP_THRESHOLD = 10_000;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    // 한 IP에서 가입·로그인을 반복하는 e2e 환경에서만 끈다.
    @Value("${app.rate-limit.enabled:true}")
    private boolean enabled = true;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !enabled || !"POST".equals(request.getMethod()) || !RULES.containsKey(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!allow(clientIp(request) + " " + path, RULES.get(path), System.currentTimeMillis())) {
            response.setStatus(429);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"요청이 너무 많습니다. 잠시 후 다시 시도해주세요.\",\"data\":null}");
            return;
        }
        chain.doFilter(request, response);
    }

    boolean allow(String key, Rule rule, long now) {
        Window w = windows.compute(key, (k, old) -> old == null || now - old.start() >= rule.windowMillis()
                ? new Window(now, 1)
                : new Window(old.start(), old.count() + 1));
        if (windows.size() > CLEANUP_THRESHOLD) {
            windows.values().removeIf(x -> now - x.start() >= LONGEST_WINDOW);
        }
        return w.count() <= rule.limit();
    }

    // Nginx가 X-Real-IP를 $remote_addr로 덮어쓴다. 프록시 없이 직접 들어오면 소켓 주소를 쓴다.
    private static String clientIp(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        return realIp != null && !realIp.isBlank() ? realIp : request.getRemoteAddr();
    }
}
