package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.service.GroupService;
import com.pgh.api_practice.service.GroupPostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(
        name = "Group",
        description = "모임 생성, 가입, 관리 및 모임 게시물·채팅 API"
)
@RestController
@RequestMapping("/group")
@AllArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final GroupPostService groupPostService;

    @Operation(
            summary = "모임 생성",
            description = "새로운 모임을 생성합니다."
    )
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> createGroup(
            @Valid
            @RequestBody(
                    description = "모임 생성 정보",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            CreateGroupDTO dto
    ) {
        Long groupId = groupService.createGroup(dto);
        return ResponseEntity.ok(ApiResponse.ok(groupId, "모임이 생성되었습니다."));
    }

    @Operation(
            summary = "모임 목록 조회",
            description = """
                    모임 목록을 페이징 조회합니다.
                    
                    - myGroups=true : 내가 가입한 모임만 조회
                    - myGroups=false 또는 미지정 : 전체 모임 조회
                    """
    )
    @GetMapping
    public ResponseEntity<ApiResponse<Page<GroupListDTO>>> getGroupList(
            Pageable pageable,
            @Parameter(
                    description = "내가 가입한 모임만 조회 여부",
                    example = "true"
            )
            @RequestParam(required = false) Boolean myGroups
    ) {
        Page<GroupListDTO> list = groupService.getGroupList(pageable, myGroups);
        return ResponseEntity.ok(ApiResponse.ok(list, "모임 목록 조회 성공"));
    }

    @Operation(
            summary = "모임 상세 조회",
            description = "모임의 상세 정보를 조회합니다."
    )
    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupDetailDTO>> getGroupDetail(
            @Parameter(
                    description = "모임 ID",
                    required = true,
                    example = "1"
            )
            @PathVariable Long groupId
    ) {
        GroupDetailDTO detail = groupService.getGroupDetail(groupId);
        return ResponseEntity.ok(ApiResponse.ok(detail, "모임 상세 조회 성공"));
    }

    @Operation(
            summary = "모임 가입 여부 확인",
            description = """
                    현재 사용자가 모임에 가입되어 있는지 확인합니다.
                    
                    - true : 가입됨
                    - false : 미가입
                    """
    )
    @GetMapping("/{groupId}/membership")
    public ResponseEntity<ApiResponse<Boolean>> checkMembership(
            @Parameter(
                    description = "모임 ID",
                    required = true,
                    example = "1"
            )
            @PathVariable Long groupId
    ) {
        boolean isMember = groupService.checkMembership(groupId);
        return ResponseEntity.ok(ApiResponse.ok(isMember, "모임 가입 여부 확인 성공"));
    }

    @Operation(
            summary = "모임 가입",
            description = "모임에 가입합니다."
    )
    @PostMapping("/{groupId}/join")
    public ResponseEntity<ApiResponse<Void>> joinGroup(
            @Parameter(
                    description = "모임 ID",
                    required = true,
                    example = "1"
            )
            @PathVariable Long groupId
    ) {
        groupService.joinGroup(groupId);
        return ResponseEntity.ok(ApiResponse.ok("모임에 가입되었습니다."));
    }

    @Operation(
            summary = "모임 탈퇴",
            description = "모임에서 탈퇴합니다."
    )
    @PostMapping("/{groupId}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveGroup(
            @Parameter(
                    description = "모임 ID",
                    required = true,
                    example = "1"
            )
            @PathVariable Long groupId
    ) {
        groupService.leaveGroup(groupId);
        return ResponseEntity.ok(ApiResponse.ok("모임에서 탈퇴되었습니다."));
    }

    @Operation(
            summary = "모임 수정",
            description = "모임 정보를 수정합니다. 관리자만 가능합니다."
    )
    @PatchMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> updateGroup(
            @Parameter(
                    description = "모임 ID",
                    required = true,
                    example = "1"
            )
            @PathVariable Long groupId,

            @Valid
            @RequestBody(
                    description = "수정할 모임 정보",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            UpdateGroupDTO dto
    ) {
        groupService.updateGroup(groupId, dto);
        return ResponseEntity.ok(ApiResponse.ok("모임 정보가 수정되었습니다."));
    }

    @Operation(
            summary = "모임 멤버 목록 조회",
            description = "모임에 가입된 멤버 목록을 조회합니다."
    )
    @GetMapping("/{groupId}/members")
    public ResponseEntity<ApiResponse<List<GroupMemberDTO>>> getGroupMembers(
            @Parameter(
                    description = "모임 ID",
                    required = true,
                    example = "1"
            )
            @PathVariable Long groupId
    ) {
        List<GroupMemberDTO> members = groupService.getGroupMembers(groupId);
        return ResponseEntity.ok(ApiResponse.ok(members, "모임 멤버 목록 조회 성공"));
    }

    @Operation(
            summary = "멤버 관리자 권한 변경",
            description = """
                    멤버의 관리자 권한을 부여하거나 해제합니다.
                    
                    - isAdmin=true : 관리자 부여
                    - isAdmin=false : 관리자 해제
                    """
    )
    @PatchMapping("/{groupId}/members/{userId}/admin")
    public ResponseEntity<ApiResponse<Void>> updateMemberAdmin(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Parameter(description = "사용자 ID", required = true, example = "5")
            @PathVariable Long userId,

            @Parameter(description = "관리자 여부", required = true, example = "true")
            @RequestParam boolean isAdmin
    ) {
        groupService.updateMemberAdmin(groupId, userId, isAdmin);
        String message = isAdmin ? "관리자 권한이 부여되었습니다." : "관리자 권한이 해제되었습니다.";
        return ResponseEntity.ok(ApiResponse.ok(message));
    }

    @Operation(
            summary = "멤버 별명 변경",
            description = "모임 내에서 사용할 멤버의 별명을 변경합니다."
    )
    @PatchMapping("/{groupId}/members/{userId}/display-name")
    public ResponseEntity<ApiResponse<Void>> updateMemberDisplayName(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Parameter(description = "사용자 ID", required = true, example = "5")
            @PathVariable Long userId,

            @Parameter(description = "별명 (미지정 시 제거)", example = "홍길동")
            @RequestParam(required = false) String displayName
    ) {
        groupService.updateMemberDisplayName(groupId, userId, displayName);
        return ResponseEntity.ok(ApiResponse.ok("별명이 변경되었습니다."));
    }

    @Operation(
            summary = "모임 삭제",
            description = "모임을 삭제합니다. 관리자만 가능합니다."
    )
    @DeleteMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Parameter(description = "모임 이름 확인용 파라미터", example = "스터디모임")
            @RequestParam(required = false) String groupName
    ) {
        groupService.deleteGroup(groupId, groupName);
        return ResponseEntity.ok(ApiResponse.ok("모임이 삭제되었습니다."));
    }

    /* =========================
       채팅방
       ========================= */

    @Operation(
            summary = "채팅방 목록 조회",
            description = "모임에 속한 채팅방 목록을 조회합니다."
    )
    @GetMapping("/{groupId}/chat-rooms")
    public ResponseEntity<ApiResponse<List<GroupChatRoomDTO>>> getChatRooms(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId
    ) {
        List<GroupChatRoomDTO> rooms = groupService.getChatRooms(groupId);
        return ResponseEntity.ok(ApiResponse.ok(rooms, "채팅방 목록 조회 성공"));
    }

    @Operation(
            summary = "채팅방 생성",
            description = "모임 내 채팅방을 생성합니다."
    )
    @PostMapping("/{groupId}/chat-rooms")
    public ResponseEntity<ApiResponse<Long>> createChatRoom(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Valid
            @RequestBody(
                    description = "채팅방 생성 정보",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            CreateGroupChatRoomDTO dto
    ) {
        Long roomId = groupService.createChatRoom(groupId, dto);
        return ResponseEntity.ok(ApiResponse.ok(roomId, "채팅방이 생성되었습니다."));
    }

    @Operation(
            summary = "채팅방 수정",
            description = "채팅방 정보를 수정합니다."
    )
    @PatchMapping("/{groupId}/chat-rooms/{roomId}")
    public ResponseEntity<ApiResponse<Void>> updateChatRoom(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Parameter(description = "채팅방 ID", required = true, example = "10")
            @PathVariable Long roomId,

            @Valid
            @RequestBody(
                    description = "채팅방 수정 정보",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            UpdateGroupChatRoomDTO dto
    ) {
        groupService.updateChatRoom(groupId, roomId, dto);
        return ResponseEntity.ok(ApiResponse.ok("채팅방 정보가 수정되었습니다."));
    }

    @Operation(
            summary = "채팅방 삭제",
            description = "채팅방을 삭제합니다."
    )
    @DeleteMapping("/{groupId}/chat-rooms/{roomId}")
    public ResponseEntity<ApiResponse<Void>> deleteChatRoom(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Parameter(description = "채팅방 ID", required = true, example = "10")
            @PathVariable Long roomId
    ) {
        groupService.deleteChatRoom(groupId, roomId);
        return ResponseEntity.ok(ApiResponse.ok("채팅방이 삭제되었습니다."));
    }

    /* =========================
       모임 게시물
       ========================= */

    @Operation(
            summary = "모임 게시물 목록 조회",
            description = "모임 활동 게시물 목록을 페이징 조회합니다."
    )
    @GetMapping("/{groupId}/posts")
    public ResponseEntity<ApiResponse<Page<GroupPostListDTO>>> getGroupPostList(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,
            Pageable pageable
    ) {
        Page<GroupPostListDTO> list = groupPostService.getGroupPostList(groupId, pageable);
        return ResponseEntity.ok(ApiResponse.ok(list, "모임 활동 게시물 목록 조회 성공"));
    }

    @Operation(
            summary = "모임 게시물 생성",
            description = "모임 활동 게시물을 작성합니다."
    )
    @PostMapping("/{groupId}/posts")
    public ResponseEntity<ApiResponse<Long>> createGroupPost(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Valid
            @RequestBody(
                    description = "게시물 생성 정보",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            CreateGroupPostDTO dto
    ) {
        Long postId = groupPostService.createGroupPost(groupId, dto);
        return ResponseEntity.ok(ApiResponse.ok(postId, "게시물이 작성되었습니다."));
    }

    @Operation(
            summary = "모임 게시물 상세 조회",
            description = "모임 활동 게시물의 상세 정보를 조회합니다."
    )
    @GetMapping("/{groupId}/posts/{postId}")
    public ResponseEntity<ApiResponse<GroupPostDetailDTO>> getGroupPostDetail(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Parameter(description = "게시물 ID", required = true, example = "100")
            @PathVariable Long postId
    ) {
        GroupPostDetailDTO detail = groupPostService.getGroupPostDetail(groupId, postId);
        return ResponseEntity.ok(ApiResponse.ok(detail, "게시물 상세 조회 성공"));
    }

    @Operation(
            summary = "모임 게시물 수정",
            description = "모임 활동 게시물을 수정합니다."
    )
    @PatchMapping("/{groupId}/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> updateGroupPost(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Parameter(description = "게시물 ID", required = true, example = "100")
            @PathVariable Long postId,

            @Valid
            @RequestBody(
                    description = "수정할 게시물 정보",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            CreateGroupPostDTO dto
    ) {
        groupPostService.updateGroupPost(groupId, postId, dto);
        return ResponseEntity.ok(ApiResponse.ok("게시물이 수정되었습니다."));
    }

    @Operation(
            summary = "모임 게시물 삭제",
            description = "모임 활동 게시물을 삭제합니다."
    )
    @DeleteMapping("/{groupId}/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> deleteGroupPost(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Parameter(description = "게시물 ID", required = true, example = "100")
            @PathVariable Long postId
    ) {
        groupPostService.deleteGroupPost(groupId, postId);
        return ResponseEntity.ok(ApiResponse.ok("게시물이 삭제되었습니다."));
    }

    /* =========================
       채팅 메시지
       ========================= */

    @Operation(
            summary = "채팅 메시지 전송",
            description = "채팅방에 메시지를 전송합니다."
    )
    @PostMapping("/{groupId}/chat-rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<Long>> sendChatMessage(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Parameter(description = "채팅방 ID", required = true, example = "10")
            @PathVariable Long roomId,

            @Valid
            @RequestBody(
                    description = "메시지 전송 정보",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            CreateGroupChatMessageDTO dto
    ) {
        Long messageId = groupService.sendChatMessage(groupId, roomId, dto);
        return ResponseEntity.ok(ApiResponse.ok(messageId, "메시지가 전송되었습니다."));
    }

    @Operation(
            summary = "채팅 메시지 목록 조회",
            description = "채팅방의 메시지 목록을 조회합니다."
    )
    @GetMapping("/{groupId}/chat-rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<List<GroupChatMessageDTO>>> getChatMessages(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Parameter(description = "채팅방 ID", required = true, example = "10")
            @PathVariable Long roomId,

            @Parameter(description = "페이지 번호", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "페이지 크기", example = "50")
            @RequestParam(defaultValue = "50") int size
    ) {
        List<GroupChatMessageDTO> messages =
                groupService.getChatMessages(groupId, roomId, page, size);
        return ResponseEntity.ok(ApiResponse.ok(messages, "채팅 메시지 목록 조회 성공"));
    }

    @Operation(
            summary = "채팅 메시지 삭제",
            description = "채팅 메시지를 삭제합니다."
    )
    @DeleteMapping("/{groupId}/chat-rooms/{roomId}/messages/{messageId}")
    public ResponseEntity<ApiResponse<Void>> deleteChatMessage(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Parameter(description = "채팅방 ID", required = true, example = "10")
            @PathVariable Long roomId,

            @Parameter(description = "메시지 ID", required = true, example = "500")
            @PathVariable Long messageId
    ) {
        groupService.deleteChatMessage(groupId, roomId, messageId);
        return ResponseEntity.ok(ApiResponse.ok("메시지가 삭제되었습니다."));
    }

    @Operation(
            summary = "채팅 메시지 반응 추가/제거",
            description = "채팅 메시지에 이모지 반응을 추가하거나 제거합니다."
    )
    @PostMapping("/{groupId}/chat-rooms/{roomId}/messages/{messageId}/reactions")
    public ResponseEntity<ApiResponse<Void>> toggleReaction(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            @Parameter(description = "채팅방 ID", required = true, example = "10")
            @PathVariable Long roomId,

            @Parameter(description = "메시지 ID", required = true, example = "500")
            @PathVariable Long messageId,

            @Parameter(description = "이모지 문자열", required = true, example = "👍")
            @RequestParam String emoji
    ) {
        groupService.toggleReaction(groupId, roomId, messageId, emoji);
        return ResponseEntity.ok(ApiResponse.ok("반응이 업데이트되었습니다."));
    }
}