package com.detailforum.server.global;

import com.detailforum.server.config.CorsOrigins;
import com.detailforum.server.repository.RefreshTokenRepository;
import com.detailforum.server.service.CustomUserDetailsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;

import java.io.IOException;
import java.util.Arrays;

@Slf4j
@Configuration
public class SecurityConfig {

    private final TokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${app.cors.allowed-origins:}")
    private String allowedOrigins;

    public SecurityConfig(TokenProvider tokenProvider, CustomUserDetailsService userDetailsService, RefreshTokenRepository refreshTokenRepository) {
        this.tokenProvider = tokenProvider;
        this.userDetailsService = userDetailsService;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception{
        return  configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CSRF 비활성화
                .csrf(AbstractHttpConfigurer::disable)

                // CORS 설정
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // 세션 비활성화
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // JWT 필터 추가
                .addFilterBefore(new JwtAuthenticationFilter(tokenProvider, userDetailsService, refreshTokenRepository), UsernamePasswordAuthenticationFilter.class)
                // 로그인 없이 쓰는 곳만 열고 나머지는 모두 인증을 요구한다.
                // 새 엔드포인트는 따로 열지 않는 한 로그인이 필요하다.
                .authorizeHttpRequests(auth -> auth
                        // 인증 흐름 자체와 정적 자원. WebSocket은 STOMP CONNECT에서 WebSocketAuthInterceptor가 검사한다.
                        .requestMatchers("/ws", "/ws/**", "/uploads/**", "/error",
                                "/api-docs/**", "/swagger-ui.html", "/swagger-ui/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/auth/register", "/auth/login", "/auth/refresh",
                                "/auth/logout", "/auth/resend-verification", "/auth/password-reset/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/auth/verify", "/auth/verify-email").permitAll()
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        // 아래 공개 GET 패턴({id})에 걸리지 않도록 '내 것' 조회를 먼저 막는다.
                        .requestMatchers(HttpMethod.GET, "/post/my-post", "/post/my-tags").authenticated()
                        // 비로그인 방문자도 보는 읽기 API. 비공개 모임 글 같은 세부 권한은 서비스에서 확인한다.
                        .requestMatchers(HttpMethod.GET,
                                "/post", "/post/{id}", "/post/user/**", "/post/group/**",
                                "/comment",
                                "/group", "/group/search", "/group/{groupId}", "/group/{groupId}/membership",
                                "/group/{groupId}/members", "/group/{groupId}/chat-rooms",
                                "/group/{groupId}/posts", "/group/{groupId}/posts/{postId}",
                                "/follow/{userId}/status", "/follow/check/{userId}",
                                "/follow/{userId}/followers", "/follow/{userId}/following",
                                "/follow/{userId}/followers/count", "/follow/{userId}/following/count",
                                "/follow/user/{username}").permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> writeError(res, 401, "인증이 필요합니다."))
                        .accessDeniedHandler((req, res, ex) -> writeError(res, 403, "접근 권한이 없습니다.")));


        return http.build();
    }

    /** 컨트롤러 응답과 같은 ApiResponse 모양({success, message, data})으로 오류를 쓴다. */
    private static void writeError(HttpServletResponse res, int status, String message) throws IOException {
        res.setStatus(status);
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"success\":false,\"message\":\"" + message + "\",\"data\":null}");
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(CorsOrigins.parse(allowedOrigins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    // PasswordEncoder Bean 등록
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
