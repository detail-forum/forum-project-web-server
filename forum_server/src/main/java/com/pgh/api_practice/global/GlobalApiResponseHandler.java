package com.pgh.api_practice.global;

import com.pgh.api_practice.dto.ApiResponse;
import com.pgh.api_practice.exception.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalApiResponseHandler {

    // 400: DTO @Valid 검증 실패. 다른 API와 같이 ApiResponse JSON으로 반환한다.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();

        for (var error : ex.getBindingResult().getAllErrors()) {
            String field = error instanceof FieldError
                    ? ((FieldError) error).getField()
                    : error.getObjectName();
            String msg = error.getDefaultMessage();
            errors.put(field, msg);
        }

        return ResponseEntity.badRequest().body(ApiResponse.fail("요청 값이 올바르지 않습니다.", errors));
    }


    // 400: JSON 파싱/타입 오류 등
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotReadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.fail("요청 본문을 읽을 수 없습니다."));
    }

    // 400: 잘못된 요청 값. 없는 리소스는 ResourceNotFoundException(404)을 쓴다.
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.fail(ex.getMessage() != null ? ex.getMessage() : "요청 값이 올바르지 않습니다."));
    }

    // 400: 가입 제한, 중복 가입처럼 호출자가 고칠 수 있는 상태
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.fail(ex.getMessage() != null ? ex.getMessage() : "요청을 처리할 수 없습니다."));
    }

    // 500: 예상치 못한 널. 인증 실패로 위장하지 않는다.
    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<ApiResponse<Void>> handleNullPointer(NullPointerException ex) {
        log.error("처리되지 않은 NullPointerException", ex);
        return ResponseEntity.internalServerError().body(ApiResponse.fail("서버 내부 오류가 발생했습니다."));
    }

    // 400: 커스텀 이미 유저있다
    @ExceptionHandler(UserAlreadyExistException.class)
    public ResponseEntity<ApiResponse<Void>> handleUserAlreadyExist(UserAlreadyExistException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.fail(ex.getMessage()));
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

    // 401: Spring Security 인증 실패 (아이디/비밀번호 틀림)
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(401).body(ApiResponse.fail("아이디 또는 비밀번호가 올바르지 않습니다."));
    }

    // 401: 기타 인증 예외
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationException(AuthenticationException ex) {
        String message = "인증에 실패했습니다.";
        if (ex.getMessage() != null && ex.getMessage().contains("자격 증명")) {
            message = "아이디 또는 비밀번호가 올바르지 않습니다.";
        }
        return ResponseEntity.status(401).body(ApiResponse.fail(message));
    }

    // 401: 인증 자격 증명 없음
    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationCredentialsNotFound(AuthenticationCredentialsNotFoundException ex) {
        return ResponseEntity.status(401).body(ApiResponse.fail("인증 정보가 없습니다."));
    }

    // 404: 핸들러를 찾을 수 없음 (NoHandlerFoundException)
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoHandlerFound(NoHandlerFoundException ex) {
        log.debug("핸들러 없음: {}", ex.getRequestURL());
        return ResponseEntity.status(404).body(ApiResponse.fail("요청한 경로를 찾을 수 없습니다: " + ex.getRequestURL()));
    }

    // 404: 정적 리소스를 찾을 수 없음 (NoResourceFoundException) - 컨트롤러 매핑 실패 시 발생
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException ex) {
        String resourcePath = ex.getResourcePath();
        log.debug("리소스 없음: {}", resourcePath);
        // /api/로 시작하는 경로는 API 엔드포인트이므로 더 명확한 메시지 제공
        if (resourcePath != null && resourcePath.startsWith("/api/")) {
            return ResponseEntity.status(404).body(ApiResponse.fail("API 엔드포인트를 찾을 수 없습니다: " + resourcePath));
        }
        return ResponseEntity.status(404).body(ApiResponse.fail("요청한 리소스를 찾을 수 없습니다: " + resourcePath));
    }

    // NonUniqueResultException 처리 (JPA 쿼리에서 여러 결과 반환 시)
    @ExceptionHandler(org.hibernate.NonUniqueResultException.class)
    public ResponseEntity<ApiResponse<Void>> handleNonUniqueResultException(org.hibernate.NonUniqueResultException ex) {
        log.error("조회 결과가 중복되었습니다", ex);
        return ResponseEntity.status(500).body(ApiResponse.fail("데이터 중복 오류가 발생했습니다. 관리자에게 문의해주세요."));
    }

    // 500: RuntimeException 처리. 원인 메시지는 로그에만 남긴다.
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Void>> handleRuntimeException(RuntimeException ex) {
        log.error("처리되지 않은 RuntimeException", ex);
        return ResponseEntity.status(500).body(ApiResponse.fail("서버 내부 오류가 발생했습니다."));
    }

    // 500: 기타 모든 예외
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
        log.error("처리되지 않은 예외", ex);
        return ResponseEntity.internalServerError().body(ApiResponse.fail("서버 내부 오류가 발생했습니다."));
    }
}
