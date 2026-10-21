package com.pgh.api_practice.dto.auth;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RegisterRequestDTOTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void passwordShorterThanSixCharactersIsRejected() {
        RegisterRequestDTO dto = sample("12345");

        assertThat(validator.validate(dto))
                .anyMatch(violation -> "password".equals(violation.getPropertyPath().toString())
                        && "비밀번호는 6자 이상이어야 합니다.".equals(violation.getMessage()));
    }

    @Test
    void passwordOfSixCharactersIsAccepted() {
        assertThat(validator.validate(sample("123456"))).isEmpty();
    }

    private static RegisterRequestDTO sample(String password) {
        return RegisterRequestDTO.builder()
                .username("member")
                .password(password)
                .nickname("nick")
                .email("member@example.com")
                .build();
    }
}
