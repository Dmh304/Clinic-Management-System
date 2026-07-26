# ============================================================================
# ECMS — Tự động sinh lại ecms_uploaded_images_sync.sql từ trạng thái DB hiện tại.
#
# Chạy file này BẤT CỨ KHI NÀO Manager vừa upload/gán ảnh mới cho bác sĩ,
# dịch vụ, hoặc khuyến mãi — nó sẽ quét DB đang chạy, tìm mọi cột
# thumbnail_url/avatar_url đang trỏ tới /api/uploads/... và viết lại file
# ecms_uploaded_images_sync.sql ở thư mục gốc repo cho khớp.
#
# Sau khi chạy xong, chỉ cần commit lại ecms_uploaded_images_sync.sql (và các
# file ảnh mới trong backend/uploads/ nếu git chưa track) — không cần nhờ
# Claude làm lại bước này nữa.
#
# Cách chạy: mở PowerShell tại thư mục gốc repo, gõ:
#   .\regenerate_uploaded_images_sync.ps1
# ============================================================================

Add-Type -AssemblyName System.Data

# Ten DB + mat khau lay theo backend/src/main/resources/application.properties.
# May nao dat ten DB khac thi doi $DbName ben duoi (hoac set bien moi truong ECMS_DB_NAME).
$DbName   = $env:ECMS_DB_NAME;     if (-not $DbName)   { $DbName   = "ecms_db" }
$DbUser   = $env:ECMS_DB_USER;     if (-not $DbUser)   { $DbUser   = "sa" }
$DbPass   = $env:ECMS_DB_PASSWORD; if (-not $DbPass)   { $DbPass   = "mh3k42k6" }
$connStr = "Server=localhost,1433;Database=$DbName;User Id=$DbUser;Password=$DbPass;Encrypt=false;TrustServerCertificate=true;"
$conn = New-Object System.Data.SqlClient.SqlConnection $connStr
$conn.Open()

function Get-UploadRows($table, $col) {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT id, $col FROM $table WHERE $col LIKE '%/uploads/%' ORDER BY id"
    $reader = $cmd.ExecuteReader()
    $tbl = New-Object System.Data.DataTable
    [void]$tbl.Load($reader)
    $reader.Close()
    # Dấu phẩy đơn ép PowerShell trả về đúng 1 DataTable, tránh bị "duỗi" thành mảng.
    ,$tbl
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("-- ============================================================================")
$lines.Add("-- ECMS -- Gan lai anh da upload qua trang Manager vao cac ban ghi seed.")
$lines.Add("-- File nay duoc SINH TU DONG boi regenerate_uploaded_images_sync.ps1 -- KHONG sua tay,")
$lines.Add("-- chay lai script do de cap nhat.")
$lines.Add("--")
$lines.Add("-- CHAY THE NAO: chay SAU ecms_schema.sql + ecms_data_seed.sql (+ ecms_test_data_extra.sql")
$lines.Add("-- neu co). Mo bang SSMS -> Execute (F5). KHONG dung sqlcmd -f 65001.")
$lines.Add("-- ============================================================================")
$lines.Add("")
$lines.Add("USE ecms_db;")
$lines.Add("GO")
$lines.Add("SET QUOTED_IDENTIFIER ON;")
$lines.Add("SET ANSI_NULLS ON;")
$lines.Add("GO")
$lines.Add("")

$targets = @(
    @{ Table = "doctors"; Col = "avatar_url"; Label = "doctors.avatar_url" },
    @{ Table = "services"; Col = "thumbnail_url"; Label = "services.thumbnail_url" },
    @{ Table = "discount_campaigns"; Col = "thumbnail_url"; Label = "discount_campaigns.thumbnail_url" },
    @{ Table = "blog_posts"; Col = "thumbnail_url"; Label = "blog_posts.thumbnail_url" },
    @{ Table = "users"; Col = "avatar_url"; Label = "users.avatar_url" }
)

$totalRows = 0
foreach ($t in $targets) {
    $tbl = Get-UploadRows $t.Table $t.Col
    $lines.Add("-- ----------------------------------------------------------------------------")
    $lines.Add("-- $($t.Label)")
    $lines.Add("-- ----------------------------------------------------------------------------")
    if ($tbl.Rows.Count -eq 0) {
        $lines.Add("-- (khong co dong nao dang tro toi /uploads/)")
    } else {
        foreach ($row in $tbl.Rows) {
            $id = $row["id"]
            $url = $row[$t.Col]
            $lines.Add("UPDATE $($t.Table) SET $($t.Col) = '$url' WHERE id = $id;")
            $totalRows++
        }
    }
    $lines.Add("")
}

$lines.Add("GO")
$lines.Add("")
$lines.Add("PRINT N'Da gan lai anh upload (' + CAST($totalRows AS NVARCHAR(10)) + N' dong).';")
$lines.Add("GO")

$outPath = Join-Path $PSScriptRoot "ecms_uploaded_images_sync.sql"
$content = ($lines -join "`r`n")
[System.IO.File]::WriteAllText($outPath, $content, (New-Object System.Text.UTF8Encoding($true)))

$conn.Close()
Write-Output "Da ghi lai $outPath voi $totalRows dong UPDATE."
Write-Output "Nho: git add ecms_uploaded_images_sync.sql (va cac file anh moi trong backend/uploads/ neu chua track) roi commit."
