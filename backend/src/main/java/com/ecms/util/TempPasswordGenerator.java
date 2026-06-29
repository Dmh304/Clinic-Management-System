// UC-55 - Manage User Account
// Sinh mật khẩu tạm dùng chung cho các action của Admin (tạo tài khoản, activate, reset mật khẩu):
// 12 ký tự, đảm bảo có ít nhất 1 chữ hoa/thường/số/ký tự đặc biệt, dùng SecureRandom.
package com.ecms.util;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class TempPasswordGenerator {

    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SPECIAL = "!@#$%^&*";
    private static final String ALL_CHARS = UPPER + LOWER + DIGITS + SPECIAL;
    private static final SecureRandom RANDOM = new SecureRandom();

    private TempPasswordGenerator() {
    }

    public static String generate() {
        StringBuilder required = new StringBuilder();
        required.append(UPPER.charAt(RANDOM.nextInt(UPPER.length())));
        required.append(LOWER.charAt(RANDOM.nextInt(LOWER.length())));
        required.append(DIGITS.charAt(RANDOM.nextInt(DIGITS.length())));
        required.append(SPECIAL.charAt(RANDOM.nextInt(SPECIAL.length())));
        for (int i = required.length(); i < 12; i++) {
            required.append(ALL_CHARS.charAt(RANDOM.nextInt(ALL_CHARS.length())));
        }

        List<Character> chars = new ArrayList<>();
        for (char c : required.toString().toCharArray()) {
            chars.add(c);
        }
        Collections.shuffle(chars, RANDOM);

        StringBuilder result = new StringBuilder(chars.size());
        chars.forEach(result::append);
        return result.toString();
    }
}
