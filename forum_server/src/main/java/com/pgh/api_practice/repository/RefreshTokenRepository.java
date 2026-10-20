package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.RefreshToken;
import com.pgh.api_practice.entity.Users;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends CrudRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByRefreshToken(String refreshToken);

    void deleteByUserId(Long userId);
}


