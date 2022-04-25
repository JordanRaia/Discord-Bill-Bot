//discord bot
import Discord, { Intents } from 'discord.js'

//webscraping website
import puppeteer from 'puppeteer';

//passwords and usernames
import dotenv from 'dotenv';
dotenv.config();    

/**
 * Uses bot to print balance owned
 * 
 * @param balance - balance that is owned 
 */
function discordBot(balance){
    


  const client = new Discord.Client({
    intents: 
    [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES
    ]
  });

  // Register an event so that when the bot is ready, it will log a messsage to the terminal
  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
  
   //gets times
   var d = new Date();
   //minutes
   var m = d.getMinutes();
   //hours
   var h = d.getHours();
   //seconds
   var s = d.getSeconds();
   console.log(h + " : " + m + " : " + s);
   
   if(h == "23" && m == "17" ){
     // message.reply("Pay me: " + balance);
     const channel = client.channels.cache.get('966961832566882344');
     channel.send("Pay me: " + balance);
   }  
  
  })
  
  // Register an event to handle incoming messages
  client.on('messageCreate', (message) => {

    //console.log(m + " : " + h )
    // When we ask rent print message
    if(message.content.startsWith("rent")) {
      message.reply("Pay me: " + balance);
    }
  })

    // client.login logs the bot in and sets it up for use. You'll enter your token here.
    client.login(process.env.TOKEN);

};



async function rent() {
  
  //for debugging shows browser when false
  const browser = await puppeteer.launch({headless: true});
  
  const page = await browser.newPage();
  await page.goto("https://hunterstarproperties.securecafe.com/residentservices/hunter-star-properties/userlogin.aspx");

  //signs into rent website
  // # = id
  await page.waitForSelector("#Username");
  await page.type("#Username", process.env.HUNTERU);
  await page.type("#Password", process.env.HUNTERP);
  await page.click("#SignIn");
  
  //gets balance we need to pay
  const xpath = "/html/body/div[1]/div/section/div/div/div/div[3]/div/div/div/div[1]/form/div[2]/div/div[1]/div/div/div[1]/div[1]/h2/b";
  await page.waitForXPath(xpath);
  const [element] = await page.$x(xpath);
  const text = await element.getProperty('textContent');
  const balance = await text.jsonValue();
  
  discordBot(balance);
  
  //used for debugging
  //console.log(balance);

};

rent();







