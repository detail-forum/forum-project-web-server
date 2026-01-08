package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.service.DirectChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/chat/direct/rooms")
@RequiredArgsConstructor
public class DirectChatController {

    private final DirectChatService directChatService;

    /** 1대1 채팅방 목록 조회 */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DirectChatRoomDTO>>> getMyRooms() {
        try {
            log.debug("1대1 채팅방 목록 조회 요청");
            List<DirectChatRoomDTO> rooms = directChatService.getMyRooms();
            log.debug("1대1 채팅방 목록 조회 성공: {}개", rooms.size());
            return ResponseEntity.ok(
                    ApiResponse.ok(rooms, "1대1 채팅방 목록 조회 성공")
            );
        } catch (Exception e) {
            log.error("1대1 채팅방 목록 조회 실패", e);
            throw e;
        }
    }

    /** 1대1 채팅방 생성 또는 조회 */
    @PostMapping
    public ResponseEntity<ApiResponse<DirectChatRoomDTO>> getOrCreateRoom(
            @RequestBody DirectChatRoomDTO request
    ) {
        try {
            log.debug("1대1 채팅방 생성/조회 요청: otherUserId={}", request.getOtherUserId());
            if (request.getOtherUserId() == null) {
                log.error("otherUserId가 null입니다.");
                return ResponseEntity.badRequest()
                        .body(ApiResponse.fail("상대 사용자 ID는 필수입니다."));
            }
            DirectChatRoomDTO response =
                    directChatService.getOrCreateRoom(request.getOtherUserId());
            log.debug("1대1 채팅방 생성/조회 성공: roomId={}", response.getId());
            return ResponseEntity.ok(
                    ApiResponse.ok(response, "채팅방 조회/생성 성공")
            );
        } catch (Exception e) {
            log.error("1대1 채팅방 생성/조회 실패: otherUserId={}", request.getOtherUserId(), e);
            throw e;
        }
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