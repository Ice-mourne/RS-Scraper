import * as cheerio from 'cheerio';
import { categories } from './categories.js';
import { readFile, timeConverter, writeFile } from './tools.js';
let items = readFile('items');
const extractNumberOfPages = (htmlString) => {
    const $ = cheerio.load(htmlString);
    const pagesNumberString = $('main > .content .paging > ul > li:last-child > a').text();
    return parseInt(pagesNumberString);
};
const extractItems = (htmlString, category) => {
    const $ = cheerio.load(htmlString);
    const itemTable = $('main > .content > table > tbody');
    let items = {};
    itemTable.find('tr').each((i, el) => {
        const row = $(el);
        const id = row
            .find('td > a')
            .attr('href')
            ?.match(/obj=\d+/)?.[0]
            .replace('obj=', '');
        const name = row.find('td > a').attr('title') || row.find('td > a > span').text();
        const memberItem = row.find('td.memberItem').length > 0;
        if (!id)
            return;
        items[id] = {
            id: parseInt(id),
            name,
            memberItem,
            category,
        };
    });
    return items;
};
const startTime = Date.now();
for (const key in categories) {
    console.log(`Scraping ${categories[key].name}...`);
    const category = categories[key];
    const response = fetch(`https://secure.runescape.com/m=itemdb_rs/catalogue?cat=${category.id}&page=1`).then((resp) => resp.text());
    const numberOfPages = response.then(extractNumberOfPages);
    for (let i = 1; i < (await numberOfPages) + 1; i++) {
        console.log(`Scraping ${category.name} page ${i}...`);
        if (i === 1) {
            response
                .then((htmlString) => extractItems(htmlString, category.name))
                .then((itemsInCategory) => {
                items = Object.assign(items, itemsInCategory);
            });
        }
        else {
            await fetch(`https://secure.runescape.com/m=itemdb_rs/catalogue?cat=${category.id}&page=${i}`)
                .then((resp) => resp.text())
                .then((htmlString) => extractItems(htmlString, category.name))
                .then((itemsInCategory) => {
                items = Object.assign(items, itemsInCategory);
            });
        }
    }
}
const endTime = Date.now();
writeFile('items', items);
console.log(`Scraped all item categories in ${timeConverter(startTime, endTime)}`);
console.log('Completed');
