import * as cheerio from 'cheerio'
import { timeConverter } from './tools.js'
import { Categories } from './types.js'

const extractInfo = (htmlString: string) => {
  const startTime = Date.now()
  console.log('Scraping categories... ')

  const $ = cheerio.load(htmlString)
  const categoryList = $('main .categories > ul')

  let categories: Categories = {}

  categoryList.find('li').each((i, el) => {
    const li = $(el)
    const id = li
      .find('a')
      .attr('href')
      ?.match(/cat=\d+/)?.[0]
      .replace('cat=', '')
    const name = li.find('a').text()

    if (!id) return

    categories[id] = {
      id: parseInt(id),
      name,
    }
  })

  const endTime = Date.now()
  console.log(`Scraped categories in ${timeConverter(startTime, endTime)}`)

  return categories
}

export const categories = await fetch(`https://secure.runescape.com/m=itemdb_rs/catalogue`)
  .then((resp) => resp.text())
  .then(extractInfo)
