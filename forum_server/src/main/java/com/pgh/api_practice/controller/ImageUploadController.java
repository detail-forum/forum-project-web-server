package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/upload")
public class ImageUploadController {

    @Value("${app.upload.dir:C:/app-data/uploads}")
    private String uploadDir;

    @Value("${app.upload.max-size:10485760}")
    private long maxFileSize; // 기본 10MB

    /**
     * 이미지 업로드
     * POST /upload/image
     */
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(
            @RequestParam("file") MultipartFile file
    ) {
        try {
            // 인증 확인
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
                return ResponseEntity.status(401).body(ApiResponse.fail("인증이 필요합니다."));
            }

            // 파일 검증
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("파일이 비어있습니다."));
            }

            // 파일 크기 검증
            if (file.getSize() > maxFileSize) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("파일 크기가 너무 큽니다. 최대 " + (maxFileSize / 1024 / 1024) + "MB까지 업로드 가능합니다."));
            }

            // 이미지 타입 검증
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("이미지 파일만 업로드 가능합니다."));
            }

            // 허용된 이미지 타입
            List<String> allowedTypes = Arrays.asList("image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp");
            if (!allowedTypes.contains(contentType.toLowerCase())) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("지원하지 않는 이미지 형식입니다. (JPEG, PNG, GIF, WebP만 가능)"));
            }

            // 업로드 디렉토리 생성
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // 파일 확장자 추출
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            // 고유한 파일명 생성
            String savedFilename = UUID.randomUUID().toString() + extension;
            Path targetPath = uploadPath.resolve(savedFilename);

            // 파일 저장
            try (var inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }
            
            // 파일 저장 확인
            if (!Files.exists(targetPath)) {
                log.error("파일 저장 실패: {}", targetPath);
                return ResponseEntity.status(500).body(ApiResponse.fail("파일 저장에 실패했습니다."));
            }
            
            log.info("파일 저장 성공: {} (크기: {} bytes)", targetPath, Files.size(targetPath));

            // URL 생성 (Nginx가 /uploads/로 서빙)
            String imageUrl = "/uploads/" + savedFilename;

            Map<String, String> result = new HashMap<>();
            result.put("url", imageUrl);
            result.put("filename", savedFilename);
            result.put("originalFilename", originalFilename != null ? originalFilename : "");

            log.info("이미지 업로드 성공: {} -> {}", originalFilename, savedFilename);

            return ResponseEntity.ok(ApiResponse.ok(result, "이미지 업로드 성공"));

        } catch (IOException e) {
            log.error("이미지 업로드 실패", e);
            return ResponseEntity.status(500).body(ApiResponse.fail("이미지 업로드 중 오류가 발생했습니다: " + e.getMessage()));
        } catch (Exception e) {
            log.error("이미지 업로드 실패", e);
            return ResponseEntity.status(500).body(ApiResponse.fail("이미지 업로드 중 오류가 발생했습니다."));
        }
    }

    /**
     * 이미지 삭제
     * DELETE /upload/image/{filename}
     */
    @DeleteMapping("/image/{filename}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(@PathVariable String filename) {
        try {
            // 인증 확인
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
                return ResponseEntity.status(401).body(ApiResponse.fail("인증이 필요합니다."));
            }

            // 보안: 파일명에 경로 탐색 문자 제거
            if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("잘못된 파일명입니다."));
            }

            Path filePath = Paths.get(uploadDir).resolve(filename);
            
            // 파일 존재 확인
            if (!Files.exists(filePath)) {
                return ResponseEntity.status(404).body(ApiResponse.fail("파일을 찾을 수 없습니다."));
            }

            // 파일 삭제
            Files.delete(filePath);

            log.info("이미지 삭제 성공: {}", filename);

            return ResponseEntity.ok(ApiResponse.ok("이미지 삭제 성공"));

        } catch (IOException e) {
            log.error("이미지 삭제 실패", e);
            return ResponseEntity.status(500).body(ApiResponse.fail("이미지 삭제 중 오류가 발생했습니다."));
        }
    }
}

