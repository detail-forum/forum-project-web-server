package com.detailforum.server.controller;

import com.detailforum.server.dto.ChangePasswordDTO;
import com.detailforum.server.dto.LoginRequestDTO;
import com.detailforum.server.dto.UpdateProfileDTO;
import com.detailforum.server.dto.auth.PasswordResetDTO;
import com.detailforum.server.dto.auth.RegisterRequestDTO;
import com.detailforum.server.dto.auth.LoginResponseDTO;
import com.detailforum.server.dto.auth.RefreshTokenRequestDTO;
import com.detailforum.server.entity.Users;
import com.detailforum.server.exception.RefreshTokenExpiredException;
import com.detailforum.server.exception.ResourceNotFoundException;
import com.detailforum.server.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.detailforum.server.dto.ApiResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.cookie.secure:false}")
    private boolean secureCookie;

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
        writeTokenCookies(response, result);
        
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
        writeTokenCookies(response, result);
        
        return ResponseEntity.ok(ApiResponse.ok(result, "토큰이 재발급되었습니다."));
    }
    
    /** ✅ 인증 상태 확인 및 토큰 정보 반환 (초기화용) */
    @GetMapping("/verify")
    public ResponseEntity<ApiResponse<LoginResponseDTO>> verifyAuth(
            jakarta.servlet.http.HttpServletRequest request,
            HttpServletResponse response
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

        try {
            LoginResponseDTO result = authService.verifyOrRefresh(accessToken, refreshToken);
            if (!accessToken.equals(result.getAccessToken()) || !refreshToken.equals(result.getRefreshToken())) {
                writeTokenCookies(response, result);
            }
            return ResponseEntity.ok(ApiResponse.ok(result, "인증 상태 확인 성공"));
        } catch (RefreshTokenExpiredException | ResourceNotFoundException ex) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.fail("인증 토큰이 유효하지 않습니다."));
        }
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
    
    /** ✅ 로그아웃 (쿠키 삭제 + 현재 리프레시 토큰 폐기) */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            jakarta.servlet.http.HttpServletRequest request,
            HttpServletResponse response
    ) {
        authService.revokeRefreshToken(readCookie(request, "refreshToken"));
        clearTokenCookies(response);
        
        return ResponseEntity.ok(ApiResponse.ok("로그아웃 성공"));
    }

    private void writeTokenCookies(HttpServletResponse response, LoginResponseDTO tokens) {
        response.addCookie(tokenCookie("accessToken", tokens.getAccessToken(), 60 * 60 * 24));
        response.addCookie(tokenCookie("refreshToken", tokens.getRefreshToken(), 60 * 60 * 24 * 7));
    }

    private void clearTokenCookies(HttpServletResponse response) {
        response.addCookie(tokenCookie("accessToken", "", 0));
        response.addCookie(tokenCookie("refreshToken", "", 0));
    }

    private Cookie tokenCookie(String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(secureCookie);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "Lax");
        return cookie;
    }

    private String readCookie(jakarta.servlet.http.HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
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
        return ResponseEntity.ok(ApiResponse.ok("인증이 필요한 계정이라면 인증 메일이 재발송되었습니다."));
    }

    /** ✅ 비밀번호 재설정 메일 요청. 가입 여부와 관계없이 같은 응답을 준다. */
    @PostMapping("/password-reset/request")
    public ResponseEntity<ApiResponse<Void>> requestPasswordReset(@Valid @RequestBody PasswordResetDTO.Request dto) {
        authService.requestPasswordReset(dto.email());
        return ResponseEntity.ok(ApiResponse.ok("가입된 이메일이라면 비밀번호 재설정 메일이 발송되었습니다."));
    }

    /** ✅ 비밀번호 재설정 */
    @PostMapping("/password-reset/confirm")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody PasswordResetDTO.Confirm dto) {
        authService.resetPassword(dto.token(), dto.newPassword());
        return ResponseEntity.ok(ApiResponse.ok("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요."));
    }
}














