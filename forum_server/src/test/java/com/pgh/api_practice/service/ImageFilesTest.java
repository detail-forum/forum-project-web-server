package com.pgh.api_practice.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageFilesTest {

    @TempDir
    Path tempDir;

    @Test
    void extensionComesFromContentTypeNotFilename() {
        assertThat(ImageFiles.extensionFor("image/jpeg")).isEqualTo(".jpg");
        assertThat(ImageFiles.extensionFor("image/png")).isEqualTo(".png");
        assertThat(ImageFiles.extensionFor("image/svg+xml")).isNull();
        assertThat(ImageFiles.extensionFor(null)).isNull();
    }

    @Test
    void rejectsFileThatDoesNotMatchDeclaredType() {
        byte[] png = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A};
        assertThat(ImageFiles.looksLikeImage(png, "image/png")).isTrue();
        assertThat(ImageFiles.looksLikeImage(png, "image/jpeg")).isFalse();
        assertThat(ImageFiles.looksLikeImage(new byte[]{0x00, 0x01}, "image/gif")).isFalse();
    }

    @Test
    void resolveStaysInsideUploadDirectory() {
        Path saved = ImageFiles.resolveInside(tempDir, "550e8400-e29b-41d4-a716-446655440000.jpg");
        assertThat(saved.normalize().startsWith(tempDir.toAbsolutePath().normalize())).isTrue();

        assertThatThrownBy(() -> ImageFiles.resolveInside(tempDir, "../secret.txt"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ImageFiles.resolveInside(tempDir, "nested/file.png"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
