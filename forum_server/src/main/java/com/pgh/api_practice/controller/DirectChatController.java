package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.service.DirectChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat/direct/rooms")
@RequiredArgsConstructor
public class DirectChatController {

    private final DirectChatService directChatService;

    /** 1대1 채팅방 목록 조회 */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DirectChatRoomDTO>>> getMyRooms() {
        List<DirectChatRoomDTO> rooms = directChatService.getMyRooms();
        return ResponseEntity.ok(
                ApiResponse.ok(rooms, "1대1 채팅방 목록 조회 성공")
        );
    }

    /** 1대1 채팅방 생성 또는 조회 */
    @PostMapping
    public ResponseEntity<ApiResponse<DirectChatRoomDTO>> getOrCreateRoom(
            @RequestBody DirectChatRoomDTO request
    ) {
        DirectChatRoomDTO response =
                directChatService.getOrCreateRoom(request.getOtherUserId());

        return ResponseEntity.ok(
                ApiResponse.ok(response, "채팅방 조회/생성 성공")
        );
    }

    /** 1대1 채팅 메시지 목록 조회 */
    @GetMapping("/{roomId}/messages")
    public ResponseEntity<ApiResponse<DirectChatMessagePageDTO>> getMessages(
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        DirectChatMessagePageDTO data =
                directChatService.getMessages(roomId, page, size);

        return ResponseEntity.ok(
                ApiResponse.ok(data, "메시지 조회 성공")
        );
    }


    @PostMapping("/{chatRoomId}/messages")
    public ResponseEntity<ApiResponse<DirectChatMessageDTO>> sendMessage(
            @PathVariable Long chatRoomId,
            @RequestBody CreateDirectMessageDTO request
    ) {
        DirectChatMessageDTO dto =
                directChatService.sendMessage(chatRoomId, request);

        return ResponseEntity.ok(
                ApiResponse.ok(dto, "메시지 전송 성공")
        );
    }
}