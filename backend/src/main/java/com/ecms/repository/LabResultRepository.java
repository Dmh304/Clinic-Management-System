/**
 * Author: TuanTD
 * 
 * Kho lưu trữ dữ liệu (Repository) cho thực thể LabResult
 * Cung cấp các phương thức để tương tác và truy vấn dữ liệu kết quả xét nghiệm từ cơ sở dữ liệu.
 *
 */

package com.ecms.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.ecms.entity.LabResult;

public interface LabResultRepository extends JpaRepository<LabResult, Long> {

    /**
     * Tìm kiếm kết quả xét nghiệm mới nhất (có ID lớn nhất) dựa trên ID của đơn xét
     * nghiệm
     * Phương thức này dùng để lấy bản ghi kết quả cuối cùng trong trường hợp một
     * đơn xét nghiệm
     * phải thực hiện hoặc cập nhật lại nhiều lần
     */
    Optional<LabResult> findTopByLabOrderIdOrderByIdDesc(Long labOrderId);

}