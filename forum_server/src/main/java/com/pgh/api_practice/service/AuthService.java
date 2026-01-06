package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.ChangePasswordDTO;
import com.pgh.api_practice.dto.LoginRequestDTO;
import com.pgh.api_practice.dto.UpdateProfileDTO;
import com.pgh.api_practice.dto.auth.LoginResponseDTO;
import com.pgh.api_practice.dto.auth.RefreshTokenRequestDTO;
import com.pgh.api_practice.dto.auth.RegisterRequestDTO;
import com.pgh.api_practice.entity.RefreshToken;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.errorcode.AuthErrorCode;
import com.pgh.api_practice.exception.AuthException;
import com.pgh.api_practice.global.TokenProvider;
import com.pgh.api_practice.repository.AuthRepository;
import com.pgh.api_practice.repository.RefreshTokenRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@AllArgsConstructor
@Service
public class AuthService {

    private final AuthRepository authRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokenRepository refreshTokenRepository;

    /** =========================
     *  회원가입
     *  ========================= */
    public void register(RegisterRequestDTO dto) {

        if (authRepository.existsByUsername(dto.getUsername())) {
            throw new AuthException(AuthErrorCode.USERNAME_ALREADY_EXISTS);
        }

        if (authRepository.existsByEmail(dto.getEmail())) {
            throw new AuthException(AuthErrorCode.EMAIL_ALREADY_EXISTS);
        }

        Users user = Users.builder()
                .username(dto.getUsername())
                .email(dto.getEmail())
                .nickname(dto.getNickname())
                .password(passwordEncoder.encode(dto.getPassword()))
                .build();

        authRepository.save(user);
    }

    /** =========================
     *  로그인
     *  ========================= */
    public LoginResponseDTO login(LoginRequestDTO dto) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        dto.getUsername(),
                        dto.getPassword()
                )
        );

        String username = authentication.getName();

        authRepository.findByUsername(username)
                .orElseThrow(() -> new AuthException(AuthErrorCode.ACCOUNT_NOT_FOUND));

        String accessToken = tokenProvider.createAccessToken(username);
        String refreshToken = tokenProvider.createRefreshToken(username);

        RefreshToken rt = RefreshToken.builder()
                .refreshToken(refreshToken)
                .expiryDateTime(LocalDateTime.now().plusDays(7))
                .build();

        refreshTokenRepository.save(rt);

        return new LoginResponseDTO(accessToken, refreshToken);
    }

    /** =========================
     *  토큰 재발급
     *  ========================= */
    @Transactional
    public LoginResponseDTO refreshToken(RefreshTokenRequestDTO dto) {

        if (!tokenProvider.validateToken(dto.getRefreshToken())) {
            throw new AuthException(AuthErrorCode.TOKEN_EXPIRED);
        }

        RefreshToken refreshTokenEntity =
                refreshTokenRepository.findByRefreshToken(dto.getRefreshToken())
                        .orElseThrow(() -> new AuthException(AuthErrorCode.INVALID_TOKEN));

        if (refreshTokenEntity.getExpiryDateTime().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(refreshTokenEntity);
            throw new AuthException(AuthErrorCode.TOKEN_EXPIRED);
        }

        String username = tokenProvider.getUsername(dto.getRefreshToken());

        String newAccessToken = tokenProvider.createAccessToken(username);
        String newRefreshToken = tokenProvider.createRefreshToken(username);

        refreshTokenRepository.delete(refreshTokenEntity);

        RefreshToken newRefreshTokenEntity = RefreshToken.builder()
                .refreshToken(newRefreshToken)
                .expiryDateTime(LocalDateTime.now().plusDays(7))
                .build();

        refreshTokenRepository.save(newRefreshTokenEntity);

        return new LoginResponseDTO(newAccessToken, newRefreshToken);
    }

    /** =========================
     *  현재 사용자 조회
     *  ========================= */
    @Transactional(readOnly = true)
    public Users getCurrentUser() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            throw new AuthException(AuthErrorCode.UNAUTHORIZED);
        }

        return authRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AuthException(AuthErrorCode.ACCOUNT_NOT_FOUND));
    }

    /** =========================
     *  프로필 수정
     *  ========================= */
    @Transactional
    public void updateProfile(UpdateProfileDTO dto) {

        Users user = getCurrentUser();
        boolean modified = false;

        if (dto.getProfileImageUrl() != null
                && !dto.getProfileImageUrl().equals(user.getProfileImageUrl())) {
            user.setProfileImageUrl(dto.getProfileImageUrl());
            modified = true;
        }

        if (dto.getEmail() != null
                && !dto.getEmail().equals(user.getEmail())) {

            if (authRepository.existsByEmail(dto.getEmail())) {
                throw new AuthException(AuthErrorCode.EMAIL_ALREADY_EXISTS);
            }

            user.setEmail(dto.getEmail());
            modified = true;
        }

        if (dto.getGithubLink() != null
                && !dto.getGithubLink().equals(user.getGithubLink())) {
            user.setGithubLink(dto.getGithubLink());
            modified = true;
        }

        if (dto.getNickname() != null
                && !dto.getNickname().equals(user.getNickname())) {

            if (authRepository.existsByNickname(dto.getNickname())) {
                throw new AuthException(AuthErrorCode.USERNAME_ALREADY_EXISTS);
            }

            user.setNickname(dto.getNickname());
            modified = true;
        }

        if (modified) {
            authRepository.save(user);
        }
    }

    /** =========================
     *  비밀번호 변경
     *  ========================= */
    @Transactional
    public void changePassword(ChangePasswordDTO dto) {

        Users user = getCurrentUser();

        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            throw new AuthException(AuthErrorCode.PASSWORD_MISMATCH);
        }

        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        authRepository.save(user);
    }

    /** =========================
     *  회원 탈퇴
     *  ========================= */
    @Transactional
    public void deleteAccount() {

        Users user = getCurrentUser();
        user.setDeleted(true);
        authRepository.save(user);

        // 필요 시 해당 유저의 RefreshToken 전체 삭제
    }
}