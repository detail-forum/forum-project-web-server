package com.pgh.api_practice.errorcode;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum GroupErrorCode {

    // ==========================
    // Authentication
    // ==========================
    UNAUTHORIZED(
            HttpStatus.UNAUTHORIZED,
            "GROUP_401",
            "인증이 필요합니다."
    ),

    // ==========================
    // Group / Member
    // ==========================
    GROUP_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "GROUP_404",
            "모임을 찾을 수 없습니다."
    ),

    MEMBER_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "GROUP_404_MEMBER",
            "모임 멤버를 찾을 수 없습니다."
    ),

    ALREADY_JOINED(
            HttpStatus.CONFLICT,
            "GROUP_409_JOINED",
            "이미 가입한 모임입니다."
    ),

    GROUP_LIMIT_EXCEEDED(
            HttpStatus.BAD_REQUEST,
            "GROUP_400_LIMIT",
            "한 사용자는 최대 10개의 모임에 가입할 수 있습니다."
    ),

    // ==========================
    // Authorization
    // ==========================
    FORBIDDEN(
            HttpStatus.FORBIDDEN,
            "GROUP_403",
            "해당 작업을 수행할 권한이 없습니다."
    ),

    OWNER_ONLY(
            HttpStatus.FORBIDDEN,
            "GROUP_403_OWNER",
            "모임 주인만 수행할 수 있습니다."
    ),

    ADMIN_ONLY(
            HttpStatus.FORBIDDEN,
            "GROUP_403_ADMIN",
            "모임 관리자만 수행할 수 있습니다."
    ),

    OWNER_CANNOT_LEAVE(
            HttpStatus.BAD_REQUEST,
            "GROUP_400_OWNER_LEAVE",
            "모임 주인은 탈퇴할 수 없습니다."
    ),

    // ==========================
    // Chat
    // ==========================
    CHATROOM_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "GROUP_404_CHATROOM",
            "채팅방을 찾을 수 없습니다."
    ),

    DEFAULT_CHATROOM_DELETE_NOT_ALLOWED(
            HttpStatus.BAD_REQUEST,
            "GROUP_400_DEFAULT_ROOM",
            "기본 채팅방은 삭제할 수 없습니다."
    ),

    MESSAGE_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "GROUP_404_MESSAGE",
            "메시지를 찾을 수 없습니다."
    ),

    INVALID_MESSAGE_ROOM(
            HttpStatus.BAD_REQUEST,
            "GROUP_400_MESSAGE_ROOM",
            "메시지가 해당 채팅방에 없습니다."
    );

    private final HttpStatus status;
    private final String code;
    private final String message;

    GroupErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}