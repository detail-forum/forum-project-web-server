package com.pgh.api_practice.exception;

import com.pgh.api_practice.errorcode.GroupPostErrorCode;
import lombok.Getter;

@Getter
public class GroupPostException extends RuntimeException {

    private final GroupPostErrorCode errorCode;

    public GroupPostException(GroupPostErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}