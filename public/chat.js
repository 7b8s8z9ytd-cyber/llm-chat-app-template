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
const chatHistory=[{role:"assistant",content:"Good evening. J.A.R.V.I.S systems are online. How may I assist?"}];
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
function speak(text){
 if(!voiceOutput||!("speechSynthesis"in window)||!text){setAvatarState("idle");return;}
 window.speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance(text);
 utterance.rate=1;utterance.pitch=.92;utterance.volume=.9;
 utterance.onstart=()=>setAvatarState("speaking");
 utterance.onend=()=>setAvatarState("idle");
 utterance.onerror=()=>setAvatarState("idle");
 window.speechSynthesis.speak(utterance);
}
function parseSse(buffer){
 const normalized=buffer.replace(/\r/g,"");
 const parts=normalized.split("\n\n");
 const remainder=parts.pop();
 const events=parts.map(part=>part.split("\n").filter(line=>line.startsWith("data:")).map(line=>line.slice(5).trimStart()).join("\n")).filter(Boolean);
 return {events,buffer:remainder};
}
async function sendMessage(){
 const message=userInput.value.trim();
 if(!message||isProcessing)return;
 if(/\\b(run|start|do)\\s+(a\\s+)?(chromebook\\s+)?(system\\s+)?diagnostics?\\b|\\bcheck my chromebook\\b/i.test(message)){
  addMessage("user",message);userInput.value="";userInput.style.height="auto";
  addMessage("assistant","Certainly. I will run the safe browser and connection checks now. For deeper hardware tests, please use the ChromeOS Diagnostics app.");
  const result=await runDiagnostics();
  addMessage("assistant",result.issues.length?"The checks found: "+result.issues.join(" "):"The checks I can access look OK. This is not a full hardware test.");
  return;
 }
 isProcessing=true;userInput.disabled=true;sendButton.disabled=true;
 addMessage("user",message);userInput.value="";userInput.style.height="auto";
 typingIndicator.classList.add("visible");coreStatus.textContent="PROCESSING REQUEST";aiStatus.textContent="AI CORE ACTIVE";setAvatarState("idle");
 chatHistory.push({role:"user",content:message});
 let responseText="";
 const responseEl=document.createElement("div");responseEl.className="message assistant-message";chatMessages.appendChild(responseEl);
 try{
  const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:chatHistory})});
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
  if(!responseText)throw new Error("The AI returned an empty response");
  chatHistory.push({role:"assistant",content:responseText});speak(responseText);
  coreStatus.textContent="RESPONSE COMPLETE";aiStatus.textContent="AI CORE READY";
 }catch(error){
  console.error(error);responseEl.textContent="I couldn't reach the AI service. Please try again in a moment.";
  coreStatus.textContent="CONNECTION ISSUE";aiStatus.textContent="CHECK AI CONNECTION";setAvatarState("idle");
 }finally{
  typingIndicator.classList.remove("visible");isProcessing=false;userInput.disabled=false;sendButton.disabled=false;userInput.focus();
 }
}
