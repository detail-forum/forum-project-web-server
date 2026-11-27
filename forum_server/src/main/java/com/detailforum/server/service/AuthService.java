package com.detailforum.server.service;


import com.detailforum.server.dto.ChangePasswordDTO;
import com.detailforum.server.dto.LoginRequestDTO;
import com.detailforum.server.dto.UpdateProfileDTO;
import com.detailforum.server.dto.auth.LoginResponseDTO;
import com.detailforum.server.dto.auth.RefreshTokenRequestDTO;
import com.detailforum.server.dto.auth.RegisterRequestDTO;
import com.detailforum.server.entity.RefreshToken;
import com.detailforum.server.entity.Users;
import com.detailforum.server.exception.ApplicationUnauthorizedException;
import com.detailforum.server.exception.RefreshTokenExpiredException;
import com.detailforum.server.exception.ResourceNotFoundException;
import com.detailforum.server.exception.UserAlreadyExistException;
import com.detailforum.server.global.TokenProvider;
import com.detailforum.server.repository.AuthRepository;
import com.detailforum.server.repository.RefreshTokenRepository;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Objects;
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

        try {
            // 동시에 같은 아이디/이메일/닉네임으로 가입하면 위 검사를 둘 다 통과한다. DB 유니크 제약이 최종 판정이다.
            authRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw new UserAlreadyExistException("이미 사용 중인 아이디, 이메일 또는 닉네임입니다.");
        }

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
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

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
                .userId(user.getId())
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

        // 4) RefreshToken에서 username 추출. 탈퇴 계정은 재발급하지 않는다.
        String username = tokenProvider.getUsername(dto.getRefreshToken());
        if ("access".equals(tokenProvider.getTokenType(dto.getRefreshToken()))) {
            throw new RefreshTokenExpiredException("리프레시 토큰이 만료되었습니다.");
        }
        Users user = authRepository.findByUsername(username)
                .filter(u -> !u.isSuspended())
                .orElseThrow(() -> new RefreshTokenExpiredException("리프레시 토큰이 만료되었습니다."));

        // 5) 새로운 AccessToken 생성
        String newAccessToken = tokenProvider.createAccessToken(username);

        // 6) 새로운 RefreshToken 생성 (선택적 - 기존 토큰 유지하거나 새로 발급)
        String newRefreshToken = tokenProvider.createRefreshToken(username);

        // 7) 기존 RefreshToken 삭제하고 새로운 RefreshToken 저장
        refreshTokenRepository.delete(refreshTokenEntity);
        RefreshToken newRefreshTokenEntity = RefreshToken.builder()
                .refreshToken(newRefreshToken)
                .expiryDateTime(LocalDateTime.now().plusDays(7))
                .userId(user.getId())
                .build();
        refreshTokenRepository.save(newRefreshTokenEntity);

        return new LoginResponseDTO(newAccessToken, newRefreshToken);
    }

    /**
     * 액세스 토큰이 유효하면 그대로 돌려주고, 아니면 리프레시 토큰으로 재발급한다.
     * 응답 형태는 로그인과 같다.
     */
    @Transactional
    public LoginResponseDTO verifyOrRefresh(String accessToken, String refreshTokenValue) {
        if (isUsableAccessToken(accessToken)) {
            return new LoginResponseDTO(accessToken, refreshTokenValue);
        }
        RefreshTokenRequestDTO request = new RefreshTokenRequestDTO();
        request.setRefreshToken(refreshTokenValue);
        return refreshToken(request);
    }

    /** 로그아웃 시 현재 리프레시 토큰만 폐기한다. 다른 기기의 세션은 유지된다. */
    @Transactional
    public void revokeRefreshToken(String refreshTokenValue) {
        if (refreshTokenValue == null || refreshTokenValue.isBlank()) {
            return;
        }
        refreshTokenRepository.findByRefreshToken(refreshTokenValue)
                .ifPresent(refreshTokenRepository::delete);
    }

    private boolean isUsableAccessToken(String accessToken) {
        if (accessToken == null || accessToken.isBlank() || !tokenProvider.validateToken(accessToken)) {
            return false;
        }
        if (tokenProvider.isRefreshToken(accessToken)) {
            return false;
        }
        return tokenProvider.getTokenType(accessToken) != null
                || refreshTokenRepository.findByRefreshToken(accessToken).isEmpty();
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
        
        if (dto.getProfileImageUrl() != null) {
            String imageUrl = ProfileFields.profileImageUrl(dto.getProfileImageUrl());
            if (!Objects.equals(imageUrl, storedOrNull(user.getProfileImageUrl()))) {
                user.setProfileImageUrl(imageUrl);
                modified = true;
            }
        }
        
        if (dto.getEmail() != null) {
            String email = ProfileFields.email(dto.getEmail());
            if (!email.equals(user.getEmail())) {
                if (authRepository.existsByEmail(email)) {
                    throw new UserAlreadyExistException("이미 사용 중인 이메일입니다.");
                }
                user.setEmail(email);
                modified = true;
            }
        }
        
        if (dto.getGithubLink() != null) {
            String githubLink = ProfileFields.githubLink(dto.getGithubLink());
            if (!Objects.equals(githubLink, storedOrNull(user.getGithubLink()))) {
                user.setGithubLink(githubLink);
                modified = true;
            }
        }
        
        if (dto.getNickname() != null) {
            String nickname = ProfileFields.nickname(dto.getNickname());
            if (!nickname.equals(user.getNickname())) {
                if (authRepository.existsByNickname(nickname)) {
                    throw new UserAlreadyExistException("이미 사용 중인 닉네임입니다.");
                }
                user.setNickname(nickname);
                modified = true;
            }
        }
        
        if (modified) {
            authRepository.save(user);
        }
    }

    private static String storedOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    /** ✅ 비밀번호 변경 */
    @Transactional
    public void changePassword(ChangePasswordDTO dto) {
        Users user = getCurrentUser();
        
        // 현재 비밀번호 확인
        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }
        
        // 새 비밀번호 설정. 이미 발급된 리프레시 토큰은 더 이상 재발급에 쓰지 못한다.
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        authRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    /** ✅ 회원탈퇴 */
    @Transactional
    public void deleteAccount() {
        Users user = getCurrentUser();
        user.setDeleted(true);
        authRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
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

    /** ✅ 이메일 인증 메일 재발송. 가입·인증 여부를 드러내지 않도록 보낼 대상이 아니면 조용히 끝낸다. */
    @Transactional
    public void resendVerificationEmail(String email) {
        Users user = authRepository.findByEmail(email).orElse(null);
        if (user == null || user.isDeleted() || user.isEmailVerified()) {
            return;
        }

        // 새 인증 토큰 생성
        String verificationToken = UUID.randomUUID().toString();
        user.setEmailVerificationToken(verificationToken);
        authRepository.save(user);

        // 이메일 재발송
        emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), verificationToken);
    }

    /** ✅ 비밀번호 재설정 메일 발송. 가입 여부를 드러내지 않도록 없는 이메일도 조용히 끝낸다. */
    @Transactional
    public void requestPasswordReset(String email) {
        Users user = authRepository.findByEmail(email).orElse(null);
        if (user == null || user.isDeleted()) {
            return;
        }

        String token = UUID.randomUUID().toString();
        user.setPasswordResetTokenHash(sha256(token));
        user.setPasswordResetExpiresAt(LocalDateTime.now().plus(PASSWORD_RESET_TTL));
        authRepository.save(user);

        emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), token);
    }

    /** ✅ 메일 링크의 토큰으로 비밀번호 재설정 */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        Users user = authRepository.findByPasswordResetTokenHash(sha256(token))
                .filter(u -> !u.isDeleted())
                .filter(u -> u.getPasswordResetExpiresAt() != null
                        && u.getPasswordResetExpiresAt().isAfter(LocalDateTime.now()))
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않거나 만료된 링크입니다. 다시 요청해주세요."));

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetExpiresAt(null);
        // 메일 링크를 열었다는 것은 이메일 소유가 확인된 것이다.
        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        authRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    private static final Duration PASSWORD_RESET_TTL = Duration.ofMinutes(30);

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

}
