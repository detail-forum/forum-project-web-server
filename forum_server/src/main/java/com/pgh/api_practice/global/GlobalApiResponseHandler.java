package com.pgh.api_practice.global;

import com.pgh.api_practice.dto.ApiResponse;
import com.pgh.api_practice.dto.ValidationErrorDTO;
import com.pgh.api_practice.exception.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalApiResponseHandler {

    // 400: DTO @Valid 검증 실패
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<String> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();

        for (var error : ex.getBindingResult().getAllErrors()) {
            String field = error instanceof FieldError
                    ? ((FieldError) error).getField()
                    : error.getObjectName();
            String msg = error.getDefaultMessage();
            errors.put(field, msg);
        }

        ValidationErrorDTO dto = ValidationErrorDTO.builder()
                .message("요청 값이 올바르지 않습니다.")
                .errors(errors)
                .build();

        // 문자열 형태로 반환 (toString() 사용)
        return ResponseEntity.badRequest().body(dto.toString());
    }


    // 400: JSON 파싱/타입 오류 등
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotReadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.fail("요청 본문을 읽을 수 없습니다."));
    }

    // 404: 서비스 계층에서 존재하지 않는 리소스 등
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(404).body(ApiResponse.fail(ex.getMessage() != null ? ex.getMessage() : "대상을 찾을 수 없습니다."));
    }

    // 400: 커스텀 이미 유저있다
    @ExceptionHandler(UserAlreadyExistException.class)
    public ResponseEntity<ApiResponse<Void>> handleUserAlreadyExist(UserAlreadyExistException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.fail(ex.getMessage()));
    }

    // 500: NullPointerException 처리
    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<ApiResponse<Void>> handleNullPointer(NullPointerException ex) {
        ex.printStackTrace(); // 디버깅을 위한 스택 트레이스 출력
        return ResponseEntity.status(401).body(ApiResponse.fail("인증이 필요합니다."));
    }

    // 500: IllegalStateException 처리 (예상치 못한 상태)
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException ex) {
        ex.printStackTrace(); // 디버깅을 위한 스택 트레이스 출력
        return ResponseEntity.status(500).body(ApiResponse.fail(ex.getMessage() != null ? ex.getMessage() : "서버 내부 오류가 발생했습니다."));
    }

    // 500: 기타 모든 예외
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
        // 로그는 여기서 찍으세요 (ex.getMessage(), stacktrace 등)
        ex.printStackTrace(); // 디버깅을 위한 스택 트레이스 출력
        return ResponseEntity.internalServerError().body(ApiResponse.fail("서버 내부 오류가 발생했습니다: " + ex.getMessage()));
    }

    //리프레시 토큰 만료시 처리
    @ExceptionHandler(RefreshTokenExpiredException.class)
    public ResponseEntity<ApiResponse<Void>> handleRefreshTokenExpiredException(RefreshTokenExpiredException ex) {
        return ResponseEntity.status(401).body(ApiResponse.fail(ex.getMessage()));//401
    }
    //토큰검증 실패시 처리
    @ExceptionHandler(TokenNotValidateException.class)
    public ResponseEntity<ApiResponse<Void>> handleTokenNotValidateException(TokenNotValidateException ex) {
       //추후 보안 관제로깅등 추가가능
        return ResponseEntity.status(401).body(ApiResponse.fail(ex.getMessage()));//401
    }
    //
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFoundException(ResourceNotFoundException ex) {
        return ResponseEntity.status(404).body(ApiResponse.fail(ex.getMessage()));
    }
    @ExceptionHandler(ApplicationUnauthorizedException.class)
    public ResponseEntity<ApiResponse<Void>> handleApplicationUnauthorizedException(ApplicationUnauthorizedException ex) {
        return ResponseEntity.status(403).body(ApiResponse.fail(ex.getMessage()));
    }
    
    @ExceptionHandler(ApplicationBadRequestException.class)
    public ResponseEntity<ApiResponse<Void>> handleApplicationBadRequestException(ApplicationBadRequestException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.fail(ex.getMessage()));
    }
}
