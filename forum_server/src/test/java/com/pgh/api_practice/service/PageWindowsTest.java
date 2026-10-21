package com.pgh.api_practice.service;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PageWindowsTest {

    @Test
    void sliceClampsOffsetPastTheEnd() {
        Page<String> page = PageWindows.slice(List.of("a", "b"), PageRequest.of(3, 10));

        assertThat(page.getContent()).isEmpty();
        assertThat(page.getTotalElements()).isEqualTo(2);
    }

    @Test
    void sliceReturnsTheRequestedWindowOnce() {
        Page<Integer> page = PageWindows.slice(List.of(1, 2, 3, 4, 5), PageRequest.of(1, 2));

        assertThat(page.getContent()).containsExactly(3, 4);
        assertThat(page.getTotalElements()).isEqualTo(5);
    }

    @Test
    void requestCapsSizeAndRejectsNonPositiveValues() {
        assertThat(PageWindows.request(-1, 0).getPageNumber()).isZero();
        assertThat(PageWindows.request(-1, 0).getPageSize()).isEqualTo(1);
        assertThat(PageWindows.request(2, 500).getPageSize()).isEqualTo(PageWindows.MAX_PAGE_SIZE);
        assertThat(PageWindows.request(2, 50).getPageSize()).isEqualTo(50);
    }
}
