package com.pgh.api_practice.global;

import com.pgh.api_practice.dto.ApiResponse;
import com.pgh.api_practice.errorcode.AuthErrorCode;
import com.pgh.api_practice.exception.AuthException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalApiResponseHandler {

    // ==========================
    // Auth 전용 예외
    // ==========================
    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ApiResponse<String>> handleAuthException(AuthException e) {
        AuthErrorCode code = e.getErrorCode();

        return ResponseEntity
                .status(code.getStatus())
                .body(ApiResponse.fail(
                        code.getCode(),
                        code.getMessage()
                ));
    }

    // ==========================
    // 잘못된 요청 (Validation / JSON)
    // ==========================
    @ExceptionHandler({
            MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class
    })
    public ResponseEntity<ApiResponse<String>> handleBadRequest(Exception e) {
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.fail(
                        "BAD_REQUEST",
                        "잘못된 요청입니다."
                ));
    }

    // ==========================
    // 기타 모든 예외 (진짜 500)
    // ==========================
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<String>> handleException(Exception e) {
        e.printStackTrace();

        return ResponseEntity
                .internalServerError()
                .body(ApiResponse.fail(
                        "INTERNAL_ERROR",
                        "서버 내부 오류가 발생했습니다."
                ));
    }
}