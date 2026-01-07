package com.pgh.api_practice.service;

import com.pgh.api_practice.entity.Follow;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.errorcode.FollowErrorCode;
import com.pgh.api_practice.exception.FollowException;
import com.pgh.api_practice.repository.FollowRepository;
import com.pgh.api_practice.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    /** =========================
     *  팔로우
     *  ========================= */
    @Transactional
    public boolean followUser(Long followingId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            throw new FollowException(FollowErrorCode.UNAUTHORIZED);
        }

        Users follower = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new FollowException(FollowErrorCode.USER_NOT_FOUND));

        Users following = userRepository.findById(followingId)
                .orElseThrow(() -> new FollowException(FollowErrorCode.TARGET_USER_NOT_FOUND));

        // 자기 자신 팔로우 금지
        if (follower.getId().equals(followingId)) {
            throw new FollowException(FollowErrorCode.SELF_FOLLOW_NOT_ALLOWED);
        }

        // 이미 팔로우 중이면 false
        if (followRepository.existsByFollowerIdAndFollowingId(
                follower.getId(), followingId)) {
            return false;
        }

        Follow follow = Follow.builder()
                .follower(follower)
                .following(following)
                .build();

        followRepository.save(follow);
        return true;
    }

    /** =========================
     *  언팔로우
     *  ========================= */
    @Transactional
    public boolean unfollowUser(Long followingId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            throw new FollowException(FollowErrorCode.UNAUTHORIZED);
        }

        Users follower = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new FollowException(FollowErrorCode.USER_NOT_FOUND));

        followRepository.deleteByFollowerIdAndFollowingId(
                follower.getId(), followingId);

        return true;
    }

    /** =========================
     *  팔로우 상태 확인
     *  ========================= */
    @Transactional(readOnly = true)
    public boolean isFollowing(Long followingId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            return false;
        }

        Users follower = userRepository.findByUsername(authentication.getName())
                .orElse(null);

        if (follower == null) {
            return false;
        }

        return followRepository.existsByFollowerIdAndFollowingId(
                follower.getId(), followingId);
    }

    /** =========================
     *  팔로워 수
     *  ========================= */
    @Transactional(readOnly = true)
    public long getFollowerCount(Long userId) {
        return followRepository.countByFollowingId(userId);
    }

    /** =========================
     *  팔로잉 수
     *  ========================= */
    @Transactional(readOnly = true)
    public long getFollowingCount(Long userId) {
        return followRepository.countByFollowerId(userId);
    }

    /** =========================
     *  팔로워 목록
     *  ========================= */
    @Transactional(readOnly = true)
    public List<UserInfoDTO> getFollowers(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new FollowException(FollowErrorCode.TARGET_USER_NOT_FOUND));

        List<Users> followers = followRepository.findFollowersByUserId(userId);

        return followers.stream()
                .map(follower -> UserInfoDTO.builder()
                        .id(follower.getId())
                        .username(follower.getUsername())
                        .nickname(follower.getNickname())
                        .email(follower.getEmail())
                        .profileImageUrl(follower.getProfileImageUrl())
                        .githubLink(follower.getGithubLink())
                        .followerCount(
                                followRepository.countByFollowingId(follower.getId())
                        )
                        .followingCount(
                                followRepository.countByFollowerId(follower.getId())
                        )
                        .isFollowing(checkIfCurrentUserIsFollowing(follower.getId()))
                        .build())
                .collect(Collectors.toList());
    }

    /** =========================
     *  팔로잉 목록
     *  ========================= */
    @Transactional(readOnly = true)
    public List<UserInfoDTO> getFollowing(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new FollowException(FollowErrorCode.TARGET_USER_NOT_FOUND));

        List<Users> following = followRepository.findFollowingByUserId(userId);

        return following.stream()
                .map(user -> UserInfoDTO.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .nickname(user.getNickname())
                        .email(user.getEmail())
                        .profileImageUrl(user.getProfileImageUrl())
                        .githubLink(user.getGithubLink())
                        .followerCount(
                                followRepository.countByFollowingId(user.getId())
                        )
                        .followingCount(
                                followRepository.countByFollowerId(user.getId())
                        )
                        .isFollowing(true)
                        .build())
                .collect(Collectors.toList());
    }

    /** =========================
     *  현재 사용자 팔로우 여부
     *  ========================= */
    private boolean checkIfCurrentUserIsFollowing(Long userId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            return false;
        }

        Users currentUser = userRepository.findByUsername(authentication.getName())
                .orElse(null);

        if (currentUser == null) {
            return false;
        }

        return followRepository.existsByFollowerIdAndFollowingId(
                currentUser.getId(), userId);
    }

    /** =========================
     *  사용자 정보 조회 (username 기준)
     *  ========================= */
    @Transactional(readOnly = true)
    public UserInfoDTO getUserInfoByUsername(String username) {

        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new FollowException(FollowErrorCode.USER_NOT_FOUND));

        return UserInfoDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .profileImageUrl(user.getProfileImageUrl())
                .githubLink(user.getGithubLink())
                .followerCount(
                        followRepository.countByFollowingId(user.getId())
                )
                .followingCount(
                        followRepository.countByFollowerId(user.getId())
                )
                .isFollowing(checkIfCurrentUserIsFollowing(user.getId()))
                .build();
    }

    /** =========================
     *  사용자 정보 DTO
     *  ========================= */
    @lombok.Getter
    @lombok.Setter
    @lombok.Builder
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class UserInfoDTO {
        private Long id;
        private String username;
        private String nickname;
        private String email;
        private String profileImageUrl;
        private String githubLink;
        private long followerCount;
        private long followingCount;
        private boolean isFollowing;
    }
}