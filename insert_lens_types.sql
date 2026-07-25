USE [ecms_db_sum_final];
GO

SET IDENTITY_INSERT [dbo].[lens_types] ON;

INSERT [dbo].[lens_types] ([id], [name], [description], [base_price], [status]) VALUES 
(1, N'Đơn tròng (Single Vision)', N'Tròng kính có một tiêu cự duy nhất, dùng để nhìn xa, nhìn gần hoặc nhìn trung gian.', 300000.00, N'ACTIVE'),
(2, N'Hai tròng (Bifocal)', N'Tròng kính có hai tiêu cự (nhìn xa và nhìn gần) với đường ranh giới phân biệt rõ ràng.', 500000.00, N'ACTIVE'),
(3, N'Đa tròng (Progressive)', N'Tròng kính cung cấp tầm nhìn liền mạch từ xa đến gần mà không có đường phân giới, mang lại tính thẩm mỹ cao.', 1200000.00, N'ACTIVE'),
(4, N'Chống ánh sáng xanh (Blue Control)', N'Tròng kính phủ lớp cắt hoặc lọc ánh sáng xanh có hại từ màn hình điện tử, giúp giảm nhức mỏi mắt.', 650000.00, N'ACTIVE'),
(5, N'Đổi màu (Photochromic/Transitions)', N'Tròng kính tự động chuyển màu tối khi ra nắng và trong suốt trở lại khi vào nhà, tiện lợi cho người hay di chuyển ngoài trời.', 850000.00, N'ACTIVE'),
(6, N'Phân cực chống chói (Polarized)', N'Tròng kính có khả năng loại bỏ ánh sáng phản chiếu, chống lóa hiệu quả, phù hợp cho người hay lái xe hoặc hoạt động thể thao ngoài trời.', 900000.00, N'ACTIVE'),
(7, N'Tròng mỏng - Chiết suất cao (High Index)', N'Tròng kính được làm từ vật liệu chiết suất cao, giúp tròng mỏng, nhẹ hơn và thẩm mỹ hơn dành cho người có độ cận/viễn cao.', 1500000.00, N'ACTIVE'),
(8, N'Chống mỏi mắt (Anti-Fatigue)', N'Tròng kính có độ hỗ trợ điều tiết ở vùng nhìn gần, giúp mắt thoải mái hơn khi sử dụng các thiết bị kỹ thuật số trong thời gian dài.', 750000.00, N'ACTIVE'),
(9, N'Tròng kiểm soát cận thị (Myopia Control)', N'Tròng kính thiết kế đặc biệt giúp làm chậm quá trình tăng độ cận ở trẻ em.', 2500000.00, N'ACTIVE');

SET IDENTITY_INSERT [dbo].[lens_types] OFF;
GO
