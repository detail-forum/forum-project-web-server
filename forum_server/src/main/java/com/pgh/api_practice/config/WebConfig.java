package com.pgh.api_practice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**") // 모든 API 경로 허용
                        // allowedOriginPatterns 사용 (와일드카드 지원)
                        .allowedOriginPatterns(
                            "http://localhost:3000",
                            "http://localhost:80",
                            "http://127.0.0.1:3000",
                            "http://127.0.0.1:80",
                            "http://211.110.30.142",  // 프로덕션 서버 IP
                            "http://211.110.30.142:80",
                            "http://*",
                            "https://*"
                        )
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }
}
