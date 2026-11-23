package com.detailforum.server.service;

import com.detailforum.server.entity.Group;
import com.detailforum.server.entity.GroupPost;
import com.detailforum.server.entity.Post;
import com.detailforum.server.entity.Users;
import com.detailforum.server.repository.GroupPostRepository;
import com.detailforum.server.repository.GroupRepository;
import com.detailforum.server.repository.PostLikeRepository;
import com.detailforum.server.repository.PostRepository;
import com.detailforum.server.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class PostLikeTargetTest {

    @Autowired private PostService postService;
    @Autowired private PostRepository postRepository;
    @Autowired private GroupRepository groupRepository;
    @Autowired private GroupPostRepository groupPostRepository;
    @Autowired private PostLikeRepository postLikeRepository;
    @Autowired private UserRepository userRepository;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void groupPostLikeGoesToGroupPostEvenWhenAPostHasTheSameId() {
        Users writer = saveUser("likewriter");
        saveUser("liker");
        Group group = groupRepository.save(Group.builder().name("g").owner(writer).build());

        // 두 테이블의 id가 겹치는 상황을 만든다.
        Post post = savePost(writer);
        GroupPost groupPost = saveGroupPost(group, writer);
        while (!post.getId().equals(groupPost.getId())) {
            if (post.getId() < groupPost.getId()) post = savePost(writer);
            else groupPost = saveGroupPost(group, writer);
        }

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("liker", null, List.of()));
        boolean liked = postService.toggleLike(groupPost.getId(), true);

        assertThat(liked).isTrue();
        assertThat(postLikeRepository.countByGroupPostId(groupPost.getId())).isEqualTo(1);
        assertThat(postLikeRepository.countByPostId(post.getId())).isZero();
    }

    private Users saveUser(String username) {
        return userRepository.save(Users.builder()
                .username(username)
                .password("hash")
                .nickname(username)
                .email(username + "@example.com")
                .emailVerified(true)
                .build());
    }

    private Post savePost(Users writer) {
        return postRepository.save(Post.builder().title("p").body("b").user(writer).build());
    }

    private GroupPost saveGroupPost(Group group, Users writer) {
        return groupPostRepository.save(GroupPost.builder().group(group).title("gp").body("b").user(writer).build());
    }
}
