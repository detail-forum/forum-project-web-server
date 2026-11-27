package com.detailforum.server.service;

import com.detailforum.server.dto.CreatePost;
import com.detailforum.server.dto.PatchPostDTO;
import com.detailforum.server.entity.Group;
import com.detailforum.server.entity.GroupMember;
import com.detailforum.server.entity.Post;
import com.detailforum.server.entity.Users;
import com.detailforum.server.exception.ApplicationBadRequestException;
import com.detailforum.server.exception.ApplicationUnauthorizedException;
import com.detailforum.server.repository.GroupMemberRepository;
import com.detailforum.server.repository.GroupRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 나눈 PostService·GroupService의 권한 검사가 그대로인지 본다. */
@SpringBootTest
@Transactional
class PostGroupPermissionTest {

    @Autowired private PostService postService;
    @Autowired private GroupService groupService;
    @Autowired private PostRepository postRepository;
    @Autowired private GroupRepository groupRepository;
    @Autowired private GroupMemberRepository groupMemberRepository;
    @Autowired private UserRepository userRepository;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void onlyAuthorCanEditOrDeletePost() {
        Users writer = saveUser("permwriter");
        saveUser("permother");
        Post post = postRepository.save(Post.builder().title("title").body("body").user(writer).build());

        loginAs("permother");
        PatchPostDTO patch = PatchPostDTO.builder().title("hijacked").build();
        assertThatThrownBy(() -> postService.updatePost(post.getId(), patch))
                .isInstanceOf(ApplicationUnauthorizedException.class);
        assertThatThrownBy(() -> postService.deletePost(post.getId()))
                .isInstanceOf(ApplicationUnauthorizedException.class);
        assertThat(post.getTitle()).isEqualTo("title");
        assertThat(post.isDeleted()).isFalse();

        loginAs("permwriter");
        postService.updatePost(post.getId(), patch);
        postService.deletePost(post.getId());
        assertThat(post.getTitle()).isEqualTo("hijacked");
        assertThat(post.isDeleted()).isTrue();
    }

    @Test
    void onlyGroupMembersCanPostIntoGroup() {
        Users owner = saveUser("permowner");
        saveUser("permoutsider");
        Group group = groupRepository.save(Group.builder().name("g").owner(owner).build());
        CreatePost dto = new CreatePost();
        dto.setTitle("group post title");
        dto.setBody("group post body");
        dto.setGroupId(group.getId());

        loginAs("permoutsider");
        assertThatThrownBy(() -> postService.savePost(dto))
                .isInstanceOf(ApplicationUnauthorizedException.class);

        loginAs("permowner");
        assertThat(postService.savePost(dto)).isPositive();
    }

    @Test
    void ownerCannotLeaveAndOnlyOwnerDeletesWithMatchingName() {
        Users owner = saveUser("grpowner");
        Users member = saveUser("grpmember");
        Group group = groupRepository.save(Group.builder().name("모임").owner(owner).build());
        groupMemberRepository.save(GroupMember.builder().group(group).user(member).isAdmin(true).build());

        loginAs("grpowner");
        assertThatThrownBy(() -> groupService.leaveGroup(group.getId()))
                .isInstanceOf(ApplicationBadRequestException.class);

        // 관리자여도 주인이 아니면 지울 수 없다.
        loginAs("grpmember");
        assertThatThrownBy(() -> groupService.deleteGroup(group.getId(), "모임"))
                .isInstanceOf(ApplicationUnauthorizedException.class);
        assertThatThrownBy(() -> groupService.updateMemberAdmin(group.getId(), owner.getId(), false))
                .isInstanceOf(ApplicationUnauthorizedException.class);

        loginAs("grpowner");
        assertThatThrownBy(() -> groupService.deleteGroup(group.getId(), "다른 이름"))
                .isInstanceOf(ApplicationBadRequestException.class);
        groupService.deleteGroup(group.getId(), "모임");
        assertThat(group.isDeleted()).isTrue();
    }

    private void loginAs(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null, List.of()));
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
}
