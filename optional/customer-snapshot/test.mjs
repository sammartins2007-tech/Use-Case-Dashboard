import fs from "node:fs";
const cap=await import("/opt/workspace-config/.github/gated-skills/app-generation/references/visual-qa/capture.mjs");
const {chromium}=cap.resolvePlaywright();
const exe="/opt/docgen-browsers/chromium-1208/chrome-linux64/chrome";
const b=await chromium.launch({headless:true,executablePath:fs.existsSync(exe)?exe:undefined});
const p=await b.newPage({viewport:{width:1440,height:900}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push("C "+m.text().slice(0,200))});
const base="file:///mnt/workspace/working/static-kit/out/Customer-AI-Use-Cases.html";
const routes=["/","/customer/Contoso","/customer/Contoso/portfolio","/customer/Contoso/roadmap","/customer/Contoso/wave/W1","/customer/Contoso/wave/W2","/use-case/130","/use-case/1","/use-case/130/solution","/use-case/1/solution","/use-case/200/solution","/finops","/method"];
const out=[];
for(const [i,r] of routes.entries()){const n=errs.length;await p.goto(base+"#"+r);await p.waitForTimeout(i===0?5000:2500);
 const t=await p.evaluate(()=>document.body.innerText.slice(0,160).replace(/\s+/g," "));
 const crash=/Something went wrong|could not be shown/.test(await p.evaluate(()=>document.body.innerText));
 await p.screenshot({path:`/tmp/static/s${i}.png`}); out.push({r,crash,err:errs.slice(n),t:t.slice(0,90)});}
// interactions
await p.goto(base+"#/use-case/130/solution");await p.waitForTimeout(2500);
for(const name of ["Sources, schedule, register, channel","Data","Decisions & requirements"]){try{await p.getByRole("tab",{name}).first().click({timeout:4000});await p.waitForTimeout(800)}catch(e){out.push({click:name,fail:e.message.split("\n")[0]})}}
await p.screenshot({path:"/tmp/static/sx.png"});
try{await p.getByRole("button",{name:"Search use cases by title or reference"}).click({timeout:3000});await p.keyboard.type("lead");await p.waitForTimeout(800);await p.screenshot({path:"/tmp/static/ss.png"});}catch(e){out.push({search:e.message.split("\n")[0]})}
console.log(JSON.stringify({out,errs:errs.slice(0,10)},null,1));await b.close();
