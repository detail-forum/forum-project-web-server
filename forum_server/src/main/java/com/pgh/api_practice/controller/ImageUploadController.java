package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@Slf4j
@Tag(
        name = "Upload",
        description = "이미지 업로드 및 삭제 API"
)
@RestController
@RequestMapping("/upload")
public class ImageUploadController {

    @Value("${app.upload.dir:C:/app-data/uploads}")
    private String uploadDir;

    @Value("${app.upload.max-size:10485760}")
    private long maxFileSize;

    @Operation(
            summary = "이미지 업로드",
            description = """
                    이미지를 업로드합니다.
                    
                    - Content-Type: multipart/form-data
                    - file 파라미터로 이미지 파일 전송
                    - 지원 형식: JPEG, PNG, GIF, WebP
                    - 최대 크기: 10MB
                    """
    )
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(
            @Parameter(
                    description = "업로드할 이미지 파일",
                    required = true
            )
            @RequestParam("file") MultipartFile file
    ) {
        try {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
                return ResponseEntity.status(401).body(ApiResponse.fail("인증이 필요합니다."));
            }

            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("파일이 비어있습니다."));
            }

            if (file.getSize() > maxFileSize) {
                return ResponseEntity.badRequest().body(ApiResponse.fail(
                        "파일 크기가 너무 큽니다. 최대 " + (maxFileSize / 1024 / 1024) + "MB까지 업로드 가능합니다."
                ));
            }

            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("이미지 파일만 업로드 가능합니다."));
            }

            List<String> allowedTypes =
                    List.of("image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp");
            if (!allowedTypes.contains(contentType.toLowerCase())) {
                return ResponseEntity.badRequest().body(ApiResponse.fail(
                        "지원하지 않는 이미지 형식입니다. (JPEG, PNG, GIF, WebP만 가능)"
                ));
            }

            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            String savedFilename = UUID.randomUUID() + extension;
            Path targetPath = uploadPath.resolve(savedFilename);

            try (var inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            if (!Files.exists(targetPath)) {
                return ResponseEntity.status(500).body(ApiResponse.fail("파일 저장에 실패했습니다."));
            }

            String imageUrl = "/uploads/" + savedFilename;

            Map<String, String> result = new HashMap<>();
            result.put("url", imageUrl);
            result.put("filename", savedFilename);
            result.put("originalFilename", originalFilename != null ? originalFilename : "");

            return ResponseEntity.ok(ApiResponse.ok(result, "이미지 업로드 성공"));

        } catch (IOException e) {
            return ResponseEntity.status(500).body(
                    ApiResponse.fail("이미지 업로드 중 오류가 발생했습니다.")
            );
        }
    }

    @Operation(
            summary = "이미지 삭제",
            description = """
                    업로드된 이미지를 삭제합니다.
                    
                    - filename은 서버에 저장된 파일명(UUID 기반)입니다.
                    """
    )
    @DeleteMapping("/image/{filename}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(
            @Parameter(
                    description = "삭제할 이미지 파일명",
                    required = true,
                    example = "550e8400-e29b-41d4-a716-446655440000.png"
            )
            @PathVariable String filename
    ) {
        try {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
                return ResponseEntity.status(401).body(ApiResponse.fail("인증이 필요합니다."));
            }

            if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("잘못된 파일명입니다."));
            }

            Path filePath = Paths.get(uploadDir).resolve(filename);
            if (!Files.exists(filePath)) {
                return ResponseEntity.status(404).body(ApiResponse.fail("파일을 찾을 수 없습니다."));
            }

            Files.delete(filePath);
            return ResponseEntity.ok(ApiResponse.ok("이미지 삭제 성공"));

        } catch (IOException e) {
            return ResponseEntity.status(500).body(
                    ApiResponse.fail("이미지 삭제 중 오류가 발생했습니다.")
            );
        }
    }
}