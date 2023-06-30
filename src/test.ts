import fs from 'fs'
import { Item } from './types.js'

const items = JSON.parse(fs.readFileSync(`./data/items.json`, 'utf8')) as { [key: string]: Item }

const data = Object.values(items).map((item) => {
  return [item.id, item.name, item.memberItem]
})

fs.writeFileSync(`./data/searchData.json`, JSON.stringify(data))
