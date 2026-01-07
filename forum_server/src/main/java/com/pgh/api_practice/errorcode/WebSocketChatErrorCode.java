package com.pgh.api_practice.errorcode;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum WebSocketChatErrorCode {

    // ==========================
    // Auth
    // ==========================
    UNAUTHORIZED(
            HttpStatus.UNAUTHORIZED,
            "CHAT_401",
            "인증이 필요합니다."
    ),

    USER_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "CHAT_404_USER",
            "사용자를 찾을 수 없습니다."
    ),

    // ==========================
    // Room / Group
    // ==========================
    CHAT_ROOM_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "CHAT_404_ROOM",
            "채팅방을 찾을 수 없습니다."
    ),

    GROUP_MEMBER_ONLY(
            HttpStatus.FORBIDDEN,
            "CHAT_403_MEMBER",
            "모임 멤버만 메시지를 전송할 수 있습니다."
    ),

    ADMIN_ONLY_ROOM(
            HttpStatus.FORBIDDEN,
            "CHAT_403_ADMIN",
            "관리자만 관리자방에 접근할 수 있습니다."
    ),

    // ==========================
    // Message
    // ==========================
    MESSAGE_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "CHAT_404_MESSAGE",
            "메시지를 찾을 수 없습니다."
    ),

    INVALID_REPLY_TARGET(
            HttpStatus.BAD_REQUEST,
            "CHAT_400_REPLY",
            "답장할 메시지가 같은 채팅방에 없습니다."
    );

    private final HttpStatus status;
    private final String code;
    private final String message;

    WebSocketChatErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}