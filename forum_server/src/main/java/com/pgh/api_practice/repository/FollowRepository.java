package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface FollowRepository extends JpaRepository<Follow, Long> {
    Optional<Follow> findByFollowerIdAndFollowingId(Long followerId, Long followingId);
    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);
    void deleteByFollowerIdAndFollowingId(Long followerId, Long followingId);
    
    // 팔로워 수 (나를 팔로우하는 사람 수)
    long countByFollowingId(Long followingId);
    
    // 팔로잉 수 (내가 팔로우하는 사람 수)
    long countByFollowerId(Long followerId);
    
    // 팔로워 목록 (나를 팔로우하는 사람들)
    @Query("SELECT f.follower FROM Follow f WHERE f.following.id = :userId ORDER BY f.createDateTime DESC")
    java.util.List<com.pgh.api_practice.entity.Users> findFollowersByUserId(@Param("userId") Long userId);
    
    // 팔로잉 목록 (내가 팔로우하는 사람들)
    @Query("SELECT f.following FROM Follow f WHERE f.follower.id = :userId ORDER BY f.createDateTime DESC")
    java.util.List<com.pgh.api_practice.entity.Users> findFollowingByUserId(@Param("userId") Long userId);
}
