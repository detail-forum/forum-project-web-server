package com.detailforum.server.dto;

import com.detailforum.server.entity.Report;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// reason 길이는 reports.reason 컬럼(300)에 맞춘다.
public record CreateReportDTO(@NotNull Report.TargetType targetType,
                              @NotNull Long targetId,
                              @NotBlank @Size(max = 300) String reason) {
}
