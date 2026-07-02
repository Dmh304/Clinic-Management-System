package com.ecms.controller;

import com.ecms.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

// Upload ảnh đại diện cho gói dịch vụ. Lưu file vào thư mục uploads/ và trả về URL
// dạng /api/uploads/<tên-file> (được phục vụ tĩnh bởi WebConfig).
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileUploadController {

    private static final Path UPLOAD_DIR = Paths.get("uploads");
    private static final long MAX_SIZE = 5L * 1024 * 1024; // 5MB

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Map<String, String>>> upload(@RequestParam("file") MultipartFile file)
            throws IOException {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Vui lòng chọn ảnh"));
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("File phải là ảnh"));
        }
        if (file.getSize() > MAX_SIZE) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Ảnh không được vượt quá 5MB"));
        }

        Files.createDirectories(UPLOAD_DIR);

        // Lấy phần mở rộng từ tên gốc, đặt tên mới ngẫu nhiên để tránh trùng/đè
        String original = StringUtils.cleanPath(
                file.getOriginalFilename() == null ? "image" : file.getOriginalFilename());
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0)
            ext = original.substring(dot);
        String filename = UUID.randomUUID().toString().replace("-", "") + ext;

        Path target = UPLOAD_DIR.resolve(filename).toAbsolutePath();
        file.transferTo(target);

        String url = "/api/uploads/" + filename;
        return ResponseEntity.ok(ApiResponse.success("Tải ảnh thành công", Map.of("url", url)));
    }
}
