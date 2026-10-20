package com.pgh.api_practice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig {

    @Value("${app.upload.dir:C:/app-data/uploads}")
    private String uploadDir;

    @Value("${app.cors.allowed-origins:}")
    private String allowedOrigins;

    @Bean
    public WebMvcConfigurer webMvcConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOriginPatterns(CorsOrigins.parse(allowedOrigins).toArray(String[]::new))
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
            }

            @Override
            public void addResourceHandlers(ResourceHandlerRegistry registry) {
                // /uploads/ 경로로 요청이 오면 업로드 디렉토리의 파일을 제공
                String uploadPath = Paths.get(uploadDir).toUri().toString();
                registry.addResourceHandler("/uploads/**")
                        .addResourceLocations("file:" + uploadPath)
                        .setCachePeriod(86400); // 24시간 캐싱
                
                // /api/로 시작하는 경로는 정적 리소스 핸들러에서 제외
                // (컨트롤러 매핑이 우선되어야 함)
            }
        };
    }
}
