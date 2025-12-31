package com.pgh.api_practice.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateGroupChatRoomDTO {
    @Size(min = 2, message = "방 이름은 2자 이상이어야 합니다.")
    private String name;
    
    private String description;
    private String profileImageUrl;
}
