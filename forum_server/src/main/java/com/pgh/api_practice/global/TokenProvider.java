package com.pgh.api_practice.global;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class TokenProvider {

    private final Key key;

    private static final long ACCESS_TOKEN_VALIDITY = 1000L * 60 * 60;          // 1시간
    private static final long REFRESH_TOKEN_VALIDITY = 1000L * 60 * 60 * 24 * 7; // 7일

    public TokenProvider(@Value("${spring.jwt.secret}") String secretKey) {
        this.key = Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    // 기존 AuthService 호환용. typ 클레임만 추가하고 subject/만료 의미는 같다.
    public String createAccessToken(String username) {
        return buildToken(username, "access", ACCESS_TOKEN_VALIDITY);
    }

    public String createRefreshToken(String username) {
        return buildToken(username, "refresh", REFRESH_TOKEN_VALIDITY);
    }

    /** typ 클레임. 예전 토큰은 null이다. */
    public String getTokenType(String token) {
        return parseClaims(token).get("typ", String.class);
    }

    public boolean isRefreshToken(String token) {
        return "refresh".equals(getTokenType(token));
    }

    private String buildToken(String username, String type, long validityMs) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + validityMs);

        return Jwts.builder()
                .setSubject(username)
                .claim("typ", type)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    // username 추출
    public String getUsername(String token) {
        return parseClaims(token).getSubject();
    }

    // userId 추출 (WebSocket, 권한 검증 핵심)
    public Long getUserId(String token) {
        return parseClaims(token).get("userId", Long.class);
    }

    // 토큰 유효성 검증
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // 공통 Claims 파서
    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}