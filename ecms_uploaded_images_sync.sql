-- ============================================================================
-- ECMS -- Gan lai anh da upload qua trang Manager vao cac ban ghi seed.
-- File nay duoc SINH TU DONG boi regenerate_uploaded_images_sync.ps1 -- KHONG sua tay,
-- chay lai script do de cap nhat.
--
-- CHAY THE NAO: chay SAU ecms_schema.sql + ecms_data_seed.sql (+ ecms_test_data_extra.sql
-- neu co). Mo bang SSMS -> Execute (F5). KHONG dung sqlcmd -f 65001.
-- ============================================================================

USE ecms_db;
GO
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ----------------------------------------------------------------------------
-- doctors.avatar_url
-- ----------------------------------------------------------------------------
UPDATE doctors SET avatar_url = '/api/uploads/8e3ab0ae77254769941022b944422fbf.jpg' WHERE id = 1;
UPDATE doctors SET avatar_url = '/api/uploads/41521318ebb1412ab4be4291f12a2128.png' WHERE id = 2;
UPDATE doctors SET avatar_url = '/api/uploads/0a6bf8997c5c444d880ec04df351ae66.jpg' WHERE id = 3;

-- ----------------------------------------------------------------------------
-- services.thumbnail_url
-- ----------------------------------------------------------------------------
UPDATE services SET thumbnail_url = '/api/uploads/a08e802825144f3c832aa4e33cba55c3.jpg' WHERE id = 3;
UPDATE services SET thumbnail_url = '/api/uploads/b81e143355a14d35bdef61dfba982498.jpg' WHERE id = 5;
UPDATE services SET thumbnail_url = '/api/uploads/9e341e8ddf8c496391a7c7a23dc9bd97.jpg' WHERE id = 6;
UPDATE services SET thumbnail_url = '/api/uploads/2d068e8b62514391a0bbd3ef1e2d6c98.jpg' WHERE id = 7;
UPDATE services SET thumbnail_url = '/api/uploads/890b9b522288495d9758e47b071e955b.webp' WHERE id = 9;
UPDATE services SET thumbnail_url = '/api/uploads/4aedd9506f1a4f5dacdef8ab9c2a7693.webp' WHERE id = 10;
UPDATE services SET thumbnail_url = '/api/uploads/712c9e7f7b6d4ca3b874cd65b6151d03.webp' WHERE id = 11;
UPDATE services SET thumbnail_url = '/api/uploads/73a37e675086406d96464c14dcb0d3c9.jpg' WHERE id = 12;
UPDATE services SET thumbnail_url = '/api/uploads/6cfd626d335e45ac920c8c127b390e55.jpg' WHERE id = 13;
UPDATE services SET thumbnail_url = '/api/uploads/8a87969634f04785b891e7732e6674c3.webp' WHERE id = 14;

-- ----------------------------------------------------------------------------
-- discount_campaigns.thumbnail_url
-- ----------------------------------------------------------------------------
UPDATE discount_campaigns SET thumbnail_url = '/api/uploads/34aecd48fc484cf69db51a8d8c86c899.jpg' WHERE id = 1;
UPDATE discount_campaigns SET thumbnail_url = '/api/uploads/dab771b4dfb441418de0a15fda93cca9.jpg' WHERE id = 2;
UPDATE discount_campaigns SET thumbnail_url = '/api/uploads/4a21c9ee9b3a4cc680ef8a7ebc25dc07.jpg' WHERE id = 3;

-- ----------------------------------------------------------------------------
-- blog_posts.thumbnail_url
-- ----------------------------------------------------------------------------
-- (khong co dong nao dang tro toi /uploads/)

-- ----------------------------------------------------------------------------
-- users.avatar_url
-- ----------------------------------------------------------------------------
-- (khong co dong nao dang tro toi /uploads/)

GO

PRINT N'Da gan lai anh upload (' + CAST(16 AS NVARCHAR(10)) + N' dong).';
GO