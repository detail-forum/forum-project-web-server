package com.detailforum.server.controller;

import com.detailforum.server.dto.ApiResponse;
import com.detailforum.server.dto.CreateReportDTO;
import com.detailforum.server.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** 신고 접수. SecurityConfig가 /reports/** 를 로그인한 사용자에게만 연다. */
@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> create(@Valid @RequestBody CreateReportDTO request,
                                                    Authentication authentication) {
        reportService.create(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.ok("신고가 접수되었습니다."));
    }
}
