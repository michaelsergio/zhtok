const express = require('express')
const zhtok = require('chinese-tokenizer');
const _ = require('lodash');
const tokenize = zhtok.loadFile('./cedict_ts.u8');
const cheerio = require('cheerio');

const app = express();
const port = 3005;

const css = `<style> 
    body {
        width: 80%;
        margin: auto;
    }
    table {
        font-size: 20px;
    }
    table td:first-child { min-width: 150px; }
    td { min-width: 80px; }
    td p { margin: 0; }
    td span { margin-right: 1em; }
    tr:nth-child(even) { background-color: #f2f2f2; }
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

const toRow = (groups) => {
    const len = groups.length;
    const item = groups[0];
    const matches = item.matches.map((x) => `<p><span>${x.pinyinPretty}</span><span>${x.english}</span></p>`).join("");
    return `<tr>
        <td onClick='say("${item.simplified}")'>${item.simplified}</td>
        <td>${len}</td>
        <td>${matches}</td>
        </tr>`
    ;
};


const toTable = (text) => {
    const tokens = tokenize(text);
    const groups = _.groupBy(tokens, (x) => x.simplified);
    const inorder = _.orderBy(groups, [(x) => x.length], ['desc']);
    // const notweird = inorder.filter((x) => x[0].simplified.charCodeAt(0) > 127).filter((x) => x[0].simplified.length < 10)
    const notweird = inorder.filter((x) => x[0].matches.length > 0).filter((x) => x[0].simplified.charCodeAt(0) > 127);
    const rows = _.map(notweird, toRow).join("");
    return `<table>
    <thead><tr><td>Char</td><td>Freq</td><td>Definition</td></tr></thead>
    <tbody>${rows}</tbody>
    </table>`;
}

const formPage = `<html>
        <form action="" method="get">
            <label htmlFor="">Enter text or URL</label>
            <input name="q" type="text"/>
        </form>
    </html>`;

app.get('/', async(req, res) => {
    const q = req.query.q;
    console.log("Got", q)
    if (q === undefined) {
        return res.send(formPage);
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
                ${js}
                ${css}
                <a href="${q}" target="_blank">Original Link: ${q}</a>
                ${toTable(text)}
                </html>`);
            })
            .catch((e) => {
                console.log("Failed to parse", e);
                return res.send(`Failed to parse url: ${q}`);
            })
    } 
    return res.send(`<html>${js}${css}${toTable(q)}</html>`);
});

app.get('/test', (req, res) => {
    const output = toTable('我。我是中國人。');
    res.send(`<html>${js}${css}${output}</html>`);
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
