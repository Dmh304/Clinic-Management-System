USE [ecms_db];
GO

SET IDENTITY_INSERT [dbo].[eyeglass_frames] ON;

INSERT [dbo].[eyeglass_frames] ([id], [name], [brand], [material], [color], [price], [stock_quantity], [status]) VALUES 
(1, N'Gọng kính cận tròn Lily 2026', N'Lily Eyewear', N'Nhựa TR90', N'Đen trong (Black Clear)', 250000.00, 50, N'ACTIVE'),
(2, N'Gọng kính chữ nhật nam tính RB-RX5228', N'Ray-Ban', N'Nhựa Acetate', N'Đồi mồi (Tortoiseshell)', 3500000.00, 15, N'ACTIVE'),
(3, N'Gọng kính khoan không viền Titan', N'Charmant', N'Titanium', N'Bạc (Silver)', 4200000.00, 10, N'ACTIVE'),
(4, N'Gọng kính mắt mèo thời trang South Side', N'Gentle Monster', N'Nhựa Acetate', N'Đen (Black)', 4500000.00, 8, N'ACTIVE'),
(5, N'Gọng kính nửa viền kim loại GM-20', N'Parim', N'Thép không gỉ', N'Vàng hồng (Rose Gold)', 850000.00, 25, N'ACTIVE'),
(6, N'Gọng kính đa giác Unisex TR-90', N'Seeson', N'Nhựa TR90', N'Trong suốt (Transparent)', 480000.00, 30, N'ACTIVE'),
(7, N'Gọng kính vuông cổ điển TF-5523', N'Tom Ford', N'Nhựa Acetate', N'Nâu Havana (Havana)', 6500000.00, 5, N'ACTIVE'),
(8, N'Gọng kính trẻ em siêu dẻo Kid-Safe', N'Bolon', N'Nhựa dẻo Silicone', N'Xanh dương (Blue)', 450000.00, 40, N'ACTIVE'),
(9, N'Gọng kính thể thao ôm mặt Crosslink', N'Oakley', N'O Matter', N'Đen nhám (Matte Black)', 2800000.00, 12, N'ACTIVE'),
(10, N'Gọng titanium siêu mảnh tròn', N'Exfash', N'Titanium', N'Vàng (Gold)', 1200000.00, 20, N'ACTIVE');

SET IDENTITY_INSERT [dbo].[eyeglass_frames] OFF;
GO
