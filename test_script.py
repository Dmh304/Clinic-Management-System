import re

line = '''INSERT [dbo].[services] ([id], [name], [category], [price], [duration_minutes], [thumbnail_url], [description], [status], [badge], [price_label], [sessions_included], [validity_days], [service_type], [is_active], [display_order], [category_id], [slug], [content], [created_at], [updated_at], [is_popular], [benefits]) VALUES (1, N'Thư giãn mắt', N'Thư giãn', 150000.00, 30, N'/images/services/thu-gian.jpg', N'Giúp mắt thư giãn sau những giờ làm việc căng thẳng', N'ACTIVE', N'Phổ biến', N'150k / lượt', 1, 30, N'SINGLE', 1, 1, 1, N'thu-gian-mat', N'<p>Liệu trình thư giãn...</p>', CAST(N'2026-06-30T04:05:08.3800000' AS DateTime2), NULL, 1, N'["Giảm nhức mỏi", "Cải thiện tuần hoàn máu", "Ngủ ngon hơn"]')'''

removals = ['category', 'status', 'benefits']

pattern = re.compile(r'INSERT \[dbo\]\.\[(\w+)\] \((.*?)\) VALUES \((.*)\)')
match = pattern.search(line)

columns_str = match.group(2)
values_str = match.group(3)

cols = [c.strip() for c in columns_str.split(',')]
cols_clean = [re.sub(r'[\[\]]', '', c) for c in cols]

values = []
current_val = []
in_quote = False
in_func = 0
for char in values_str:
    if char == "'":
        in_quote = not in_quote
    elif char == '(' and not in_quote:
        in_func += 1
    elif char == ')' and not in_quote:
        in_func -= 1
    elif char == ',' and not in_quote and in_func == 0:
        values.append(''.join(current_val).strip())
        current_val = []
        continue
    current_val.append(char)
values.append(''.join(current_val).strip())

with open('test_out.txt', 'w', encoding='utf-8') as f:
    f.write(f'Cols ({len(cols)}): {cols_clean}\n')
    f.write(f'Vals ({len(values)}): {values}\n')
    for i, (c, v) in enumerate(zip(cols_clean, values)):
        f.write(f'{i}: {c} = {v}\n')
