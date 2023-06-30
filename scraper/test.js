import fs from 'fs';
const items = JSON.parse(fs.readFileSync(`./data/items.json`, 'utf8'));
const data = Object.values(items).map((item) => {
    return [item.id, item.name, item.memberItem];
});
fs.writeFileSync(`./data/searchData.json`, JSON.stringify(data));
