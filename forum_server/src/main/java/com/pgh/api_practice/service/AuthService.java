package com.pgh.api_practice.service;


import com.pgh.api_practice.dto.ChangePasswordDTO;
import com.pgh.api_practice.dto.LoginRequestDTO;
import com.pgh.api_practice.dto.UpdateProfileDTO;
import com.pgh.api_practice.dto.auth.LoginResponseDTO;
import com.pgh.api_practice.dto.auth.RefreshTokenRequestDTO;
import com.pgh.api_practice.dto.auth.RegisterRequestDTO;
import com.pgh.api_practice.entity.RefreshToken;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.exception.ApplicationUnauthorizedException;
import com.pgh.api_practice.exception.RefreshTokenExpiredException;
import com.pgh.api_practice.exception.ResourceNotFoundException;
import com.pgh.api_practice.exception.UserAlreadyExistException;
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
import java.util.UUID;

@AllArgsConstructor
@Service
public class AuthService {

    private final AuthRepository authRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailService emailService;

    // 회원가입
    @Transactional
    public void register(RegisterRequestDTO dto) {
        // 아이디 중복 검증
        if (authRepository.existsByUsername(dto.getUsername())) {
            throw new UserAlreadyExistException("이미 사용 중인 아이디입니다.");
        }

        // 이메일 중복 검증
        if (authRepository.existsByEmail(dto.getEmail())) {
            throw new UserAlreadyExistException("이미 사용 중인 이메일입니다.");
        }

        // 닉네임 중복 검증
        if (authRepository.existsByNickname(dto.getNickname())) {
            throw new UserAlreadyExistException("이미 사용 중인 닉네임입니다.");
        }

        // 이메일 인증 토큰 생성
        String verificationToken = UUID.randomUUID().toString();

        Users user = Users.builder()
                .username(dto.getUsername())
                .email(dto.getEmail())
                .nickname(dto.getNickname())
                .password(passwordEncoder.encode(dto.getPassword())) // 비밀번호 인코딩
                .emailVerified(false) // 이메일 미인증 상태로 시작
                .emailVerificationToken(verificationToken)
                .build();

        authRepository.save(user);

        // 이메일 인증 메일 발송
        try {
            emailService.sendVerificationEmail(dto.getEmail(), dto.getUsername(), verificationToken);
        } catch (Exception e) {
            // 이메일 발송 실패해도 회원가입은 완료 (나중에 재발송 가능)
            // 로그만 남기고 계속 진행
            System.err.println("이메일 발송 실패: " + e.getMessage());
        }
    }

    // 로그인
    @Transactional
    public LoginResponseDTO login(LoginRequestDTO dto) {
        // 1) 인증
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(dto.getUsername(), dto.getPassword())
        );

        String username = authentication.getName();

        // 2) 사용자 존재 확인 및 이메일 인증 여부 확인
        Users user = authRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

        // 3) 이메일 인증 여부 확인
        if (!user.isEmailVerified()) {
            throw new ApplicationUnauthorizedException("이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.");
        }

        // 4) 토큰 생성
        String accessToken  = tokenProvider.createAccessToken(username);
        String refreshToken = tokenProvider.createRefreshToken(username);

        // 5) 신규 RT 저장
        RefreshToken rt = RefreshToken.builder()
                .refreshToken(refreshToken)
                .expiryDateTime(LocalDateTime.now().plusDays(7))
                .build();
        refreshTokenRepository.save(rt);

        return new LoginResponseDTO(accessToken, refreshToken);
    }

    // ✅ 토큰 재발급
    @Transactional
    public LoginResponseDTO refreshToken(RefreshTokenRequestDTO dto) {
        // 1) RefreshToken 검증
        if (!tokenProvider.validateToken(dto.getRefreshToken())) {
            throw new RefreshTokenExpiredException("리프레시 토큰이 만료되었습니다.");
        }

        // 2) DB에서 RefreshToken 조회
        RefreshToken refreshTokenEntity = refreshTokenRepository.findByRefreshToken(dto.getRefreshToken())
                .orElseThrow(() -> new ResourceNotFoundException("리프레시 토큰을 찾을 수 없습니다."));

        // 3) RefreshToken 만료 시간 확인
        if (refreshTokenEntity.getExpiryDateTime().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(refreshTokenEntity);
            throw new RefreshTokenExpiredException("리프레시 토큰이 만료되었습니다.");
        }

        // 4) RefreshToken에서 username 추출
        String username = tokenProvider.getUsername(dto.getRefreshToken());

        // 5) 새로운 AccessToken 생성
        String newAccessToken = tokenProvider.createAccessToken(username);

        // 6) 새로운 RefreshToken 생성 (선택적 - 기존 토큰 유지하거나 새로 발급)
        String newRefreshToken = tokenProvider.createRefreshToken(username);

        // 7) 기존 RefreshToken 삭제하고 새로운 RefreshToken 저장
        refreshTokenRepository.delete(refreshTokenEntity);
        RefreshToken newRefreshTokenEntity = RefreshToken.builder()
                .refreshToken(newRefreshToken)
                .expiryDateTime(LocalDateTime.now().plusDays(7))
                .build();
        refreshTokenRepository.save(newRefreshTokenEntity);

        return new LoginResponseDTO(newAccessToken, newRefreshToken);
    }

    /** ✅ 현재 사용자 정보 조회 */
    @Transactional(readOnly = true)
    public Users getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        
        String username = authentication.getName();
        return authRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
    }

    /** ✅ 프로필 정보 수정 */
    @Transactional
    public void updateProfile(UpdateProfileDTO dto) {
        Users user = getCurrentUser();
        
        boolean modified = false;
        
        if (dto.getProfileImageUrl() != null && !dto.getProfileImageUrl().equals(user.getProfileImageUrl())) {
            user.setProfileImageUrl(dto.getProfileImageUrl());
            modified = true;
        }
        
        if (dto.getEmail() != null && !dto.getEmail().equals(user.getEmail())) {
            // 이메일 중복 확인
            if (authRepository.existsByEmail(dto.getEmail()) && !dto.getEmail().equals(user.getEmail())) {
                throw new UserAlreadyExistException("이미 사용 중인 이메일입니다.");
            }
            user.setEmail(dto.getEmail());
            modified = true;
        }
        
        if (dto.getGithubLink() != null && !dto.getGithubLink().equals(user.getGithubLink())) {
            user.setGithubLink(dto.getGithubLink());
            modified = true;
        }
        
        if (dto.getNickname() != null && !dto.getNickname().equals(user.getNickname())) {
            // 닉네임 중복 확인
            if (authRepository.existsByNickname(dto.getNickname()) && !dto.getNickname().equals(user.getNickname())) {
                throw new UserAlreadyExistException("이미 사용 중인 닉네임입니다.");
            }
            user.setNickname(dto.getNickname());
            modified = true;
        }
        
        if (modified) {
            authRepository.save(user);
        }
    }

    /** ✅ 비밀번호 변경 */
    @Transactional
    public void changePassword(ChangePasswordDTO dto) {
        Users user = getCurrentUser();
        
        // 현재 비밀번호 확인
        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }
        
        // 새 비밀번호 설정
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        authRepository.save(user);
    }

    /** ✅ 회원탈퇴 */
    @Transactional
    public void deleteAccount() {
        Users user = getCurrentUser();
        user.setDeleted(true);
        authRepository.save(user);
        
        // 모든 리프레시 토큰 삭제
        // (선택적 - 보안을 위해)
    }

    /** ✅ 이메일 인증 처리 */
    @Transactional
    public void verifyEmail(String token) {
        Users user = authRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("유효하지 않은 인증 토큰입니다."));

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("이미 인증된 이메일입니다.");
        }

        // 이메일 인증 완료
        user.setEmailVerified(true);
        user.setEmailVerificationToken(null); // 토큰 제거 (일회용)
        authRepository.save(user);
    }

    /** ✅ 이메일 인증 메일 재발송 */
    @Transactional
    public void resendVerificationEmail(String email) {
        Users user = authRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("해당 이메일로 가입된 계정을 찾을 수 없습니다."));

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("이미 인증된 이메일입니다.");
        }

        // 새 인증 토큰 생성
        String verificationToken = UUID.randomUUID().toString();
        user.setEmailVerificationToken(verificationToken);
        authRepository.save(user);

        // 이메일 재발송
        emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), verificationToken);
    }

}
