package com.detailforum.server.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProfileDTO {
    private String profileImageUrl;
    private String email;
    private String githubLink;
    private String nickname;
}
