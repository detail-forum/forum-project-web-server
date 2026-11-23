package com.detailforum.server.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class DirectChatMessagePageDTO {

    private List<DirectChatMessageDTO> content;
    private long totalElements;
    private int totalPages;
}