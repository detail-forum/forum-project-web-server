package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.ApiResponse;
import com.pgh.api_practice.dto.ChatSearchMessageDTO;
import com.pgh.api_practice.service.ChatSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatSearchService chatSearchService;

    @GetMapping("/search")
    public ApiResponse<Page<ChatSearchMessageDTO>> searchChatMessages(
            @RequestParam String query,
            @RequestParam String type,
            @RequestParam Long chatRoomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (query == null || query.trim().isEmpty()) {
            throw new IllegalArgumentException("검색어(query)는 필수입니다.");
        }

        PageRequest pageable = PageRequest.of(page, size);

        Page<ChatSearchMessageDTO> result =
                chatSearchService.search(query.trim(), type, chatRoomId, pageable);

        return ApiResponse.ok(result, "검색 성공");
    }
}