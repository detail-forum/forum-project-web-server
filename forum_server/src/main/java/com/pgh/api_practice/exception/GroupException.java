package com.pgh.api_practice.exception;

import com.pgh.api_practice.errorcode.GroupErrorCode;
import lombok.Getter;

@Getter
public class GroupException extends RuntimeException {

    private final GroupErrorCode errorCode;

    public GroupException(GroupErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}