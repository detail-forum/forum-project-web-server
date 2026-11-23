package com.detailforum.server.repository;

import com.detailforum.server.entity.RefreshToken;
import com.detailforum.server.entity.Users;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends CrudRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByRefreshToken(String refreshToken);

    void deleteByUserId(Long userId);
}


