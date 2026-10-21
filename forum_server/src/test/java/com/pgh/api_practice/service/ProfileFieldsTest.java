package com.pgh.api_practice.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProfileFieldsTest {

    @Test
    void githubLinkAllowsHttpAndClearsBlank() {
        assertThat(ProfileFields.githubLink(" https://github.com/member "))
                .isEqualTo("https://github.com/member");
        assertThat(ProfileFields.githubLink("  ")).isNull();
    }

    @Test
    void githubLinkRejectsJavascriptScheme() {
        assertThatThrownBy(() -> ProfileFields.githubLink("javascript:alert(1)"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("GitHub 링크는 http 또는 https 주소여야 합니다.");
    }

    @Test
    void profileImageAllowsUploadPathAndRejectsDataUrl() {
        assertThat(ProfileFields.profileImageUrl("/uploads/550e8400-e29b-41d4-a716-446655440000.jpg"))
                .endsWith(".jpg");
        assertThatThrownBy(() -> ProfileFields.profileImageUrl("javascript:alert(1)"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ProfileFields.profileImageUrl("/uploads/../secret.txt"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void nicknameAndEmailFollowColumnLimits() {
        assertThat(ProfileFields.nickname(" 닉네임 ")).isEqualTo("닉네임");
        assertThatThrownBy(() -> ProfileFields.nickname("1234567890123456"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(ProfileFields.email(" Member@Example.com ")).isEqualTo("Member@Example.com");
        assertThatThrownBy(() -> ProfileFields.email("not-an-email"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
