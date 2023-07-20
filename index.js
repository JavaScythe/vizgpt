const puppeteer = require('puppeteer');
const http = require('http');
const ws = require("ws");
const mode = process.argv[2];
const fs = require("fs");
const server = http.createServer( (req,res) => {
    res.writeHead(200, {
        "Content-type": "text/html"
    });
    res.end(fs.readFileSync(__dirname+"/index.html", "utf-8"));
});
let thinking = false;
function uid(){
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
let lastUid;
const wss = new ws.WebSocketServer({ server });
wss.on('connection', function connection(ws) {
    ws.on('error', console.error);
  
    ws.on('message', function message(data) {
        data = JSON.parse(data);
        if(data.type == "query"){
            if(thinking){
                return;
            }
            thinking = true;
            gptType(data.text).then((resp) => {
                console.log("REPS: "+resp.length);
                //parse out a message contained in %%'s
                let matches = resp.match(/%%([^%]+)%%/g);
                let img = null;
                if(matches != null){
                    let match = matches[0];
                    let text = match.substring(2, match.length-2);
                    console.log("TEXT: "+text);
                    pixType(text).then((resp) => {
                        console.log("REPS2 "+resp);
                        ws.send(JSON.stringify({type: "image", image: resp, uid: lastUid}));
                        thinking = false;
                    });
                }
                if(matches == null){
                    thinking = false;
                }
                lastUid = uid();
                resp = resp.replace(/%%([^%]+)%%/g, "");
                ws.send(JSON.stringify({type: "message", message: resp, uid: lastUid}));
            });
        }
    });
  
  });
server.listen(3000);
let gpt = null;
async function gptType(p){
    let pages = await browser.pages();
    await pages[1].bringToFront();
    await gpt.type('textarea[id="prompt-textarea"]', p);
    let buttonclass = "absolute p-1 rounded-md md:bottom-3 md:p-2 md:right-3 dark:hover:bg-gray-900 dark:disabled:hover:bg-transparent right-2 disabled:text-gray-400 enabled:bg-brand-purple text-white bottom-1.5 transition-colors disabled:opacity-40";
    await gpt.click('button[class="'+buttonclass+'"]');
    await gpt.evaluate(() => {
        Object.defineProperty(window.document,'hidden',{get:function(){return false;},configurable:true});
        Object.defineProperty(window.document,'visibilityState',{get:function(){return 'visible';},configurable:true});
        window.document.dispatchEvent(new Event('visibilitychange'));
    });
    let lastText = "";
    let lastTextCount = 0;
    pages = await browser.pages();
    await pages[1].bringToFront();
    while(1){
        if(lastTextCount > 2 && lastText.length > 1){
            return lastText;
        }
        await new Promise(r => setTimeout(r, 400));
        let text = await gpt.evaluate((respClass) => {
            let resp = document.getElementsByClassName("markdown prose w-full break-words dark:prose-invert light");
            if(resp.length > 0){
                return resp[resp.length-1].textContent;
            }
            return "";
        });
        if(text != lastText){
            lastText = text;
            lastTextCount = 0;
        }else{
            lastTextCount++;
        }
    }
}
let pix = null;
async function pixType(p){
    const pages = await browser.pages();
    await pages[0].bringToFront();
    let tin = "sc-jcMfQk sc-hiDMwi cmgyRx jHkUgj MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputMultiline MuiInputBase-inputAdornedEnd";
    //empty the textarea
    await pix.click('textarea[class="'+tin+'"]');
    await pix.keyboard.down('Control');
    await pix.keyboard.press('A');
    await pix.keyboard.up('Control');
    await pix.keyboard.press('Backspace');

    await pix.type('textarea[class="'+tin+'"]', p);
    let btnclass=  "sc-jSUZER XXuqd MuiButtonBase-root MuiButton-root MuiLoadingButton-root rounded-xl bg-purple-600 font-bold font-inria text-white MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge MuiButton-containedSizeLarge sc-ezOQGI fFiXHq MuiButton-root MuiLoadingButton-root rounded-xl bg-purple-600 font-bold font-inria text-white MuiButton-contained MuiButton-containedPrimary MuiButton-sizeLarge MuiButton-containedSizeLarge sc-bWOGAC dlEiBs w-full";
    await pix.click('button[class="'+btnclass+'"]');
    await new Promise(r => setTimeout(r, 1000));
    let imgClass = "bg-skeleton rounded-md z-10 relative";
    await pix.waitForSelector('img[class="'+imgClass+'"]');
    let img = await pix.evaluate(() => {
        let resp = document.getElementsByClassName("bg-skeleton rounded-md z-10 relative");
        if(resp.length > 0){
            return resp[resp.length-1].getAttribute("src");
        }
        return "";
    });
    return img;
}
let browser;
(async () => {
    browser = await puppeteer.launch({
        headless: false,
        executablePath: "/usr/bin/chromium",
        userDataDir: "/home/system/.config/chromium",
        args: [
            '--start-maximized',
        ]
    });
    const page2 = await browser.newPage();
    await page2.goto('https://pixai.art/submit/gen');
    let tin = "sc-jcMfQk sc-hiDMwi cmgyRx jHkUgj MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputMultiline MuiInputBase-inputAdornedEnd";
    await page2.waitForSelector('textarea[class="'+tin+'"]');
    let optClass = "sc-jSUZER XXuqd MuiButtonBase-root sc-ilhmMj eGJBRE MuiToggleButton-root MuiToggleButton-fullWidth MuiToggleButton-sizeMedium MuiToggleButton-standard MuiToggleButtonGroup-grouped MuiToggleButtonGroup-groupedHorizontal";
    await page2.click('button[class="'+optClass+'"]');
    let ratioClass = "sc-hlLBRy iwLVhe MuiSelect-select MuiSelect-outlined sc-jcMfQk sc-hiDMwi laKAFK cfWUNz MuiInputBase-input MuiOutlinedInput-input"
    await page2.waitForSelector('div[class="'+ratioClass+'"]');
    await page2.click('div[class="'+ratioClass+'"]');
    let opt2class = "sc-jSUZER XXuqd MuiButtonBase-root MuiMenuItem-root MuiMenuItem-gutters sc-eGJbfJ cTnYhb MuiMenuItem-root MuiMenuItem-gutters";
    //click first option in dropdown
    await page2.click('li[class="'+opt2class+'"][data-value="0"]');
    pix=page2;

    const page = await browser.newPage();
    await page.goto('https://chat.openai.com/');
    await page.waitForSelector('textarea[id="prompt-textarea"]');
    gpt=page;
    gptType("When you respond, include the SUBJECT in the context of this conversation, contained in percent signs, like this: %%a large forest%%. The contents of the %% will be removed, so DO NOT MAKE IT PART OF A SENTENCE. You MUST keep the description brief but juicy. You must ONLY include key words.").then((resp) => {
        console.log("Inital Prompt Complete");
    });
    
    /*
    gptType("Hey ChatGPT, how's it going?").then((resp) => {
        console.log("REPS: "+resp);
        gptType("This is a peak followup").then((resp) => {
            console.log("REPS2 "+resp);
        });
    });
    */
    const pages = await browser.pages();
    await pages[0].close();
    
    
})();
/*
pixType("Robot in a forest").then((resp) => {
        console.log(resp);
        gptType("This is a peak followup").then((resp) => {
            console.log("REPS2 "+resp);
        });
    });
    pixType("Robot in a forest").then((resp) => {
        console.log(resp);
    });
    gptType("Hey ChatGPT, how's it going?").then((resp) => {
        console.log(resp);
    });
*/