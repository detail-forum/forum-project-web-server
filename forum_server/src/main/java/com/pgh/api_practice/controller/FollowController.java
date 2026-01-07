package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.ApiResponse;
import com.pgh.api_practice.service.FollowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(
        name = "Follow",
        description = "팔로우 / 언팔로우 및 팔로워·팔로잉 조회 API"
)
@RestController
@RequestMapping("/follow")
@AllArgsConstructor
public class FollowController {

    private final FollowService followService;

    @Operation(
            summary = "팔로우",
            description = """
                    특정 사용자를 팔로우합니다.
                    
                    - true : 새로 팔로우됨
                    - false : 이미 팔로우 중
                    """
    )
    @PostMapping("/{userId}")
    public ResponseEntity<ApiResponse<Boolean>> followUser(
            @Parameter(
                    description = "팔로우할 사용자 ID",
                    required = true,
                    example = "3"
            )
            @PathVariable Long userId
    ) {
        boolean followed = followService.followUser(userId);
        return ResponseEntity.ok(ApiResponse.ok(
                followed,
                followed ? "팔로우 성공" : "이미 팔로우 중입니다."
        ));
    }

    @Operation(
            summary = "언팔로우",
            description = "특정 사용자를 언팔로우합니다."
    )
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> unfollowUser(
            @Parameter(
                    description = "언팔로우할 사용자 ID",
                    required = true,
                    example = "3"
            )
            @PathVariable Long userId
    ) {
        followService.unfollowUser(userId);
        return ResponseEntity.ok(ApiResponse.ok("언팔로우 성공"));
    }

    @Operation(
            summary = "팔로우 상태 확인",
            description = """
                    현재 사용자가 해당 사용자를 팔로우 중인지 확인합니다.
                    
                    - true : 팔로우 중
                    - false : 팔로우하지 않음
                    """
    )
    @GetMapping("/{userId}/status")
    public ResponseEntity<ApiResponse<Boolean>> getFollowStatus(
            @Parameter(
                    description = "대상 사용자 ID",
                    required = true,
                    example = "3"
            )
            @PathVariable Long userId
    ) {
        boolean isFollowing = followService.isFollowing(userId);
        return ResponseEntity.ok(ApiResponse.ok(
                isFollowing,
                isFollowing ? "팔로우 중" : "팔로우하지 않음"
        ));
    }

    @Operation(
            summary = "팔로워 수 조회",
            description = "특정 사용자의 팔로워 수를 조회합니다."
    )
    @GetMapping("/{userId}/followers/count")
    public ResponseEntity<ApiResponse<Long>> getFollowerCount(
            @Parameter(
                    description = "사용자 ID",
                    required = true,
                    example = "3"
            )
            @PathVariable Long userId
    ) {
        long count = followService.getFollowerCount(userId);
        return ResponseEntity.ok(ApiResponse.ok(count, "팔로워 수 조회 성공"));
    }

    @Operation(
            summary = "팔로잉 수 조회",
            description = "특정 사용자가 팔로우 중인 사용자 수를 조회합니다."
    )
    @GetMapping("/{userId}/following/count")
    public ResponseEntity<ApiResponse<Long>> getFollowingCount(
            @Parameter(
                    description = "사용자 ID",
                    required = true,
                    example = "3"
            )
            @PathVariable Long userId
    ) {
        long count = followService.getFollowingCount(userId);
        return ResponseEntity.ok(ApiResponse.ok(count, "팔로잉 수 조회 성공"));
    }

    @Operation(
            summary = "팔로워 목록 조회",
            description = "특정 사용자를 팔로우하고 있는 사용자 목록을 조회합니다."
    )
    @GetMapping("/{userId}/followers")
    public ResponseEntity<ApiResponse<List<FollowService.UserInfoDTO>>> getFollowers(
            @Parameter(
                    description = "사용자 ID",
                    required = true,
                    example = "3"
            )
            @PathVariable Long userId
    ) {
        List<FollowService.UserInfoDTO> followers = followService.getFollowers(userId);
        return ResponseEntity.ok(ApiResponse.ok(followers, "팔로워 목록 조회 성공"));
    }

    @Operation(
            summary = "팔로잉 목록 조회",
            description = "특정 사용자가 팔로우 중인 사용자 목록을 조회합니다."
    )
    @GetMapping("/{userId}/following")
    public ResponseEntity<ApiResponse<List<FollowService.UserInfoDTO>>> getFollowing(
            @Parameter(
                    description = "사용자 ID",
                    required = true,
                    example = "3"
            )
            @PathVariable Long userId
    ) {
        List<FollowService.UserInfoDTO> following = followService.getFollowing(userId);
        return ResponseEntity.ok(ApiResponse.ok(following, "팔로잉 목록 조회 성공"));
    }

    @Operation(
            summary = "사용자 정보 조회 (username)",
            description = "username을 기준으로 사용자 기본 정보를 조회합니다."
    )
    @GetMapping("/user/{username}")
    public ResponseEntity<ApiResponse<FollowService.UserInfoDTO>> getUserInfo(
            @Parameter(
                    description = "사용자 username",
                    required = true,
                    example = "juyoung"
            )
            @PathVariable String username
    ) {
        FollowService.UserInfoDTO userInfo =
                followService.getUserInfoByUsername(username);
        return ResponseEntity.ok(ApiResponse.ok(userInfo, "사용자 정보 조회 성공"));
    }

    @Operation(
            summary = "팔로우 상태 확인 (check)",
            description = """
                    팔로우 상태를 확인합니다.
                    
                    status API와 기능은 동일하지만 경로만 다릅니다.
                    """
    )
    @GetMapping("/check/{userId}")
    public ResponseEntity<ApiResponse<Boolean>> checkFollowStatus(
            @Parameter(
                    description = "대상 사용자 ID",
                    required = true,
                    example = "3"
            )
            @PathVariable Long userId
    ) {
        boolean isFollowing = followService.isFollowing(userId);
        return ResponseEntity.ok(ApiResponse.ok(
                isFollowing,
                isFollowing ? "팔로우 중" : "팔로우하지 않음"
        ));
    }
}