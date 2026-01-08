package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<Users, Long> {
    /** username으로 사용자 조회 (중복 시 첫 번째 결과만 반환) */
    @Query("SELECT u FROM Users u WHERE u.username = :username AND u.isDeleted = false ORDER BY u.id ASC")
    List<Users> findAllByUsername(@Param("username") String username);
    
    default Optional<Users> findByUsername(String username) {
        List<Users> users = findAllByUsername(username);
        return users.isEmpty() ? Optional.empty() : Optional.of(users.get(0));
    }
}
