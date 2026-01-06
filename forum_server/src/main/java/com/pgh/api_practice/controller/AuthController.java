package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.dto.auth.*;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(
        name = "Auth",
        description = "회원가입, 로그인, 인증 상태 확인, 토큰 관리 API"
)
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(
            summary = "회원가입",
            description = "이메일, 비밀번호 등 회원 정보를 입력받아 회원가입을 진행합니다."
    )
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(
            @Valid
            @RequestBody(
                    description = "회원가입 요청 정보",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            RegisterRequestDTO registerRequestDTO
    ) {
        authService.register(registerRequestDTO);
        return ResponseEntity.ok(ApiResponse.ok("회원가입이 완료되었습니다."));
    }

    @Operation(
            summary = "로그인",
            description = """
                    이메일과 비밀번호로 로그인합니다.
                    
                    - accessToken, refreshToken은 HttpOnly 쿠키로 설정됩니다.
                    - 응답 body에도 토큰 정보가 포함됩니다.
                    """
    )
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponseDTO>> login(
            @Valid
            @RequestBody(
                    description = "로그인 요청 정보 (email, password)",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            LoginRequestDTO loginRequestDTO,
            HttpServletResponse response
    ) {
        LoginResponseDTO result = authService.login(loginRequestDTO);
        /* 기존 로직 그대로 */
        Cookie accessTokenCookie = new Cookie("accessToken", result.getAccessToken());
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setPath("/");
        accessTokenCookie.setMaxAge(60 * 60 * 24);
        accessTokenCookie.setAttribute("SameSite", "Lax");
        response.addCookie(accessTokenCookie);

        Cookie refreshTokenCookie = new Cookie("refreshToken", result.getRefreshToken());
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setMaxAge(60 * 60 * 24 * 7);
        refreshTokenCookie.setAttribute("SameSite", "Lax");
        response.addCookie(refreshTokenCookie);

        return ResponseEntity.ok(ApiResponse.ok(result, "로그인이 완료되었습니다"));
    }

    @Operation(
            summary = "토큰 재발급",
            description = """
                    accessToken / refreshToken을 재발급합니다.
                    
                    - refreshToken은 body 또는 HttpOnly 쿠키에서 자동으로 읽습니다.
                    - 둘 다 없으면 401 반환
                    """
    )
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponseDTO>> refresh(
            @RequestBody(
                    description = "리프레시 토큰 (선택, 없으면 쿠키에서 조회)",
                    required = false
            )
            @org.springframework.web.bind.annotation.RequestBody
            RefreshTokenRequestDTO refreshTokenRequestDTO,
            jakarta.servlet.http.HttpServletRequest request,
            HttpServletResponse response
    ) {
        /* 기존 로직 그대로 */
        String refreshToken = null;
        if (refreshTokenRequestDTO != null && refreshTokenRequestDTO.getRefreshToken() != null) {
            refreshToken = refreshTokenRequestDTO.getRefreshToken();
        } else if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if ("refreshToken".equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                    break;
                }
            }
        }

        if (refreshToken == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.fail("리프레시 토큰이 없습니다."));
        }

        RefreshTokenRequestDTO requestDTO = new RefreshTokenRequestDTO();
        requestDTO.setRefreshToken(refreshToken);

        LoginResponseDTO result = authService.refreshToken(requestDTO);

        Cookie accessTokenCookie = new Cookie("accessToken", result.getAccessToken());
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setPath("/");
        accessTokenCookie.setMaxAge(60 * 60 * 24);
        response.addCookie(accessTokenCookie);

        Cookie refreshTokenCookie = new Cookie("refreshToken", result.getRefreshToken());
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setMaxAge(60 * 60 * 24 * 7);
        response.addCookie(refreshTokenCookie);

        return ResponseEntity.ok(ApiResponse.ok(result, "토큰이 재발급되었습니다."));
    }

    @Operation(
            summary = "인증 상태 확인",
            description = """
                    현재 로그인 상태를 확인합니다.
                    
                    - accessToken / refreshToken 쿠키가 모두 존재해야 성공
                    - 프론트 초기 로딩 시 인증 상태 확인용
                    """
    )
    @GetMapping("/verify")
    public ResponseEntity<ApiResponse<LoginResponseDTO>> verifyAuth(
            jakarta.servlet.http.HttpServletRequest request
    ) {
        /* 기존 로직 그대로 */
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

        if (accessToken == null || refreshToken == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.fail("인증 토큰이 없습니다."));
        }

        LoginResponseDTO result = new LoginResponseDTO(accessToken, refreshToken);
        return ResponseEntity.ok(ApiResponse.ok(result, "인증 상태 확인 성공"));
    }

    @Operation(
            summary = "내 정보 조회",
            description = "현재 로그인한 사용자의 정보를 조회합니다."
    )
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Users>> getCurrentUser() {
        Users user = authService.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.ok(user, "사용자 정보 조회 성공"));
    }

    @Operation(
            summary = "프로필 수정",
            description = "닉네임 등 사용자 프로필 정보를 수정합니다."
    )
    @PatchMapping("/profile")
    public ResponseEntity<ApiResponse<Void>> updateProfile(
            @RequestBody(
                    description = "수정할 프로필 정보",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            UpdateProfileDTO dto
    ) {
        authService.updateProfile(dto);
        return ResponseEntity.ok(ApiResponse.ok("프로필 수정 성공"));
    }

    @Operation(
            summary = "비밀번호 변경",
            description = "현재 비밀번호와 새 비밀번호를 입력받아 변경합니다."
    )
    @PatchMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid
            @RequestBody(
                    description = "비밀번호 변경 정보",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            ChangePasswordDTO dto
    ) {
        authService.changePassword(dto);
        return ResponseEntity.ok(ApiResponse.ok("비밀번호 변경 성공"));
    }

    @Operation(
            summary = "회원탈퇴",
            description = "현재 로그인한 사용자의 계정을 삭제합니다."
    )
    @DeleteMapping("/account")
    public ResponseEntity<ApiResponse<Void>> deleteAccount() {
        authService.deleteAccount();
        return ResponseEntity.ok(ApiResponse.ok("회원탈퇴 성공"));
    }

    @Operation(
            summary = "로그아웃",
            description = "accessToken, refreshToken 쿠키를 삭제하여 로그아웃합니다."
    )
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse response) {
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
}