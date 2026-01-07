package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.ApiResponse;
import com.pgh.api_practice.service.FollowService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/follow")
@AllArgsConstructor
public class FollowController {

    private final FollowService followService;

    /** ✅ 팔로우 */
    // POST http://localhost:8081/follow/{userId}
    @PostMapping("/{userId}")
    public ResponseEntity<ApiResponse<Boolean>> followUser(@PathVariable Long userId) {
        boolean followed = followService.followUser(userId);
        return ResponseEntity.ok(ApiResponse.ok(followed, followed ? "팔로우 성공" : "이미 팔로우 중입니다."));
    }

    /** ✅ 언팔로우 */
    // DELETE http://localhost:8081/follow/{userId}
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> unfollowUser(@PathVariable Long userId) {
        followService.unfollowUser(userId);
        return ResponseEntity.ok(ApiResponse.ok("언팔로우 성공"));
    }

    /** ✅ 팔로우 상태 확인 */
    // GET http://localhost:8081/follow/{userId}/status
    @GetMapping("/{userId}/status")
    public ResponseEntity<ApiResponse<Boolean>> getFollowStatus(@PathVariable Long userId) {
        boolean isFollowing = followService.isFollowing(userId);
        return ResponseEntity.ok(ApiResponse.ok(isFollowing, isFollowing ? "팔로우 중" : "팔로우하지 않음"));
    }

    /** ✅ 팔로워 수 조회 */
    // GET http://localhost:8081/follow/{userId}/followers/count
    @GetMapping("/{userId}/followers/count")
    public ResponseEntity<ApiResponse<Long>> getFollowerCount(@PathVariable Long userId) {
        long count = followService.getFollowerCount(userId);
        return ResponseEntity.ok(ApiResponse.ok(count, "팔로워 수 조회 성공"));
    }

    /** ✅ 팔로잉 수 조회 */
    // GET http://localhost:8081/follow/{userId}/following/count
    @GetMapping("/{userId}/following/count")
    public ResponseEntity<ApiResponse<Long>> getFollowingCount(@PathVariable Long userId) {
        long count = followService.getFollowingCount(userId);
        return ResponseEntity.ok(ApiResponse.ok(count, "팔로잉 수 조회 성공"));
    }

    /** ✅ 팔로워 목록 조회 */
    // GET http://localhost:8081/follow/{userId}/followers
    @GetMapping("/{userId}/followers")
    public ResponseEntity<ApiResponse<List<FollowService.UserInfoDTO>>> getFollowers(@PathVariable Long userId) {
        List<FollowService.UserInfoDTO> followers = followService.getFollowers(userId);
        return ResponseEntity.ok(ApiResponse.ok(followers, "팔로워 목록 조회 성공"));
    }

    /** ✅ 팔로잉 목록 조회 */
    // GET http://localhost:8081/follow/{userId}/following
    @GetMapping("/{userId}/following")
    public ResponseEntity<ApiResponse<List<FollowService.UserInfoDTO>>> getFollowing(@PathVariable Long userId) {
        List<FollowService.UserInfoDTO> following = followService.getFollowing(userId);
        return ResponseEntity.ok(ApiResponse.ok(following, "팔로잉 목록 조회 성공"));
    }
    
    /** ✅ 사용자 정보 조회 (username으로) */
    // GET http://localhost:8081/follow/user/{username}
    @GetMapping("/user/{username}")
    public ResponseEntity<ApiResponse<FollowService.UserInfoDTO>> getUserInfo(@PathVariable String username) {
        FollowService.UserInfoDTO userInfo = followService.getUserInfoByUsername(username);
        return ResponseEntity.ok(ApiResponse.ok(userInfo, "사용자 정보 조회 성공"));
    }
    
    /** ✅ 팔로우 상태 확인 (더 확실한 방법) */
    // GET http://localhost:8081/follow/check/{userId}
    @GetMapping("/check/{userId}")
    public ResponseEntity<ApiResponse<Boolean>> checkFollowStatus(@PathVariable Long userId) {
        boolean isFollowing = followService.isFollowing(userId);
        return ResponseEntity.ok(ApiResponse.ok(isFollowing, isFollowing ? "팔로우 중" : "팔로우하지 않음"));
    }
}
