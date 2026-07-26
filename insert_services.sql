BEGIN TRAN;

-- =====================================================
-- 1) SOFT DELETE DỊCH VỤ PHẪU THUẬT ĐỤC THỦY TINH THỂ
-- =====================================================
UPDATE services
SET is_active = 0,
    updated_at = GETDATE()
WHERE id = 8;

-- =====================================================
-- 2) NHÓM BÁC SĨ KHÁM
-- =====================================================
INSERT INTO services
(
    name, description, price, duration_minutes,
    category_id, slug, thumbnail_url, content, badge,
    benefits, price_label, sessions_included, validity_days,
    service_type, is_active, is_popular, is_lab_service,
    display_order, created_at, updated_at
)
VALUES
(
    N'Khám mắt tổng quát',
    N'Khám ban đầu, hỏi bệnh, đánh giá triệu chứng, khám lâm sàng và đưa ra chẩn đoán sơ bộ.',
    150000, 15,
    NULL, N'kham-mat-tong-quat', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 1, 0,
    1, GETDATE(), GETDATE()
),
(
    N'Khám tật khúc xạ và tư vấn kính',
    N'Bác sĩ đọc kết quả đo, chẩn đoán cận thị, viễn thị, loạn thị và tư vấn chỉnh kính phù hợp.',
    120000, 15,
    NULL, N'kham-tat-khuc-xa-va-tu-van-kinh', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 1, 0,
    2, GETDATE(), GETDATE()
),
(
    N'Khám đỏ mắt, đau mắt, cộm xốn',
    N'Khám các triệu chứng đỏ mắt, đau mắt, cộm xốn, chảy nước mắt, nghi viêm kết mạc hoặc kích ứng bề mặt mắt.',
    150000, 15,
    NULL, N'kham-do-mat-dau-mat-com-xon', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 0, 0,
    3, GETDATE(), GETDATE()
),
(
    N'Khám khô mắt và rối loạn bề mặt nhãn cầu',
    N'Đánh giá khô mắt, rát mắt, chói sáng, mỏi mắt và các vấn đề bề mặt nhãn cầu.',
    180000, 15,
    NULL, N'kham-kho-mat-va-roi-loan-be-mat-nhan-cau', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 0, 0,
    4, GETDATE(), GETDATE()
),
(
    N'Khám mỏi mắt, nhức mắt do màn hình',
    N'Khám hội chứng thị giác màn hình, mỏi mắt khi học tập hoặc làm việc máy tính kéo dài.',
    150000, 15,
    NULL, N'kham-moi-mat-nhuc-mat-do-man-hinh', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 0, 0,
    5, GETDATE(), GETDATE()
),
(
    N'Soi đáy mắt và đánh giá võng mạc',
    N'Bác sĩ soi đáy mắt để đánh giá võng mạc, gai thị và mạch máu võng mạc.',
    200000, 20,
    NULL, N'soi-day-mat-va-danh-gia-vong-mac', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 0, 0,
    6, GETDATE(), GETDATE()
),
(
    N'Khám sàng lọc glaucoma',
    N'Khám lâm sàng khi nghi ngờ tăng nhãn áp hoặc glaucoma, kết hợp đọc các kết quả đo liên quan.',
    200000, 20,
    NULL, N'kham-sang-loc-glaucoma', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 0, 0,
    7, GETDATE(), GETDATE()
),
(
    N'Khám trẻ em, nhược thị, lác',
    N'Khám chuyên cho trẻ em, sàng lọc nhược thị, lác và các bất thường phối hợp hai mắt.',
    180000, 20,
    NULL, N'kham-tre-em-nhuoc-thi-lac', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 0, 0,
    8, GETDATE(), GETDATE()
),
(
    N'Tái khám và đọc kết quả cận lâm sàng',
    N'Bác sĩ xem lại kết quả đo thị lực, đo khúc xạ, đo nhãn áp và đưa ra hướng xử trí tiếp theo.',
    100000, 10,
    NULL, N'tai-kham-va-doc-ket-qua-can-lam-sang', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 0, 0,
    9, GETDATE(), GETDATE()
);

-- =====================================================
-- 3) NHÓM LAB / KỸ THUẬT VIÊN
-- =====================================================
INSERT INTO services
(
    name, description, price, duration_minutes,
    category_id, slug, thumbnail_url, content, badge,
    benefits, price_label, sessions_included, validity_days,
    service_type, is_active, is_popular, is_lab_service,
    display_order, created_at, updated_at
)
VALUES
(
    N'Đo thị lực (VA/BCVA)',
    N'Đo thị lực không kính và có kính chỉnh tối tốt nhất bằng bảng đo thị lực chuẩn.',
    50000, 10,
    NULL, N'do-thi-luc-va-bcva', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 1, 1,
    10, GETDATE(), GETDATE()
),
(
    N'Đo khúc xạ tự động',
    N'Đo khúc xạ khách quan bằng máy Auto-Refractor để xác định SPH, CYL và AXIS.',
    70000, 10,
    NULL, N'do-khuc-xa-tu-dong', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 1, 1,
    11, GETDATE(), GETDATE()
),
(
    N'Đo nhãn áp (IOP)',
    N'Đo áp lực nội nhãn bằng máy Tonometer để sàng lọc tăng nhãn áp và glaucoma.',
    70000, 10,
    NULL, N'do-nhan-ap-iop', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 1, 1,
    12, GETDATE(), GETDATE()
),
(
    N'Chụp bản đồ giác mạc (Topo)',
    N'Phân tích hình thái và độ cong giác mạc bằng máy Topographer, hỗ trợ đánh giá tật khúc xạ và chỉ định kính áp tròng/phẫu thuật.',
    150000, 15,
    NULL, N'chup-ban-do-giac-mac-topo', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 0, 1,
    13, GETDATE(), GETDATE()
),
(
    N'Chụp OCT',
    N'Chụp cắt lớp quang học OCT để đánh giá võng mạc, hoàng điểm và thần kinh thị.',
    200000, 15,
    NULL, N'chup-oct', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    N'CLINICAL', 1, 1, 1,
    14, GETDATE(), GETDATE()
);

COMMIT TRAN;

UPDATE services
SET is_active = 0,
    updated_at = GETDATE()
WHERE id IN (6, 9, 10, 11, 12, 14);