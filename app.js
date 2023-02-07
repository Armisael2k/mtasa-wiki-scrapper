import puppeteer from 'puppeteer';
import { writeJsonFile } from 'write-json-file';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto('https://wiki.multitheftauto.com/wiki/Resource:DGS', { waitUntil: 'networkidle0' });
    await page.waitForSelector('li>a[title]', { timeout: 2000});
    const links = (await page.$$eval('li>a[title]', link => link.map(row => row.href))).filter(row => row.includes('Dgs') && !row.includes('-'));

    const log = [];
    const functions = {};
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        try {
            console.log('Go to', link, `${i+1}/${links.length}`);
            await page.goto(link, { waitUntil: 'networkidle0' });
            await page.waitForSelector('.mw-page-title-main', { timeout: 2000});
            await page.waitForSelector('h2 + pre', { timeout: 2000});
            const functionName = (await page.$eval('.mw-page-title-main', el => el.textContent)).trim();
            const syntax = await page.$$eval('h2 + pre', el => el.map(row => row.previousElementSibling.textContent == 'Syntax' ? { isFunction: true, syntax: row.textContent.trim() } : { isFunction: false } ));
            log.push({
                ...syntax,
                link: link,
            });
            if (syntax.length > 0) {
                for (let i2 = 0; i2 < syntax.length; i2++) {
                    const row = syntax[i2];
                    if (!row.isFunction) continue;
                    let n = "";
                    if (i2 > 0) n = (i2+1).toString();
                    console.log(functionName+n);
                    functions[functionName+n] = {
                        scope: "lua",
                        description: row.syntax,
                        prefix: functionName+n,
                        body: functionName
                    }
                }
            } else {
                console.log('Not a function');
            }
        } catch (err) {
            if (err.message.search('TimeoutError: Waiting for selector')){
                console.log('Not a function');
            } else {
                console.log(err);
            }
        }
    }
    browser.close();
    await writeJsonFile('log.json', log);
    await writeJsonFile('functions.json', functions);
    console.log('End');
})();