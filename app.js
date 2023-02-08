import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeJsonFile } from 'write-json-file';
import sleep from 'sleep-promise';

const mainURL = 'https://wiki.multitheftauto.com';

// const text = '( element dgsElement, bool relative [, bool includeParent = false,  bool theOpt = false ] )';
// console.log(
//     text
//     .split('[')
//     .map(params => params
//       .replace(/[\(\)\[\]]/, '')
//       .split(',')
//       .map(s => s.trim())
//       .filter(s => s.length > 0)
//     )
// );

function getParams(syntax) {
    const params = /\(([^)]+)\)/.exec(syntax)?.[1].split(/\s*,\s*/)?.map(arg => arg.trim()) || [];
    return params;
}

async function init() {
    try {
        const { data } = await axios.get(mainURL + '/wiki/Template:DGSFUNCTIONS');
        const $ = cheerio.load(data);
        const functionList = $('.mw-parser-output>ul>li>a').get().map(el => ({
            name: $(el).text(),
            href: $(el).attr('href'),
            haveInfo: !$(el).hasClass('new')
        }));

        const functionsData = {};
        for (let i = 0; i < functionList.length; i++) {
            const { name, href, haveInfo } = functionList[i];
            if (!haveInfo) {
                console.log('Skipped fn', href, i+1 + '/' + functionList.length);
                continue;
            };
            console.log('Go to fn', mainURL + href, i+1 + '/' + functionList.length);
            const { data } = await axios.get(mainURL + href);
            const $ = cheerio.load(data);
            let info = $('h2:contains("Syntax")').prevAll('p').get().reverse().map(el => $(el).text().replaceAll('\n', '')).filter(text => text.length > 0).join(' ');
            if (info.length > 140) info = info.slice(0, 140).trim() + '...';
            const syntaxList = $('h2 + pre').get().map(el => ({
                isSyntax:  $(el).prev().text().trim() === 'Syntax',
                syntax: $(el).text(),
            })).filter(row => row.isSyntax);
            for (let i2 = 0; i2 < syntaxList.length; i2++) {
                const { syntax } = syntaxList[i2];
                let n  = '';
                if (i2 > 0) n = i2+1;
                const syntaxClear = syntax.trim().replace('\n', '');
                const params = getParams(syntaxClear);
                const paramsVSCode =  params.map((param, pi) => '${' + (pi+1) + ':' + param.trim() + '}');
                functionsData[name+n] = {
                    scope: 'lua',
                    prefix: name+n,
                    description: [info.trim().length > 0 ? info : 'No info', ' | URL: ' + mainURL + href],
                    body: name + '(' + paramsVSCode.join(', ') + ')'
                };
                console.log('Added', name+n);
            }
            await sleep(50);
        }
        await writeJsonFile('functions.json', functionsData);
        console.log('End');
    } catch (err) {
        console.error(err);
    }
}

init();