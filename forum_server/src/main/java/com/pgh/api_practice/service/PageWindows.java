package com.pgh.api_practice.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.List;

/**
 * 목록을 한 번만 자른다. 클라이언트가 보내는 size는 프론트가 쓰는 최대값(100)을 넘지 않는다.
 */
public final class PageWindows {

    public static final int MAX_PAGE_SIZE = 100;

    private PageWindows() {
    }

    public static PageRequest request(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        return PageRequest.of(safePage, safeSize);
    }

    public static <T> Page<T> slice(List<T> items, Pageable pageable) {
        List<T> source = items == null ? List.of() : items;
        if (pageable == null || pageable.isUnpaged()) {
            return new PageImpl<>(new ArrayList<>(source));
        }
        int start = (int) Math.min(Math.max(pageable.getOffset(), 0L), source.size());
        int end = (int) Math.min((long) start + pageable.getPageSize(), source.size());
        return new PageImpl<>(new ArrayList<>(source.subList(start, end)), pageable, source.size());
    }
}
