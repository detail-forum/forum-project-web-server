package com.detailforum.server.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangePasswordDTO {
    @Size(min = 6, message = "비밀번호는 6자 이상이어야 합니다.")
    private String currentPassword;
    
    @Size(min = 6, message = "비밀번호는 6자 이상이어야 합니다.")
    private String newPassword;
}
