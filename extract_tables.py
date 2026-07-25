import docx

doc = docx.Document('c:/Users/ADMIN/Clinic-Management-System/ECMS_SRS.docx')

res = []
for table in doc.tables:
    table_text = []
    for row in table.rows:
        for cell in row.cells:
            if cell.text.strip():
                table_text.append(cell.text.strip())
    res.append('\n'.join(table_text))

with open('c:/Users/ADMIN/Clinic-Management-System/tables.txt', 'w', encoding='utf-8') as f:
    f.write('\n\n---TABLE---\n\n'.join(res))
