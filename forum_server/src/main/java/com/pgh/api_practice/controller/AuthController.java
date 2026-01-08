package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.ChangePasswordDTO;
import com.pgh.api_practice.dto.LoginRequestDTO;
import com.pgh.api_practice.dto.UpdateProfileDTO;
import com.pgh.api_practice.dto.auth.RegisterRequestDTO;
import com.pgh.api_practice.dto.auth.LoginResponseDTO;
import com.pgh.api_practice.dto.auth.RefreshTokenRequestDTO;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.pgh.api_practice.dto.ApiResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(
            @Valid @RequestBody RegisterRequestDTO registerRequestDTO
    ) {
        authService.register(registerRequestDTO);
        return ResponseEntity.ok(ApiResponse.ok("회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요."));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponseDTO>> login(
            @Valid @RequestBody LoginRequestDTO loginRequestDTO,
            HttpServletResponse response
    ) {
        LoginResponseDTO result = authService.login(loginRequestDTO);
        
        // HttpOnly 쿠키로 토큰 설정 (보안 강화)
        Cookie accessTokenCookie = new Cookie("accessToken", result.getAccessToken());
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setSecure(false); // HTTPS 환경에서는 true로 변경
        accessTokenCookie.setPath("/");
        accessTokenCookie.setMaxAge(60 * 60 * 24); // 1일
        accessTokenCookie.setAttribute("SameSite", "Lax"); // CSRF 방지
        response.addCookie(accessTokenCookie);
        
        Cookie refreshTokenCookie = new Cookie("refreshToken", result.getRefreshToken());
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setSecure(false); // HTTPS 환경에서는 true로 변경
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setMaxAge(60 * 60 * 24 * 7); // 7일
        refreshTokenCookie.setAttribute("SameSite", "Lax"); // CSRF 방지
        response.addCookie(refreshTokenCookie);
        
        return ResponseEntity.ok(ApiResponse.ok(result, "로그인이 완료되었습니다"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponseDTO>> refresh(
            @RequestBody(required = false) RefreshTokenRequestDTO refreshTokenRequestDTO,
            jakarta.servlet.http.HttpServletRequest request,
            HttpServletResponse response
    ) {
        // 요청 body에서 refreshToken을 받거나, 없으면 쿠키에서 읽기
        String refreshToken = null;
        if (refreshTokenRequestDTO != null && refreshTokenRequestDTO.getRefreshToken() != null) {
            refreshToken = refreshTokenRequestDTO.getRefreshToken();
        } else {
            // 쿠키에서 refreshToken 읽기
            jakarta.servlet.http.Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (jakarta.servlet.http.Cookie cookie : cookies) {
                    if ("refreshToken".equals(cookie.getName())) {
                        refreshToken = cookie.getValue();
                        break;
                    }
                }
            }
        }
        
        // refreshToken이 없으면 에러
        if (refreshToken == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.fail("리프레시 토큰이 없습니다."));
        }
        
        // RefreshTokenRequestDTO 생성
        RefreshTokenRequestDTO requestDTO = new RefreshTokenRequestDTO();
        requestDTO.setRefreshToken(refreshToken);
        
        LoginResponseDTO result = authService.refreshToken(requestDTO);
        
        // HttpOnly 쿠키로 새 토큰 설정
        Cookie accessTokenCookie = new Cookie("accessToken", result.getAccessToken());
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setSecure(false); // HTTPS 환경에서는 true로 변경
        accessTokenCookie.setPath("/");
        accessTokenCookie.setMaxAge(60 * 60 * 24); // 1일
        response.addCookie(accessTokenCookie);
        
        Cookie refreshTokenCookie = new Cookie("refreshToken", result.getRefreshToken());
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setSecure(false); // HTTPS 환경에서는 true로 변경
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setMaxAge(60 * 60 * 24 * 7); // 7일
        response.addCookie(refreshTokenCookie);
        
        return ResponseEntity.ok(ApiResponse.ok(result, "토큰이 재발급되었습니다."));
    }
    
    /** ✅ 인증 상태 확인 및 토큰 정보 반환 (초기화용) */
    @GetMapping("/verify")
    public ResponseEntity<ApiResponse<LoginResponseDTO>> verifyAuth(
            jakarta.servlet.http.HttpServletRequest request
    ) {
        // 쿠키에서 토큰 읽기
        jakarta.servlet.http.Cookie[] cookies = request.getCookies();
        String accessToken = null;
        String refreshToken = null;
        
        if (cookies != null) {
            for (jakarta.servlet.http.Cookie cookie : cookies) {
                if ("accessToken".equals(cookie.getName())) {
                    accessToken = cookie.getValue();
                } else if ("refreshToken".equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                }
            }
        }
        
        // 토큰이 없으면 인증 실패
        if (accessToken == null || refreshToken == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.fail("인증 토큰이 없습니다."));
        }
        
        // 토큰 유효성 검증은 JWT 필터에서 이미 수행됨
        // 여기서는 토큰 정보만 반환
        LoginResponseDTO result = new LoginResponseDTO(accessToken, refreshToken);
        return ResponseEntity.ok(ApiResponse.ok(result, "인증 상태 확인 성공"));
    }
    
    /** ✅ 현재 사용자 정보 조회 */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Users>> getCurrentUser() {
        Users user = authService.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok(user, "사용자 정보 조회 성공"));
    }
    
    /** ✅ 프로필 정보 수정 */
    @PatchMapping("/profile")
    public ResponseEntity<ApiResponse<Void>> updateProfile(@RequestBody UpdateProfileDTO dto) {
        authService.updateProfile(dto);
        return ResponseEntity.ok(ApiResponse.ok("프로필 수정 성공"));
    }
    
    /** ✅ 비밀번호 변경 */
    @PatchMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordDTO dto) {
        authService.changePassword(dto);
        return ResponseEntity.ok(ApiResponse.ok("비밀번호 변경 성공"));
    }
    
    /** ✅ 회원탈퇴 */
    @DeleteMapping("/account")
    public ResponseEntity<ApiResponse<Void>> deleteAccount() {
        authService.deleteAccount();
        return ResponseEntity.ok(ApiResponse.ok("회원탈퇴 성공"));
    }
    
    /** ✅ 로그아웃 (쿠키 삭제) */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse response) {
        // 쿠키 삭제
        Cookie accessTokenCookie = new Cookie("accessToken", null);
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setPath("/");
        accessTokenCookie.setMaxAge(0);
        response.addCookie(accessTokenCookie);
        
        Cookie refreshTokenCookie = new Cookie("refreshToken", null);
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setMaxAge(0);
        response.addCookie(refreshTokenCookie);
        
        return ResponseEntity.ok(ApiResponse.ok("로그아웃 성공"));
    }

    /** ✅ 이메일 인증 처리 */
    @GetMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(ApiResponse.ok("이메일 인증이 완료되었습니다."));
    }

    /** ✅ 이메일 인증 메일 재발송 */
    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<Void>> resendVerificationEmail(@RequestParam String email) {
        authService.resendVerificationEmail(email);
        return ResponseEntity.ok(ApiResponse.ok("인증 메일이 재발송되었습니다."));
    }
}














