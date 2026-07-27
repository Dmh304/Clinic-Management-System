import sys
import re
import io

correct_order = [
    'users',
    'service_categories',
    'services',
    'rooms',
    'medicines',
    'staffs',
    'doctors',
    'lab_technicians',
    'patients',
    'service_registrations',
    'patient_service_subscriptions',
    'appointments',
    'doctor_schedules',
    'medical_records',
    'lab_orders',
    'lab_results',
    'feedbacks',
    'invoices',
    'invoice_details',
    'care_sessions',
    'eyeglass_prescriptions',
    'prescriptions',
    'prescription_items',
    'blog_posts',
    'audit_logs',
    'verification_tokens',
    'notifications'
]

input_file = 'data_seed_sum_final.sql'
with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

table_blocks = {t: [] for t in correct_order}
current_table = None

for line in content.splitlines():
    match = re.search(r'\[dbo\]\.\[(.*?)\]', line)
    if match:
        t = match.group(1)
        if t in correct_order:
            current_table = t
        else:
            print(f"Warning: Unknown table {t}")
            
    if current_table:
        table_blocks[current_table].append(line)
    elif line.strip() != '' and not line.startswith('--'):
        # Just in case there are lines before any table is detected
        print(f"Orphan line: {line}")

# Reassemble
new_content = []
for t in correct_order:
    if table_blocks[t]:
        new_content.append('\n'.join(table_blocks[t]))

with open(input_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_content) + '\n')

print("Reordering complete.")
