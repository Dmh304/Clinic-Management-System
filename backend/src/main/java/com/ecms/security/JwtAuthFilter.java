// Mạnh Hùng - HE200743
// Bộ lọc Spring Security chạy một lần mỗi request để xác thực JWT.
// Đọc token từ header Authorization, kiểm tra hợp lệ, nạp thông tin người dùng vào SecurityContext
// để các controller sau có thể lấy thông tin xác thực qua Authentication object.
package com.ecms.security;

import com.ecms.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;
    private final UserRepository userRepository;

    // Trích xuất JWT từ header, xác thực chữ ký và nạp thông tin người dùng vào SecurityContext nếu hợp lệ
    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.isTokenValid(token)) {
            chain.doFilter(request, response);
            return;
        }

        String email = jwtUtil.extractEmail(token);
        if (email == null) {
            chain.doFilter(request, response);
            return;
        }

        // Token đã bị thu hồi nếu tokenVersion trong token không khớp với tokenVersion hiện tại của user
        // (tăng lên mỗi lần admin deactivate tài khoản — UC-55). JWT vốn stateless nên đây là cách
        // thực tế nhất để chặn token cũ mà không cần lưu session/blacklist phía server.
        boolean tokenRevoked = userRepository.findByEmail(email)
                .map(user -> user.getTokenVersion() != jwtUtil.extractTokenVersion(token))
                .orElse(true);
        if (tokenRevoked) {
            chain.doFilter(request, response);
            return;
        }

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null,
                    userDetails.getAuthorities());
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        chain.doFilter(request, response);
    }
}
