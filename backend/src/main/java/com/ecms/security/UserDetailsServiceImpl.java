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

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng: " + email));

        String roleName = user.getRole() != null
                ? "ROLE_" + user.getRole().getName()
                : "ROLE_PATIENT";

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPasswordHash(),
                "ACTIVE".equals(user.getStatus()),
                true, true, true,
                List.of(new SimpleGrantedAuthority(roleName)));
    }
}