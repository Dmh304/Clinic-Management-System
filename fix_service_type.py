import sys
import io

input_file = 'data_seed_sum_final.sql'
with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace N'DIAGNOSTIC' and N'EXAM' with N'CLINICAL' in INSERT [dbo].[services]
lines = content.splitlines()
for i, line in enumerate(lines):
    if 'INSERT [dbo].[services] (' in line:
        lines[i] = line.replace("N'DIAGNOSTIC'", "N'CLINICAL'").replace("N'EXAM'", "N'CLINICAL'")

with open(input_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
