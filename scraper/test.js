import cliProgress from 'cli-progress';
// create new progress bar
// const b1 = new cliProgress.SingleBar({
//   format: 'Scraping Item {bar} {value}/{total} {percentage}%',
//   barCompleteChar: '\u2588',
//   barIncompleteChar: '\u2591',
//   hideCursor: true,
// })
// // initialize the bar - defining payload token "speed" with the default value "N/A"
// b1.start(10000, 0)
// // update values
// // b1.increment()
// // b1.update(20)
// // stop the bar
// b1.stop()
// create new container
const multiBar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: '{message} {bar} {value}/{total} {percentage}%',
}, cliProgress.Presets.shades_grey);
// add bars
const b1 = multiBar.create(200, 0);
const b2 = multiBar.create(1000, 0);
// control bars
b1.increment();
b2.update(20, { message: 'Scraping Items' });
b1.update(20, { message: 'Proxies Left  ' });
// stop all bars
multiBar.stop();
