-- ============================================================================
-- Patch bổ sung cho DB đã có sẵn dữ liệu blog cũ (chạy 1 lần, an toàn khi chạy lại):
--   0) Thêm cột doctors.featured (nếu chưa có) — theo merge test-branch
--   1) Thêm 4 blog_categories (nếu bảng đang trống)
--   2) Gán category_id cho 3 bài viết cũ (id 1-3), publish bài Phaco (id 3),
--      chỉ thêm ảnh mẫu cho bài NÀO CHƯA CÓ ảnh (không ghi đè ảnh đã upload thủ công)
--   3) Thêm 4 bài viết mới (id 4-7) nếu chưa tồn tại
-- ============================================================================
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 0) doctors.featured
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('doctors') AND name = 'featured'
)
BEGIN
    ALTER TABLE doctors ADD featured BIT NOT NULL DEFAULT 0;
END
GO

-- 1) blog_categories
IF NOT EXISTS (SELECT 1 FROM blog_categories)
BEGIN
    SET IDENTITY_INSERT blog_categories ON;
    INSERT INTO blog_categories (id, name, slug, display_order)
    VALUES
    (1, N'Tin tức - sự kiện', N'tin-tuc-su-kien', 1),
    (2, N'Cẩm nang sức khỏe', N'cam-nang-suc-khoe', 2),
    (3, N'Công nghệ nhãn khoa', N'cong-nghe-nhan-khoa', 3),
    (4, N'Dịch vụ tại ECMS', N'dich-vu-tai-ecms', 4);
    SET IDENTITY_INSERT blog_categories OFF;
END
GO

-- 2) Gán category cho 3 bài viết cũ
UPDATE blog_posts SET category_id = 2 WHERE id = 1 AND category_id IS NULL;   -- 5 dấu hiệu tăng nhãn áp -> Cẩm nang sức khỏe
UPDATE blog_posts SET category_id = 4 WHERE id = 2 AND category_id IS NULL;   -- Kính áp tròng -> Dịch vụ tại ECMS
UPDATE blog_posts
    SET category_id = 3, status = 'PUBLISHED', published_at = ISNULL(published_at, DATEADD(DAY,-6,GETDATE()))
    WHERE id = 3 AND category_id IS NULL;                                     -- Phẫu thuật Phaco -> Công nghệ nhãn khoa

-- Chỉ thêm ảnh mẫu cho bài chưa có ảnh (không đụng tới ảnh đã upload thủ công, vd id=2)
UPDATE blog_posts SET thumbnail_url = 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&h=360&fit=crop&auto=format'
    WHERE id = 1 AND thumbnail_url IS NULL;
UPDATE blog_posts SET thumbnail_url = 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=600&h=360&fit=crop&auto=format'
    WHERE id = 3 AND thumbnail_url IS NULL;
GO

-- 3) Thêm 4 bài viết mới (id 4-7)
IF NOT EXISTS (SELECT 1 FROM blog_posts WHERE id = 4)
BEGIN
    SET IDENTITY_INSERT blog_posts ON;

    INSERT INTO blog_posts (id, title, slug, content, thumbnail_url, author_id, category_id, status, published_at, created_at)
    VALUES
    (4, N'4 dấu hiệu ung thư mắt dễ nhầm với bệnh mắt thông thường',
        N'4-dau-hieu-ung-thu-mat-de-nham-voi-benh-mat-thong-thuong',
        N'Ung thư mắt là bệnh lý hiếm gặp nhưng nguy hiểm, có thể đe dọa thị lực và tính mạng nếu không được phát hiện sớm. Điều đáng lo ngại là nhiều triệu chứng ban đầu rất dễ bị nhầm lẫn với các bệnh mắt thông thường. Dưới đây là 4 dấu hiệu cảnh báo cần lưu ý:

1. Mờ mắt: Thị lực thay đổi đột ngột hoặc từ từ ở một bên mắt, không cải thiện dù đã nghỉ ngơi. Nhiều người nhầm với cận thị hay mỏi mắt, nhưng nếu tình trạng chỉ xảy ra ở một mắt và không thuyên giảm, đây có thể là dấu hiệu của khối u hắc mạc (melanoma) đang phát triển bên trong mắt, chèn ép võng mạc và làm biến dạng hình ảnh.

2. Xuất hiện đốm đen trong tầm nhìn: Các đốm đen, "ruồi bay" thường được xem là hiện tượng lão hóa bình thường. Tuy nhiên, khi các đốm này trở nên rõ rệt, kéo dài hoặc tăng nhanh về số lượng, đó có thể là dấu hiệu của khối u đang hình thành, gây xuất huyết hoặc thay đổi cấu trúc dịch kính.

3. Thay đổi màu sắc con ngươi: Con ngươi bình thường có màu đen và phản xạ tốt với ánh sáng. Xuất hiện đốm trắng hoặc ánh sáng bất thường trong con ngươi — đặc biệt ở trẻ em — có thể là dấu hiệu của u nguyên bào võng mạc (retinoblastoma), rất dễ nhầm với dị tật bẩm sinh thông thường.

4. Đau nhức hoặc cảm giác căng tức trong mắt: Ung thư mắt giai đoạn đầu thường không gây đau. Khi khối u phát triển và xâm lấn mô xung quanh, người bệnh có thể cảm thấy đau nhức phía sau mắt, dễ nhầm với đau đầu hoặc tăng nhãn áp thông thường.

Khi nhận thấy các dấu hiệu bất thường kéo dài, người bệnh nên đến khám chuyên khoa mắt sớm để được chẩn đoán và điều trị kịp thời.',
        'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&h=360&fit=crop&auto=format',
        3, 1, 'PUBLISHED', DATEADD(DAY,-2,GETDATE()), DATEADD(DAY,-3,GETDATE())),

    (5, N'12 dấu hiệu ở mắt cảnh báo bệnh nghiêm trọng',
        N'12-dau-hieu-o-mat-canh-bao-benh-nghiem-trong',
        N'Đôi mắt là bộ phận nhạy cảm của cơ thể, nhưng nhiều triệu chứng xuất hiện ở mắt không chỉ là bệnh về mắt mà còn cảnh báo những bệnh lý nghiêm trọng khác trong cơ thể. Dưới đây là 12 dấu hiệu cần đặc biệt lưu ý:

1. Mù thoáng qua: Có thể là dấu hiệu thiếu máu cục bộ tạm thời, cảnh báo nguy cơ đột quỵ, cần được cấp cứu ngay.

2. Mờ mắt sau khi ăn nhiều đường: Lượng đường trong máu tăng cao làm thủy tinh thể sưng phồng, cần xét nghiệm tiểu đường; tình trạng lặp lại có thể dẫn đến đục thủy tinh thể.

3. Nhìn thấy một điểm cố định trong tầm nhìn: Đây là dấu hiệu cấp cứu, có thể liên quan đến khối u ác tính sau mắt hoặc u não.

4. Một mắt ngày càng yếu đi: Do mạch máu trong mắt bị rò rỉ hoặc tắc nghẽn, có thể là dấu hiệu cảnh báo nguy cơ nhồi máu cơ tim và đột quỵ.

5. Mắt bị lé đột ngột: Có thể báo hiệu tăng áp lực nội sọ hoặc đột quỵ.

6. Hoa mắt khi đứng lên đột ngột: Cho thấy lưu lượng máu đến mắt, dây thần kinh thị giác hoặc não bị giảm, gợi ý huyết áp thấp hoặc bệnh lý mạch máu.

7. Thị lực thay đổi bất thường: Chuyển đổi đột ngột giữa nhìn rõ và mờ có thể là dấu hiệu của bệnh tiểu đường hoặc bệnh lý khác.

8. Đột ngột nhìn đôi: Có thể là dấu hiệu xuất huyết, khối u hoặc phù nề, cần được thăm khám ngay.

9. Nhìn thấy tia sáng đột ngột: Là triệu chứng của bong võng mạc, một tình trạng cấp cứu nhãn khoa.

10. Khô mắt mạn tính: Có thể là dấu hiệu của hội chứng Sjögren, làm tăng nguy cơ nhiễm trùng và u lympho.

11. Mắt bị lồi: Có thể là dấu hiệu của bệnh lý mắt do tuyến giáp, đe dọa thị lực và có thể dẫn đến mù lòa.

12. Căng tức trong mắt: Có thể do viêm phía sau mắt như bệnh tuyến giáp, nhiễm trùng hoặc khối u.

Khi gặp bất kỳ dấu hiệu nào kể trên, đặc biệt là những dấu hiệu xuất hiện đột ngột, người bệnh nên đến cơ sở y tế chuyên khoa mắt để được thăm khám kịp thời.',
        'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&h=360&fit=crop&auto=format',
        4, 2, 'PUBLISHED', DATEADD(DAY,-4,GETDATE()), DATEADD(DAY,-4,GETDATE())),

    (6, N'Dinh dưỡng — yếu tố quan trọng giúp chống lại tình trạng suy giảm thị lực',
        N'dinh-duong-yeu-to-quan-trong-chong-suy-giam-thi-luc',
        N'Theo các bác sĩ chuyên khoa mắt, việc bổ sung đầy đủ dưỡng chất cho mắt mỗi ngày là phương pháp hiệu quả để chống lại tình trạng suy giảm thị lực. Một số dưỡng chất quan trọng cần lưu ý:

- Vitamin A: Tạo sắc tố thị giác giúp nhìn rõ trong điều kiện thiếu sáng; thiếu vitamin A gây quáng gà. Có nhiều trong dầu gan cá, sữa, lòng đỏ trứng, gan, cà rốt, bí đỏ, cà chua.

- Vitamin E: Giúp giảm nguy cơ thoái hóa điểm vàng. Có trong các loại hạt, ngũ cốc, gan bò, lòng đỏ trứng.

- Vitamin C: Hỗ trợ sức khỏe của mắt, có nhiều trong rau xanh tươi và trái cây họ cam quýt.

- Lutein: Giúp phòng ngừa thoái hóa điểm vàng, có nhiều trong rau lá xanh đậm.

- Kẽm: Là khoáng chất thiết yếu cho hoạt động của mắt.

- Anthocyanosides và Oligomeric proanthocyanosides: Có đặc tính chống oxy hóa, tìm thấy trong việt quất đen và hạt nho.

Bên cạnh chế độ dinh dưỡng, các bác sĩ khuyến nghị áp dụng quy tắc "20-20-20": cứ mỗi 20 phút nhìn màn hình, hãy cho mắt nghỉ 20 giây bằng cách nhắm mắt hoặc nhìn ra xa trên 6 mét. Sử dụng kính lọc ánh sáng xanh khi làm việc với máy tính cũng là biện pháp được khuyến khích.',
        'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=360&fit=crop&auto=format',
        5, 2, 'PUBLISHED', DATEADD(DAY,-7,GETDATE()), DATEADD(DAY,-8,GETDATE())),

    (7, N'Bác sĩ nhãn khoa khuyên bạn nên biết 10 điều này',
        N'bac-si-nhan-khoa-khuyen-ban-nen-biet-10-dieu-nay',
        N'Khám mắt định kỳ là điều cần thiết ngay cả khi không có triệu chứng bất thường, và một chế độ ăn cân bằng cũng góp phần bảo vệ sức khỏe đôi mắt. Dưới đây là 10 điều các bác sĩ nhãn khoa khuyên bạn nên biết:

1. Dùng máy tính nhiều không làm hỏng mắt vĩnh viễn, nhưng gây mỏi mắt và mờ mắt tạm thời. Nên nghỉ mắt sau mỗi 20 phút, nhìn xa 2-5 phút và chớp mắt thường xuyên để giữ ẩm tự nhiên.

2. Đeo kính không làm mắt yếu đi: Kính chất lượng tốt, đúng độ tuổi không gây hại cho mắt như nhiều người vẫn lầm tưởng.

3. Mắt khô vào mùa đông: Thời tiết lạnh làm nước mắt bốc hơi nhanh hơn, gây đỏ và khó chịu. Máy tạo độ ẩm, nước mắt nhân tạo và uống đủ nước sẽ giúp cải thiện.

4. Rủi ro từ mỹ phẩm: Chuốt mascara có thể gây trầy giác mạc, các hạt mỹ phẩm có thể lọt vào dưới mí mắt và gây tổn thương.

5. Hút thuốc gây hại cho thị lực: Hút thuốc thường xuyên làm tăng nguy cơ thoái hóa điểm vàng — nguyên nhân hàng đầu gây mù lòa ở người trưởng thành.

6. Không chỉ có cà rốt: Rau lá xanh đậm như cải bó xôi, cải xoăn có tác dụng phòng ngừa thoái hóa điểm vàng tốt hơn cà rốt.

7. Đọc sách trong ánh sáng yếu: Không gây tổn thương vĩnh viễn cho mắt, chỉ khiến mắt mỏi và đau đầu nhanh hơn. Góc đọc sách quan trọng hơn độ sáng.

8. Mắt đỏ cần được thăm khám: Đôi khi mắt đỏ là dấu hiệu của bệnh lý nghiêm trọng gây nhạy cảm hoặc mất thị lực, không nên chủ quan cho rằng vô hại.

9. Tháo kính áp tròng trước khi ngủ: Ngủ khi đeo kính áp tròng làm tăng nguy cơ nhiễm trùng gấp 10-15 lần, có thể gây đau, đỏ mắt và nhạy cảm ánh sáng.

10. Vệ sinh kính đúng cách: Tránh dùng nước nóng khi rửa kính vì làm giảm tuổi thọ tròng kính; nên dùng nước ấm và khăn sạch thay vì quần áo để tránh bụi bẩn.',
        'https://images.unsplash.com/photo-1516841273335-e39b37888115?w=600&h=360&fit=crop&auto=format',
        3, 1, 'PUBLISHED', DATEADD(DAY,-1,GETDATE()), DATEADD(DAY,-1,GETDATE()));

    SET IDENTITY_INSERT blog_posts OFF;
END
GO

PRINT N'✅ Patch blog_categories hoàn tất.';
