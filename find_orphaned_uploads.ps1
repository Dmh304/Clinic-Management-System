# ============================================================================
# ECMS -- Tim file anh "mo coi" trong backend/uploads/ (khong con DB nao tro toi)
# de biet an toan xoa cai nao, tranh xoa nham anh dang duoc dung (vo anh).
#
# CACH DUNG:
#   .\find_orphaned_uploads.ps1            -> chi liet ke, KHONG xoa gi ca
#   .\find_orphaned_uploads.ps1 -Delete     -> xoa cac file mo coi (hoi xac nhan truoc)
# ============================================================================

param(
    [switch]$Delete
)

Add-Type -AssemblyName System.Data
# Ten DB + mat khau lay theo backend/src/main/resources/application.properties.
# May nao dat ten DB khac thi doi $DbName ben duoi (hoac truyen -DbName khi chay).
$DbName   = $env:ECMS_DB_NAME;     if (-not $DbName)   { $DbName   = "ecms_db" }
$DbUser   = $env:ECMS_DB_USER;     if (-not $DbUser)   { $DbUser   = "sa" }
$DbPass   = $env:ECMS_DB_PASSWORD; if (-not $DbPass)   { $DbPass   = "mh3k42k6" }
$connStr = "Server=localhost,1433;Database=$DbName;User Id=$DbUser;Password=$DbPass;Encrypt=false;TrustServerCertificate=true;"
$conn = New-Object System.Data.SqlClient.SqlConnection $connStr
$conn.Open()

# Moi cot co the chua duong dan /api/uploads/<file> trong toan bo schema.
$columns = @(
    @{ Table = "doctors"; Col = "avatar_url" },
    @{ Table = "services"; Col = "thumbnail_url" },
    @{ Table = "discount_campaigns"; Col = "thumbnail_url" },
    @{ Table = "blog_posts"; Col = "thumbnail_url" },
    @{ Table = "users"; Col = "avatar_url" },
    @{ Table = "lab_results"; Col = "image_url" },
    @{ Table = "medical_records"; Col = "lab_image_url" },
    @{ Table = "invoices"; Col = "pdf_url" }
)

$referenced = New-Object System.Collections.Generic.HashSet[string]
foreach ($c in $columns) {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT DISTINCT $($c.Col) FROM $($c.Table) WHERE $($c.Col) IS NOT NULL AND $($c.Col) LIKE '%/uploads/%'"
    $reader = $cmd.ExecuteReader()
    $tbl = New-Object System.Data.DataTable
    [void]$tbl.Load($reader)
    $reader.Close()
    foreach ($row in $tbl.Rows) {
        $url = $row[$c.Col]
        $fileName = ($url -split '/')[-1]
        [void]$referenced.Add($fileName)
    }
}
$conn.Close()

Write-Output "So file dang duoc DB tham chieu: $($referenced.Count)"

$uploadDir = Join-Path $PSScriptRoot "backend\uploads"
$allFiles = Get-ChildItem -Path $uploadDir -File
$orphans = $allFiles | Where-Object { -not $referenced.Contains($_.Name) }

Write-Output "So file hien co trong backend\uploads: $($allFiles.Count)"
Write-Output "So file MO COI (khong ai tham chieu): $($orphans.Count)"
Write-Output ""

if ($orphans.Count -eq 0) {
    Write-Output "Khong co file mo coi nao -- khong can don."
    exit 0
}

$totalSize = ($orphans | Measure-Object -Property Length -Sum).Sum
Write-Output ("Danh sach file mo coi (tong {0:N1} MB):" -f ($totalSize / 1MB))
foreach ($f in $orphans) {
    Write-Output ("  {0}  ({1:N0} KB, sua lan cuoi {2})" -f $f.Name, ($f.Length / 1KB), $f.LastWriteTime)
}

if ($Delete) {
    # CHOT AN TOAN: neu MOI file deu bi coi la "mo coi" thi gan nhu chac chan la
    # dang soi nham DB (sai ten DB) hoac DB vua dung lai tu seed nen chua co dong
    # nao tro toi /api/uploads/ -- KHONG phai anh that su thua. Chan lai.
    if ($allFiles.Count -gt 0 -and $orphans.Count -eq $allFiles.Count) {
        Write-Output ""
        Write-Output "DA CHAN XOA: 100% file bi bao la mo coi ($($orphans.Count)/$($allFiles.Count))."
        Write-Output "Gan nhu chac chan la sai DB (dang doc '$DbName') hoac DB moi dung lai tu"
        Write-Output "ecms_data_seed.sql nen anh chua duoc gan vao doctors/services/campaigns."
        Write-Output "Hay kiem tra lai truoc; neu that su muon xoa thi xoa tay."
        exit 1
    }

    Write-Output ""
    $answer = Read-Host "Xoa $($orphans.Count) file mo coi? Go 'yes' de xac nhan"
    if ($answer -ne 'yes') {
        Write-Output "Da huy, khong xoa gi ca."
        exit 0
    }
    foreach ($f in $orphans) {
        Remove-Item -Path $f.FullName -Force
    }
    Write-Output "Da xoa xong $($orphans.Count) file."
} else {
    Write-Output ""
    Write-Output "Day moi la liet ke -- CHUA xoa gi ca. Chay lai voi -Delete de xoa that."
}
