package com.detailforum.server.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Map;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidationErrorDTO {

    private String message;
    private Map<String, String> errors;

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("message: ").append(message).append("\n");

        if (errors != null && !errors.isEmpty()) {
            sb.append("errors:\n");
            errors.forEach((field, error) ->
                    sb.append(" - ").append(field).append(": ").append(error).append("\n"));
        }
        return sb.toString();
    }
}
