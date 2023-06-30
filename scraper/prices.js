import { PriceScrapingTools, fetchWithProxy, readFile, timeConverter } from './tools.js';
import { getWorkingProxies } from './getProxies.js';
const startTime = Date.now();
const extractTradeData = (htmlString, itemId) => {
    const rawTradeData = htmlString
        .match(/<script>[\s\S]+?<\/script>/g)
        ?.find((s) => s.indexOf('average') !== -1 || s.indexOf('trade') !== -1)
        ?.match(/(average|trade).+]\)/g);
    if (!rawTradeData) {
        // writeFileSync(`error${Math.random()}.html`, htmlString)
        return {};
    }
    let newTradeData = {};
    let i = 0;
    let string = '';
    let type = undefined;
    let date = undefined;
    for (; i < rawTradeData.length; i++) {
        string = rawTradeData[i];
        type = string.match(/average|trade/)?.[0];
        date = string.match(/\d{4}\/\d{2}\/\d{2}/)?.[0];
        if (type === undefined || date === undefined)
            continue;
        if (newTradeData[date] === undefined)
            newTradeData[date] = {};
        if (type === 'average') {
            const average = string.match(/, -?\d+/g);
            if (!average)
                continue;
            newTradeData[date].current = parseInt(average[0].replace(', ', ''));
            newTradeData[date].average = parseInt(average[1].replace(', ', ''));
        }
        else {
            const traded = string.match(/, \d+/g);
            if (!traded)
                continue;
            // 29492 is a special item that has no trade volume
            if (itemId === 29492) {
                newTradeData[date].traded = 0;
            }
            else {
                newTradeData[date].traded = parseInt(traded[0].replace(', ', ''));
            }
        }
    }
    return newTradeData;
};
const botMessage = 'Please complete the security check to continue. This step helps us keep your account secure.';
const blockedMessage = `As a result, your IP address has been temporarily blocked. Please try again later.`;
/**
 ** Checks if IP was restricted from accessing the page
 ** Because of too many requests
 */
const isRestricted = (htmlString) => {
    if (htmlString.includes(blockedMessage))
        return 'blocked';
    if (htmlString.includes(botMessage))
        return 'bot';
    return false;
};
export async function getItemPrices(queueData) {
    const pst = typeof queueData === 'function'
        ? queueData
        : new PriceScrapingTools(await getWorkingProxies(), queueData, 200);
    while (pst.items.size > 0) {
        const [itemId, item] = pst.getItem();
        const url = `https://secure.runescape.com/m=itemdb_rs/viewitem?obj=${itemId}`;
        const proxy = await pst.getRandomProxy();
        const promise = fetchWithProxy(url, proxy, item.id);
        await pst.addPromise(promise);
        promise.then(async (response) => {
            if (response.status === 'failed') {
                // failed to connecting to proxy
                pst.handleFailedRequest(response.proxy.index, false);
                return;
            }
            if (isRestricted(response.text) === 'bot') {
                // proxy is detected as bot kill it
                pst.handleFailedRequest(response.proxy.index, true);
                return;
            }
            if (isRestricted(response.text) === 'blocked') {
                // to many requests
                pst.handleFailedRequest(response.proxy.index, false);
                return;
            }
            const data = extractTradeData(response.text, item.id);
            // make sure we actually got data
            if (Object.keys(data).length === 0) {
                pst.handleFailedRequest(response.proxy.index, false);
                return;
            }
            pst.handleSuccessfulRequest(Number(itemId), data, response.proxy.index);
        });
    }
    await Promise.all(pst.activeRequests);
    // console.log(pst.items.size)
    // if (pst.items.size > 1) await fetchQueueWithRetry(pst)
    pst.stopProgressBars();
}
await getItemPrices(readFile('items'));
const endTime = Date.now();
console.log(`Scraped all item prices in ${timeConverter(startTime, endTime)}`);
console.log('Completed');
process.exit();
