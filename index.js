const express = require('express')
const zhtok = require('chinese-tokenizer');
const _ = require('lodash');
const dictPath = process.env.DICT_PATH || "./cedict_ts.u8";
const tokenize = zhtok.loadFile(dictPath);
const cheerio = require('cheerio');

const app = express();
const port = 3005;

const css = `<style> 
    body {
        width: 80%;
        margin: auto;
    }
    div { margin: 12px 0; }
    table { font-size: 20px; }
    table td:first-child { min-width: 150px; }
    input { min-width: 80%; }
    td { min-width: 50px; }
    td p { margin: 0; }
    td span { margin-right: 1em; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    thead { background-color: #f2f2f2; }
</style>`;

const js = `<script>
function say(txt) {
    const synth = window.speechSynthesis;
    const utterThis = new SpeechSynthesisUtterance(txt);
    const zhVoices = synth.getVoices().filter(x=> x.lang == "zh-CN");
    if (zhVoices.length === 0) return;
    const voice = zhVoices[1 % zhVoices.length];
    utterThis.voice = voice;
    synth.speak(utterThis);
}
</script>`

const head = `<head><title>汉语 Freq</title>${css}${js}</head>`

const toRow = (groups) => {
    const len = groups.length;
    const item = groups[0];
    const matches = item.matches.map((x) => `<p><span>${x.pinyinPretty}</span><span>${x.english}</span></p>`).join("");
    return `<tr>
        <td>${item.simplified}</td>
        <td onClick='say("${item.simplified}")'>▶️</td>
        <td>${len}</td>
        <td>${matches}</td>
        </tr>`
    ;
};


const toTable = (text) => {
    const tokens = tokenize(text);
    const groups = _.groupBy(tokens, (x) => x.simplified);
    const inorder = _.orderBy(groups, [(x) => x.length], ['desc']);
    const notweird = inorder.filter((x) => x[0].matches.length > 0).filter((x) => x[0].simplified.charCodeAt(0) > 127);
    const rows = _.map(notweird, toRow).join("");
    const unique = notweird.length;
    return `<div>
        <p>Found ${unique} unique phrases.</p>
        <div>
            <table>
            <thead><tr><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7+</td></tr>
            <tbody><tr>
            <td>${notweird.filter((x) => x.length === 1).length}</td>
            <td>${notweird.filter((x) => x.length === 2).length}</td>
            <td>${notweird.filter((x) => x.length === 3).length}</td>
            <td>${notweird.filter((x) => x.length === 4).length}</td>
            <td>${notweird.filter((x) => x.length === 5).length}</td>
            <td>${notweird.filter((x) => x.length === 6).length}</td>
            <td>${notweird.filter((x) => x.length >= 7).length}</td>
            </tr></tbody>
            </table>
        </div>
        <table>
            <thead><tr><td>Char</td><td>Say</td><td>Freq</td><td>Definition</td></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
}

const formElement = `<div class="source-article">
        <form action="" method="get">
            <label htmlFor="">Enter text or URL</label>
            <input name="q" type="text"/>
        </form>
    </div>`;

app.get('/', async(req, res) => {
    const q = req.query.q;
    console.log("Got", q)
    if (q === undefined) {
        return res.send(`<html>${head}<h1>Frequency</h1>${formElement}</html>`);
    } 
    if (q.startsWith("http")) {
        const axios = require('axios');
        return await axios.get(q)
            .then((response) => response.data)
            .then((data) => {
                const $ = cheerio.load(data);
                const text = $('body').text();
                return res.send(`
                <html>
                ${head}
                <h1>Frequency</h1>
                ${formElement}
                <div>
                    <a href="${q}" target="_blank">Original Link: ${q}</a>
                </div>
                ${toTable(text)}
                </html>`);
            })
            .catch((e) => {
                console.log("Failed to parse", e);
                return res.send(`Failed to parse url: ${q}`);
            })
    } 
    return res.send(`<html>${head}<h1>Frequency</h1>${formElement}${toTable(q)}</html>`);
});

app.get('/test', (req, res) => {
    const output = toTable('我。我是中國人。');
    res.send(`<html>${head}${output}</html>`);
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
