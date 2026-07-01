// DucTKH
// Entity đại diện cho bảng invoices trong cơ sở dữ liệu.
// Dùng để lưu trữ thông tin hóa đơn (bao gồm tiền khám, tiền thuốc, v.v.).
package com.ecms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {
}
