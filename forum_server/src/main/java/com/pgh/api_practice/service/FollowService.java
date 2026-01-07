package com.pgh.api_practice.service;

import com.pgh.api_practice.entity.Follow;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.exception.ApplicationUnauthorizedException;
import com.pgh.api_practice.exception.ResourceNotFoundException;
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

    /** ✅ 팔로우 */
    @Transactional
    public boolean followUser(Long followingId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        
        String username = authentication.getName();
        Users follower = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
        
        Users following = userRepository.findById(followingId)
                .orElseThrow(() -> new ResourceNotFoundException("팔로우할 유저를 찾을 수 없습니다."));
        
        // 자기 자신을 팔로우할 수 없음
        if (follower.getId().equals(followingId)) {
            throw new IllegalArgumentException("자기 자신을 팔로우할 수 없습니다.");
        }
        
        // 이미 팔로우 중인지 확인
        if (followRepository.existsByFollowerIdAndFollowingId(follower.getId(), followingId)) {
            return false; // 이미 팔로우 중
        }
        
        // 팔로우 생성
        Follow follow = Follow.builder()
                .follower(follower)
                .following(following)
                .build();
        followRepository.save(follow);
        
        return true; // 팔로우 성공
    }
    
    /** ✅ 언팔로우 */
    @Transactional
    public boolean unfollowUser(Long followingId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        
        String username = authentication.getName();
        Users follower = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
        
        // 팔로우 관계 삭제
        followRepository.deleteByFollowerIdAndFollowingId(follower.getId(), followingId);
        
        return true; // 언팔로우 성공
    }
    
    /** ✅ 팔로우 상태 확인 */
    @Transactional(readOnly = true)
    public boolean isFollowing(Long followingId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            return false;
        }
        
        String username = authentication.getName();
        Users follower = userRepository.findByUsername(username).orElse(null);
        if (follower == null) {
            return false;
        }
        
        return followRepository.existsByFollowerIdAndFollowingId(follower.getId(), followingId);
    }
    
    /** ✅ 팔로워 수 조회 */
    @Transactional(readOnly = true)
    public long getFollowerCount(Long userId) {
        return followRepository.countByFollowingId(userId);
    }
    
    /** ✅ 팔로잉 수 조회 */
    @Transactional(readOnly = true)
    public long getFollowingCount(Long userId) {
        return followRepository.countByFollowerId(userId);
    }
    
    /** ✅ 팔로워 목록 조회 */
    @Transactional(readOnly = true)
    public List<UserInfoDTO> getFollowers(Long userId) {
        // 사용자 존재 확인
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
        
        List<Users> followers = followRepository.findFollowersByUserId(userId);
        
        return followers.stream()
                .map(follower -> UserInfoDTO.builder()
                        .id(follower.getId())
                        .username(follower.getUsername())
                        .nickname(follower.getNickname())
                        .email(follower.getEmail())
                        .profileImageUrl(follower.getProfileImageUrl())
                        .githubLink(follower.getGithubLink())
                        .followerCount(followRepository.countByFollowingId(follower.getId()))
                        .followingCount(followRepository.countByFollowerId(follower.getId()))
                        .isFollowing(checkIfCurrentUserIsFollowing(follower.getId()))
                        .build())
                .collect(Collectors.toList());
    }
    
    /** ✅ 팔로잉 목록 조회 */
    @Transactional(readOnly = true)
    public List<UserInfoDTO> getFollowing(Long userId) {
        // 사용자 존재 확인
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
        
        List<Users> following = followRepository.findFollowingByUserId(userId);
        
        return following.stream()
                .map(followingUser -> UserInfoDTO.builder()
                        .id(followingUser.getId())
                        .username(followingUser.getUsername())
                        .nickname(followingUser.getNickname())
                        .email(followingUser.getEmail())
                        .profileImageUrl(followingUser.getProfileImageUrl())
                        .githubLink(followingUser.getGithubLink())
                        .followerCount(followRepository.countByFollowingId(followingUser.getId()))
                        .followingCount(followRepository.countByFollowerId(followingUser.getId()))
                        .isFollowing(true) // 팔로잉 목록이므로 항상 true
                        .build())
                .collect(Collectors.toList());
    }
    
    /** 현재 사용자가 특정 사용자를 팔로우하는지 확인 */
    private boolean checkIfCurrentUserIsFollowing(Long userId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            return false;
        }
        
        String username = authentication.getName();
        Users currentUser = userRepository.findByUsername(username).orElse(null);
        if (currentUser == null) {
            return false;
        }
        
        boolean exists = followRepository.existsByFollowerIdAndFollowingId(currentUser.getId(), userId);
        System.out.println("팔로우 상태 확인 - 현재 사용자 ID: " + currentUser.getId() + ", 대상 사용자 ID: " + userId + ", 팔로우 여부: " + exists);
        return exists;
    }
    
    /** ✅ 사용자 정보 조회 (username으로) */
    @Transactional(readOnly = true)
    public UserInfoDTO getUserInfoByUsername(String username) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
        
        long followerCount = followRepository.countByFollowingId(user.getId());
        long followingCount = followRepository.countByFollowerId(user.getId());
        boolean isFollowing = checkIfCurrentUserIsFollowing(user.getId());
        
        return UserInfoDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .profileImageUrl(user.getProfileImageUrl())
                .githubLink(user.getGithubLink())
                .followerCount(followerCount)
                .followingCount(followingCount)
                .isFollowing(isFollowing)
                .build();
    }
    
    /** 사용자 정보 DTO */
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
