package com.pgh.api_practice.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "group_post_tags", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"group_post_id", "tag_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupPostTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_post_id", nullable = false)
    private GroupPost groupPost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", nullable = false)
    private Tag tag;
}
