const puppeteer = require('puppeteer');
const fs = require('fs');

async function convertAnsiToPng(ansiFile, pngFile) {
    const ansiText = fs.readFileSync(ansiFile, 'utf8');
    const escapedAnsi = ansiText
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\r\\n');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
        <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
        <style>
            body { margin: 0; padding: 20px; background-color: #1e1e1e; }
            #terminal { width: 100%; height: 100%; }
        </style>
    </head>
    <body>
        <div id="terminal"></div>
        <script>
            const term = new Terminal({
                theme: { background: '#1e1e1e' },
                cols: 100,
                rows: 30,
                fontFamily: 'monospace',
                fontSize: 14,
                convertEol: true
            });
            term.open(document.getElementById('terminal'));
            term.write('${escapedAnsi}');
        </script>
    </body>
    </html>
    `;

    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 900, height: 600, deviceScaleFactor: 2 });
        await page.setContent(html, { waitUntil: 'networkidle0' });

        await new Promise(r => setTimeout(r, 1000));

        const element = await page.$('.xterm-screen');
        await element.screenshot({ path: pngFile });

        await browser.close();
    } catch(e) {
        process.exit(1);
    }
}

const ansiFile = process.argv[2];
const pngFile = process.argv[3];
convertAnsiToPng(ansiFile, pngFile).catch(e => {
    process.exit(1);
});
