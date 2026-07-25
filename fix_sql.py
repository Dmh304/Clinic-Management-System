import re

input_file = 'data_seed_sum_final.sql'
output_file = 'data_seed_sum_final_fixed.sql'

with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the columns to remove for each table
removals = {
    'services': ['category', 'status', 'benefits'],
    'users': ['google_id', 'email_verified_at', 'last_login_at', 'enabled', 'updated_at'],
    'appointments': ['appointment_date', 'room_id'],
    'medical_records': ['image_url'],
    'lab_results': ['result_data'],
    'invoices': ['subscription_id'],
    'care_sessions': ['check_in_at', 'is_incident', 'started_at', 'check_in_by', 'room_id'],
    'prescriptions': ['type', 'issued_by', 'dispensed_by', 'dispensed_at'],
    'medicines': ['category', 'requires_prescription', 'description', 'status'],
    'prescription_items': ['unit', 'dosage_instruction', 'status', 'created_at']
}

def remove_columns_from_insert(match):
    table_name = match.group(1).strip()
    columns_str = match.group(2)
    values_str = match.group(3)
    
    if table_name not in removals:
        return match.group(0)
        
    cols_to_remove = removals[table_name]
    
    # parse columns
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
    
    if len(cols) != len(values):
        print(f'Length mismatch in {table_name}: {len(cols)} cols vs {len(values)} vals')
        return match.group(0)
    
    new_cols = []
    new_vals = []
    for c_clean, c_raw, v in zip(cols_clean, cols, values):
        if c_clean not in cols_to_remove:
            new_cols.append(c_raw)
            new_vals.append(v)
            
    return f"INSERT [dbo].[{table_name}] ({', '.join(new_cols)}) VALUES ({', '.join(new_vals)})"

pattern = re.compile(r'INSERT \[dbo\]\.\[(\w+)\] \((.*?)\) VALUES \((.*)\)')

new_lines = []
for line in content.splitlines():
    if 'INSERT [dbo].[roles]' in line or 'SET IDENTITY_INSERT [dbo].[roles]' in line:
        continue
    if 'INSERT [dbo].[system_configs]' in line or 'SET IDENTITY_INSERT [dbo].[system_configs]' in line:
        continue
    if 'INSERT [dbo].[backup_logs]' in line or 'SET IDENTITY_INSERT [dbo].[backup_logs]' in line:
        continue
    if 'INSERT [dbo].[glasses_orders]' in line or 'SET IDENTITY_INSERT [dbo].[glasses_orders]' in line:
        continue
    if 'INSERT [dbo].[refresh_tokens]' in line or 'SET IDENTITY_INSERT [dbo].[refresh_tokens]' in line:
        continue
    if 'INSERT [dbo].[password_reset_tokens]' in line or 'SET IDENTITY_INSERT [dbo].[password_reset_tokens]' in line:
        continue
        
    new_line = pattern.sub(remove_columns_from_insert, line)
    new_lines.append(new_line)

with open(output_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print('Done generating ' + output_file)
