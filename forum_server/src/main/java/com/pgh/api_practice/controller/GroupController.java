package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.service.GroupService;
import com.pgh.api_practice.service.GroupPostService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/group")
@AllArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final GroupPostService groupPostService;

    /** 모임 생성 */
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> createGroup(@Valid @RequestBody CreateGroupDTO dto) {
        Long groupId = groupService.createGroup(dto);
        return ResponseEntity.ok(ApiResponse.ok(groupId, "모임이 생성되었습니다."));
    }

    /** 모임 목록 조회 */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<GroupListDTO>>> getGroupList(
            Pageable pageable,
            @RequestParam(required = false) Boolean myGroups
    ) {
        Page<GroupListDTO> list = groupService.getGroupList(pageable, myGroups);
        return ResponseEntity.ok(ApiResponse.ok(list, "모임 목록 조회 성공"));
    }

    /** 모임 상세 조회 */
    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupDetailDTO>> getGroupDetail(@PathVariable Long groupId) {
        GroupDetailDTO detail = groupService.getGroupDetail(groupId);
        return ResponseEntity.ok(ApiResponse.ok(detail, "모임 상세 조회 성공"));
    }

    /** 모임 가입 여부 확인 */
    @GetMapping("/{groupId}/membership")
    public ResponseEntity<ApiResponse<Boolean>> checkMembership(@PathVariable Long groupId) {
        boolean isMember = groupService.checkMembership(groupId);
        return ResponseEntity.ok(ApiResponse.ok(isMember, "모임 가입 여부 확인 성공"));
    }

    /** 모임 가입 */
    @PostMapping("/{groupId}/join")
    public ResponseEntity<ApiResponse<Void>> joinGroup(@PathVariable Long groupId) {
        groupService.joinGroup(groupId);
        return ResponseEntity.ok(ApiResponse.ok("모임에 가입되었습니다."));
    }

    /** 모임 탈퇴 */
    @PostMapping("/{groupId}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveGroup(@PathVariable Long groupId) {
        groupService.leaveGroup(groupId);
        return ResponseEntity.ok(ApiResponse.ok("모임에서 탈퇴되었습니다."));
    }

    /** 모임 수정 */
    @PatchMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> updateGroup(
            @PathVariable Long groupId,
            @Valid @RequestBody UpdateGroupDTO dto) {
        groupService.updateGroup(groupId, dto);
        return ResponseEntity.ok(ApiResponse.ok("모임 정보가 수정되었습니다."));
    }

    /** 모임 멤버 목록 조회 */
    @GetMapping("/{groupId}/members")
    public ResponseEntity<ApiResponse<List<GroupMemberDTO>>> getGroupMembers(@PathVariable Long groupId) {
        List<GroupMemberDTO> members = groupService.getGroupMembers(groupId);
        return ResponseEntity.ok(ApiResponse.ok(members, "모임 멤버 목록 조회 성공"));
    }

    /** 멤버 관리자 권한 변경 */
    @PatchMapping("/{groupId}/members/{userId}/admin")
    public ResponseEntity<ApiResponse<Void>> updateMemberAdmin(
            @PathVariable Long groupId,
            @PathVariable Long userId,
            @RequestParam boolean isAdmin) {
        groupService.updateMemberAdmin(groupId, userId, isAdmin);
        String message = isAdmin ? "관리자 권한이 부여되었습니다." : "관리자 권한이 해제되었습니다.";
        return ResponseEntity.ok(ApiResponse.ok(message));
    }

    /** 멤버 별명 변경 */
    @PatchMapping("/{groupId}/members/{userId}/display-name")
    public ResponseEntity<ApiResponse<Void>> updateMemberDisplayName(
            @PathVariable Long groupId,
            @PathVariable Long userId,
            @RequestParam(required = false) String displayName) {
        groupService.updateMemberDisplayName(groupId, userId, displayName);
        return ResponseEntity.ok(ApiResponse.ok("별명이 변경되었습니다."));
    }

    /** 모임 삭제 */
    @DeleteMapping("/{groupId}")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(
            @PathVariable Long groupId,
            @RequestParam(required = false) String groupName
    ) {
        groupService.deleteGroup(groupId, groupName);
        return ResponseEntity.ok(ApiResponse.ok("모임이 삭제되었습니다."));
    }

    /** 채팅방 목록 조회 */
    @GetMapping("/{groupId}/chat-rooms")
    public ResponseEntity<ApiResponse<List<GroupChatRoomDTO>>> getChatRooms(@PathVariable Long groupId) {
        List<GroupChatRoomDTO> rooms = groupService.getChatRooms(groupId);
        return ResponseEntity.ok(ApiResponse.ok(rooms, "채팅방 목록 조회 성공"));
    }

    /** 채팅방 생성 */
    @PostMapping("/{groupId}/chat-rooms")
    public ResponseEntity<ApiResponse<Long>> createChatRoom(
            @PathVariable Long groupId,
            @Valid @RequestBody CreateGroupChatRoomDTO dto) {
        Long roomId = groupService.createChatRoom(groupId, dto);
        return ResponseEntity.ok(ApiResponse.ok(roomId, "채팅방이 생성되었습니다."));
    }

    /** 채팅방 수정 */
    @PatchMapping("/{groupId}/chat-rooms/{roomId}")
    public ResponseEntity<ApiResponse<Void>> updateChatRoom(
            @PathVariable Long groupId,
            @PathVariable Long roomId,
            @Valid @RequestBody UpdateGroupChatRoomDTO dto) {
        groupService.updateChatRoom(groupId, roomId, dto);
        return ResponseEntity.ok(ApiResponse.ok("채팅방 정보가 수정되었습니다."));
    }

    /** 채팅방 삭제 */
    @DeleteMapping("/{groupId}/chat-rooms/{roomId}")
    public ResponseEntity<ApiResponse<Void>> deleteChatRoom(
            @PathVariable Long groupId,
            @PathVariable Long roomId) {
        groupService.deleteChatRoom(groupId, roomId);
        return ResponseEntity.ok(ApiResponse.ok("채팅방이 삭제되었습니다."));
    }

    /** 모임 활동 게시물 목록 조회 */
    @GetMapping("/{groupId}/posts")
    public ResponseEntity<ApiResponse<Page<GroupPostListDTO>>> getGroupPostList(
            @PathVariable Long groupId,
            Pageable pageable) {
        Page<GroupPostListDTO> list = groupPostService.getGroupPostList(groupId, pageable);
        return ResponseEntity.ok(ApiResponse.ok(list, "모임 활동 게시물 목록 조회 성공"));
    }

    /** 모임 활동 게시물 생성 */
    @PostMapping("/{groupId}/posts")
    public ResponseEntity<ApiResponse<Long>> createGroupPost(
            @PathVariable Long groupId,
            @Valid @RequestBody CreateGroupPostDTO dto) {
        Long postId = groupPostService.createGroupPost(groupId, dto);
        return ResponseEntity.ok(ApiResponse.ok(postId, "게시물이 작성되었습니다."));
    }

    /** 모임 활동 게시물 상세 조회 */
    @GetMapping("/{groupId}/posts/{postId}")
    public ResponseEntity<ApiResponse<GroupPostDetailDTO>> getGroupPostDetail(
            @PathVariable Long groupId,
            @PathVariable Long postId) {
        GroupPostDetailDTO detail = groupPostService.getGroupPostDetail(groupId, postId);
        return ResponseEntity.ok(ApiResponse.ok(detail, "게시물 상세 조회 성공"));
    }

    /** 모임 활동 게시물 수정 */
    @PatchMapping("/{groupId}/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> updateGroupPost(
            @PathVariable Long groupId,
            @PathVariable Long postId,
            @Valid @RequestBody CreateGroupPostDTO dto) {
        groupPostService.updateGroupPost(groupId, postId, dto);
        return ResponseEntity.ok(ApiResponse.ok("게시물이 수정되었습니다."));
    }

    /** 모임 활동 게시물 삭제 */
    @DeleteMapping("/{groupId}/posts/{postId}")
    public ResponseEntity<ApiResponse<Void>> deleteGroupPost(
            @PathVariable Long groupId,
            @PathVariable Long postId) {
        groupPostService.deleteGroupPost(groupId, postId);
        return ResponseEntity.ok(ApiResponse.ok("게시물이 삭제되었습니다."));
    }

    /** 채팅 메시지 전송 */
    @PostMapping("/{groupId}/chat-rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<Long>> sendChatMessage(
            @PathVariable Long groupId,
            @PathVariable Long roomId,
            @Valid @RequestBody CreateGroupChatMessageDTO dto) {
        Long messageId = groupService.sendChatMessage(groupId, roomId, dto);
        return ResponseEntity.ok(ApiResponse.ok(messageId, "메시지가 전송되었습니다."));
    }

    /** 채팅 메시지 목록 조회 */
    @GetMapping("/{groupId}/chat-rooms/{roomId}/messages")
    public ResponseEntity<ApiResponse<List<GroupChatMessageDTO>>> getChatMessages(
            @PathVariable Long groupId,
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        List<GroupChatMessageDTO> messages = groupService.getChatMessages(groupId, roomId, page, size);
        return ResponseEntity.ok(ApiResponse.ok(messages, "채팅 메시지 목록 조회 성공"));
    }

    /** 채팅 메시지 삭제 */
    @DeleteMapping("/{groupId}/chat-rooms/{roomId}/messages/{messageId}")
    public ResponseEntity<ApiResponse<Void>> deleteChatMessage(
            @PathVariable Long groupId,
            @PathVariable Long roomId,
            @PathVariable Long messageId) {
        groupService.deleteChatMessage(groupId, roomId, messageId);
        return ResponseEntity.ok(ApiResponse.ok("메시지가 삭제되었습니다."));
    }

    /** 채팅 메시지 반응 추가/제거 */
    @PostMapping("/{groupId}/chat-rooms/{roomId}/messages/{messageId}/reactions")
    public ResponseEntity<ApiResponse<Void>> toggleReaction(
            @PathVariable Long groupId,
            @PathVariable Long roomId,
            @PathVariable Long messageId,
            @RequestParam String emoji) {
        groupService.toggleReaction(groupId, roomId, messageId, emoji);
        return ResponseEntity.ok(ApiResponse.ok("반응이 업데이트되었습니다."));
    }
}
