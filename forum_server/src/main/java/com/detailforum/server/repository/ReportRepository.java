package com.detailforum.server.repository;

import com.detailforum.server.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReportRepository extends JpaRepository<Report, Long> {

    boolean existsByReporterIdAndTargetTypeAndTargetId(Long reporterId, Report.TargetType targetType, Long targetId);

    @Query(value = "SELECT r FROM Report r JOIN FETCH r.reporter WHERE r.status = :status ORDER BY r.id DESC",
            countQuery = "SELECT COUNT(r) FROM Report r WHERE r.status = :status")
    Page<Report> findByStatus(@Param("status") Report.Status status, Pageable pageable);

    long countByStatus(Report.Status status);

    long countByTargetTypeAndTargetIdAndStatus(Report.TargetType targetType, Long targetId, Report.Status status);

    /** 같은 대상에 쌓인 미처리 신고를 한 번에 닫는다. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE Report r SET r.status = :to WHERE r.targetType = :type AND r.targetId = :targetId AND r.status = com.detailforum.server.entity.Report.Status.OPEN")
    int closeOpen(@Param("type") Report.TargetType type, @Param("targetId") Long targetId, @Param("to") Report.Status to);
}
