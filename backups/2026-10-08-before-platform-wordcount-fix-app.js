const $ = (selector) => document.querySelector(selector);

const brands = {
  streetwear: {
    name: "Northstar Supply", handle: "northstarsupply", avatar: "N", platform: "instagram",
    description: "Independent streetwear. Unfiltered, playful, community-first.",
    summary: "A little grit, a lot of heart. Northstar talks like the friend who found the good spot first and brought everyone along.",
    tone: "Direct · playful · streetwise", dos: "Talk to the community. Keep it punchy.", donts: "Skip corporate speak and fake hype.",
    samples: ["No map. No rush. Just the long way home.  #NorthstarSupply", "The city looks better when you take the side streets. You know the ones. ", "Small batch. Big plans. The new utility overshirt is here. What are you pairing it with?  #BuiltForTheInBetween", "Same crew, new uniform. Appreciate everyone who showed up for the pop-up. You made it feel like home. ", "Weather said stay in. We said one more lap.  #KeepMoving", "Good clothes get stories. Tag us in yours. #NorthstarOnTheMove "],
  },
  saas: {
    name: "SignalDesk", handle: "signaldesk", avatar: "S", platform: "linkedin",
    description: "B2B SaaS for customer teams. Clear, useful, quietly confident.",
    summary: "SignalDesk makes complex work feel manageable. The voice is thoughtful and specific, with the customer’s day always in view.",
    tone: "Clear · useful · quietly confident", dos: "Lead with an insight. Make the benefit concrete.", donts: "Avoid buzzwords and unsupported claims.",
    samples: ["The best customer handoff is the one your customer never has to think about. We made a small change to help teams get there.", "A faster response is good. A response with the right context is better. Here is how support teams can close that gap.", "We spoke with 18 customer leaders about the signals they trust. One pattern kept coming up: context beats volume.", "New in SignalDesk: shared account notes. Your team can pick up the conversation without asking the customer to start over.", "Good operations are often invisible. This week, we are sharing a look at the workflows that keep customer teams aligned.", "A product update should solve a real Tuesday problem. This one helps teams see what needs attention before it becomes urgent."],
  }
};
let previousScenario = "streetwear";
let campaignAssets = {};
let voiceMode = "fresh";
let customVoiceProfile = null;
let creatorCategory = "product";
let setupStep = 1;
let setupHasPosts = null;
let outputLanguage = "English";
let setupAnswers = {};
let scenarioCatalog = {};
let voiceProfiles = [];
let currentCampaignId = null;
let currentDraftId = null;
let currentDraftPlatform = null;
let currentCampaignSignature = "";
let hasApiDraft = false;
let wordTargetTimer = null;
let lastQuality = {};
let selectedVoiceProfileId = null;
let researchResults = [];
let currentVideoAssetId = null;

const sentencePattern = /[^.!?]+[.!?]+|[^.!?]+$/g;
const wordPattern = /[\p{L}\p{N}\p{M}]+(?:['’][\p{L}\p{N}\p{M}]+)*/gu;
const hashtagPattern = /#[\p{L}\p{N}_]+/gu;
function words(text) { return text.match(wordPattern) || []; }
function platformName(value){return ({instagram:"Instagram",linkedin:"LinkedIn",x:"X",tiktok:"TikTok",facebook:"Facebook",threads:"Threads",youtube_shorts:"YouTube Shorts",pinterest:"Pinterest"})[value]||value;}
function getStats(posts) {
  let lens = [], tags = 0, questions = 0;
  for (const post of posts) { const ss = post.match(sentencePattern) || []; lens.push(...ss.map(s => words(s).length).filter(Boolean)); tags += (post.match(hashtagPattern) || []).length; if (post.includes("?")) questions++; }
  return { sentenceLength: lens.length ? lens.reduce((a,b)=>a+b,0)/lens.length : 0, hashtags: posts.length ? tags/posts.length : 0, questionRatio: posts.length ? questions/posts.length*100 : 0 };
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function currentBrand() { return brands[$("#scenario").value]; }
function renderProfile(key) {
  const b=brands[key];
  const samplePosts=voiceMode==="posts"?samplePostInput():voiceMode==="fresh"?[]:b.samples;
  const m=samplePosts.length?getStats(samplePosts):null;
  let localProfile=b;
  if(voiceMode==="fresh"){
    const description=$("#voice-description").value.trim(), favorite=$("#favorite-words").value.trim(), avoid=$("#avoid-words").value.trim();
    localProfile={summary:description||"No post history yet. Set the voice using your preferences and refine it as you write.",tone:$("#voice-tone").value,dos:favorite?`Use these words naturally: ${favorite}.`:"Tell us which words and phrases feel like you.",donts:avoid?`Avoid these words: ${avoid}.`:"Review every draft and add any terms you want to avoid."};
  }else if(voiceMode==="posts"){
    localProfile={summary:samplePosts.length?"Your profile will be based on the writing samples you provide.":"Paste one or more of your posts to build a profile.",tone:"Tone is waiting for your sample posts.",dos:"Add favorite words if you want them used naturally.",donts:"Add terms or claims you want to avoid."};
  }
  const p=customVoiceProfile||localProfile;
  $("#profile-title").textContent=voiceMode==="demo"?b.name:"Your voice profile"; $("#profile-summary").textContent=p.summary||b.summary; if($("#scenario-description"))$("#scenario-description").textContent=b.description;
  $("#tone-notes").textContent=p.tone||b.tone; $("#dos-notes").textContent=p.dos||b.dos; $("#donts-notes").textContent=p.donts||b.donts;
  $("#adapted-brand-title").textContent=voiceMode==="demo"?b.name:"Your voice"; $("#adapted-handle").textContent=voiceMode==="demo"?b.handle:"personal profile"; $("#brand-avatar").textContent=voiceMode==="demo"?b.avatar:"Y";
  $("#metrics-grid").innerHTML=m?[[m.sentenceLength.toFixed(1),"WORDS / SENTENCE"],[m.hashtags.toFixed(1),"HASHTAGS / POST"],[`${Math.round(m.questionRatio)}%`,"POSTS WITH A QUESTION"]].map(([v,l])=>`<div class="metric"><strong>${v}</strong><span>${l}</span></div>`).join(""):[["—","NO POST HISTORY"],["—","NO POST HISTORY"],["—","NO POST HISTORY"]].map(([v,l])=>`<div class="metric"><strong>${v}</strong><span>${l}</span></div>`).join("");
  $("#library").hidden=voiceMode==="fresh";
  if(voiceMode==="posts")$("#library summary").firstChild.textContent=`View ${samplePosts.length||"your"} sample posts behind this profile `;
  $("#sample-list").innerHTML=samplePosts.map(s=>`<li>${escapeHtml(s)}</li>`).join("");
}
function samplePostInput(){return $("#sample-posts-input").value.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean).slice(0,10);}
function values() { creatorCategory=$("#campaign-category").value;outputLanguage=$("#campaign-language").value;return { brand_id:$("#scenario").value||"streetwear", profile_id:selectedVoiceProfileId, category:creatorCategory, scenario_id:$("#scenario-id").value, campaign_intent:$("#campaign-intent").value, target_words:+$("#target-words").value, energy:+$("#energy").value, language:outputLanguage, optimization:$("#optimization").value, keywords:$("#campaign-keywords").value.trim(), keyword_context:$("#keyword-context").value.trim(), topic:$("#topic").value.trim(), platform:$("#platform").value, length:"medium", formality:+$("#formality").value, audience:$("#audience").value.trim(), campaign_name:"", campaign_goal:$("#campaign-goal").value.trim(), knowledge:$("#brand-knowledge").value.trim(), style_guide:$("#style-guide").value.trim(), voice_mode:voiceMode, sample_posts:voiceMode==="posts"?samplePostInput():[], voice_description:$("#voice-description").value.trim(), voice_tone:$("#voice-tone").value, favorite_words:$("#favorite-words").value.trim(), avoid_words:$("#avoid-words").value.trim() }; }
function cleanSubject(topic) { return topic.trim().replace(/[.!?]+$/,"" ) || "Our latest update"; }
function formalityStyle(value, saas) {
  if(value<30) return saas?"plain-spoken":"casual";
  if(value<70) return saas?"clear and warm":"confident and relaxed";
  return saas?"polished and precise":"considered and refined";
}
function buildDraft(v, adapted=true, editSeed="") {
  const b=brands[v.brand_id], saas=v.brand_id==="saas", subject=cleanSubject(v.topic), formal=v.formality>=68, veryFormal=v.formality>=82;
  const campaign=v.campaign_name ? `${v.campaign_name}: ` : "";
  const knowledge=v.knowledge ? v.knowledge.split(/[.!?\n]/).map(s=>s.trim()).filter(Boolean).slice(0,2).join(". ") : "";
  const goal=v.campaign_goal || "";
  const audience=v.audience || "";
  const factual=knowledge ? `${knowledge.replace(/[.!?]+$/g,"")}.` : "";
  let opening, body, close;
  if(!adapted) {
    opening=veryFormal?"We are pleased to announce":"Here’s the update";
    body=`${subject}. ${factual||"Explore the latest details and see what is new."}`;
    close=/instagram/.test(v.platform)?"Take a look today.":"Learn more today.";
  } else if(saas) {
    opening=veryFormal?"A clearer way forward for customer teams.":formal?"A practical update for customer teams.":"A small update, built around a real workday.";
    body=editSeed || `${campaign}${subject}. ${factual || `We focused on making the next step clearer for ${audience}.`} ${formal?`The aim is simple: ${goal.toLowerCase().replace(/[.!?]+$/g,"")}.`:`Less time coordinating, more time helping customers.`}`;
    close=v.platform==="x"?"What would make this workflow clearer?":"See what changed, and tell us what would make your workflow clearer.";
  } else {
    opening=veryFormal?"A clear story, with the details that matter.":formal?"A thoughtful update for your audience.":"Here’s what matters.";
    body=editSeed || `${campaign}${subject}.${factual?` ${factual}`:""}${audience?` For ${audience}.`:""}${goal?` The goal is to ${goal.toLowerCase().replace(/[.!?]+$/g,"")}.`:""}`;
    close="What would you add?";
  }
  if(adapted&&v.voice_mode==="fresh"){
    const tone=(v.voice_tone||v.voice_description||"").toLowerCase();
    if(/witty|playful/.test(tone))opening="A little less ordinary. A lot more you.";
    else if(/expert|precise/.test(tone))opening="A clear update, with the details that matter.";
    else if(/minimal|direct/.test(tone))opening="Here is what is new.";
    else if(/warm|approachable/.test(tone))opening="A note from us, for you.";
  }
  if(v.length==="short") { body=body.split(/(?<=[.!?])\s+/).slice(0,1).join(" "); close=""; }
  if(v.length==="long") body += saas?" We shaped this around the moments that slow customer teams down, so the next handoff has more useful context.":" Wear it your way, take the side streets, and make the everyday yours.";
  if(v.platform==="x" && words(`${opening} ${body} ${close}`).length>45) body=body.split(/(?<=[.!?])\s+/).slice(0,2).join(" ");
  let text=[opening,body,close].filter(Boolean).join("\n\n");
  if(adapted && !saas && v.platform==="instagram") text += "";
  if(adapted && saas && v.platform==="linkedin" && v.length!=="short") text += "\n\nLess noise. Better conversations.";
  if(adapted&&v.platform==="tiktok")text=`${opening} ${body.split(".")[0]}.\n\n#ForYou #BehindTheBrand`;
  if(adapted&&v.platform==="threads")text=[opening,body,close].filter(Boolean).join(" ");
  if(adapted&&v.platform==="facebook")text=[opening,body,close].filter(Boolean).join("\n\n");
  if(adapted&&v.platform==="youtube_shorts")text=`${opening}\n\n${body}\n\nWatch the short for the full story.`;
  if(adapted&&v.platform==="pinterest")text=`${subject}: ${body}`;
  const favorite=(v.favorite_words||"").split(",").map(s=>s.trim()).find(Boolean);
  if(adapted&&favorite&&!text.toLowerCase().includes(favorite.toLowerCase()))text+=`\n\nKeep the feel of “${favorite}” in every detail.`;
  if(adapted&&v.keywords){const keyword=v.keywords.split(/,|\n/).map(x=>x.trim()).find(Boolean);if(keyword&&!text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()))text+=`\n\n${keyword}${v.keyword_context?` — ${v.keyword_context.trim().replace(/[.!?]+$/g,"")}.`:"."}`;}
  if(adapted&&["aeo","all"].includes(v.optimization)&&v.topic)text=`What should you know about ${v.topic.replace(/[?.!]+$/g,"")}? ${v.knowledge}\n\n${text}`;
  if(adapted&&["geo","all"].includes(v.optimization)&&v.knowledge&&!text.toLocaleLowerCase().includes(v.knowledge.toLocaleLowerCase()))text+=`\n\nContext: ${v.knowledge}`;
  if(adapted&&v.category!=="product"){
    const categoryLead={ngo:"A better future starts when communities lead.",business:"A clearer way to solve a real customer problem.",creator:"I wanted to share this with you."}[v.category];
    const categoryClose={ngo:"Join the work. Share this with someone who cares.",business:"Talk with our team to find the right fit.",creator:"What would you add? Tell me below."}[v.category];
    text=[categoryLead,`${v.campaign_name?`${v.campaign_name}: `:""}${subject}. ${factual||v.knowledge||""} ${goal}`.trim(),categoryClose].filter(Boolean).join("\n\n");
  }
  if(adapted&&v.keywords){const keyword=v.keywords.split(/,|\n/).map(x=>x.trim()).find(Boolean);if(keyword&&!text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()))text+=`\n\n${keyword}${v.keyword_context?` — ${v.keyword_context.trim().replace(/[.!?]+$/g,"")}.`:"."}`;}
  if(adapted&&v.avoid_words)for(const term of v.avoid_words.split(",").map(s=>s.trim()).filter(s=>s.length>2))text=text.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"ig"),"").replace(/[ \t]{2,}/g," ");
  if(adapted && v.style_guide) { const avoid=(v.style_guide.match(/(?:avoid|never|skip|don't|do not)\s+([^.;\n]+)/i)||[])[1]; if(avoid) for(const term of avoid.split(/,|\band\b/i).map(s=>s.trim()).filter(s=>s.length>2)) text=text.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"ig"),"").replace(/\s{2,}/g," "); }
  if(adapted && v.formality>=70) {
    text=text.replace("Built for the long way round and everything in between.","Designed for everyday wear, from the usual route to the unexpected turn.")
      .replace("What piece are you claiming first?","Explore the collection and find the piece that feels like you.")
      .replace("tell us what would make your workflow clearer.","share which workflow improvements would be most useful.");
  } else if(adapted && v.formality<30) {
    text=text.replace("We focused on making", "We built this to make").replace("See what changed, and tell us", "Take a look and tell us");
  }
  if(v.platform==="instagram" && v.length!=="short" && adapted && !saas) text=text.replace(/\n\n/g,"\n\n");
  if(adapted&&v.platform==="x"&&text.length>280)text=`${text.slice(0,277).replace(/\s+\S*$/,"" )}…`;
  return text;
}
function updateCounts() { const target=+$("#target-words").value;$("#generic-words").textContent=`${words($("#generic-output").textContent).length} WORDS`;$("#adapted-words").textContent=`${words($("#adapted-output").value).length} / ${target} WORDS`; }
function generateLocal(options={}) {
  const v=values(); $("#generic-platform").textContent=platformName(v.platform).toUpperCase(); $("#adapted-platform").textContent=platformName(v.platform).toUpperCase();
  if(hasApiDraft){updateCounts();$("#draft-status-text").textContent="SETTINGS CHANGED · REGENERATE TO APPLY";return;}
  if(!v.topic){$("#generic-output").textContent="";$("#adapted-output").value="";updateCounts();$("#draft-status-text").textContent="ADD AN IDEA TO START";return;}
  $("#generic-output").textContent=buildDraft(v,false); $("#adapted-output").value=buildDraft(v,true,options.editSeed||""); updateCounts(); $("#draft-status-text").textContent=options.editSeed?"REWORKED FROM YOUR EDIT":"READY TO EDIT";
}
async function generateFromApi(options={}) {
  const input=values();
  if(!input.topic){$("#draft-status-text").textContent="ADD YOUR IDEA FIRST";$("#topic").focus();return;}
  generateLocal(options); $("#draft-status-text").textContent="WRITING…";
  try {
    const response=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...input,edit_seed:options.editSeed||""})});
    const result=await response.json();if(!response.ok) throw new Error(result.error||"Generation unavailable");
    if(typeof result.generic!=="string"||typeof result.adapted!=="string") throw new Error("Invalid API result");
    hasApiDraft=true; $("#generic-output").textContent=result.generic; $("#adapted-output").value=result.adapted; updateCounts();
    const requestValues=input;resetPublishApproval();const modeLabel=result.mode==="sarvam"?"SARVAM GENERATED":result.mode==="openai-compatible"?"AI GENERATED":"LOCAL STARTER DRAFT";$("#draft-status-text").textContent=`${modeLabel} · ${result.word_count}/${result.target_words} WORDS`;$("#api-status-label").textContent=result.mode==="sarvam"?"SARVAM CONNECTED":result.mode==="openai-compatible"?"AI CONNECTED":"LOCAL MODE";await scoreDraft(result.adapted,requestValues);await saveCampaignAndDraft(result.adapted,requestValues);
  } catch (error) { $("#draft-status-text").textContent=error.message||"GENERATION UNAVAILABLE";$("#quality-total").innerHTML="—<small>/100</small>"; }
}
async function scoreDraft(text,v){try{const r=await fetch("/api/score",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:{sample_posts:v.sample_posts},output:text,platform:v.platform,category:v.category,scenario_id:v.scenario_id,target_words:v.target_words,keywords:v.keywords,keyword_context:v.keyword_context,avoid_words:v.avoid_words,optimization:v.optimization})});const d=await r.json();if(!r.ok)return;lastQuality=d;$("#quality-total").innerHTML=`${d.score}<small>/100</small>`;const names={voice_fit:"VOICE FIT",audience_scenario_fit:"AUDIENCE + SCENARIO",platform_fit:"CHANNEL FIT",keyword_context:"KEYWORD + CONTEXT",clarity:"CLARITY",brand_safety:"BRAND SAFETY",discovery_readiness:"SEO · AEO · GEO"};$("#quality-breakdown").innerHTML=Object.entries(d.dimensions).map(([k,n])=>`<div><strong>${n}</strong><span>${names[k]}</span></div>`).join("")+(d.suggestions?.length?`<ul class="quality-suggestions">${d.suggestions.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul>`:'<p class="quality-suggestions">No improvement flags from the current rubric.</p>');}catch{}}
async function saveCampaignAndDraft(content,v){
  const signature=JSON.stringify([v.category,v.scenario_id,v.topic,v.keywords,v.keyword_context,v.campaign_goal,v.knowledge,v.language]);
  if(signature!==currentCampaignSignature){
    const campaign={profile_id:v.profile_id,category:v.category,scenario_id:v.scenario_id,name:v.topic||"Untitled draft",brief:[v.topic,v.campaign_goal,v.knowledge].filter(Boolean).join("\n\n"),keywords:v.keywords,keyword_context:v.keyword_context,settings:{platform:v.platform,language:v.language,target_words:v.target_words,formality:v.formality,energy:v.energy,intent:v.campaign_intent}};
    const cr=await fetch("/api/campaigns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(campaign)});const cd=await cr.json();if(!cr.ok)throw new Error(cd.error||"Campaign save failed");currentCampaignId=cd.id;currentCampaignSignature=signature;
  }
    const dr=await fetch("/api/drafts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaign_id:currentCampaignId,platform:v.platform,language:v.language,content,quality:lastQuality})});const dd=await dr.json();if(!dr.ok)throw new Error(dd.error||"Draft save failed");currentDraftId=dd.id;currentDraftPlatform=v.platform;$("#draft-save-status").textContent="Saved locally · "+platformName(v.platform);
}
async function persistEditedDraft(){const content=$("#adapted-output").value.trim();if(!content)return;try{if(currentDraftId){const r=await fetch(`/api/drafts/${currentDraftId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({content})});if(!r.ok)throw new Error();}else await saveCampaignAndDraft(content,values());$("#draft-save-status").textContent="Edited draft saved locally.";}catch{$("#draft-save-status").textContent="Could not save the edited draft.";}}
function resetPublishApproval(){const consent=$("#publish-consent"),button=$("#approve-publish");if(consent){consent.checked=false;button.disabled=true;}}
async function analyzeProfile(key) {
  try { const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({brand_id:key,sample_posts:brands[key].samples})}); if(!r.ok)return; const d=await r.json();
    if(d.profile){$("#profile-summary").textContent=d.profile.summary||brands[key].summary;$("#tone-notes").textContent=d.profile.tone||brands[key].tone;$("#dos-notes").textContent=d.profile.dos||brands[key].dos;$("#donts-notes").textContent=d.profile.donts||brands[key].donts;}
    if(d.metrics){const m=d.metrics;$("#metrics-grid").innerHTML=[[m.average_sentence_length,"WORDS / SENTENCE"],[m.average_hashtags_per_post,"HASHTAGS / POST"],[`${m.question_ratio_percent}%`,"POSTS WITH A QUESTION"]].map(([v,l])=>`<div class="metric"><strong>${escapeHtml(v)}</strong><span>${l}</span></div>`).join("");}
  } catch { /* Local profile remains available. */ }
}
function setVoiceMode(mode){voiceMode=mode;customVoiceProfile=null;document.querySelectorAll("[data-voice-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.voiceMode===mode)));$("#voice-demo-panel").hidden=mode!=="demo";$("#voice-posts-panel").hidden=mode!=="posts";$("#voice-fresh-panel").hidden=mode!=="fresh";$("#voice-source-badge").textContent=mode==="demo"?"DEMO PROFILE":mode==="posts"?"YOUR POSTS":"PREFERENCE-BASED";$("#voice-analysis-status").textContent=mode==="demo"?"Demo voice is ready. You can switch to your own examples or start from preferences.":mode==="posts"?"Paste a few posts, then build a profile from your writing.":"No post history needed. Describe your style and preferred words.";renderProfile($("#scenario").value);generateLocal();}
async function buildVoiceProfile(){const v=values();if(voiceMode==="posts"&&!v.sample_posts.length){$("#voice-analysis-status").textContent="Paste at least one authored post, or start with preferences.";return;}if(voiceMode==="fresh"&&!v.voice_description&&!v.favorite_words&&!v.avoid_words&&!v.voice_tone){$("#voice-analysis-status").textContent="Describe your style or add preferred or avoided words first.";return;}$("#voice-analysis-status").textContent="Building your voice profile…";try{const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...v,brand_id:v.brand_id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Profile analysis unavailable");customVoiceProfile={...d.profile};const metrics=d.metrics||{};if(d.metrics)$("#metrics-grid").innerHTML=[[metrics.average_sentence_length,"WORDS / SENTENCE"],[metrics.average_hashtags_per_post,"HASHTAGS / POST"],[`${metrics.question_ratio_percent}%`,"POSTS WITH A QUESTION"]].map(([x,l])=>`<div class="metric"><strong>${escapeHtml(x)}</strong><span>${l}</span></div>`).join("");$("#voice-analysis-status").textContent=d.mode==="ai"?"AI-assisted profile ready. Review and edit its traits.":"Profile ready. Save it to reuse this voice.";$("#api-status-label").textContent=d.mode==="ai"?"AI CONNECTED":"LOCAL MODE";renderProfile(v.brand_id);generateLocal();}catch(e){$("#voice-analysis-status").textContent=e.message||"Could not build the profile. Your inputs are still available.";}}
async function discoverPublicPosts(){
  const urls=$("#profile-url").value.split(/\n|,/).map(x=>x.trim()).filter(Boolean);
  $("#discover-status").textContent="Searching public excerpts…";
  $("#discover-results").innerHTML="";
  if(!urls.length){$("#discover-status").textContent="Paste a public profile URL first.";return;}
  try{
    const r=await fetch("/api/discover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile_urls:urls})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||"Search unavailable");
    const results=d.results||[];window.discoveredPosts=results;
    if(!results.length){$("#discover-status").textContent="No indexed excerpts were returned. Continue with a recording or a voice description.";return;}
    const failures=(d.failures||[]).map(x=>`${platformName(x.platform)}: ${x.error}`).join(" · ");
    $("#discover-status").textContent=`${results.length} excerpts. Keep checked only the posts you wrote.${failures?` ${failures}`:""}`;
    $("#discover-results").innerHTML=results.map((x,i)=>`<label class="discover-item"><input type="checkbox" data-result-index="${i}"><span><strong>${escapeHtml(x.platform||"").toUpperCase()} · ${escapeHtml(x.title||"Public post excerpt")}</strong><span>${escapeHtml(x.snippet||"")}</span><a href="${escapeHtml(x.link||"#")}" target="_blank" rel="noopener">Open source ↗</a></span></label>`).join("");
  }catch(e){$("#discover-status").textContent=e.message||"Search unavailable. Continue without search.";}
}
async function transcribeVoiceAudio(){
  const file=$("#voice-audio")?.files?.[0];
  if(!file){$("#voice-audio-status").textContent="Choose an audio recording first.";return;}
  const target=setupHasPosts?$("#setup-authored-posts"):$("#setup-style-answer");
  $("#transcribe-voice").disabled=true;$("#voice-audio-status").textContent="Transcribing on this computer with Whisper…";
  try{
    const form=new FormData();form.append("file",file);
    const response=await fetch("/api/transcribe",{method:"POST",body:form});const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Transcription failed.");
    target.value=[target.value.trim(),data.text].filter(Boolean).join("\n\n");
    const labels={kn:"Kannada",hi:"Hindi",en:"English"};
    $("#voice-audio-status").textContent=`Transcribed in ${labels[data.language]||data.language}. The transcript is added to your voice input.`;
  }catch(error){$("#voice-audio-status").textContent=error.message||"Could not transcribe this recording.";}
  finally{$("#transcribe-voice").disabled=false;}
}
async function researchCampaignContext(){const query=$("#research-query").value.trim();if(!query){$("#research-status").textContent="Enter a topic, place, or public campaign question first.";return;}$("#research-status").textContent="Searching public web references…";$("#research-results").innerHTML="";$("#use-research-results").hidden=true;try{const r=await fetch("/api/research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Search unavailable");researchResults=d.results||[];if(!researchResults.length){$("#research-status").textContent="No public results found for that query.";return;}$("#research-status").textContent=`${researchResults.length} public results. Review sources and select only context you have verified.`;$("#research-results").innerHTML=researchResults.map((x,i)=>`<label class="discover-item"><input type="checkbox" data-research-index="${i}"><span><strong>${escapeHtml(x.title||"Search result")}</strong><span>${escapeHtml(x.snippet||"")}</span><small>${escapeHtml(x.source||"")}${x.date?` · ${escapeHtml(x.date)}`:""}</small><a href="${escapeHtml(x.link||"#")}" target="_blank" rel="noopener">Open source ↗</a></span></label>`).join("");$("#use-research-results").hidden=false;}catch(e){$("#research-status").textContent=e.message||"Search unavailable.";}}
function useResearchContext(){const chosen=[...document.querySelectorAll("[data-research-index]:checked")].map(el=>researchResults[+el.dataset.researchIndex]).filter(Boolean);if(!chosen.length){$("#research-status").textContent="Select at least one reference to add.";return;}const excerpts=chosen.map(x=>`${x.title}. ${x.snippet} (Source: ${x.link})`).join("\n\n");const existing=$("#brand-knowledge").value.trim();$("#brand-knowledge").value=[existing,excerpts].filter(Boolean).join("\n\n");$("#research-status").textContent="Selected excerpts added to the brief. Verify their claims before generating.";}
async function loadScenarios(category, selected=""){
  try{if(!Object.keys(scenarioCatalog).length){const r=await fetch("/api/scenarios");scenarioCatalog=await r.json();}}
  catch{scenarioCatalog={};}
  const list=scenarioCatalog[category]||[];$("#scenario-id").innerHTML=list.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)} · ${escapeHtml(x.description)}</option>`).join("");
  if(selected&&list.some(x=>x.id===selected))$("#scenario-id").value=selected;
}
async function loadVoiceProfiles(){
  try{const r=await fetch("/api/voice-profiles");const d=await r.json();voiceProfiles=d.profiles||[];
    const select=$("#saved-voice-select");select.innerHTML='<option value="">Choose a starter or saved profile</option>'+voiceProfiles.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.category.toUpperCase())} · ${escapeHtml(p.name)}${p.is_preset?" · starter":" · saved"}</option>`).join("");
  }catch{}
}
async function loadPlatformConnections(){
  try{const r=await fetch("/api/platforms");const d=await r.json();const fb=d.platforms.find(p=>p.platform==="facebook");const pages=fb?.capabilities?.facebook_pages||[];$("#facebook-page-wrap").hidden=!pages.length;$("#publish-facebook-page").innerHTML=pages.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");const pin=d.platforms.find(p=>p.platform==="pinterest");$("#pinterest-board-wrap").hidden=!pin?.connected;const yt=d.platforms.find(p=>p.platform==="youtube_shorts");$("#youtube-video-wrap").hidden=!yt?.connected;$("#youtube-title-wrap").hidden=!yt?.connected;$("#youtube-privacy-wrap").hidden=!yt?.connected;$("#platform-connection-list").innerHTML=d.platforms.map(p=>`<div class="platform-connection"><div><strong>${escapeHtml(platformName(p.platform))}</strong><span>${escapeHtml(p.connected?p.account_label||"Connected":p.configured?"Ready to connect":"Public search available · account login not configured")}</span></div><div class="connection-actions">${p.connected&&p.capabilities?.can_read_posts?`<button type="button" data-import-platform="${escapeHtml(p.platform)}">Import posts</button>`:""}${p.connected||p.configured?`<button type="button" data-connect-platform="${escapeHtml(p.platform)}" data-connect-url="${escapeHtml(p.connect_url||"")}" data-connected="${p.connected}">${p.connected?"Disconnect":"Connect account"}</button>`:""}</div></div>`).join("");
    document.querySelectorAll("[data-connect-platform]").forEach(b=>b.onclick=async()=>{const platform=b.dataset.connectPlatform;if(b.dataset.connected==="false"){if(b.dataset.connectUrl){window.location.href=b.dataset.connectUrl;return;}$("#publish-status").textContent="Add the platform developer app credentials and approved OAuth scopes to the server environment first.";return;}try{const res=await fetch(`/api/platforms/${platform}/connect`,{method:"DELETE"});const result=await res.json();$("#publish-status").textContent=result.error||result.status||"Connection state updated.";await loadPlatformConnections();}catch{$("#publish-status").textContent="Could not reach the local connection service.";}});
    document.querySelectorAll("[data-import-platform]").forEach(b=>b.onclick=()=>importConnectedPosts(b.dataset.importPlatform));
  }catch{$("#platform-connection-list").textContent="Platform connection status is unavailable.";}
}
async function importConnectedPosts(platform){try{$("#publish-status").textContent=`Importing authorized ${platformName(platform)} posts…`;const query=platform==="facebook"?`?page_id=${encodeURIComponent($("#publish-facebook-page").value)}`:"";const r=await fetch(`/api/platforms/${platform}/posts${query}`);const d=await r.json();if(!r.ok)throw new Error(d.error||"Provider post history unavailable");if(!d.posts?.length)throw new Error("No authored post text was returned. You can paste examples manually.");$("#sample-posts-input").value=d.posts.map(x=>x.text).join("\n\n");setVoiceMode("posts");renderProfile($("#scenario").value);await buildVoiceProfile();$("#publish-status").textContent=`Imported ${d.posts.length} authored posts from ${platformName(platform)}. Original text is preserved in the sample field.`;}catch(e){$("#publish-status").textContent=e.message||"Could not import posts.";}}
async function loadPerformanceSummary(){
  try{const r=await fetch("/api/performance");const d=await r.json();const target=$("#performance-summary");
    if(!d.observations){target.textContent="No provider-reported observations yet. Connect a supported account and sync metrics when the official API is configured.";return;}
    target.innerHTML=Object.entries(d.by_platform).map(([platform,data])=>`<div class="performance-platform"><strong>${escapeHtml(platformName(platform))}</strong><span>${data.posts} observed posts</span><span>${Object.entries(data.average||{}).map(([k,v])=>`${escapeHtml(k)} ${escapeHtml(v)}`).join(" · ")}</span></div>`).join("")+`<p>${escapeHtml(d.message||"")}</p>`;
  }catch{$("#performance-summary").textContent="Performance data is unavailable.";}
}
async function syncPerformance(){const target=$("#performance-summary");target.textContent="Requesting provider-reported metrics for published drafts…";try{const r=await fetch("/api/performance/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Metric sync failed");await loadPerformanceSummary();if(d.unavailable_platforms?.length)target.insertAdjacentHTML("beforeend",`<p>${d.synced_posts} posts synced. Some providers returned no metrics or require additional API access: ${escapeHtml(d.unavailable_platforms.join(", "))}.</p>`);}catch(e){target.textContent=e.message||"Provider metric sync failed.";}}
async function saveVoiceProfile(){
  const name=$("#voice-profile-name").value.trim();if(!name){$("#voice-analysis-status").textContent="Name this voice profile before saving.";$("#voice-profile-name").focus();return;}
  const v=values();const payload={name,category:v.category,summary:customVoiceProfile?.summary||v.voice_description,tone:customVoiceProfile?.tone||v.voice_tone,favorite_words:v.favorite_words,avoid_words:v.avoid_words,sample_posts:v.sample_posts};
  try{const r=await fetch("/api/voice-profiles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error);selectedVoiceProfileId=d.id;$("#voice-analysis-status").textContent="Voice profile saved on this device.";await loadVoiceProfiles();$("#saved-voice-select").value=d.id;}
  catch(e){$("#voice-analysis-status").textContent=e.message||"Could not save this profile.";}
}
function applyVoiceProfile(id){const p=voiceProfiles.find(x=>x.id===id);if(!p)return;selectedVoiceProfileId=p.is_preset?null:p.id;creatorCategory=p.category;$("#campaign-category").value=p.category;$("#voice-description").value=p.summary||"";$("#voice-tone").value=p.tone||"warm and approachable";$("#favorite-words").value=p.favorite_words||"";$("#avoid-words").value=p.avoid_words||"";if(p.sample_posts?.length){voiceMode="posts";$("#sample-posts-input").value=p.sample_posts.join("\n\n");}else voiceMode="fresh";document.querySelectorAll("[data-voice-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.voiceMode===voiceMode)));$("#voice-demo-panel").hidden=true;$("#voice-posts-panel").hidden=voiceMode!=="posts";$("#voice-fresh-panel").hidden=voiceMode!=="fresh";customVoiceProfile={summary:p.summary,tone:p.tone,dos:p.favorite_words?`Use naturally: ${p.favorite_words}`:"Follow this saved voice.",donts:p.avoid_words?`Avoid: ${p.avoid_words}`:""};loadScenarios(creatorCategory);renderProfile($("#scenario").value);generateLocal();}
function setScenario() {
  const key=$("#scenario").value; if(!brands[key])return;
  const saas=key==="saas";$("#platform").value=brands[key].platform;$("#formality").value=saas?68:24;$("#energy").value=saas?38:65;
  $("#formality-label").textContent=saas?"Polished":"Casual";$("#energy-label").textContent=saas?"Steady":"Energetic";
  customVoiceProfile=null;renderProfile(key);generateLocal();if(voiceMode==="demo")analyzeProfile(key);
}
function editDraft(action) {
  const box=$("#adapted-output"), text=box.value.trim(), v=values(); if(!text)return;
  const paragraphs=text.split(/\n\s*\n/); let next=text;
  if(action==="rewrite"){ next=buildDraft(v,true); }
  if(action==="clarify"){ next=text.replace(/\butilize\b/gi,"use").replace(/\bin order to\b/gi,"to").replace(/\b(the next step|the goal):/gi,"$1 is").replace(/\s+/g," ").replace(/\n\s*/g,"\n\n"); }
  if(action==="expand"){ next=`${text}\n\n${v.brand_id==="saas"?"That means teams can spend less time rebuilding context and more time responding to customers.":"Easy layers, considered details, and room to make the day your own."}`; }
  if(action==="shorten"){ next=paragraphs.slice(0,2).join("\n\n").replace(/\s+/g," ").replace(/\n /g,"\n"); }
  if(action==="cta"){ if(!/\b(shop|explore|learn more|tell us|see what|discover|visit|try)\b/i.test(text))next+=`\n\n${v.brand_id==="saas"?"See what changed and share your questions.":"Explore the collection and find your next everyday layer."}`; }
  box.value=next;updateCounts();$("#draft-status-text").textContent="EDIT APPLIED · READY TO REGENERATE";
}
async function buildCampaignPack(){
  const v=values();if(!v.topic){$("#draft-status-text").textContent="ADD YOUR IDEA FIRST";$("#topic").focus();return;}campaignAssets={};for(const p of ["instagram","linkedin","x","tiktok","facebook","threads","youtube_shorts","pinterest"]){try{const r=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...v,platform:p})});const d=await r.json();if(!r.ok)throw new Error(d.error);campaignAssets[p]=d.adapted;}catch(e){campaignAssets[p]=`Could not generate this version: ${e.message||"generation service unavailable"}`;}}
  $("#campaign-pack-results").hidden=false;showAsset("instagram");$("#campaign-pack-results").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function showSetupStep(step){
  const shell=$("#setup-question");
  if(setupStep===1&&$("#profile-url")){
    setupAnswers.profileUrl=$("#profile-url").value;
    setupAnswers.discoverStatus=$("#discover-status").textContent;
    setupAnswers.discoverHtml=$("#discover-results").innerHTML;
    setupAnswers.selectedExcerpts=[...document.querySelectorAll("[data-result-index]:checked")].map(x=>+x.dataset.resultIndex);
    const selected=setupAnswers.selectedExcerpts.map(i=>window.discoveredPosts?.[i]).filter(x=>x?.snippet);
    if(selected.length){setupAnswers.posts=selected.map(x=>x.snippet).join("\n\n");setupHasPosts=true;$("#sample-posts-input").value=setupAnswers.posts;}
  }
  if(setupStep===3 && $("#setup-platform")) setupAnswers.platform=$("#setup-platform").value;
  if(setupStep===3 && $("#output-language")) setupAnswers.language=$("#output-language").value;
  if(setupStep===4) setupAnswers.hasPosts=setupHasPosts;
  if(setupStep===5){setupAnswers.style=$("#setup-style-answer")?.value||"";setupAnswers.posts=$("#setup-authored-posts")?.value||"";}
  setupStep=step;
  const steps=["YOUR POSTS","YOUR WORK","YOUR CHANNEL","YOUR HISTORY","YOUR VOICE"];
  $("#setup-step-label").textContent=`0${step} / 05 · ${steps[step-1]}`;
  $("#setup-progress-bar").style.width=`${step*20}%`;
  shell.classList.remove("question-reenter");void shell.offsetWidth;shell.classList.add("question-reenter");
  const back=step>1?'<button id="setup-back" class="setup-back" type="button">← Back</button>':'';
  const actions=(hint,label)=>`<div class="setup-actions"><span>${hint}</span><div class="setup-action-buttons">${back}<button id="setup-next" type="button">${label}</button></div></div>`;
  if(step===1){
    shell.innerHTML=`<p class="eyebrow">START WITH YOUR PUBLIC PROFILE</p><h2 id="setup-title">Shape your voice from your writing.</h2><p class="setup-subtitle">Add a public profile link, review the search excerpts, and choose the posts you wrote.</p><label class="field-label" for="profile-url">Public profile URL</label><textarea id="profile-url" rows="2" placeholder="https://www.instagram.com/yourbrand/">${escapeHtml(setupAnswers.profileUrl||"")}</textarea><button id="discover-posts" class="secondary-action" type="button">Search with SerpAPI</button><p id="discover-status" class="input-hint" aria-live="polite">${escapeHtml(setupAnswers.discoverStatus||"")}</p><div id="discover-results" class="discover-results">${setupAnswers.discoverHtml||""}</div>${actions("You can skip search and start with your own description.","Continue →")}`;
    setupAnswers.selectedExcerpts?.forEach(i=>{const checkbox=shell.querySelector(`[data-result-index="${i}"]`);if(checkbox)checkbox.checked=true;});
    $("#discover-posts").textContent="Search posts";$("#discover-posts").onclick=discoverPublicPosts;
  }
  if(step===2){
    const categories=[["ngo","NGO","Cause, community, action"],["business","Business","Service, expertise, trust"],["creator","Influencer / creator","Personality, story, community"],["product","Product / brand","Benefits, proof, discovery"]];
    shell.innerHTML=`<p class="eyebrow">A VOICE STUDIO FOR EVERY KIND OF CREATOR</p><h2 id="setup-title">Who are you creating for?</h2><p class="setup-subtitle">Choose the audience type that best describes this voice.</p><div class="creator-types" role="group" aria-label="Audience type">${categories.map(([id,name,desc],i)=>`<button type="button" data-category="${id}" aria-pressed="${creatorCategory===id}"><span>0${i+1}</span><strong>${name}</strong><small>${desc}</small></button>`).join("")}</div>${actions("You can change this for another campaign.","Continue →")}`;
    shell.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{creatorCategory=b.dataset.category;$("#campaign-category").value=creatorCategory;shell.querySelectorAll("[data-category]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));loadScenarios(creatorCategory);});
  }
  if(step===3){
    shell.innerHTML=`<p class="eyebrow">YOUR AUDIENCE IS ALREADY THERE</p><h2 id="setup-title">Where do you want to publish?</h2><p class="setup-subtitle">Pick the first platform and the language mode for your drafts.</p><div class="setup-controls"><label>First platform<select id="setup-platform">${[["instagram","Instagram"],["linkedin","LinkedIn"],["x","X"],["tiktok","TikTok"],["facebook","Facebook"],["threads","Threads"],["youtube_shorts","YouTube Shorts"],["pinterest","Pinterest"]].map(([v,n])=>`<option value="${v}">${n}</option>`).join("")}</select></label><label>Language and script<select id="output-language"><option>English</option><option>Hindi</option><option>Kannada</option><option>Hinglish</option><option>Kanglish</option></select></label></div>${actions("You can create versions for other platforms later.","Continue →")}`;
    $("#setup-platform").value=setupAnswers.platform||$("#platform").value;$("#output-language").value=setupAnswers.language||outputLanguage;
  }
  if(step===4){
    if(setupHasPosts===null&&setupAnswers.posts)setupHasPosts=true;
    shell.innerHTML=`<p class="eyebrow">YOUR VOICE, YOUR WAY</p><h2 id="setup-title">Do you have posts to use as examples?</h2><p class="setup-subtitle">Only use writing you own or have permission to use. Public search snippets are optional and may be incomplete.</p><div class="history-options"><button type="button" data-history="posts" aria-pressed="${setupHasPosts===true}"><strong>I have posts</strong><small>Paste authored examples or review public excerpts.</small></button><button type="button" data-history="fresh" aria-pressed="${setupHasPosts===false}"><strong>Start fresh</strong><small>Describe the voice you want; no post history is needed.</small></button></div>${actions("Your answer is kept if you go back.","Continue →")}`;
    shell.querySelectorAll("[data-history]").forEach(b=>b.onclick=()=>{setupHasPosts=b.dataset.history==="posts";shell.querySelectorAll("[data-history]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));});
  }
  if(step===5){
    const question="Describe how you want your writing to sound.";
    const field=setupHasPosts?`<label class="field-label" for="setup-authored-posts">Paste a few posts you wrote</label><textarea id="setup-authored-posts" rows="5" placeholder="Separate posts with a blank line.">${escapeHtml(setupAnswers.posts||"")}</textarea>`:`<label class="field-label" for="setup-style-answer">${question}</label><textarea id="setup-style-answer" rows="4" placeholder="Describe the style, audience, and message. For example: warm, direct, rooted in local community.">${escapeHtml(setupAnswers.style||"")}</textarea>`;
    shell.innerHTML=`<p class="eyebrow">${setupHasPosts?"LET YOUR WRITING SHOW US HOW YOU SPEAK":"NO HISTORY NEEDED · START WITH YOUR VOICE"}</p><h2 id="setup-title">${setupHasPosts?"Review your writing samples.":question}</h2><p class="setup-subtitle">${setupHasPosts?"Search excerpts are already included. Add or edit examples if you like.":"Your description or recording will guide the voice of each draft."}</p>${field}<div class="voice-recording"><label class="field-label" for="voice-audio">Add a voice recording</label><input id="voice-audio" type="file" accept="audio/*" /><button id="transcribe-voice" class="secondary-action" type="button">Transcribe with local Whisper</button><p id="voice-audio-status" class="input-hint" aria-live="polite">Kannada, Hindi, and English are detected automatically. Audio is transcribed locally; the transcript is sent to your configured writing model when you generate.</p></div>${actions("Your voice stays editable.","Enter the studio →")}`;
    $("#transcribe-voice").onclick=transcribeVoiceAudio;
  }
  if(step>1) $("#setup-back").onclick=()=>showSetupStep(step-1);
  $("#setup-next").onclick=()=>{
    if(step===3){setupAnswers.platform=$("#setup-platform").value;setupAnswers.language=$("#output-language").value;$("#platform").value=setupAnswers.platform;outputLanguage=setupAnswers.language;$("#campaign-language").value=outputLanguage;}
    if(step===4&&setupHasPosts===null){$("#setup-question .setup-subtitle").textContent="Choose whether you have authored posts or want to start fresh.";return;}
    if(step<5){showSetupStep(step+1);return;}
    if(setupHasPosts===true){setVoiceMode("posts");$("#sample-posts-input").value=$("#setup-authored-posts").value||$("#sample-posts-input").value;}else{setVoiceMode("fresh");$("#voice-description").value=$("#setup-style-answer").value;}
    $("#creator-setup").hidden=true;document.body.classList.remove("is-setup");$("#campaign-category").value=creatorCategory;loadScenarios(creatorCategory);renderProfile($("#scenario").value);generateLocal();
    if(setupHasPosts===true&&samplePostInput().length)buildVoiceProfile();$("#profile").scrollIntoView({behavior:"smooth",block:"start"});
  };
}
function showAsset(platform){campaignAssets[platform]??=buildDraft({...values(),platform},true);$("#asset-output").value=campaignAssets[platform];const name=platformName(platform);$("#asset-title").textContent=`${name} ${platform==="instagram"?"caption":platform==="pinterest"?"pin description":platform==="youtube_shorts"?"description":"post"}`;document.querySelectorAll("[data-platform]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.platform===platform)));}

$("#scenario").addEventListener("change",setScenario);
document.querySelectorAll("[data-voice-mode]").forEach(b=>b.addEventListener("click",()=>setVoiceMode(b.dataset.voiceMode)));
$("#analyze-voice").addEventListener("click",buildVoiceProfile);
$("#research-button").addEventListener("click",researchCampaignContext);
$("#use-research-results").addEventListener("click",useResearchContext);
$("#generate-button").addEventListener("click",()=>generateFromApi());
$("#regenerate-edits").addEventListener("click",()=>{const editSeed=$("#adapted-output").value.trim();if(!editSeed){$("#draft-status-text").textContent="ADD AN EDIT FIRST";return;}generateFromApi({editSeed});});
for(const selector of ["#topic","#audience","#campaign-goal","#brand-knowledge","#style-guide","#favorite-words","#avoid-words","#voice-description","#campaign-keywords","#keyword-context"]) $(selector).addEventListener("input",()=>generateLocal());
for(const selector of ["#voice-tone","#sample-posts-input"]) $(selector).addEventListener("change",()=>{if(selector==="#sample-posts-input"&&voiceMode==="posts")renderProfile($("#scenario").value);generateLocal();});
for(const selector of ["#platform","#audience","#campaign-category","#campaign-language","#optimization","#scenario-id","#campaign-intent"]) $(selector).addEventListener("change",()=>{if(selector==="#campaign-category"){creatorCategory=$(selector).value;loadScenarios(creatorCategory);}if(selector==="#campaign-language")outputLanguage=$(selector).value;if(selector==="#platform")resetPublishApproval();generateLocal();});
$("#formality").addEventListener("input",e=>{$("#formality-label").textContent=e.target.value<30?"Conversational":e.target.value<68?"Balanced":"Polished";generateLocal();});
$("#energy").addEventListener("input",e=>{$("#energy-label").textContent=e.target.value<30?"Calm":e.target.value<70?"Steady":"Energetic";generateLocal();});
$("#target-words").addEventListener("input",e=>{$("#target-words-label").textContent=`${e.target.value} words`;if(hasApiDraft&&values().topic){clearTimeout(wordTargetTimer);$("#draft-status-text").textContent="WORD TARGET CHANGED · UPDATING";wordTargetTimer=setTimeout(()=>generateFromApi(),850);}else generateLocal();});
$("#adapted-output").addEventListener("input",()=>{updateCounts();resetPublishApproval();});
$("#adapted-output").addEventListener("change",persistEditedDraft);
$("#save-draft").addEventListener("click",persistEditedDraft);
$("#save-voice-profile").addEventListener("click",saveVoiceProfile);
$("#saved-voice-select").addEventListener("change",e=>applyVoiceProfile(e.target.value));
$("#refresh-performance").addEventListener("click",syncPerformance);
$("#youtube-video-file").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;currentVideoAssetId=null;$("#youtube-upload-status").textContent=`Uploading ${file.name} (${Math.ceil(file.size/1048576)} MB)…`;try{const form=new FormData();form.append("file",file);const r=await fetch("/api/media-assets",{method:"POST",body:form});const d=await r.json();if(!r.ok)throw new Error(d.error||"Upload failed");currentVideoAssetId=d.id;$("#youtube-upload-status").textContent=`${d.filename} uploaded and ready.`;}catch(err){$("#youtube-upload-status").textContent=err.message||"Video upload failed.";}});
for(const selector of ["#publish-media-url","#publish-facebook-page","#publish-pinterest-board","#youtube-video-title","#youtube-privacy","#youtube-video-file"]) $(selector).addEventListener("input",resetPublishApproval),$(selector).addEventListener("change",resetPublishApproval);
document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editDraft(b.dataset.edit)));
$("#campaign-pack-generate").addEventListener("click",buildCampaignPack);
document.querySelectorAll("[data-platform]").forEach(b=>b.addEventListener("click",()=>showAsset(b.dataset.platform)));
$("#asset-output").addEventListener("input",e=>{const active=document.querySelector('[data-platform][aria-selected="true"]')?.dataset.platform;if(active)campaignAssets[active]=e.target.value;});
$("#copy-asset").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("#asset-output").value);$("#copy-asset").textContent="Copied ";setTimeout(()=>$("#copy-asset").textContent="Copy version ↗",1500);}catch{$("#asset-output").select();document.execCommand("copy");}});
$("#setup-dismiss").addEventListener("click",()=>{$("#creator-setup").hidden=true;document.body.classList.remove("is-setup");});
$("#publish-consent").addEventListener("change",e=>$("#approve-publish").disabled=!e.target.checked);
$("#approve-publish").addEventListener("click",async()=>{if(!currentDraftId||!$("#publish-consent").checked){$("#publish-status").textContent="Select the approval box for this exact draft before continuing.";return;}if(currentDraftPlatform!==values().platform){$("#publish-status").textContent="Generate or save a draft for the selected destination, then approve it.";return;}await persistEditedDraft();try{const r=await fetch(`/api/drafts/${currentDraftId}/publish`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({approved:true,approved_content:$("#adapted-output").value.trim(),asset_url:$("#publish-media-url").value.trim(),page_id:$("#publish-facebook-page").value,board_id:$("#publish-pinterest-board").value.trim(),video_asset_id:currentVideoAssetId,video_title:$("#youtube-video-title").value.trim(),privacy_status:$("#youtube-privacy").value})});const d=await r.json();$("#publish-status").textContent=d.error||`Published successfully${d.post_id?` · ${d.post_id}`:""}.`;if(d.status==="published")resetPublishApproval();}catch{$("#publish-status").textContent="Could not reach the publishing service.";}});
document.body.classList.add("is-setup");showSetupStep(1);
renderProfile("streetwear");generateLocal();loadScenarios("product");loadVoiceProfiles();loadPlatformConnections();loadPerformanceSummary();analyzeProfile("streetwear");
fetch("/api/health").then(r=>r.ok?r.json():null).then(s=>{if(s)$("#api-status-label").textContent=s.mode==="sarvam"?"SARVAM CONNECTED":s.mode==="openai-compatible"?"AI CONNECTED":"LOCAL MODE";}).catch(()=>{});
const oauthParams=new URLSearchParams(location.search);if(oauthParams.get("connected")){$("#publish-status").textContent=`${platformName(oauthParams.get("connected"))} account connected through OAuth.`;history.replaceState(null,"",location.pathname);}else if(oauthParams.get("oauth_error")){$("#publish-status").textContent=`${platformName(oauthParams.get("oauth_error"))} connection did not complete. Check provider credentials, redirect URI, scopes, and review status.`;history.replaceState(null,"",location.pathname);}
