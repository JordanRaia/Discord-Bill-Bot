import DiscordJS, { Intents } from "discord.js";
import dotenv from "dotenv";
import schedule from "node-schedule";
import puppeteer from "puppeteer";
import fs from "fs";

var rent = fs.readFileSync("billTxt/rent.txt", "utf8");
var electric = fs.readFileSync("billTxt/electric.txt", "utf8");
var gas = fs.readFileSync("billTxt/gas.txt", "utf8");
var water = fs.readFileSync("billTxt/water.txt", "utf8");

const months = [
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    "January",
];

dotenv.config();

function sleep(num) {
    let now = new Date();
    const stop = now.getTime() + num;
    while (true) {
        now = new Date();
        if (now.getTime() > stop) return;
    }
}

const client = new DiscordJS.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

async function scrapeHunter() {
    const browser = await puppeteer.launch({ headerless: true });
    const page = await browser.newPage();

    await page.goto(
        "https://hunterstarproperties.securecafe.com/residentservices/hunter-star-properties/userlogin.aspx"
    );

    await page.waitForSelector("#Username");
    await page.type("#Username", process.env.HUNTERU);
    await page.type("#Password", process.env.HUNTERP);

    await page.click("#SignIn");

    // Get cookies
    const cookies = await page.cookies();

    var rentCase = true;
    var waterCase = true;

    try {
        //try get rent
        await page.waitForXPath(
            "/html/body/div[1]/div/section/div/div/div/div[3]/div/div/div/div[1]/form/div[2]/div/div[1]/div/div/div[1]/div[2]/table/tbody/tr[1]/td[2]/span"
        );
    } catch {
        console.log("Rent Bill failed to load");
        rentCase = false;
    }

    if (rentCase) {
        //if there's a rent bill
        const [rel] = await page.$x(
            "/html/body/div[1]/div/section/div/div/div/div[3]/div/div/div/div[1]/form/div[2]/div/div[1]/div/div/div[1]/div[2]/table/tbody/tr[1]/td[2]/span"
        );
        const txt = await rel.getProperty("textContent");
        const rentTxt = await txt.jsonValue();
        rent = rentTxt;
    }

    try {
        //try to get water
        await page.waitForXPath(
            "/html/body/div[1]/div/section/div/div/div/div[3]/div/div/div/div[1]/form/div[2]/div/div[1]/div/div/div[1]/div[2]/table/tbody/tr[2]/td[2]/span"
        );
    } catch {
        console.log("Water Bill failed to load");
        waterCase = false;
    }

    if (waterCase) {
        //if there's a water bill
        const [wel] = await page.$x(
            "/html/body/div[1]/div/section/div/div/div/div[3]/div/div/div/div[1]/form/div[2]/div/div[1]/div/div/div[1]/div[2]/table/tbody/tr[2]/td[2]/span"
        );
        const txt = await wel.getProperty("textContent");
        const waterTxt = await txt.jsonValue();
        water = waterTxt;
    }

    await browser.close(); //close browser

    console.log("Hunter Star Bills are Ready", rent, water);
}

async function scrapeElectric() {
    const browser = await puppeteer.launch({ headerless: true });
    const page = await browser.newPage();
    await page.goto("https://www.comed.com/login"); //go to url

    // Login
    sleep(3000); //wait 3 seconds
    await page.waitForSelector("#signInName"); //wait for username to be selectable
    await page.type("#signInName", process.env.COMUSER); //type username
    await page.type("#password", process.env.COMPASS); //type password
    await page.click("#next"); //click sign in

    // Get cookies
    const cookies = await page.cookies();

    var xpath =
        "/html/body/app-root/app-dashboard/main/article/section/div/div[2]/app-card-common[1]/section/div/div/app-bill-due/article/section/div[3]/div[1]/span";

    try {
        await page.waitForXPath(xpath);
    } catch {
        xpath =
            "/html/body/app-root/app-dashboard/main/article/section/div/div[2]/app-card-common[1]/section/div/div/app-bill-due/article/section/div[4]/div[1]/span";
        try {
            await page.waitForXPath(xpath);
        } catch {
            await browser.close();
            console.log("Electric Bill failed to load");
            return;
        }
    }

    const [el] = await page.$x(xpath);
    const txt = await el.getProperty("textContent");
    const rawTxt = await txt.jsonValue();

    electric = rawTxt;

    await browser.close();

    console.log("Electric Bill is Ready", electric);
}

async function scrapeGas() {
    const browser = await puppeteer.launch({ headerless: true });
    const page = await browser.newPage();
    await page.goto(
        "https://customerportal.southerncompany.com/User/Login?LDC=7"
    ); //go to url

    // Login
    sleep(3000); //wait 3 seconds
    await page.waitForSelector("#username"); //wait for username to be selectable
    await page.type("#username", process.env.NICORUSER); //type username
    await page.type("#inputPassword", process.env.NICORPASS); //type password
    await page.click("#loginbtn"); //click sign in

    try {
        await page.waitForXPath(
            '//*[@id="container"]/div[2]/div[2]/form/div[4]/div/div[1]/div/div[5]'
        );
    } catch {
        console.log("Gas Bill failed to load");
        await browser.close();
        return;
    }

    // Get cookies
    const cookies = await page.cookies();

    const [el] = await page.$x(
        '//*[@id="container"]/div[2]/div[2]/form/div[4]/div/div[1]/div/div[5]'
    );
    const txt = await el.getProperty("textContent");
    const rawTxt = await txt.jsonValue();

    gas = rawTxt;

    await browser.close();

    console.log("Gas Bill is Ready", gas);
}

function checkZero() {
    if (electric === "$0.00") {
        electric = "TBA";
    }
    if (gas === "$0.00") {
        gas = "TBA";
    }
    if (rent === "$0.00") {
        rent = "TBA";
    }
    if (water === "$0.00") {
        water = "TBA";
    }
}

async function task() {
    var today = new Date();
    var date =
        today.getFullYear() +
        "-" +
        (today.getMonth() + 1) +
        "-" +
        today.getDate();

    console.log("Bill Bot is Starting...", date);
    const channel = client.channels.cache.get("808532247425712157"); //channel to send messages too

    let d = new Date();
    let day = d.getDate();
    let month = months[d.getMonth()];
    if (day === 2) {
        channel.send("For " + month + " 1st");
        channel.send("----------------------");
        channel.send("Internet: $59.90");
    }
    await scrapeElectric();
    await scrapeHunter();
    await scrapeGas();

    //if balance of $0.00
    checkZero();

    const rentData = fs.readFileSync("billTxt/rent.txt", "utf8");
    const electricData = fs.readFileSync("billTxt/electric.txt", "utf8");
    const gasData = fs.readFileSync("billTxt/gas.txt", "utf8");
    const waterData = fs.readFileSync("billTxt/water.txt", "utf8");

    //check if balance is identical to previous check, if not print
    if (rentData != rent) {
        if (rent != "TBA") {
            channel.send("rent: $353.34");
        }
        fs.writeFileSync("billTxt/rent.txt", rent);
        console.log("New Rent Balance");
    }
    if (electricData != electric) {
        if (electric != "TBA") {
            channel.send("electric: " + electric);
        }
        fs.writeFileSync("billTxt/electric.txt", electric);
        console.log("New Electric Balance");
    }
    if (gasData != gas) {
        if (gas != "TBA") {
            channel.send("gas: " + gas);
        }
        fs.writeFileSync("billTxt/gas.txt", gas);
        console.log("New Gas Balance");
    }
    if (waterData != water) {
        if (water != "TBA") {
            channel.send("water: " + water);
        }
        fs.writeFileSync("billTxt/water.txt", water);
        console.log("New Water Balance");
    }

    console.log("Bill Bot is Finished!", date);
}

client.on("ready", async () => {
    task();
    schedule.scheduleJob("0 0 * * *", async () => {
        task();
    });
});

client.on("messageCreate", async (message) => {
    if (message.content === "!bills") {
        message.reply({
            content:
                "internet: $59.90\nrent: " +
                rent +
                "\nelectric: " +
                electric +
                "\ngas: " +
                gas +
                "\nwater: " +
                water,
        });
    }
    if (message.content === "!internet") {
        message.reply({
            content: "Internet: $59.90",
        });
    }
    if (message.content === "!gas") {
        message.reply({
            content: "gas: " + gas,
        });
    }
    if (message.content === "!electric") {
        message.reply({
            content: "electric: " + electric,
        });
    }
    if (message.content === "!rent") {
        message.reply({
            content: "rent: " + rent,
        });
    }
    if (message.content === "!water") {
        message.reply({
            content: "water: " + water,
        });
    }
});

client.login(process.env.TOKEN);
