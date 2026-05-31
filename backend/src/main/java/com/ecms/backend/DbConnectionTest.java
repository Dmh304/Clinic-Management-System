package com.ecms.backend;

import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Properties;

public class DbConnectionTest {
    public static void main(String[] args) {
        Properties props = new Properties();
        try (InputStream in = Thread.currentThread().getContextClassLoader()
                .getResourceAsStream("application.properties")) {
            if (in == null) {
                System.err.println("application.properties not found on classpath");
                System.exit(2);
            }
            props.load(in);

            String url = props.getProperty("spring.datasource.url");
            String user = props.getProperty("spring.datasource.username");
            String pass = props.getProperty("spring.datasource.password");

            System.out.println("Using JDBC URL: " + (url == null ? "<null>" : url.replaceAll("(?<=://).*@", "")));
            System.out.println("Using username: " + user);

            if (url == null) {
                System.err.println("spring.datasource.url is not set in application.properties");
                System.exit(3);
            }

            try (Connection conn = DriverManager.getConnection(url, user, pass)) {
                if (conn != null && !conn.isClosed()) {
                    System.out.println("SUCCESS: Obtained JDBC connection. AutoCommit=" + conn.getAutoCommit());
                    System.exit(0);
                } else {
                    System.err.println("FAILED: Connection was null or closed after getConnection()");
                    System.exit(4);
                }
            }

        } catch (Exception e) {
            System.err.println("ERROR: Exception while testing DB connection:");
            e.printStackTrace(System.err);
            System.exit(1);
        }
    }
}
