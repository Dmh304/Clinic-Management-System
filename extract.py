import docx

doc = docx.Document('c:/Users/ADMIN/Clinic-Management-System/ECMS_SRS.docx')
paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

res = []
for i, p in enumerate(paras):
    if 'UC-55:' in p or 'UC-56:' in p:
        res.append("=== MATCH ===")
        res.extend(paras[max(0, i-2):min(len(paras), i+40)])

with open('c:/Users/ADMIN/Clinic-Management-System/uc55_search.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(res))
