package com.detailforum.server.controller;

import com.detailforum.server.entity.Group;
import com.detailforum.server.entity.GroupChatRoom;
import com.detailforum.server.entity.GroupMember;
import com.detailforum.server.entity.Users;
import com.detailforum.server.global.TokenProvider;
import com.detailforum.server.repository.GroupChatRoomRepository;
import com.detailforum.server.repository.GroupMemberRepository;
import com.detailforum.server.repository.GroupRepository;
import com.detailforum.server.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GroupChatMessageApiTest {

    @Autowired private MockMvc mvc;
    @Autowired private TokenProvider tokenProvider;
    @Autowired private UserRepository userRepository;
    @Autowired private GroupRepository groupRepository;
    @Autowired private GroupMemberRepository groupMemberRepository;
    @Autowired private GroupChatRoomRepository roomRepository;

    private String url;
    private String token;

    @BeforeEach
    void setUp() {
        Users alice = userRepository.save(Users.builder()
                .username("alice").password("x").nickname("alice").email("alice@example.com").emailVerified(true).build());
        Group group = groupRepository.save(Group.builder().name("g").owner(alice).build());
        groupMemberRepository.save(GroupMember.builder().group(group).user(alice).isAdmin(true).build());
        GroupChatRoom room = roomRepository.save(GroupChatRoom.builder().group(group).name("일반방").isAdminRoom(false).build());
        url = "/group/" + group.getId() + "/chat-rooms/" + room.getId() + "/messages";
        token = "Bearer " + tokenProvider.createAccessToken("alice");
    }

    @Test
    void imageMessageWithEmptyTextIsAccepted() throws Exception {
        // 프론트는 이미지·파일·GIF를 message: '' 로 보낸다
        send("{\"message\":\"\",\"messageType\":\"IMAGE\",\"fileUrl\":\"/uploads/a.png\"}").andExpect(status().isOk());
        send("{\"message\":\"\",\"messageType\":\"FILE\",\"fileUrl\":\"/uploads/a.pdf\",\"fileName\":\"a.pdf\",\"fileSize\":10}")
                .andExpect(status().isOk());
    }

    @Test
    void emptyTextMessageIsStillRejected() throws Exception {
        send("{\"message\":\"\"}").andExpect(status().isBadRequest());
        send("{\"message\":\"\",\"messageType\":\"IMAGE\"}").andExpect(status().isBadRequest());
    }

    private org.springframework.test.web.servlet.ResultActions send(String json) throws Exception {
        return mvc.perform(post(url).header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content(json));
    }
}
