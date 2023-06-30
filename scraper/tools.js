import fs from 'fs';
import nodeFetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import cliProgress from 'cli-progress';
import { getWorkingProxies } from './getProxies.js';
export const timeConverter = (startTime, endTime) => {
    const time = endTime - startTime;
    const milliseconds = time % 1000;
    const seconds = Math.floor(time / 1000) % 60;
    const minutes = Math.floor(time / (1000 * 60)) % 60;
    const hours = Math.floor(time / (1000 * 60 * 60)) % 24;
    return (`${hours ? `${hours} hours ` : ''}` +
        `${minutes ? `${minutes} minutes ` : ''}` +
        `${seconds ? `${seconds} seconds ` : ''}` +
        `${milliseconds ? `${milliseconds} milliseconds` : ''}`);
};
export const readFile = (fileName) => {
    return fs.existsSync(`./data/${fileName}.json`) ? JSON.parse(fs.readFileSync(`./data/${fileName}.json`, 'utf8')) : {};
};
export const writeFile = (fileName, data) => {
    if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data');
    }
    fs.writeFileSync(`./data/${fileName}.json`, JSON.stringify(data, undefined, 1));
};
export const fetchWithProxy = async (url, proxy, itemId) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, 3 * 60 * 1000);
    try {
        const proxyUrl = `http://${proxy.host}:${proxy.port}`;
        const proxyAgent = new HttpsProxyAgent(proxyUrl);
        return await nodeFetch(url, {
            agent: proxyAgent,
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'accept-language': 'en-US',
                'accept-encoding': 'gzip, deflate, br',
                accept: 'text/html',
                referer: 'https://www.google.com/',
            },
        })
            .then((response) => response
            .text()
            .then((text) => ({ text, proxy, status: 'success', itemId }))
            .catch(() => ({ proxy, status: 'failed' })))
            .catch(() => ({ proxy, status: 'failed' }))
            .finally(() => {
            clearTimeout(timeout);
        });
    }
    catch (e) {
        return { proxy, status: 'failed' };
    }
};
export const waitForAnyResponse = async (promises) => {
    return new Promise((resolve, reject) => {
        promises.forEach((promise, i) => {
            promise.then(() => resolve(i)).catch(() => reject(i));
        });
    });
};
// const successRate = (successCount: number, failureCount: number) => {
//   const total = successCount + failureCount
//   return Number(((successCount / total) * 100).toFixed(2))
// }
// export const calculateSuccessRate = (callResults: boolean[]): number => {
//   const successCount = callResults.filter((result) => result).length
//   const failureCount = callResults.length - successCount
//   return successRate(successCount, failureCount)
// }
// export const addPriceInfo = (tradeData: TradeData, id: number) => {
//   if (!fs.existsSync('./data')) {
//     fs.mkdirSync('./data')
//   }
//   if (!fs.existsSync('./data/prices')) {
//     fs.mkdirSync('./data/prices')
//   }
//   let tradeDataMin: {
//     [key: string]: {
//       c: number
//       a: number
//       t: number
//     }
//   } = fs.existsSync(`./data/prices/${id}.json`) ? JSON.parse(fs.readFileSync(`./data/prices/${id}.json`, 'utf8')) : {}
//   for (const date in tradeData) {
//     tradeDataMin[date] = {
//       c: tradeData[date].current,
//       a: tradeData[date].average,
//       t: tradeData[date].traded,
//     }
//   }
//   const sortedKeys = Object.keys(tradeDataMin).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
//   const sortedTradeDataMin: typeof tradeDataMin = {}
//   sortedKeys.forEach((key) => {
//     sortedTradeDataMin[key] = tradeDataMin[key]
//   })
//   fs.writeFileSync(`./data/prices/${id}.json`, JSON.stringify(sortedTradeDataMin))
// }
export class PriceScrapingTools {
    constructor(proxies, items, maxRequests) {
        this.proxies = proxies;
        this.items = new Map(Object.entries(items));
        this.maxRequests = maxRequests;
        this.totalNumberOfItems = Object.keys(items).length;
        this.totalNumberOfProxies = proxies.length;
        this.initializeBars();
    }
    proxies;
    items;
    maxRequests;
    totalNumberOfItems;
    totalNumberOfProxies;
    activeRequests = [];
    successFailList = [];
    waitForAnyResponse = async (promises) => {
        return new Promise((resolve, reject) => {
            promises.forEach((promise, i) => {
                promise.then(() => resolve(i)).catch(() => reject(i));
            });
        });
    };
    readFile = (fileName) => {
        return fs.existsSync(`./data/prices/${fileName}.json`)
            ? JSON.parse(fs.readFileSync(`./data/prices/${fileName}.json`, 'utf8'))
            : {};
    };
    writeFile = (fileName, data) => {
        if (!fs.existsSync('./data/prices'))
            fs.mkdirSync('./data/prices');
        fs.writeFileSync(`./data/prices/${fileName}.json`, JSON.stringify(data));
    };
    /**
     * Did request fail or succeed used to show percentage
     */
    addRequestStatus(status) {
        this.successFailList.push(status);
        if (this.successFailList.length > 1000)
            this.successFailList.shift();
    }
    /**
     ** Add new promise if max number of requests is reached
     ** wait for any request to finish before adding new one
     */
    async addPromise(promise) {
        if (this.activeRequests.length >= this.maxRequests) {
            const index = await this.waitForAnyResponse(this.activeRequests);
            this.activeRequests = this.activeRequests.filter((_, i) => i !== index);
        }
        this.activeRequests.push(promise);
    }
    async getRandomProxy() {
        if (this.proxies.length < 20) {
            this.proxies = await getWorkingProxies();
        }
        const randomIndex = Math.floor(Math.random() * this.proxies.length);
        const randomProxy = this.proxies[randomIndex];
        const successCount = randomProxy.successCount;
        const failedCount = randomProxy.failedCount;
        const total = successCount + failedCount;
        const successPercentage = successCount / (successCount + failedCount);
        if (total < 10)
            return randomProxy;
        if (successPercentage > 0.1)
            return randomProxy;
        this.proxies.slice(randomIndex, 1);
        return this.getRandomProxy();
    }
    getItem() {
        const [key, item] = this.items.entries().next().value;
        this.items.delete(key);
        this.items.set(key, item);
        return [key, item];
    }
    handleSuccessfulRequest(itemId, newTradeData, proxyIndex) {
        this.items.delete(String(itemId));
        const updatedTradeData = Object.assign(this.readFile(itemId), newTradeData);
        const sortedKeys = Object.keys(updatedTradeData).sort((a, b) => {
            return new Date(a).getTime() - new Date(b).getTime();
        });
        const sortedTradeData = {};
        sortedKeys.forEach((key) => {
            sortedTradeData[key] = {
                c: updatedTradeData[key].current || updatedTradeData[key].c,
                a: updatedTradeData[key].average || updatedTradeData[key].a,
                t: updatedTradeData[key].traded || updatedTradeData[key].t,
            };
        });
        this.writeFile(itemId, sortedTradeData);
        this.proxies[proxyIndex].successCount++;
        this.addRequestStatus(true);
        const successCount = this.successFailList.filter((result) => result).length;
        const failureCount = this.successFailList.length - successCount;
        this.itemBar?.update(this.totalNumberOfItems - this.items.size, {
            secondNumber: ((successCount / (successCount + failureCount)) * 100).toFixed(2) + '%',
        });
    }
    handleFailedRequest(proxyIndex, removeProxy) {
        if (removeProxy) {
            this.proxies[proxyIndex].failedCount += 1000;
        }
        else {
            this.proxies[proxyIndex].failedCount++;
        }
        this.addRequestStatus(false);
        const aliveProxyNumber = this.proxies.filter((proxy) => {
            const total = proxy.successCount + proxy.failedCount;
            const successPercentage = proxy.successCount / (proxy.successCount + proxy.failedCount);
            if (total < 10)
                return true;
            if (successPercentage > 0.1)
                return true;
            return false;
        }).length;
        this.proxyBar?.update(this.totalNumberOfProxies - aliveProxyNumber, {
            secondNumber: aliveProxyNumber,
        });
    }
    //
    // from here on out its just for logging
    //
    progressBars = null;
    itemBar = null;
    proxyBar = null;
    initializeBars() {
        this.progressBars = new cliProgress.MultiBar({
            clearOnComplete: false,
            hideCursor: true,
            format: '{message} {bar} {value}/{total} {percentage}% || {secondMessage} {secondNumber}',
        }, cliProgress.Presets.shades_grey);
        this.itemBar = this.progressBars.create(this.totalNumberOfItems, 0, {
            message: 'Scraping Items',
            secondMessage: 'Success Rate:',
            secondNumber: '100',
        });
        this.proxyBar = this.progressBars.create(this.totalNumberOfProxies, 0, {
            message: 'Proxies Killed',
            secondMessage: 'Proxies Alive:',
            secondNumber: this.totalNumberOfProxies,
        });
    }
    stopProgressBars() {
        this.progressBars?.stop();
    }
}
