import json

# load json
with open('card3start.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Replace '\u001f' in the 'flds' field with --- (for parsing in csv later)
for entry in data:
    if 'flds' in entry:
        entry['flds'] = entry['flds'].replace('\u001f', '---')

# save the modified JSON
with open('cards3end.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print("Preprocessing complete! Saved as 'output.json'.")