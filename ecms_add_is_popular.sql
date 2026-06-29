-- =====================================================================
-- Bổ sung cột is_popular cho bảng services phục vụ sắp xếp gói dịch vụ nổi bật lên đầu
-- =====================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

ALTER TABLE services ADD is_popular BIT NOT NULL DEFAULT 0;
