package com.detailforum.server.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateGroupDTO {
    @Size(min = 2, message = "모임 이름은 2자 이상이어야 합니다.")
    private String name;
    
    private String description;
    private String profileImageUrl;
}
