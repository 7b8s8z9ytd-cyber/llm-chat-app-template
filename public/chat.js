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
 avatarStage.classList.remove("speaking","listening","thinking");
 if(["speaking","listening","thinking"].includes(state))avatarStage.classList.add(state);
 if(avatarLabel)avatarLabel.textContent=state==="speaking"?"J.A.R.V.I.S // SPEAKING":state==="listening"?"J.A.R.V.I.S // LISTENING":state==="thinking"?"J.A.R.V.I.S // PROCESSING":"STANDBY // HOLOGRAM STABLE";
}
const CHAT_STORAGE_KEY="jarvis-chat-history-v1";
const SESSIONS_STORAGE_KEY="jarvis-sessions-v1";
const DEFAULT_GREETING={role:"assistant",content:"Good evening. J.A.R.V.I.S systems are online. How may I assist?"};
function makeSession(messages=[DEFAULT_GREETING]){return {id:"session-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),title:"New session",updatedAt:Date.now(),messages:messages.slice(-100)};}
function loadSessions(){
 try{
  const saved=JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY)||"null");
  if(Array.isArray(saved)&&saved.length)return saved.filter(s=>s&&typeof s.id==="string"&&Array.isArray(s.messages)).slice(0,50);
  const legacy=JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)||"[]");
  const valid=Array.isArray(legacy)?legacy.filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-24):[];
  return [makeSession(valid.length?valid:[DEFAULT_GREETING])];
 }catch(error){console.warn("Local session history unavailable",error);return [makeSession()];}
}
let savedSessions=loadSessions();
let activeSessionId=savedSessions[0].id;
let chatHistory=savedSessions[0].messages.slice(-24);
function saveChatHistory(){
 try{
  const current=savedSessions.find(s=>s.id===activeSessionId);
  if(current){current.messages=chatHistory.slice(-100);current.updatedAt=Date.now();const firstUser=chatHistory.find(m=>m.role==="user");current.title=firstUser?firstUser.content.slice(0,42):"New session";}
  savedSessions.sort((a,b)=>b.updatedAt-a.updatedAt);savedSessions=savedSessions.slice(0,50);
  localStorage.setItem(SESSIONS_STORAGE_KEY,JSON.stringify(savedSessions));localStorage.setItem(CHAT_STORAGE_KEY,JSON.stringify(chatHistory.slice(-24)));
  const status=document.getElementById("memory-status");if(status)status.textContent="SESSION MEMORY // "+savedSessions.length+" SAVED";
  scheduleCloudSync();
 }catch(error){const status=document.getElementById("memory-status");if(status)status.textContent="SESSION MEMORY // STORAGE UNAVAILABLE";}
}
let syncReady=false;
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

// Optional wake phrase mode. Requires microphone permission and a browser that
// supports continuous SpeechRecognition. It can be stopped at any time.
const wakeButton=document.getElementById("wake-button");
let wakeRecognition=null;
let wakeEnabled=false;
if(wakeButton&&SpeechRecognition){
 wakeRecognition=new SpeechRecognition();
 wakeRecognition.lang="en-IE";
 wakeRecognition.continuous=true;
 wakeRecognition.interimResults=false;
 wakeRecognition.maxAlternatives=1;
 wakeRecognition.onresult=(event)=>{
  for(let i=event.resultIndex;i<event.results.length;i++){
   if(!event.results[i].isFinal)continue;
   const heard=event.results[i][0].transcript.trim();
   const match=heard.match(/\bhey jarvis\b[,. ]*(.*)$/i);
   if(!match)continue;
   const command=match[1].trim();
   if(command){userInput.value=command;sendMessage();}
   else if(recognition){try{recognition.start();}catch(error){}}
  }
 };
 wakeRecognition.onerror=(event)=>{
  if(event.error==="not-allowed"||event.error==="service-not-allowed"){
   wakeEnabled=false;wakeButton.textContent="HEY JARVIS: PERMISSION NEEDED";wakeButton.classList.remove("active");
  }
 };
 wakeRecognition.onend=()=>{
  if(wakeEnabled){try{wakeRecognition.start();}catch(error){}}
 };
 wakeButton.addEventListener("click",()=>{
  wakeEnabled=!wakeEnabled;
  wakeButton.textContent=wakeEnabled?"HEY JARVIS: ON":"HEY JARVIS: OFF";
  wakeButton.classList.toggle("active",wakeEnabled);
  if(wakeEnabled){try{wakeRecognition.start();coreStatus.textContent="WAKE PHRASE ACTIVE";}catch(error){wakeEnabled=false;wakeButton.textContent="HEY JARVIS: OFF";wakeButton.classList.remove("active");coreStatus.textContent="MICROPHONE UNAVAILABLE";}}
  else{wakeRecognition.stop();coreStatus.textContent="AWAITING INSTRUCTIONS";}
 });
}else if(wakeButton){
 wakeButton.disabled=true;wakeButton.textContent="WAKE PHRASE UNSUPPORTED";
 wakeButton.title="This browser does not support continuous speech recognition.";
}

function addMessage(role,content){
 const el=document.createElement("div");
 el.className="message "+(role==="user"?"user-message":"assistant-message");
 el.textContent=content;
 chatMessages.appendChild(el);chatMessages.scrollTop=chatMessages.scrollHeight;
}
function renderSessionHistory(){
 const list=document.getElementById("session-history-list");if(!list)return;list.replaceChildren();
 if(!savedSessions.length){const empty=document.createElement("div");empty.className="history-empty";empty.textContent="No saved sessions yet. Start chatting and your sessions will appear here.";list.appendChild(empty);return;}
 const filter=(document.getElementById("session-search")?.value||"").trim().toLowerCase();
 const visibleSessions=savedSessions.filter(session=>(session.title||"New session").toLowerCase().includes(filter)||session.messages.some(m=>String(m.content||"").toLowerCase().includes(filter)));
 if(!visibleSessions.length){const empty=document.createElement("div");empty.className="history-empty";empty.textContent=filter?"No sessions match that search.":"No saved sessions yet.";list.appendChild(empty);return;}
 visibleSessions.forEach(session=>{const button=document.createElement("button");button.type="button";button.className="history-item"+(session.id===activeSessionId?" active":"");const firstUser=session.messages.find(m=>m.role==="user");button.textContent=session.title&&session.title!=="New session"?session.title:(firstUser?firstUser.content.slice(0,42):"New session");button.title=button.textContent;button.addEventListener("click",()=>openSession(session.id));list.appendChild(button);});
}
function openSession(id){
 const session=savedSessions.find(s=>s.id===id);if(!session)return;activeSessionId=id;chatHistory=session.messages.slice(-24);chatMessages.replaceChildren();chatHistory.forEach(message=>addMessage(message.role,message.content));renderSessionHistory();coreStatus.textContent="SESSION RESTORED";const panel=document.getElementById("blueprint-panel");if(panel)panel.style.display="none";
}
if(chatHistory.length){chatMessages.innerHTML="";chatHistory.forEach(message=>addMessage(message.role,message.content));}
renderSessionHistory();saveChatHistory();
const newChatButton=document.getElementById("new-chat-button");
if(newChatButton)newChatButton.addEventListener("click",()=>{
 if(isProcessing)return;const session=makeSession();savedSessions.unshift(session);activeSessionId=session.id;chatHistory=session.messages.slice();chatMessages.replaceChildren();addMessage("assistant",DEFAULT_GREETING.content);const panel=document.getElementById("blueprint-panel");if(panel)panel.style.display="none";saveChatHistory();renderSessionHistory();coreStatus.textContent="NEW SESSION READY";
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
 if((m=q.match(/^(open|go to|navigate to)\s+(.+)$/i)))return {action:"open",args:{target:m[2].trim()}};
 if((m=q.match(/^(search (google for|the web for)|google)\s+(.+)$/i)))return {action:"search",args:{query:m[3].trim()}};
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
  if(/^([a-z0-9-]+\.)+[a-z]{2,}(?::\\d+)?(?:\/.*)?$/i.test(value))value="https://"+value;
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
  const page=(document.querySelector("main")?.innerText||document.body.innerText||"").replace(/\s+/g," ").trim().slice(0,1600);
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

async function sendMessage(){
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
 typingIndicator.classList.add("visible");coreStatus.textContent="PROCESSING REQUEST";aiStatus.textContent="AI CORE ACTIVE";setAvatarState("thinking");
 chatHistory.push({role:"user",content:message});while(chatHistory.length>24)chatHistory.splice(0,1);saveChatHistory();renderSessionHistory();
 let responseText="";
 const responseEl=document.createElement("div");responseEl.className="message assistant-message";chatMessages.appendChild(responseEl);
 try{
  const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:chatHistory.slice(-12)})});
  let result;
  try{result=await response.json();}catch(error){throw new Error("The server returned an unreadable response (HTTP "+response.status+").");}
  if(!response.ok){
   let detail=result&&typeof result.error==="string"?result.error:"AI request failed";
   if(result&&result.diagnostic)detail+=" | Diagnostic: "+JSON.stringify(result.diagnostic).slice(0,700);
   throw new Error(detail+" (HTTP "+response.status+")");
  }
  responseText=typeof result.response==="string"?result.response:(typeof result.choices?.[0]?.message?.content==="string"?result.choices[0].message.content:"");
  if(!responseText.trim())throw new Error("Cloudflare returned no reply text. Check the Workers AI binding and deployment logs.");
  responseEl.textContent=responseText;
  chatMessages.scrollTop=chatMessages.scrollHeight;
  renderBlueprintFromResponse(responseText,responseEl);
  chatHistory.push({role:"assistant",content:responseText});while(chatHistory.length>24)chatHistory.splice(0,1);saveChatHistory();renderSessionHistory();speak(responseText);
  coreStatus.textContent="RESPONSE COMPLETE";aiStatus.textContent="AI CORE READY";
 }catch(error){
  console.error(error);responseEl.textContent="I couldn't reach the AI service. "+(error&&error.message?("Details: "+error.message):"Please try again in a moment.");
  coreStatus.textContent="CONNECTION ISSUE";aiStatus.textContent="CHECK AI CONNECTION";setAvatarState("idle");
 }finally{
  typingIndicator.classList.remove("visible");isProcessing=false;userInput.disabled=false;sendButton.disabled=false;userInput.focus();
 }
}


/* JARVIS 3.0 live information centre */
const infoClock=document.getElementById("info-clock");
const infoDate=document.getElementById("info-date");
function updateInfoClock(){
 if(!infoClock||!infoDate)return;
 const now=new Date();
 infoClock.textContent=now.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit"});
 infoDate.textContent=now.toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}
updateInfoClock();
setInterval(updateInfoClock,1000);

const weatherCityInput=document.getElementById("weather-city");
const weatherSearchButton=document.getElementById("weather-search");
const weatherResult=document.getElementById("weather-result");
function weatherDescription(code){
 const descriptions={0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Depositing rime fog",51:"Light drizzle",53:"Drizzle",55:"Dense drizzle",56:"Freezing drizzle",57:"Dense freezing drizzle",61:"Slight rain",63:"Moderate rain",65:"Heavy rain",66:"Freezing rain",67:"Heavy freezing rain",71:"Slight snow",73:"Moderate snow",75:"Heavy snow",77:"Snow grains",80:"Rain showers",81:"Moderate rain showers",82:"Violent rain showers",85:"Snow showers",86:"Heavy snow showers",95:"Thunderstorm",96:"Thunderstorm with hail",99:"Thunderstorm with heavy hail"};
 return descriptions[code]||"Conditions unavailable";
}
async function loadWeather(){
 const city=weatherCityInput?.value.trim();
 if(!city||!weatherResult||!weatherSearchButton)return;
 weatherSearchButton.disabled=true;weatherResult.textContent="Contacting weather service...";
 try{
  const geoUrl="https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(city)+"&count=1&language=en&format=json";
  const geoResponse=await fetch(geoUrl);
  if(!geoResponse.ok)throw new Error("Location lookup unavailable (HTTP "+geoResponse.status+").");
  const geo=await geoResponse.json();
  const place=geo.results&&geo.results[0];
  if(!place)throw new Error("I couldn't find that town or city. Try a nearby larger place.");
  const forecastUrl="https://api.open-meteo.com/v1/forecast?latitude="+encodeURIComponent(place.latitude)+"&longitude="+encodeURIComponent(place.longitude)+"&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto";
  const forecastResponse=await fetch(forecastUrl);
  if(!forecastResponse.ok)throw new Error("Weather service unavailable (HTTP "+forecastResponse.status+").");
  const forecast=await forecastResponse.json();
  const current=forecast.current||{},daily=forecast.daily||{};
  const temperature=Number.isFinite(current.temperature_2m)?Math.round(current.temperature_2m)+"°C":"—";
  const feels=Number.isFinite(current.apparent_temperature)?Math.round(current.apparent_temperature)+"°C":"—";
  const humidity=Number.isFinite(current.relative_humidity_2m)?current.relative_humidity_2m+"%":"—";
  const wind=Number.isFinite(current.wind_speed_10m)?Math.round(current.wind_speed_10m)+" km/h":"—";
  const high=daily.temperature_2m_max?.[0],low=daily.temperature_2m_min?.[0];
  const placeName=[place.name,place.admin1,place.country].filter(Boolean).join(", ");
  weatherResult.textContent=placeName+" — "+weatherDescription(current.weather_code)+". Now "+temperature+"; feels like "+feels+". Today's high "+(Number.isFinite(high)?Math.round(high)+"°C":"—")+" / low "+(Number.isFinite(low)?Math.round(low)+"°C":"—")+". Humidity "+humidity+". Wind "+wind+".";
 }catch(error){weatherResult.textContent="Weather unavailable: "+(error&&error.message?error.message:"Please try again.");}
 finally{weatherSearchButton.disabled=false;}
}
if(weatherSearchButton)weatherSearchButton.addEventListener("click",loadWeather);
if(weatherCityInput)weatherCityInput.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();loadWeather();}});
document.querySelectorAll("[data-info-url]").forEach(button=>button.addEventListener("click",()=>{
 const url=button.getAttribute("data-info-url");
 if(url)window.open(url,"_blank","noopener,noreferrer");
}));


/* JARVIS 3.0 project workshop and mission control — local browser storage */
const WORKSHOP_KEY="jarvis-workshop-v1";
const projectList=document.getElementById("project-list");
const taskList=document.getElementById("task-list");
const projectNameInput=document.getElementById("project-name");
const taskNameInput=document.getElementById("task-name");
const taskDateInput=document.getElementById("task-date");
const workshopStatus=document.getElementById("workshop-status");
let workshopData={projects:[],tasks:[]};
try{
 const saved=JSON.parse(localStorage.getItem(WORKSHOP_KEY)||"null");
 if(saved&&typeof saved==="object"){
  workshopData.projects=Array.isArray(saved.projects)?saved.projects.slice(0,100):[];
  workshopData.tasks=Array.isArray(saved.tasks)?saved.tasks.slice(0,200):[];
 }
}catch(error){workshopStatus.textContent="LOCAL STORAGE COULD NOT BE READ";}
function saveWorkshop(){
 try{localStorage.setItem(WORKSHOP_KEY,JSON.stringify(workshopData));if(workshopStatus)workshopStatus.textContent="SAVED LOCALLY // "+workshopData.projects.length+" PROJECTS // "+workshopData.tasks.length+" TASKS";scheduleCloudSync();}
 catch(error){if(workshopStatus)workshopStatus.textContent="STORAGE FULL OR UNAVAILABLE — EXPORT YOUR NOTES BEFORE CLEARING BROWSER DATA";}
}
function renderWorkshopList(container,items,type){
 if(!container)return;
 container.replaceChildren();
 if(!items.length){const empty=document.createElement("div");empty.className="workshop-empty";empty.textContent=type==="project"?"No projects yet. Add your first project above.":"No missions yet. Add a task above.";container.appendChild(empty);return;}
 items.forEach(item=>{
  const row=document.createElement("div");row.className="workshop-item"+(item.done?" done":"");
  if(type==="task"){
   const check=document.createElement("input");check.type="checkbox";check.checked=!!item.done;check.setAttribute("aria-label","Mark task complete");check.addEventListener("change",()=>{item.done=check.checked;saveWorkshop();renderWorkshop();});row.appendChild(check);
  }
  const label=document.createElement("span");label.textContent=item.name+(item.due?" · due "+item.due:"");row.appendChild(label);
  const remove=document.createElement("button");remove.type="button";remove.textContent="REMOVE";remove.addEventListener("click",()=>{if(type==="project")workshopData.projects=workshopData.projects.filter(x=>x.id!==item.id);else workshopData.tasks=workshopData.tasks.filter(x=>x.id!==item.id);saveWorkshop();renderWorkshop();});row.appendChild(remove);
  container.appendChild(row);
 });
}
function renderWorkshop(){renderWorkshopList(projectList,workshopData.projects,"project");renderWorkshopList(taskList,workshopData.tasks,"task");}
function addWorkshopItem(type){
 const input=type==="project"?projectNameInput:taskNameInput;
 const name=input?.value.trim();
 if(!name)return;
 if(type==="project")workshopData.projects.unshift({id:Date.now()+"-"+Math.random().toString(36).slice(2),name:name,createdAt:Date.now()});
 else workshopData.tasks.unshift({id:Date.now()+"-"+Math.random().toString(36).slice(2),name:name,due:taskDateInput?.value||"",done:false,createdAt:Date.now()});
 input.value="";saveWorkshop();renderWorkshop();
}
document.getElementById("add-project")?.addEventListener("click",()=>addWorkshopItem("project"));
document.getElementById("add-task")?.addEventListener("click",()=>addWorkshopItem("task"));
projectNameInput?.addEventListener("keydown",e=>{if(e.key==="Enter")addWorkshopItem("project");});
taskNameInput?.addEventListener("keydown",e=>{if(e.key==="Enter")addWorkshopItem("task");});
renderWorkshop();
document.getElementById("security-check")?.addEventListener("click",()=>{
 const result=document.getElementById("security-result");
 if(!result)return;
 const checks=[
  "HTTPS CONNECTION: "+(location.protocol==="https:"?"SECURE":"NOT SECURE"),
  "PAGE CONTEXT: "+(window.isSecureContext?"SECURE CONTEXT":"LIMITED CONTEXT"),
  "LOCAL STORAGE: "+(function(){try{const k="jarvis-security-test";localStorage.setItem(k,"ok");localStorage.removeItem(k);return "AVAILABLE";}catch(e){return "UNAVAILABLE";}})(),
  "MICROPHONE: "+(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia?"BROWSER API AVAILABLE — PERMISSION REQUIRED":"API UNAVAILABLE"),
  "EXTERNAL CONTROL: NOT ENABLED — NO OTHER TABS OR ACCOUNTS ARE CONTROLLED"
 ];
 result.textContent=checks.join(" // ");
});

/* Simple browser-based 3D concept preview */
const modelShape=document.getElementById("model-shape");
const modelRotation=document.getElementById("model-rotation");
const conceptModel=document.getElementById("concept-model");
const modelCaption=document.getElementById("model-caption");
function updateConceptModel(){
 if(!conceptModel||!modelShape||!modelRotation)return;
 const shape=modelShape.value;
 conceptModel.className="concept-model "+shape;
 conceptModel.style.transform="rotateX(-20deg) rotateY("+Number(modelRotation.value)+"deg)";
 if(modelCaption)modelCaption.textContent=shape.toUpperCase()+" // ROTATABLE CONCEPT VIEW";
}
modelShape?.addEventListener("change",updateConceptModel);
modelRotation?.addEventListener("input",updateConceptModel);
updateConceptModel();


// JARVIS planner reminders, portable backup, and install prompt.
const plannerStatus=document.getElementById("planner-status");
const reminderButton=document.getElementById("enable-reminders");
let remindersEnabled=false;
const notifiedDueTasks=new Set();
function updateReminderStatus(message){
 if(plannerStatus)plannerStatus.textContent=message;
}
function checkDueReminders(){
 if(!remindersEnabled||!("Notification" in window)||Notification.permission!=="granted")return;
 const now=Date.now();
 workshopData.tasks.forEach(task=>{
  if(task.done||!task.due)return;
  const due=Date.parse(task.due);
  if(!Number.isFinite(due)||due>now||notifiedDueTasks.has(task.id))return;
  notifiedDueTasks.add(task.id);
  try{new Notification("J.A.R.V.I.S reminder",{body:task.name+" is due now."});}
  catch(error){updateReminderStatus("REMINDER DISPLAY UNAVAILABLE IN THIS BROWSER.");}
 });
}
if(reminderButton){
 reminderButton.addEventListener("click",async()=>{
  if(!("Notification" in window)){updateReminderStatus("THIS BROWSER DOES NOT SUPPORT SYSTEM NOTIFICATIONS.");return;}
  if(!window.isSecureContext){updateReminderStatus("REMINDERS REQUIRE A SECURE HTTPS CONNECTION.");return;}
  let permission=Notification.permission;
  if(permission!=="granted")permission=await Notification.requestPermission();
  if(permission==="granted"){
   remindersEnabled=true;
   reminderButton.textContent="REMINDERS: ON";
   reminderButton.classList.add("active");
   updateReminderStatus("REMINDERS ON // CHECKED WHILE JARVIS IS OPEN. MOBILE/BACKGROUND DELIVERY IS NOT GUARANTEED.");
   checkDueReminders();
  }else updateReminderStatus("NOTIFICATION PERMISSION NOT GRANTED. YOU CAN STILL USE THE TASK LIST.");
 });
}
setInterval(checkDueReminders,30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkDueReminders();});

// Export a local backup containing sessions, projects, and tasks.
document.getElementById("export-backup")?.addEventListener("click",()=>{
 try{
  const backup={format:"jarvis-backup-v1",createdAt:new Date().toISOString(),sessions:savedSessions,workshop:workshopData,plumbing:plumbingData};
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download="jarvis-backup-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  updateReminderStatus("BACKUP EXPORTED // KEEP THE FILE SOMEWHERE SAFE.");
 }catch(error){updateReminderStatus("BACKUP EXPORT FAILED: "+error.message);}
});

// Offer installation only when Chrome provides the PWA install event.
let pendingInstallPrompt=null;
const installButton=document.getElementById("install-app");
window.addEventListener("beforeinstallprompt",event=>{
 event.preventDefault();pendingInstallPrompt=event;
 if(installButton)installButton.hidden=false;
});
if(installButton)installButton.addEventListener("click",async()=>{
 if(!pendingInstallPrompt)return;
 pendingInstallPrompt.prompt();
 await pendingInstallPrompt.userChoice;
 pendingInstallPrompt=null;installButton.hidden=true;
});
window.addEventListener("appinstalled",()=>{
 if(installButton)installButton.hidden=true;
 updateReminderStatus("JARVIS APP INSTALLED.");
});


// Session search and cautious backup import (merge only; never overwrite existing data).
document.getElementById("session-search")?.addEventListener("input",renderSessionHistory);
const backupFile=document.getElementById("backup-file");
document.getElementById("import-backup")?.addEventListener("click",()=>backupFile?.click());
backupFile?.addEventListener("change",async()=>{
 const file=backupFile.files?.[0];backupFile.value="";
 if(!file)return;
 if(file.size>5*1024*1024){updateReminderStatus("BACKUP FILE TOO LARGE (MAX 5 MB).");return;}
 try{
  const data=JSON.parse(await file.text());
  if(data?.format!=="jarvis-backup-v1"||!Array.isArray(data.sessions)||!data.workshop||typeof data.workshop!=="object")throw new Error("This does not look like a JARVIS backup.");
  const validSessions=data.sessions.filter(s=>s&&typeof s.id==="string"&&Array.isArray(s.messages)).map(s=>({
   id:s.id,title:String(s.title||"Imported session").slice(0,100),updatedAt:Number(s.updatedAt)||Date.now(),
   messages:s.messages.filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-100).map(m=>({role:m.role,content:m.content.slice(0,12000)}))
  }));
  const known=new Set(savedSessions.map(s=>s.id));
  validSessions.forEach(s=>{if(!known.has(s.id)){savedSessions.push(s);known.add(s.id);}});
  savedSessions.sort((a,b)=>b.updatedAt-a.updatedAt);savedSessions=savedSessions.slice(0,50);
  const projects=Array.isArray(data.workshop.projects)?data.workshop.projects:[],tasks=Array.isArray(data.workshop.tasks)?data.workshop.tasks:[];
  const projectIds=new Set(workshopData.projects.map(p=>p.id));
  projects.filter(p=>p&&typeof p.name==="string").slice(0,100).forEach(p=>{if(!projectIds.has(p.id))workshopData.projects.push({id:String(p.id||("import-"+Date.now()+"-"+Math.random())),name:p.name.slice(0,100),createdAt:Number(p.createdAt)||Date.now()});});
  const taskIds=new Set(workshopData.tasks.map(t=>t.id));
  tasks.filter(t=>t&&typeof t.name==="string").slice(0,200).forEach(t=>{if(!taskIds.has(t.id))workshopData.tasks.push({id:String(t.id||("import-"+Date.now()+"-"+Math.random())),name:t.name.slice(0,150),due:typeof t.due==="string"?t.due:"",done:!!t.done,createdAt:Number(t.createdAt)||Date.now()});});
  const importedPlumbing=data.plumbing&&typeof data.plumbing==="object"?data.plumbing:{};
  const knownCustomerIds=new Set(plumbingData.customers.map(c=>c.id));
  (Array.isArray(importedPlumbing.customers)?importedPlumbing.customers:[]).filter(c=>c&&typeof c.name==="string").slice(0,300).forEach(c=>{
   const id=String(c.id||("import-customer-"+Date.now()+"-"+Math.random()));
   if(!knownCustomerIds.has(id)){plumbingData.customers.push({id,name:c.name.slice(0,90),phone:typeof c.phone==="string"?c.phone.slice(0,35):"",address:typeof c.address==="string"?c.address.slice(0,160):"",createdAt:Number(c.createdAt)||Date.now()});knownCustomerIds.add(id);}
  });
  const knownJobIds=new Set(plumbingData.jobs.map(j=>j.id));
  (Array.isArray(importedPlumbing.jobs)?importedPlumbing.jobs:[]).filter(j=>j&&typeof j.title==="string"&&typeof j.customer==="string").slice(0,500).forEach(j=>{
   const id=String(j.id||("import-job-"+Date.now()+"-"+Math.random()));
   if(!knownJobIds.has(id)){const statuses=["Enquiry","Quote needed","Booked","In progress","Completed","Invoiced"];plumbingData.jobs.push({id,title:j.title.slice(0,100),customer:j.customer.slice(0,90),date:typeof j.date==="string"?j.date:"",status:statuses.includes(j.status)?j.status:"Enquiry",createdAt:Number(j.createdAt)||Date.now()});knownJobIds.add(id);}
  });
  saveChatHistory();saveWorkshop();savePlumbingData();renderSessionHistory();renderWorkshop();renderPlumbingBusiness();
  updateReminderStatus("BACKUP IMPORTED // MERGED WITHOUT REPLACING CURRENT DATA. REOPEN A SESSION FROM HISTORY.");
 }catch(error){updateReminderStatus("BACKUP IMPORT FAILED: "+(error.message||"INVALID FILE"));}
});


// PLUMBING BUSINESS MODE // customer and job records kept separately from chat history.

/* Encrypted personal-device sync. Plumbing customer/job data is deliberately excluded. */
const SYNC_CODE_KEY = "jarvis-sync-code-v1";
const syncCodeInput = document.getElementById("sync-code");
const syncPassInput = document.getElementById("sync-passphrase");
const syncStatus = document.getElementById("sync-status");
let syncInProgress = false;
let syncTimer = null;
if (syncCodeInput) syncCodeInput.value = localStorage.getItem(SYNC_CODE_KEY) || "";
function setSyncStatus(message) { if (syncStatus) syncStatus.textContent = "DEVICE SYNC // " + message; }
function randomSyncCode() {
 const bytes = crypto.getRandomValues(new Uint8Array(32));
 return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function bytesToBase64(bytes) { let binary=""; bytes.forEach(b=>binary+=String.fromCharCode(b)); return btoa(binary); }
function base64ToBytes(value) { return Uint8Array.from(atob(value),c=>c.charCodeAt(0)); }
async function syncCryptoKey(code, passphrase) {
 const material = await crypto.subtle.importKey("raw",new TextEncoder().encode(passphrase),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",salt:new TextEncoder().encode("JARVIS-device-sync-v1:"+code),iterations:310000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
async function encryptSyncSnapshot(snapshot, code, passphrase) {
 const key=await syncCryptoKey(code,passphrase),iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(snapshot)));
 return JSON.stringify({iv:bytesToBase64(iv),data:bytesToBase64(new Uint8Array(encrypted))});
}
async function decryptSyncSnapshot(payload, code, passphrase) {
 const envelope=JSON.parse(payload),key=await syncCryptoKey(code,passphrase);
 const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(envelope.iv)},key,base64ToBytes(envelope.data));
 return JSON.parse(new TextDecoder().decode(clear));
}
function currentSyncSnapshot() {
 return {version:1,savedAt:Date.now(),sessions:savedSessions,workshop:workshopData};
}
function mergeById(localItems, remoteItems) {
 const map=new Map();
 [...(Array.isArray(remoteItems)?remoteItems:[]),...(Array.isArray(localItems)?localItems:[])].forEach(item=>{
  if(!item||typeof item.id!=="string")return;
  const old=map.get(item.id),time=x=>Number(x.updatedAt||x.createdAt||0);
  if(!old||time(item)>=time(old))map.set(item.id,item);
 });
 return [...map.values()].sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0));
}
async function syncNow() {
 if(syncInProgress)return;
 const code=(syncCodeInput?.value||localStorage.getItem(SYNC_CODE_KEY)||"").trim();
 const passphrase=syncPassInput?.value||"";
 if(!/^[A-Za-z0-9_-]{40,50}$/.test(code)){setSyncStatus("GENERATE OR ENTER YOUR PRIVATE SYNC CODE.");return;}
 if(passphrase.length<12){setSyncStatus("ENTER YOUR PASSPHRASE (AT LEAST 12 CHARACTERS).");return;}
 if(!crypto.subtle){setSyncStatus("THIS BROWSER DOES NOT SUPPORT SECURE ENCRYPTION.");return;}
 syncInProgress=true;setSyncStatus("ENCRYPTING AND CONNECTING...");
 try {
  localStorage.setItem(SYNC_CODE_KEY,code);
  const key=encodeURIComponent(code);
  const get=await fetch("/api/sync?code="+key,{cache:"no-store"});
  const remote=await get.json();
  if(!get.ok)throw new Error(remote.error||"Cloud sync is unavailable.");
  if(remote.payload){
   const decoded=await decryptSyncSnapshot(remote.payload,code,passphrase);
   if(decoded.version!==1)throw new Error("This sync backup uses an unsupported version.");
   savedSessions=mergeById(savedSessions,decoded.sessions).slice(0,50);
   if(savedSessions.length&&!savedSessions.some(s=>s.id===activeSessionId))activeSessionId=savedSessions[0].id;
   const active=savedSessions.find(s=>s.id===activeSessionId);
   if(active){chatHistory=active.messages.slice(-24);chatMessages.replaceChildren();chatHistory.forEach(m=>addMessage(m.role,m.content));}
   const remoteWorkshop=decoded.workshop||{};
   workshopData.projects=mergeById(workshopData.projects,remoteWorkshop.projects).slice(0,100);
   workshopData.tasks=mergeById(workshopData.tasks,remoteWorkshop.tasks).slice(0,200);
   localStorage.setItem(SESSIONS_STORAGE_KEY,JSON.stringify(savedSessions));
   localStorage.setItem(CHAT_STORAGE_KEY,JSON.stringify(chatHistory.slice(-24)));
   localStorage.setItem(WORKSHOP_KEY,JSON.stringify(workshopData));
   renderSessionHistory();renderWorkshop();
  }
  const encrypted=await encryptSyncSnapshot(currentSyncSnapshot(),code,passphrase);
  const put=await fetch("/api/sync?code="+key,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({payload:encrypted})});
  const result=await put.json();
  if(!put.ok)throw new Error(result.error||"Could not save encrypted sync data.");
  setSyncStatus("SYNC COMPLETE // PERSONAL CHATS AND WORKSHOP NOTES UPDATED.");
 } catch(error) {
  setSyncStatus(error.message==="The operation failed for an operation-specific reason"? "DECRYPTION FAILED — CHECK THAT BOTH DEVICES USE THE SAME CODE AND PASSPHRASE.":String(error.message||error).slice(0,150));
 } finally {syncInProgress=false;}
}
function scheduleCloudSync() {
 if(!syncReady||!localStorage.getItem(SYNC_CODE_KEY)||syncInProgress)return;
 clearTimeout(syncTimer);
 syncTimer=setTimeout(()=>{if(syncPassInput?.value)syncNow();else setSyncStatus("CHANGES SAVED ON THIS DEVICE. ENTER PASSPHRASE AND TAP SYNC NOW TO UPLOAD.");},1800);
}
document.getElementById("sync-generate")?.addEventListener("click",()=>{
 const code=randomSyncCode();syncCodeInput.value=code;localStorage.setItem(SYNC_CODE_KEY,code);
 setSyncStatus("CODE CREATED. COPY IT AND KEEP IT PRIVATE; USE THE SAME CODE AND PASSPHRASE ON YOUR OTHER DEVICE.");
});
document.getElementById("sync-copy")?.addEventListener("click",async()=>{
 try{await navigator.clipboard.writeText(syncCodeInput.value);setSyncStatus("PRIVATE CODE COPIED. KEEP IT SECRET.");}
 catch(error){setSyncStatus("COPY BLOCKED BY BROWSER. SELECT AND COPY THE CODE MANUALLY.");}
});
document.getElementById("sync-connect")?.addEventListener("click",syncNow);
document.getElementById("sync-disconnect")?.addEventListener("click",()=>{
 localStorage.removeItem(SYNC_CODE_KEY);if(syncCodeInput)syncCodeInput.value="";if(syncPassInput)syncPassInput.value="";
 setSyncStatus("DISCONNECTED. CLOUD COPY IS NOT DELETED.");
});
syncReady=true;

const BUSINESS_STORAGE_KEY="jarvis-plumbing-business-v1";
const businessStatus=document.getElementById("biz-status");
let plumbingData={customers:[],jobs:[]};
try{
 const savedBusiness=JSON.parse(localStorage.getItem(BUSINESS_STORAGE_KEY)||"null");
 if(savedBusiness&&typeof savedBusiness==="object"){
  plumbingData.customers=Array.isArray(savedBusiness.customers)?savedBusiness.customers.slice(0,300):[];
  plumbingData.jobs=Array.isArray(savedBusiness.jobs)?savedBusiness.jobs.slice(0,500):[];
 }
}catch(error){if(businessStatus)businessStatus.textContent="BUSINESS STORAGE COULD NOT BE READ.";}
function savePlumbingData(){
 try{
  localStorage.setItem(BUSINESS_STORAGE_KEY,JSON.stringify(plumbingData));
  if(businessStatus)businessStatus.textContent="BUSINESS RECORDS SAVED LOCALLY // "+plumbingData.customers.length+" CUSTOMERS // "+plumbingData.jobs.length+" JOBS";
 }catch(error){if(businessStatus)businessStatus.textContent="STORAGE UNAVAILABLE OR FULL. EXPORT/BACK UP YOUR DATA BEFORE CLEARING BROWSER DATA.";}
}
function businessRow(container,text,onRemove){
 if(!container)return;
 const row=document.createElement("div");row.className="workshop-item";
 const label=document.createElement("span");label.textContent=text;row.appendChild(label);
 const remove=document.createElement("button");remove.type="button";remove.textContent="REMOVE";
 remove.addEventListener("click",onRemove);row.appendChild(remove);container.appendChild(row);
}
function renderPlumbingBusiness(){
 const customerList=document.getElementById("biz-customer-list");
 const jobList=document.getElementById("biz-job-list");
 if(customerList){
  customerList.replaceChildren();
  if(!plumbingData.customers.length){const empty=document.createElement("div");empty.className="workshop-empty";empty.textContent="No customers saved yet.";customerList.appendChild(empty);}
  plumbingData.customers.forEach(customer=>businessRow(customerList,customer.name+(customer.phone?" · "+customer.phone:"")+(customer.address?" · "+customer.address:""),()=>{
   plumbingData.customers=plumbingData.customers.filter(item=>item.id!==customer.id);savePlumbingData();renderPlumbingBusiness();
  }));
 }
 if(jobList){
  jobList.replaceChildren();
  if(!plumbingData.jobs.length){const empty=document.createElement("div");empty.className="workshop-empty";empty.textContent="No jobs recorded yet.";jobList.appendChild(empty);}
  plumbingData.jobs.forEach(job=>{
   const row=document.createElement("div");row.className="workshop-item";
   const details=document.createElement("span");details.textContent=job.title+" · "+job.customer+" · "+(job.date||"Date not set");row.appendChild(details);
   const statusSelect=document.createElement("select");statusSelect.className="control";
   ["Enquiry","Quote needed","Booked","In progress","Completed","Invoiced"].forEach(status=>{const option=document.createElement("option");option.value=status;option.textContent=status;statusSelect.appendChild(option);});
   statusSelect.value=job.status;statusSelect.setAttribute("aria-label","Status for "+job.title);
   statusSelect.addEventListener("change",()=>{job.status=statusSelect.value;savePlumbingData();});
   row.appendChild(statusSelect);
   const remove=document.createElement("button");remove.type="button";remove.textContent="REMOVE";remove.addEventListener("click",()=>{plumbingData.jobs=plumbingData.jobs.filter(item=>item.id!==job.id);savePlumbingData();renderPlumbingBusiness();});row.appendChild(remove);
   jobList.appendChild(row);
  });
 }
}
document.getElementById("biz-add-customer")?.addEventListener("click",()=>{
 const name=document.getElementById("biz-customer-name")?.value.trim();
 const phone=document.getElementById("biz-customer-phone")?.value.trim()||"";
 const address=document.getElementById("biz-customer-address")?.value.trim()||"";
 if(!name){if(businessStatus)businessStatus.textContent="ENTER A CUSTOMER NAME FIRST.";return;}
 plumbingData.customers.unshift({id:"customer-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),name:name.slice(0,90),phone:phone.slice(0,35),address:address.slice(0,160),createdAt:Date.now()});
 ["biz-customer-name","biz-customer-phone","biz-customer-address"].forEach(id=>{const field=document.getElementById(id);if(field)field.value="";});
 savePlumbingData();renderPlumbingBusiness();
});
document.getElementById("biz-add-job")?.addEventListener("click",()=>{
 const title=document.getElementById("biz-job-title")?.value.trim();
 const customer=document.getElementById("biz-job-customer")?.value.trim();
 const date=document.getElementById("biz-job-date")?.value||"";
 const status=document.getElementById("biz-job-status")?.value||"Enquiry";
 if(!title||!customer){if(businessStatus)businessStatus.textContent="ENTER BOTH A JOB DESCRIPTION AND CUSTOMER NAME.";return;}
 plumbingData.jobs.unshift({id:"job-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),title:title.slice(0,100),customer:customer.slice(0,90),date,status,createdAt:Date.now()});
 ["biz-job-title","biz-job-customer","biz-job-date"].forEach(id=>{const field=document.getElementById(id);if(field)field.value="";});
 savePlumbingData();renderPlumbingBusiness();
});
document.getElementById("biz-make-quote")?.addEventListener("click",()=>{
 const customer=document.getElementById("biz-quote-customer")?.value.trim()||"Customer";
 const description=document.getElementById("biz-quote-description")?.value.trim()||"Work description to be confirmed";
 const labour=Number(document.getElementById("biz-quote-labour")?.value);
 const materials=Number(document.getElementById("biz-quote-materials")?.value);
 const vat=Number(document.getElementById("biz-quote-vat")?.value);
 const output=document.getElementById("biz-quote-total");
 if(!Number.isFinite(labour)||!Number.isFinite(materials)||!Number.isFinite(vat)||labour<0||materials<0||vat<0||vat>100){
  if(output)output.textContent="Please enter valid non-negative amounts and a VAT percentage between 0 and 100.";return;
 }
 const subtotal=labour+materials,vatAmount=subtotal*vat/100,total=subtotal+vatAmount;
 const euro=value=>new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR"}).format(value);
 const lines=["PLUMBING WORK — QUOTATION DRAFT","Customer: "+customer,"Description: "+description,"Labour: "+euro(labour),"Materials: "+euro(materials),"Subtotal: "+euro(subtotal),"VAT ("+vat+"%): "+euro(vatAmount),"TOTAL: "+euro(total),"","DRAFT ONLY — confirm scope, pricing, VAT treatment, terms and business details before sending."];
 if(output){output.replaceChildren();const pre=document.createElement("pre");pre.style.whiteSpace="pre-wrap";pre.style.fontFamily="inherit";pre.textContent=lines.join("\n");output.appendChild(pre);}
 if(businessStatus)businessStatus.textContent="QUOTE DRAFT CALCULATED // CHECK VAT AND ALL DETAILS BEFORE USE.";
});
renderPlumbingBusiness();
