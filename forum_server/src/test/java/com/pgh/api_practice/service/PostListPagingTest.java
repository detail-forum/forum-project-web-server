package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.PostListDTO;
import com.pgh.api_practice.entity.Post;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.repository.PostRepository;
import com.pgh.api_practice.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class PostListPagingTest {

    @Autowired
    private PostService postService;
    @Autowired
    private PostRepository postRepository;
    @Autowired
    private UserRepository userRepository;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void searchKeepsTheFirstPageAndReturnsTheRemainderOnTheNextPage() {
        Users writer = saveUser("writer", "writer@example.com", "writer");
        for (int i = 0; i < 15; i++) {
            savePost(writer, "alpha " + i, LocalDateTime.of(2026, 1, 1, 0, 0).plusMinutes(i));
        }

        Page<PostListDTO> first = postService.searchPosts(PageRequest.of(0, 10), "alpha", "RESENT", null);
        Page<PostListDTO> second = postService.searchPosts(PageRequest.of(1, 10), "alpha", "RESENT", null);

        assertThat(titles(first)).containsExactly(
                "alpha 14", "alpha 13", "alpha 12", "alpha 11", "alpha 10",
                "alpha 9", "alpha 8", "alpha 7", "alpha 6", "alpha 5");
        assertThat(titles(second)).containsExactly("alpha 4", "alpha 3", "alpha 2", "alpha 1", "alpha 0");
        assertThat(first.getTotalElements()).isEqualTo(15);
        assertThat(second.getTotalElements()).isEqualTo(15);
    }

    @Test
    void pagePastTheEndIsEmptyInsteadOfFailing() {
        Users writer = saveUser("another", "another@example.com", "another");
        savePost(writer, "solo", LocalDateTime.of(2026, 2, 1, 0, 0));

        Page<PostListDTO> page = postService.getPostList(PageRequest.of(4, 10), "RESENT", "ALL");

        assertThat(page.getContent()).isEmpty();
        assertThat(page.getTotalElements()).isEqualTo(1);
    }

    @Test
    void myPostsSecondPageContinuesTheMergedList() {
        Users writer = saveUser("mine", "mine@example.com", "mine");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("mine", null, List.of()));
        for (int i = 0; i < 12; i++) {
            savePost(writer, "mine " + i, LocalDateTime.of(2026, 3, 1, 0, 0).plusMinutes(i));
        }

        Page<PostListDTO> second = postService.getMyPostList(PageRequest.of(1, 10), "RESENT", "ALL");

        assertThat(second.getTotalElements()).isEqualTo(12);
        assertThat(titles(second)).containsExactly("mine 1", "mine 0");
    }

    private Users saveUser(String username, String email, String nickname) {
        return userRepository.save(Users.builder()
                .username(username)
                .password("hash")
                .nickname(nickname)
                .email(email)
                .emailVerified(true)
                .build());
    }

    private void savePost(Users writer, String title, LocalDateTime createdTime) {
        Post post = postRepository.save(Post.builder()
                .title(title)
                .body("body")
                .user(writer)
                .build());
        post.setCreatedTime(createdTime);
        postRepository.save(post);
    }

    private static List<String> titles(Page<PostListDTO> page) {
        return page.getContent().stream().map(PostListDTO::getTitle).toList();
    }
}
