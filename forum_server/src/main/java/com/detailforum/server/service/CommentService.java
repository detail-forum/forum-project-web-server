package com.detailforum.server.service;

import com.detailforum.server.dto.CommentDTO;
import com.detailforum.server.dto.CreateCommentDTO;
import com.detailforum.server.dto.UpdateCommentDTO;
import com.detailforum.server.entity.Comment;
import com.detailforum.server.entity.CommentLike;
import com.detailforum.server.entity.GroupPost;
import com.detailforum.server.entity.Post;
import com.detailforum.server.entity.Users;
import com.detailforum.server.exception.ApplicationUnauthorizedException;
import com.detailforum.server.exception.ResourceNotFoundException;
import com.detailforum.server.repository.CommentLikeRepository;
import com.detailforum.server.repository.CommentRepository;
import com.detailforum.server.repository.GroupPostRepository;
import com.detailforum.server.repository.PostRepository;
import com.detailforum.server.repository.UserRepository;
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
    private final NotificationService notificationService;

    /**
     * 현재 인증된 사용자 정보 가져오기 (인증 필수)
     */
    private Users getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
    }

    /**
     * 현재 인증된 사용자 정보 가져오기 (인증 선택적, 없으면 null 반환)
     */
    private Users getCurrentUserOrNull() {
        try {
            return getCurrentUser();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 댓글 목록 조회 (대댓글 포함) - posts와 group_posts 모두 지원
     */
    @Transactional(readOnly = true)
    public List<CommentDTO> getCommentsByPostId(Long postId) {
        // 인증되지 않은 사용자도 댓글을 볼 수 있음
        Users currentUser = getCurrentUserOrNull();

        // 최상위 댓글 목록 조회 (posts와 group_posts 모두)
        List<Comment> topLevelComments = commentRepository.findAllByPostIdOrGroupPostIdAndNotDeletedAndNoParent(postId);

        // effectively final로 만들기 위해 final 변수에 복사
        final Users finalCurrentUser = currentUser;
        return topLevelComments.stream()
                .map(comment -> convertToDTO(comment, finalCurrentUser))
                .collect(Collectors.toList());
    }

    /**
     * Comment 엔티티를 CommentDTO로 변환 (대댓글 포함)
     */
    private CommentDTO convertToDTO(Comment comment, Users currentUser) {
        long likeCount = commentLikeRepository.countByCommentId(comment.getId());
        boolean isLiked = currentUser != null && commentLikeRepository.existsByCommentIdAndUserId(comment.getId(), currentUser.getId());

        // 대댓글 목록 조회
        List<Comment> replies = commentRepository.findAllByParentCommentIdAndNotDeleted(comment.getId());
        List<CommentDTO> replyDTOs = replies.stream()
                .map(reply -> convertToDTO(reply, currentUser))
                .collect(Collectors.toList());

        // postId 결정 (post 또는 groupPost 중 하나)
        Long postIdValue = comment.getPost() != null ? comment.getPost().getId() : 
                           (comment.getGroupPost() != null ? comment.getGroupPost().getId() : null);
        
        return CommentDTO.builder()
                .id(comment.getId())
                .body(comment.getBody())
                .username(comment.getUser().getUsername())
                .userId(comment.getUser().getId())
                .postId(postIdValue)
                .parentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null)
                .isPinned(comment.isPinned())
                .likeCount(likeCount)
                .isLiked(isLiked)
                .createDateTime(comment.getCreatedTime())
                .updateDateTime(comment.getUpdatedTime())
                .replies(replyDTOs)
                .build();
    }

    /**
     * 댓글 생성 - posts와 group_posts 모두 지원
     */
    @Transactional
    public CommentDTO createComment(CreateCommentDTO dto) {
        Users currentUser = getCurrentUser();

        // 먼저 posts 테이블에서 찾기
        Post post = null;
        GroupPost groupPost = null;
        
        Optional<Post> postOpt = postRepository.findById(dto.getPostId());
        if (postOpt.isPresent()) {
            post = postOpt.get();
            if (post.isDeleted()) {
                throw new ResourceNotFoundException("삭제된 게시글입니다.");
            }
        } else {
            // posts에서 찾지 못하면 group_posts에서 찾기
            Optional<GroupPost> groupPostOpt = groupPostRepository.findByIdAndIsDeletedFalse(dto.getPostId());
            if (groupPostOpt.isPresent()) {
                groupPost = groupPostOpt.get();
            } else {
                throw new ResourceNotFoundException("게시글을 찾을 수 없습니다.");
            }
        }

        Comment parentComment = null;
        if (dto.getParentCommentId() != null) {
            parentComment = commentRepository.findById(dto.getParentCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException("부모 댓글을 찾을 수 없습니다."));
            if (parentComment.isDeleted()) {
                throw new ResourceNotFoundException("삭제된 댓글입니다.");
            }
            // 대댓글은 같은 게시글에만 작성 가능
            Long parentPostId = parentComment.getPost() != null ? parentComment.getPost().getId() :
                               (parentComment.getGroupPost() != null ? parentComment.getGroupPost().getId() : null);
            if (parentPostId == null || !parentPostId.equals(dto.getPostId())) {
                throw new ApplicationUnauthorizedException("같은 게시글에만 대댓글을 작성할 수 있습니다.");
            }
        }

        Comment.CommentBuilder commentBuilder = Comment.builder()
                .body(dto.getBody())
                .user(currentUser)
                .parentComment(parentComment);
        
        if (post != null) {
            commentBuilder.post(post);
        } else {
            commentBuilder.groupPost(groupPost);
        }

        Comment saved = commentRepository.save(commentBuilder.build());
        
        // 대댓글인 경우 알림 생성
        if (parentComment != null) {
            Long parentCommentAuthorId = parentComment.getUser().getId();
            Long postIdValue = post != null ? post.getId() : groupPost.getId();
            boolean isGroupPost = post == null;
            notificationService.createCommentReplyNotification(
                    parentCommentAuthorId, 
                    currentUser.getId(), 
                    postIdValue, 
                    saved.getId(), 
                    isGroupPost
            );
        }
        
        return convertToDTO(saved, currentUser);
    }

    /**
     * 댓글 수정 (댓글 작성자만 가능)
     */
    @Transactional
    public CommentDTO updateComment(Long commentId, UpdateCommentDTO dto) {
        Users currentUser = getCurrentUser();

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("댓글을 찾을 수 없습니다."));

        if (comment.isDeleted()) {
            throw new ResourceNotFoundException("삭제된 댓글입니다.");
        }

        // 댓글 작성자만 수정 가능
        if (!comment.getUser().getId().equals(currentUser.getId())) {
            throw new ApplicationUnauthorizedException("작성자만 댓글을 수정할 수 있습니다.");
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
                .orElseThrow(() -> new ResourceNotFoundException("댓글을 찾을 수 없습니다."));

        if (comment.isDeleted()) {
            throw new ResourceNotFoundException("이미 삭제된 댓글입니다.");
        }

        // 작성자 또는 게시글 작성자만 삭제 가능
        boolean isCommentAuthor = comment.getUser().getId().equals(currentUser.getId());
        boolean isPostAuthor = false;
        if (comment.getPost() != null) {
            isPostAuthor = comment.getPost().getUser().getId().equals(currentUser.getId());
        } else if (comment.getGroupPost() != null) {
            isPostAuthor = comment.getGroupPost().getUser().getId().equals(currentUser.getId());
        }

        if (!isCommentAuthor && !isPostAuthor) {
            throw new ApplicationUnauthorizedException("작성자 또는 게시글 작성자만 댓글을 삭제할 수 있습니다.");
        }

        comment.setDeleted(true);
        commentRepository.save(comment);
    }

    /**
     * 댓글 좋아요/취소
     */
    @Transactional
    public CommentDTO toggleLike(Long commentId) {
        Users currentUser = getCurrentUser();

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("댓글을 찾을 수 없습니다."));

        if (comment.isDeleted()) {
            throw new ResourceNotFoundException("삭제된 댓글입니다.");
        }

        CommentLike existingLike = commentLikeRepository.findByCommentIdAndUserId(commentId, currentUser.getId())
                .orElse(null);

        if (existingLike != null) {
            // 좋아요 취소
            commentLikeRepository.delete(existingLike);
        } else {
            // 좋아요 추가
            CommentLike like = CommentLike.builder()
                    .comment(comment)
                    .user(currentUser)
                    .build();
            commentLikeRepository.save(like);
        }

        return convertToDTO(comment, currentUser);
    }

    /**
     * 댓글 고정/고정 해제 (게시글 작성자만 가능)
     */
    @Transactional
    public CommentDTO togglePin(Long commentId) {
        Users currentUser = getCurrentUser();

        Comment comment = commentRepository.findByIdWithUserAndPost(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("댓글을 찾을 수 없습니다."));

        if (comment.isDeleted()) {
            throw new ResourceNotFoundException("삭제된 댓글입니다.");
        }

        // 게시글 작성자만 댓글을 고정할 수 있음
        boolean isPostAuthor = false;
        if (comment.getPost() != null) {
            isPostAuthor = comment.getPost().getUser().getId().equals(currentUser.getId());
        } else if (comment.getGroupPost() != null) {
            isPostAuthor = comment.getGroupPost().getUser().getId().equals(currentUser.getId());
        }
        
        if (!isPostAuthor) {
            throw new ApplicationUnauthorizedException("게시글 작성자만 댓글을 고정할 수 있습니다.");
        }

        comment.setPinned(!comment.isPinned());
        Comment updated = commentRepository.save(comment);
        return convertToDTO(updated, currentUser);
    }
}

