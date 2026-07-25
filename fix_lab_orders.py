import sys
import io
import re

input_file = 'data_seed_sum_final.sql'
with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.splitlines()
for i, line in enumerate(lines):
    if 'INSERT [dbo].[lab_orders] (' in line:
        match = re.search(r'VALUES \((.*)\)', line)
        if match:
            # We know the first few values are numeric or NULL.
            # Split by comma
            vals = match.group(1).split(',')
            
            # vals[0]: id
            # vals[1]: medical_record_id
            # vals[2]: ordered_by
            # vals[3]: assigned_to
            
            ordered_by = vals[2].strip()
            if ordered_by == '5':
                vals[2] = ' 1'
                
            assigned_to = vals[3].strip()
            if assigned_to == '9':
                vals[3] = ' 1'
                
            # Reconstruct the line
            new_vals_str = ','.join(vals)
            lines[i] = line[:match.start(1)] + new_vals_str + line[match.end(1):]

with open(input_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
