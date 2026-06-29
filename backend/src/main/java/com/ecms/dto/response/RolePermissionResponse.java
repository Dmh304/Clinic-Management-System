// UC-56 - Configure System and Data
// Chỉ đọc (read-only): danh sách quyền hard-code theo từng role, lấy từ RolePermissionCatalog.
package com.ecms.dto.response;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RolePermissionResponse {
    private String role;
    private List<String> permissions;
}
