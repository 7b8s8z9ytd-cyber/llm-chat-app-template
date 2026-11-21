// J.A.R.V.I.S interface controls and Cloudflare Workers AI connection
const chatMessages=document.getElementById("chat-messages");
const userInput=document.getElementById("user-input");
const sendButton=document.getElementById("send-button");
const typingIndicator=document.getElementById("typing-indicator");
const voiceButton=document.getElementById("voice-button");
const speakButton=document.getElementById("speak-button");
const coreStatus=document.getElementById("core-status");
const aiStatus=document.getElementById("ai-status");
const avatarStage=document.getElementById("avatar-stage");
const avatarLabel=document.getElementById("avatar-label");
function setAvatarState(state){
 if(!avatarStage)return;
 avatarStage.classList.remove("speaking","listening");
 if(state==="speaking"||state==="listening")avatarStage.classList.add(state);
 if(avatarLabel)avatarLabel.textContent=state==="speaking"?"J.A.R.V.I.S // SPEAKING":state==="listening"?"J.A.R.V.I.S // LISTENING":"STANDBY // HOLOGRAM STABLE";
}
const CHAT_STORAGE_KEY="jarvis-chat-history-v1";
const DEFAULT_GREETING={role:"assistant",content:"Good evening. J.A.R.V.I.S systems are online. How may I assist?"};
function loadSavedChat(){
 try{const saved=JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)||"[]");if(Array.isArray(saved)){const valid=saved.filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-24);if(valid.length)return valid;}}
 catch(error){console.warn("Local chat history unavailable",error);}
 return [DEFAULT_GREETING];
}
const chatHistory=loadSavedChat();
function saveChatHistory(){
 try{localStorage.setItem(CHAT_STORAGE_KEY,JSON.stringify(chatHistory.slice(-24)));}
 catch(error){const status=document.getElementById("memory-status");if(status)status.textContent="SESSION MEMORY // STORAGE UNAVAILABLE";}
}
let isProcessing=false;
let voiceOutput=true;
let recognition=null;
const diagnosticsButton=document.getElementById("diagnostics-button");
const diagnosticsResults=document.getElementById("diagnostics-results");
const diagStatus=document.getElementById("diag-status");
const diagSummary=document.getElementById("diag-summary");
function browserName(){
 const ua=navigator.userAgent;
 if(ua.includes("Edg/"))return "Microsoft Edge";
 if(ua.includes("Chrome/"))return "Chrome";
 if(ua.includes("Firefox/"))return "Firefox";
 if(ua.includes("Safari/"))return "Safari";
 return "Browser";
}
async function runDiagnostics(){
 if(diagnosticsButton)diagnosticsButton.disabled=true;
 if(diagStatus)diagStatus.textContent="CHECKING...";
 if(diagSummary)diagSummary.textContent="RUNNING SAFE, READ-ONLY TESTS";
 if(diagnosticsResults)diagnosticsResults.textContent="Checking browser, network and JARVIS connection...";
 const checks=[];
 checks.push(["Browser",browserName()]);
 checks.push(["Online status",navigator.onLine?"Online":"Offline"]);
 checks.push(["Screen",window.screen.width+" × "+window.screen.height]);
 checks.push(["CPU threads",navigator.hardwareConcurrency?navigator.hardwareConcurrency+" reported":"Not available"]);
 checks.push(["Memory estimate",navigator.deviceMemory?navigator.deviceMemory+" GB (browser estimate)":"Not exposed by browser"]);
 const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 checks.push(["Network type",connection?(connection.effectiveType||"Connected"):"Not exposed by browser"]);
 if(connection&&Number.isFinite(connection.rtt))checks.push(["Network RTT estimate",connection.rtt+" ms"]);
 try{
  const start=performance.now();
  const response=await fetch("/?jarvis-diagnostic="+Date.now(),{method:"GET",cache:"no-store"});
  const elapsed=Math.round(performance.now()-start);
  checks.push(["JARVIS server",response.ok?"Responding (HTTP "+response.status+")":"Returned HTTP "+response.status]);
  checks.push(["Server response time",elapsed+" ms"]);
 }catch(error){checks.push(["JARVIS server","Could not reach this site"]);}
 if(navigator.getBattery){
  try{const battery=await navigator.getBattery();checks.push(["Battery",Math.round(battery.level*100)+"%"+(battery.charging?" (charging)":"")]);}
  catch(error){checks.push(["Battery","API unavailable"]);}
 }else checks.push(["Battery","Not exposed by this browser"]);
 const issues=[];
 if(!navigator.onLine)issues.push("Chromebook reports that it is offline.");
 if(checks.some(item=>item[0]==="JARVIS server"&&item[1]==="Could not reach this site"))issues.push("JARVIS server could not be reached.");
 if(diagnosticsResults)diagnosticsResults.innerHTML=checks.map(item=>item[0]+": "+item[1]).join("<br>");
 if(diagStatus)diagStatus.textContent=issues.length?"CHECK COMPLETE — ISSUE FOUND":"CHECK COMPLETE";
 if(diagSummary)diagSummary.textContent=issues.length?issues.join(" "):"BROWSER AND CONNECTION CHECKS LOOK OK";
 if(diagnosticsButton)diagnosticsButton.disabled=false;
 return {checks,issues};
}
if(diagnosticsButton)diagnosticsButton.addEventListener("click",runDiagnostics);


function updateClock(){
 const now=new Date();
 document.getElementById("clock").textContent=now.toLocaleTimeString("en-IE",{hour12:false});
 document.getElementById("date").textContent=now.toLocaleDateString("en-IE",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase();
}
updateClock();setInterval(updateClock,1000);

userInput.addEventListener("input",function(){this.style.height="auto";this.style.height=this.scrollHeight+"px";});
userInput.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}});
sendButton.addEventListener("click",sendMessage);

speakButton.addEventListener("click",()=>{
 voiceOutput=!voiceOutput;
 speakButton.textContent=voiceOutput?"♫ VOICE OUTPUT: ON":"♫ VOICE OUTPUT: OFF";
 speakButton.classList.toggle("active",voiceOutput);
 if(!voiceOutput&&"speechSynthesis"in window)window.speechSynthesis.cancel();
});

const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SpeechRecognition){
 recognition=new SpeechRecognition();
 recognition.lang="en-IE";recognition.interimResults=false;recognition.maxAlternatives=1;
 recognition.onstart=()=>{voiceButton.classList.add("active");coreStatus.textContent="LISTENING...";setAvatarState("listening");};
 recognition.onend=()=>{voiceButton.classList.remove("active");if(!isProcessing)coreStatus.textContent="AWAITING INSTRUCTIONS";setAvatarState("idle");};
 recognition.onerror=()=>{coreStatus.textContent="VOICE INPUT UNAVAILABLE";};
 recognition.onresult=e=>{userInput.value=e.results[0][0].transcript;sendMessage();};
 voiceButton.addEventListener("click",()=>{try{recognition.start();}catch(e){coreStatus.textContent="VOICE INPUT ACTIVE";}});
}else{
 voiceButton.addEventListener("click",()=>{coreStatus.textContent="VOICE INPUT NOT SUPPORTED";});
 voiceButton.title="Speech recognition is not supported in this browser";
}

function addMessage(role,content){
 const el=document.createElement("div");
 el.className="message "+(role==="user"?"user-message":"assistant-message");
 el.textContent=content;
 chatMessages.appendChild(el);chatMessages.scrollTop=chatMessages.scrollHeight;
}
if(chatHistory.length>1){chatMessages.innerHTML="";chatHistory.forEach(message=>addMessage(message.role,message.content));}
saveChatHistory();
const newChatButton=document.getElementById("new-chat-button");
if(newChatButton)newChatButton.addEventListener("click",()=>{
 if(!confirm("Start a new JARVIS conversation? This clears the saved conversation on this browser."))return;
 chatHistory.splice(0,chatHistory.length,DEFAULT_GREETING);
 chatMessages.innerHTML="";addMessage("assistant",DEFAULT_GREETING.content);saveChatHistory();
 coreStatus.textContent="NEW SESSION READY";
});
const capabilitiesButton=document.getElementById("capabilities-button");
if(capabilitiesButton)capabilitiesButton.addEventListener("click",()=>{
 userInput.value="What can you do? Explain your capabilities and limitations.";sendMessage();
});

let selectedJarvisVoice=null;
const voiceSelect=document.getElementById("voice-select");
const voiceStatus=document.getElementById("voice-status");
const voicePreviewButton=document.getElementById("voice-preview-button");
function loadJarvisVoices(){
 if(!("speechSynthesis"in window)||!voiceSelect)return;
 const voices=window.speechSynthesis.getVoices();
 if(!voices.length){
  voiceSelect.innerHTML="<option value=''>No voices reported yet — retrying...</option>";
  if(voiceStatus)voiceStatus.textContent="WAITING FOR CHROME VOICE LIST";
  return;
 }
 const previous=voiceSelect.value;
 voiceSelect.innerHTML="";
 voices.forEach((voice,index)=>{
  const option=document.createElement("option");
  option.value=String(index);
  option.textContent=voice.name+" ("+voice.lang+")"+(voice.default?" — device default":"");
  voiceSelect.appendChild(option);
 });
 const preferred=/Daniel|George|Ryan|Arthur|Oliver|Google UK English Male|Microsoft.*(UK|United Kingdom)/i;
 const best=voices.findIndex(v=>/^en-GB/i.test(v.lang)&&preferred.test(v.name));
 const british=voices.findIndex(v=>/^en-GB/i.test(v.lang));
 const irish=voices.findIndex(v=>/^en-IE/i.test(v.lang));
 const deviceDefault=voices.findIndex(v=>v.default);
 const chosen=previous!==""&&voices[Number(previous)]?Number(previous):(best>=0?best:british>=0?british:irish>=0?irish:deviceDefault>=0?deviceDefault:0);
 voiceSelect.value=String(chosen);
 selectedJarvisVoice=voices[chosen];
 if(voiceStatus)voiceStatus.textContent=selectedJarvisVoice.lang.startsWith("en-GB")?"BRITISH VOICE SELECTED // "+selectedJarvisVoice.name:"NO BRITISH VOICE FOUND // SELECT A VOICE ABOVE";
}
if("speechSynthesis"in window){
 loadJarvisVoices();
 window.speechSynthesis.addEventListener("voiceschanged",loadJarvisVoices);
}
if(voiceSelect)voiceSelect.addEventListener("change",()=>{
 const voices=window.speechSynthesis.getVoices();
 selectedJarvisVoice=voices[Number(voiceSelect.value)]||null;
 if(voiceStatus)voiceStatus.textContent=selectedJarvisVoice?("SELECTED // "+selectedJarvisVoice.name+" ("+selectedJarvisVoice.lang+")"):"VOICE NOT AVAILABLE";
});
function speak(text){
 if(!voiceOutput||!("speechSynthesis"in window)||!text){setAvatarState("idle");return;}
 window.speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance(text);
 utterance.voice=selectedJarvisVoice;
 utterance.lang=selectedJarvisVoice?.lang||"en-GB";
 // Cinematic pacing and lower pitch; the actual voice is supplied by ChromeOS.
 utterance.rate=.86;utterance.pitch=.78;utterance.volume=1;
 utterance.onstart=()=>setAvatarState("speaking");
 utterance.onend=()=>setAvatarState("idle");
 utterance.onerror=()=>setAvatarState("idle");
 window.speechSynthesis.speak(utterance);
}
function previewJarvisVoice(){
 if(!("speechSynthesis"in window))return;
 loadJarvisVoices();
 window.speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance("Good evening. All systems are operational. How may I assist you?");
 utterance.voice=selectedJarvisVoice;
 utterance.lang=selectedJarvisVoice?.lang||"en-GB";
 utterance.rate=.86;utterance.pitch=.78;utterance.volume=1;
 utterance.onstart=()=>setAvatarState("speaking");
 utterance.onend=()=>setAvatarState("idle");
 utterance.onerror=()=>setAvatarState("idle");
 window.speechSynthesis.speak(utterance);
}
if(voicePreviewButton)voicePreviewButton.addEventListener("click",previewJarvisVoice);
function parseSse(buffer){
 const normalized=buffer.replace(/\r/g,"");
 const parts=normalized.split("\n\n");
 const remainder=parts.pop();
 const events=parts.map(part=>part.split("\n").filter(line=>line.startsWith("data:")).map(line=>line.slice(5).trimStart()).join("\n")).filter(Boolean);
 return {events,buffer:remainder};
}
function parseBrowserCommand(text){
 const q=text.trim();let m;
 if(/^(browser help|help with browser control)$/i.test(q))return {action:"help"};
 if((m=q.match(/^(open|go to|navigate to)\\s+(.+)$/i)))return {action:"open",args:{target:m[2].trim()}};
 if((m=q.match(/^(search (google for|the web for)|google)\\s+(.+)$/i)))return {action:"search",args:{query:m[3].trim()}};
 if(/^(new tab|open a new tab)$/i.test(q))return {action:"new_tab"};
 if(/^(back|go back)$/i.test(q))return {action:"back"};
 if(/^(forward|go forward)$/i.test(q))return {action:"forward"};
 if(/^(read (this |the )?page|summarise this page|summarize this page)$/i.test(q))return {action:"read"};
 return null;
}
function safeWebUrl(target){
 let value=target.trim();
 if(!value)return null;
 if(!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)){
  if(/^([a-z0-9-]+\\.)+[a-z]{2,}(?::\\d+)?(?:\/.*)?$/i.test(value))value="https://"+value;
  else value="https://www.google.com/search?q="+encodeURIComponent(value);
 }
 try{const u=new URL(value);return (u.protocol==="https:"||u.protocol==="http:")?u.href:null;}catch{return null;}
}
function launchUrl(url){return !!window.open(url,"_blank","noopener,noreferrer");}
function browserHelp(){
 return "I can open websites and Google searches, launch a new tab, go back or forward in this JARVIS tab, and read the visible text on this dashboard. Try “open youtube.com”, “search Google for rugby”, “new tab”, “back”, “forward”, or “read this page”. Because Family Link blocks extensions, I cannot control other tabs, click buttons on other websites, or fill their forms from this webpage.";
}
function handleBrowserCommand(command,originalMessage){
 addMessage("user",originalMessage);let reply="";
 if(command.action==="help")reply=browserHelp();
 else if(command.action==="open"){
  const url=safeWebUrl(command.args.target);
  if(!url)reply="I can only open ordinary HTTP or HTTPS websites.";
  else if(launchUrl(url))reply="Opening "+url;
  else reply="Your browser blocked the new tab. Open this address: "+url;
 }else if(command.action==="search"){
  const url="https://www.google.com/search?q="+encodeURIComponent(command.args.query);
  if(launchUrl(url))reply="Searching Google for: "+command.args.query;
  else reply="Your browser blocked the new tab. Open this address: "+url;
 }else if(command.action==="new_tab"){
  if(launchUrl("https://www.google.com"))reply="Opening a new tab with Google.";
  else reply="Your browser blocked the new tab. Allow pop-ups for your JARVIS dashboard if you want this shortcut.";
 }else if(command.action==="back"){
  if(history.length>1){history.back();reply="Going back in this JARVIS tab.";}else reply="There is no earlier page in this tab's history.";
 }else if(command.action==="forward"){history.forward();reply="Going forward in this JARVIS tab.";}
 else if(command.action==="read"){
  const page=(document.querySelector("main")?.innerText||document.body.innerText||"").replace(/\\s+/g," ").trim().slice(0,1600);
  reply=page?"Visible dashboard text: "+page:"I couldn't find readable page text.";
 }
 addMessage("assistant",reply);
 if(["open","search","new_tab"].includes(command.action))speak(reply);
 return true;
}

function renderBlueprintFromResponse(responseText,responseEl){
 const match=responseText.match(/BLUEPRINT_START\s*([\s\S]*?)\s*BLUEPRINT_END/);
 if(!match)return false;
 let data;try{data=JSON.parse(match[1]);}catch(error){console.warn("Invalid blueprint JSON",error);return false;}
 if(!data||typeof data.title!=="string"||!Array.isArray(data.views))return false;
 const panel=document.getElementById("blueprint-panel"),content=document.getElementById("blueprint-content");
 if(!panel||!content)return false;
 content.replaceChildren();
 const heading=document.createElement("h3");heading.textContent=data.title;heading.style.cssText="color:#baf7ff;font-size:15px;letter-spacing:1px";content.appendChild(heading);
 if(data.summary){const p=document.createElement("p");p.textContent=data.summary;p.style.cssText="font-size:12px;line-height:1.5;color:#9dd9ed";content.appendChild(p);}
 data.views.slice(0,3).forEach(view=>{
  const title=document.createElement("div");title.textContent=String(view.name||"Design view");title.style.cssText="font-size:10px;letter-spacing:2px;color:#52eaff;margin:12px 0 6px";content.appendChild(title);
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 1000 700");svg.setAttribute("role","img");svg.setAttribute("aria-label",String(view.name||"Project blueprint"));svg.style.cssText="width:100%;height:auto;background-color:#031326;border:1px solid rgba(82,234,255,.35);background-image:linear-gradient(rgba(22,72,106,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(22,72,106,.45) 1px,transparent 1px);background-size:40px 40px";
  (Array.isArray(view.elements)?view.elements:[]).slice(0,100).forEach(el=>{
   let node;const ns=svg.namespaceURI;
   if(el.type==="rect"){node=document.createElementNS(ns,"rect");["x","y","width","height"].forEach(k=>node.setAttribute(k,String(Number(el[k])||0)));node.setAttribute("fill","none");}
   else if(el.type==="line"){node=document.createElementNS(ns,"line");["x1","y1","x2","y2"].forEach(k=>node.setAttribute(k,String(Number(el[k])||0)));}
   else if(el.type==="circle"){node=document.createElementNS(ns,"circle");["cx","cy","r"].forEach(k=>node.setAttribute(k,String(Number(el[k])||0)));node.setAttribute("fill","none");}
   else if(el.type==="text"){node=document.createElementNS(ns,"text");node.setAttribute("x",String(Number(el.x)||0));node.setAttribute("y",String(Number(el.y)||0));node.setAttribute("font-size","20");}
   if(node){node.setAttribute("stroke","#6deaff");node.setAttribute("stroke-width","3");node.setAttribute("vector-effect","non-scaling-stroke");if(el.type==="text"){node.setAttribute("fill","#baf7ff");node.textContent=String(el.label||"").slice(0,80);}else if(el.label){const label=document.createElementNS(ns,"text");label.setAttribute("x",String(Number(el.x??el.cx??el.x1)||0));label.setAttribute("y",String((Number(el.y??el.cy??el.y1)||0)-10));label.setAttribute("fill","#baf7ff");label.setAttribute("font-size","18");label.textContent=String(el.label).slice(0,80);svg.appendChild(label);}svg.appendChild(node);}
  });
  content.appendChild(svg);
 });
 const addList=(headingText,items)=>{if(!Array.isArray(items)||!items.length)return;const h=document.createElement("h4");h.textContent=headingText;h.style.cssText="color:#52eaff;font-size:10px;letter-spacing:2px;margin:14px 0 6px";content.appendChild(h);const ul=document.createElement("ul");ul.style.cssText="font-size:12px;line-height:1.6;color:#b7e9f5;padding-left:20px";items.slice(0,20).forEach(item=>{const li=document.createElement("li");li.textContent=typeof item==="string"?item:String(item.name||"Part")+(item.quantity?" — "+item.quantity:"");ul.appendChild(li);});content.appendChild(ul);};
 addList("MATERIALS",data.materials);addList("ASSEMBLY / PROJECT STAGES",data.steps);addList("SAFETY NOTES",data.safety);
 responseEl.textContent="Blueprint generated below. Review the design, approximate dimensions and safety notes before building.";
 panel.style.display="block";panel.scrollIntoView({behavior:"smooth",block:"nearest"});return true;
}
\nasync function sendMessage(){
 const message=userInput.value.trim();
 if(!message||isProcessing)return;
 const browserCommand=parseBrowserCommand(message);
 if(browserCommand){userInput.value="";userInput.style.height="auto";handleBrowserCommand(browserCommand,message);return;}
 if(/\b(run|start|do)\s+(a\s+)?(chromebook\s+)?(system\s+)?diagnostics?\b|\bcheck my chromebook\b/i.test(message)){
  addMessage("user",message);userInput.value="";userInput.style.height="auto";
  addMessage("assistant","Certainly. I will run the safe browser and connection checks now. For deeper hardware tests, please use the ChromeOS Diagnostics app.");
  const result=await runDiagnostics();
  addMessage("assistant",result.issues.length?"The checks found: "+result.issues.join(" "):"The checks I can access look OK. This is not a full hardware test.");
  return;
 }
 isProcessing=true;userInput.disabled=true;sendButton.disabled=true;
 addMessage("user",message);userInput.value="";userInput.style.height="auto";
 typingIndicator.classList.add("visible");coreStatus.textContent="PROCESSING REQUEST";aiStatus.textContent="AI CORE ACTIVE";setAvatarState("idle");
 chatHistory.push({role:"user",content:message});while(chatHistory.length>24)chatHistory.splice(0,1);saveChatHistory();
 let responseText="";
 const responseEl=document.createElement("div");responseEl.className="message assistant-message";chatMessages.appendChild(responseEl);
 try{
  const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:chatHistory.slice(-12)})});
  if(!response.ok)throw new Error("AI request failed ("+response.status+")");
  if(!response.body)throw new Error("No response stream");
  const reader=response.body.getReader();const decoder=new TextDecoder();let buffer="";let finished=false;
  while(!finished){
   const {done,value}=await reader.read();
   if(done){buffer+="\n\n";finished=true;}
   else buffer+=decoder.decode(value,{stream:true});
   const parsed=parseSse(buffer);buffer=parsed.buffer;
   for(const data of parsed.events){
    if(data==="[DONE]"){finished=true;break;}
    try{
     const item=JSON.parse(data);
     const chunk=typeof item.response==="string"?item.response:(item.choices?.[0]?.delta?.content||"");
     if(chunk){responseText+=chunk;responseEl.textContent=responseText;chatMessages.scrollTop=chatMessages.scrollHeight;}
    }catch(err){console.warn("Skipping unrecognised response chunk",err);}
   }
  }
  if(!responseText)throw new Error("The AI returned an empty response");\n  renderBlueprintFromResponse(responseText,responseEl);
  chatHistory.push({role:"assistant",content:responseText});while(chatHistory.length>24)chatHistory.splice(0,1);saveChatHistory();speak(responseText);
  coreStatus.textContent="RESPONSE COMPLETE";aiStatus.textContent="AI CORE READY";
 }catch(error){
  console.error(error);responseEl.textContent="I couldn't reach the AI service. Please try again in a moment.";
  coreStatus.textContent="CONNECTION ISSUE";aiStatus.textContent="CHECK AI CONNECTION";setAvatarState("idle");
 }finally{
  typingIndicator.classList.remove("visible");isProcessing=false;userInput.disabled=false;sendButton.disabled=false;userInput.focus();
 }
}
