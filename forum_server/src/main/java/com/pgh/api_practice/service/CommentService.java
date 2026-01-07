package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.CommentDTO;
import com.pgh.api_practice.dto.CreateCommentDTO;
import com.pgh.api_practice.dto.UpdateCommentDTO;
import com.pgh.api_practice.entity.Comment;
import com.pgh.api_practice.entity.CommentLike;
import com.pgh.api_practice.entity.GroupPost;
import com.pgh.api_practice.entity.Post;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.errorcode.CommentErrorCode;
import com.pgh.api_practice.exception.CommentException;
import com.pgh.api_practice.repository.CommentLikeRepository;
import com.pgh.api_practice.repository.CommentRepository;
import com.pgh.api_practice.repository.GroupPostRepository;
import com.pgh.api_practice.repository.PostRepository;
import com.pgh.api_practice.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final PostRepository postRepository;
    private final GroupPostRepository groupPostRepository;
    private final UserRepository userRepository;

    /**
     * 현재 인증된 사용자 정보 가져오기 (인증 필수)
     */
    private Users getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            throw new CommentException(CommentErrorCode.UNAUTHORIZED);
        }

        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new CommentException(CommentErrorCode.USER_NOT_FOUND));
    }

    /**
     * 현재 인증된 사용자 정보 가져오기 (인증 선택적)
     */
    private Users getCurrentUserOrNull() {
        try {
            return getCurrentUser();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 댓글 목록 조회 (대댓글 포함)
     */
    @Transactional(readOnly = true)
    public List<CommentDTO> getCommentsByPostId(Long postId) {
        Users currentUser = getCurrentUserOrNull();

        List<Comment> topLevelComments =
                commentRepository.findAllByPostIdOrGroupPostIdAndNotDeletedAndNoParent(postId);

        final Users finalCurrentUser = currentUser;
        return topLevelComments.stream()
                .map(comment -> convertToDTO(comment, finalCurrentUser))
                .collect(Collectors.toList());
    }

    /**
     * Comment → CommentDTO 변환
     */
    private CommentDTO convertToDTO(Comment comment, Users currentUser) {
        long likeCount = commentLikeRepository.countByCommentId(comment.getId());
        boolean isLiked =
                currentUser != null &&
                        commentLikeRepository.existsByCommentIdAndUserId(
                                comment.getId(), currentUser.getId()
                        );

        List<Comment> replies =
                commentRepository.findAllByParentCommentIdAndNotDeleted(comment.getId());

        List<CommentDTO> replyDTOs = replies.stream()
                .map(reply -> convertToDTO(reply, currentUser))
                .collect(Collectors.toList());

        Long postIdValue =
                comment.getPost() != null
                        ? comment.getPost().getId()
                        : (comment.getGroupPost() != null
                        ? comment.getGroupPost().getId()
                        : null);

        return CommentDTO.builder()
                .id(comment.getId())
                .body(comment.getBody())
                .username(comment.getUser().getUsername())
                .userId(comment.getUser().getId())
                .postId(postIdValue)
                .parentCommentId(
                        comment.getParentComment() != null
                                ? comment.getParentComment().getId()
                                : null
                )
                .isPinned(comment.isPinned())
                .likeCount(likeCount)
                .isLiked(isLiked)
                .createDateTime(comment.getCreatedTime())
                .updateDateTime(comment.getUpdatedTime())
                .replies(replyDTOs)
                .build();
    }

    /**
     * 댓글 생성
     */
    @Transactional
    public CommentDTO createComment(CreateCommentDTO dto) {
        Users currentUser = getCurrentUser();

        Post post = null;
        GroupPost groupPost = null;

        Optional<Post> postOpt = postRepository.findById(dto.getPostId());
        if (postOpt.isPresent()) {
            post = postOpt.get();
            if (post.isDeleted()) {
                throw new CommentException(CommentErrorCode.POST_DELETED);
            }
        } else {
            groupPost = groupPostRepository.findByIdAndIsDeletedFalse(dto.getPostId())
                    .orElseThrow(() -> new CommentException(CommentErrorCode.POST_NOT_FOUND));
        }

        Comment parentComment = null;
        if (dto.getParentCommentId() != null) {
            parentComment = commentRepository.findById(dto.getParentCommentId())
                    .orElseThrow(() -> new CommentException(CommentErrorCode.PARENT_COMMENT_NOT_FOUND));

            if (parentComment.isDeleted()) {
                throw new CommentException(CommentErrorCode.COMMENT_DELETED);
            }

            Long parentPostId =
                    parentComment.getPost() != null
                            ? parentComment.getPost().getId()
                            : (parentComment.getGroupPost() != null
                            ? parentComment.getGroupPost().getId()
                            : null);

            if (parentPostId == null || !parentPostId.equals(dto.getPostId())) {
                throw new CommentException(CommentErrorCode.INVALID_REPLY_TARGET);
            }
        }

        Comment.CommentBuilder builder = Comment.builder()
                .body(dto.getBody())
                .user(currentUser)
                .parentComment(parentComment);

        if (post != null) {
            builder.post(post);
        } else {
            builder.groupPost(groupPost);
        }

        Comment saved = commentRepository.save(builder.build());
        return convertToDTO(saved, currentUser);
    }

    /**
     * 댓글 수정
     */
    @Transactional
    public CommentDTO updateComment(Long commentId, UpdateCommentDTO dto) {
        Users currentUser = getCurrentUser();

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CommentException(CommentErrorCode.COMMENT_NOT_FOUND));

        if (comment.isDeleted()) {
            throw new CommentException(CommentErrorCode.COMMENT_DELETED);
        }

        if (!comment.getUser().getId().equals(currentUser.getId())) {
            throw new CommentException(CommentErrorCode.FORBIDDEN);
        }

        comment.setBody(dto.getBody());
        Comment updated = commentRepository.save(comment);
        return convertToDTO(updated, currentUser);
    }

    /**
     * 댓글 삭제
     */
    @Transactional
    public void deleteComment(Long commentId) {
        Users currentUser = getCurrentUser();

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CommentException(CommentErrorCode.COMMENT_NOT_FOUND));

        if (comment.isDeleted()) {
            throw new CommentException(CommentErrorCode.COMMENT_DELETED);
        }

        boolean isCommentAuthor =
                comment.getUser().getId().equals(currentUser.getId());

        boolean isPostAuthor =
                comment.getPost() != null
                        ? comment.getPost().getUser().getId().equals(currentUser.getId())
                        : comment.getGroupPost() != null
                        && comment.getGroupPost().getUser().getId().equals(currentUser.getId());

        if (!isCommentAuthor && !isPostAuthor) {
            throw new CommentException(CommentErrorCode.FORBIDDEN);
        }

        comment.setDeleted(true);
        commentRepository.save(comment);
    }

    /**
     * 댓글 좋아요 / 취소
     */
    @Transactional
    public CommentDTO toggleLike(Long commentId) {
        Users currentUser = getCurrentUser();

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CommentException(CommentErrorCode.COMMENT_NOT_FOUND));

        if (comment.isDeleted()) {
            throw new CommentException(CommentErrorCode.COMMENT_DELETED);
        }

        CommentLike existingLike =
                commentLikeRepository.findByCommentIdAndUserId(
                        commentId, currentUser.getId()
                ).orElse(null);

        if (existingLike != null) {
            commentLikeRepository.delete(existingLike);
        } else {
            CommentLike like = CommentLike.builder()
                    .comment(comment)
                    .user(currentUser)
                    .build();
            commentLikeRepository.save(like);
        }

        return convertToDTO(comment, currentUser);
    }

    /**
     * 댓글 고정 / 해제
     */
    @Transactional
    public CommentDTO togglePin(Long commentId) {
        Users currentUser = getCurrentUser();

        Comment comment = commentRepository.findByIdWithUserAndPost(commentId)
                .orElseThrow(() -> new CommentException(CommentErrorCode.COMMENT_NOT_FOUND));

        if (comment.isDeleted()) {
            throw new CommentException(CommentErrorCode.COMMENT_DELETED);
        }

        boolean isPostAuthor =
                comment.getPost() != null
                        ? comment.getPost().getUser().getId().equals(currentUser.getId())
                        : comment.getGroupPost() != null
                        && comment.getGroupPost().getUser().getId().equals(currentUser.getId());

        if (!isPostAuthor) {
            throw new CommentException(CommentErrorCode.FORBIDDEN);
        }

        comment.setPinned(!comment.isPinned());
        Comment updated = commentRepository.save(comment);
        return convertToDTO(updated, currentUser);
    }
}