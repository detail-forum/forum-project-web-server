package com.pgh.api_practice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Slf4j
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String fromEmail;
    private final String baseUrl;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username}") String fromEmail,
            @Value("${app.base-url:http://localhost:3000}") String baseUrl
    ) {
        this.mailSender = mailSender;
        this.fromEmail = fromEmail;
        this.baseUrl = baseUrl;
    }

    /**
     * 이메일 인증 메일 발송
     */
    public void sendVerificationEmail(String toEmail, String username, String verificationToken) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("[rjsgud's forum] 이메일 인증을 완료해주세요");

            String verificationUrl = baseUrl + "/verify-email?token=" + verificationToken;
            
            String htmlContent = buildVerificationEmailHtml(username, verificationUrl);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("이메일 인증 메일 발송 성공: {}", toEmail);
        } catch (MessagingException e) {
            log.error("이메일 인증 메일 발송 실패: {}", toEmail, e);
            throw new RuntimeException("이메일 발송에 실패했습니다.", e);
        }
    }

    /**
     * 이메일 인증 HTML 템플릿 생성
     */
    private String buildVerificationEmailHtml(String username, String verificationUrl) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<meta charset='UTF-8'>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }" +
                ".container { max-width: 600px; margin: 0 auto; padding: 20px; }" +
                ".header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }" +
                ".content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }" +
                ".button { display: inline-block; padding: 12px 30px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }" +
                ".footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<h1>rjsgud's forum</h1>" +
                "</div>" +
                "<div class='content'>" +
                "<h2>이메일 인증을 완료해주세요</h2>" +
                "<p>안녕하세요, <strong>" + username + "</strong>님!</p>" +
                "<p>회원가입을 완료하기 위해 아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>" +
                "<p style='text-align: center;'>" +
                "<a href='" + verificationUrl + "' class='button'>이메일 인증하기</a>" +
                "</p>" +
                "<p>만약 버튼이 작동하지 않는다면, 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>" +
                "<p style='word-break: break-all; color: #4F46E5;'>" + verificationUrl + "</p>" +
                "<p>이 링크는 24시간 동안 유효합니다.</p>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>이 메일은 자동으로 발송된 메일입니다. 회원가입을 요청하지 않으셨다면 무시하셔도 됩니다.</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
    }
}
