// Mạnh Hùng - HE200743
// Triển khai UserDetailsService của Spring Security.
// Tải thông tin người dùng từ database theo email để Spring Security có thể xác thực
// và kiểm tra quyền truy cập trong quá trình xử lý JWT.
package com.ecms.security;

import com.ecms.entity.User;
import com.ecms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    // Tải thông tin xác thực người dùng theo email: lấy passwordHash, trạng thái và vai trò để Spring Security kiểm tra quyền
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng: " + email));

        String roleName = user.getRole() != null
                ? "ROLE_" + user.getRole().getName()
                : "ROLE_PATIENT";

        // Tài khoản đăng nhập bằng Google có thể chưa có passwordHash (null) — Spring Security's User
        // không chấp nhận password null, nên dùng chuỗi rỗng làm giá trị thay thế (không dùng để xác thực)
        String passwordForUserDetails = user.getPasswordHash() != null ? user.getPasswordHash() : "";

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                passwordForUserDetails,
                "ACTIVE".equals(user.getStatus()),
                true, true, true,
                List.of(new SimpleGrantedAuthority(roleName)));
    }
}