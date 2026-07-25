USE [ecms_db_sum_final];
GO

SET IDENTITY_INSERT [dbo].[eyeglass_coatings] ON;

INSERT [dbo].[eyeglass_coatings] ([id], [name], [description], [price]) VALUES 
(1, N'Lớp phủ chống trầy xước (Anti-Scratch)', N'Tăng độ cứng cho bề mặt tròng kính, hạn chế tối đa các vết xước dăm trong quá trình sinh hoạt và lau chùi.', 100000.00),
(2, N'Lớp phủ chống phản quang (Anti-Reflective/AR)', N'Loại bỏ ánh sáng phản chiếu và bóng lóa trên mặt kính, cho hình ảnh truyền qua sắc nét, sáng rõ hơn và tăng tính thẩm mỹ.', 150000.00),
(3, N'Lớp phủ chống tia cực tím (100% UV Protection)', N'Ngăn chặn tuyệt đối tia UV400 có hại từ ánh nắng mặt trời, bảo vệ giác mạc và võng mạc khỏi các bệnh lý nguy hiểm.', 120000.00),
(4, N'Lớp phủ chống bám nước (Hydrophobic)', N'Tạo hiệu ứng lá sen trên mặt kính giúp nước mưa trôi đi nhanh chóng, không đọng thành giọt gây cản trở tầm nhìn khi đi mưa.', 180000.00),
(5, N'Lớp phủ chống bám vân tay, dầu mỡ (Oleophobic)', N'Giúp bề mặt tròng kính trơn láng, hạn chế tối đa việc bám dính mồ hôi, vân tay và rất dễ dàng lau chùi.', 150000.00),
(6, N'Lớp phủ chống tĩnh điện (Anti-Static)', N'Khử tĩnh điện trên bề mặt kính (thường sinh ra do ma sát khi lau), giúp tròng kính không bị hút các hạt bụi nhỏ trong không khí.', 100000.00),
(7, N'Lớp phủ chống đọng sương (Anti-Fog)', N'Ngăn chặn hiện tượng tròng kính bị mờ đục do hơi thở khi đeo khẩu trang, ăn đồ nóng hoặc khi thay đổi nhiệt độ đột ngột.', 200000.00),
(8, N'Lớp phủ lọc ánh sáng xanh (Blue Control Coating)', N'Bề mặt kính phản xạ lại phần lớn ánh sáng xanh tím có hại từ màn hình thiết bị điện tử, giúp mắt giảm căng thẳng và mỏi mệt.', 250000.00);

SET IDENTITY_INSERT [dbo].[eyeglass_coatings] OFF;
GO
