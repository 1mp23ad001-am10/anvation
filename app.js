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
let importedSamplePosts = null;
let outputLanguage = "English";
let setupStep = 1;
let setupAnswers = {};
let scenarioCatalog = {};
let voiceProfiles = [];
let platformAccounts = {};
let currentCampaignId = null;
let currentDraftId = null;
let currentDraftPlatform = null;
let currentCampaignSignature = "";
let hasApiDraft = false;
let wordTargetTimer = null;
let lastQuality = {};
let selectedVoiceProfileId = null;
let currentVideoAssetId = null;
let ideaRecorder = null;
let ideaRecorderStream = null;
let ideaRecorderChunks = [];

const sentencePattern = /[^.!?]+[.!?]+|[^.!?]+$/g;
const wordPattern = /[\p{L}\p{N}\p{M}]+(?:['’][\p{L}\p{N}\p{M}]+)*/gu;
const hashtagPattern = /#[\p{L}\p{N}_]+/gu;
const supportedLanguages = ["English","Hindi","Kannada","Hinglish","Kanglish"];
function words(text) { return text.match(wordPattern) || []; }
function platformName(value){return ({instagram:"Instagram",linkedin:"LinkedIn",x:"X"})[value]||value;}
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
    const description=$("#voice-description").value.trim(), avoid=$("#avoid-words").value.trim();
    localProfile={summary:description||"No voice guidance yet. Add a recording or posts if you want the draft to match an established voice.",tone:$("#voice-tone").value,dos:"Use the source examples and recording as voice guidance.",donts:avoid?`Avoid these terms: ${avoid}.`:"Do not invent facts."};
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
function samplePostInput(){return importedSamplePosts || $("#sample-posts-input").value.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean).slice(0,10);}
function values() { creatorCategory=$("#campaign-category").value;outputLanguage=$("#campaign-language").value;return { brand_id:$("#scenario").value||"streetwear", profile_id:selectedVoiceProfileId, category:creatorCategory, scenario_id:$("#scenario-id").value, campaign_intent:$("#campaign-intent").value, target_words:+$("#target-words").value, energy:+$("#energy").value, language:outputLanguage, optimization:$("#optimization").value, keywords:$("#campaign-keywords").value.trim(), keyword_context:$("#keyword-context").value.trim(), topic:$("#topic").value.trim(), platform:$("#platform").value, length:"medium", formality:+$("#formality").value, audience:$("#audience").value.trim(), campaign_name:"", campaign_goal:$("#campaign-goal").value.trim(), knowledge:$("#brand-knowledge").value.trim(), style_guide:$("#style-guide").value.trim(), voice_mode:voiceMode, sample_posts:voiceMode==="posts"?samplePostInput():[], voice_description:$("#voice-description").value.trim(), voice_tone:$("#voice-tone").value, favorite_words:"", avoid_words:$("#avoid-words").value.trim() }; }
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
  if(v.length==="long") body += saas?" We shaped this around the moments that slow customer teams down, so the next handoff has more useful context.":" Add a relevant detail from the brief, explain why it matters to the audience, and make the next step clear.";
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
function syncWordLimit(){const slider=$("#target-words"),platform=$("#platform").value;slider.max=platform==="x"?35:300;if(+slider.value>+slider.max)slider.value=slider.max;$("#target-words-label").textContent=`${slider.value} words`;$("#target-words-max").textContent=`${slider.max} words`;const chars={x:280,instagram:2200,linkedin:3000}[platform];$("#length-hint").textContent=`Word target applies when you generate. ${platformName(platform)} also has a ${chars.toLocaleString()}-character post limit.`;}
function updateCounts() { const target=+$("#target-words").value;const count=words($("#adapted-output").value).length;$("#adapted-words").textContent=hasApiDraft?`${count} / ${target} WORDS`:`${count} WORD PREVIEW · ${target} WORD TARGET`; }
function generateLocal(options={}) {
  const v=values(); $("#adapted-platform").textContent=platformName(v.platform).toUpperCase();
  if(hasApiDraft){updateCounts();$("#draft-status-text").textContent="SETTINGS CHANGED · REGENERATE TO APPLY";return;}
  if(!v.topic){$("#adapted-output").value="";updateCounts();$("#draft-status-text").textContent="ADD AN IDEA TO START";return;}
  $("#adapted-output").value=buildDraft(v,true,options.editSeed||""); updateCounts(); $("#draft-status-text").textContent=options.editSeed?"LOCAL PREVIEW · APPLYING YOUR EDIT":"LOCAL STARTER PREVIEW · GENERATE FOR YOUR WORD TARGET";
}
async function generateFromApi(options={}) {
  if(options.targetWords){const max=+$("#target-words").max;$("#target-words").value=Math.min(max,Math.max(20,options.targetWords));$("#target-words-label").textContent=`${$("#target-words").value} words`;}
  const input=values();
  if(!input.topic){$("#draft-status-text").textContent="ADD YOUR IDEA FIRST";$("#topic").focus();return;}
  generateLocal(options); $("#draft-status-text").textContent="WRITING…";
  try {
    const response=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...input,edit_seed:options.editSeed||"",edit_instruction:options.instruction||""})});
    const result=await response.json();if(!response.ok) throw new Error(result.error||"Generation unavailable");
    if(typeof result.adapted!=="string") throw new Error("Invalid API result");
    if(result.target_words!==input.target_words){$("#target-words").value=result.target_words;$("#target-words-label").textContent=`${result.target_words} words`;}
    hasApiDraft=true; $("#adapted-output").value=result.adapted; updateCounts();
    input.target_words=result.target_words;const requestValues=input;resetPublishApproval();const modeLabel=result.mode==="sarvam"?"SARVAM GENERATED":result.mode==="openai-compatible"?"AI GENERATED":"LOCAL STARTER DRAFT";$("#draft-status-text").textContent=`${modeLabel} · ${result.word_count}/${result.target_words} WORDS${result.target_met?"":` · ${result.constraint_note||"Target not reached; review the actual count."}`}`;$("#api-status-label").textContent=result.mode==="sarvam"?"SARVAM CONNECTED":result.mode==="openai-compatible"?"AI CONNECTED":"LOCAL MODE";await scoreDraft(result.adapted,requestValues);await saveCampaignAndDraft(result.adapted,requestValues);
  } catch (error) { $("#draft-status-text").textContent=error.message||"GENERATION UNAVAILABLE";$("#quality-total").innerHTML="—<small>/100</small>"; }
}
async function scoreDraft(text,v){try{const r=await fetch("/api/score",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:{sample_posts:v.sample_posts},output:text,platform:v.platform,language:v.language,category:v.category,scenario_id:v.scenario_id,target_words:v.target_words,keywords:v.keywords,keyword_context:v.keyword_context,avoid_words:v.avoid_words,optimization:v.optimization})});const d=await r.json();if(!r.ok)return;lastQuality=d;$("#quality-total").innerHTML=`${d.score}<small>/100</small>`;const names={voice_fit:"VOICE FIT",audience_scenario_fit:"AUDIENCE + SCENARIO",platform_fit:"PLATFORM FIT",keyword_context:"KEYWORD + CONTEXT",clarity:"CLARITY",brand_safety:"BRAND SAFETY",discovery_readiness:"DISCOVERY",language_fit:"LANGUAGE + SCRIPT",word_count_fit:"WORD COUNT"};$("#quality-breakdown").innerHTML=Object.entries(d.dimensions).map(([k,n])=>`<div><strong>${n}</strong><span>${names[k]}</span></div>`).join("")+(d.suggestions?.length?`<ul class="quality-suggestions">${d.suggestions.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul>`:'<p class="quality-suggestions">No improvement flags from the current rubric.</p>');}catch{}}
async function saveCampaignAndDraft(content,v){
  const signature=JSON.stringify([v.category,v.scenario_id,v.topic,v.keywords,v.keyword_context,v.campaign_goal,v.knowledge,v.language]);
  if(signature!==currentCampaignSignature){
    const campaign={profile_id:v.profile_id,category:v.category,scenario_id:v.scenario_id,name:v.topic||"Untitled draft",brief:[v.topic,v.campaign_goal,v.knowledge].filter(Boolean).join("\n\n"),keywords:v.keywords,keyword_context:v.keyword_context,settings:{platform:v.platform,language:v.language,target_words:v.target_words,formality:v.formality,energy:v.energy,intent:v.campaign_intent}};
    const cr=await fetch("/api/campaigns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(campaign)});const cd=await cr.json();if(!cr.ok)throw new Error(cd.error||"Campaign save failed");currentCampaignId=cd.id;currentCampaignSignature=signature;
  }
    const dr=await fetch("/api/drafts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaign_id:currentCampaignId,platform:v.platform,language:v.language,content,quality:lastQuality})});const dd=await dr.json();if(!dr.ok)throw new Error(dd.error||"Draft save failed");currentDraftId=dd.id;currentDraftPlatform=v.platform;$("#draft-save-status").textContent="Saved locally · "+platformName(v.platform);syncPublishAvailability();
}
async function persistEditedDraft(){const content=$("#adapted-output").value.trim();if(!content)return false;try{if(currentDraftId){const r=await fetch(`/api/drafts/${currentDraftId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({content})});if(!r.ok)throw new Error();}else await saveCampaignAndDraft(content,values());$("#draft-save-status").textContent="Edited draft saved locally.";return true;}catch{$("#draft-save-status").textContent="Could not save the edited draft.";return false;}}
function syncPublishFields(){if($("#publish-media-wrap"))$("#publish-media-wrap").hidden=$("#platform").value!=="instagram";syncPublishAvailability();}
function syncPublishAvailability(){const platform=$("#platform").value,account=platformAccounts[platform],ready=Boolean(currentDraftId&&currentDraftPlatform===platform&&account?.connected&&account.capabilities?.can_publish),mediaReady=platform!=="instagram"||/^https:\/\//i.test($("#publish-media-url").value.trim());const target=$("#publish-target"),button=$("#approve-publish");if(target)target.textContent=account?.connected?`Destination account: ${platformName(platform)} · ${account.account_label||"Connected account"}`:`No ${platformName(platform)} account is connected.`;button.disabled=!(ready&&mediaReady);button.title=ready&&!mediaReady?"Add a public HTTPS image or video URL for Instagram.":"";}
function resetPublishApproval(){syncPublishAvailability();}
async function analyzeProfile(key) {
  try { const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({brand_id:key,sample_posts:brands[key].samples})}); if(!r.ok)return; const d=await r.json();
    if(d.profile){$("#profile-summary").textContent=d.profile.summary||brands[key].summary;$("#tone-notes").textContent=d.profile.tone||brands[key].tone;$("#dos-notes").textContent=d.profile.dos||brands[key].dos;$("#donts-notes").textContent=d.profile.donts||brands[key].donts;}
    if(d.metrics){const m=d.metrics;$("#metrics-grid").innerHTML=[[m.average_sentence_length,"WORDS / SENTENCE"],[m.average_hashtags_per_post,"HASHTAGS / POST"],[`${m.question_ratio_percent}%`,"POSTS WITH A QUESTION"]].map(([v,l])=>`<div class="metric"><strong>${escapeHtml(v)}</strong><span>${l}</span></div>`).join("");}
  } catch { /* Local profile remains available. */ }
}
function setVoiceMode(mode){voiceMode=mode;customVoiceProfile=null;$("#voice-source-badge").textContent=mode==="posts"?"YOUR POSTS":"YOUR VOICE";renderProfile($("#scenario").value);generateLocal();}
async function buildVoiceProfile(){const v=values();if(voiceMode==="posts"&&!v.sample_posts.length){$("#voice-analysis-status").textContent="Paste at least one authored post, or start with preferences.";return;}if(voiceMode==="fresh"&&!v.voice_description&&!v.favorite_words&&!v.avoid_words&&!v.voice_tone){$("#voice-analysis-status").textContent="Describe your style or add preferred or avoided words first.";return;}$("#voice-analysis-status").textContent="Building your voice profile…";try{const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...v,brand_id:v.brand_id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Profile analysis unavailable");customVoiceProfile={...d.profile};const metrics=d.metrics||{};if(d.metrics)$("#metrics-grid").innerHTML=[[metrics.average_sentence_length,"WORDS / SENTENCE"],[metrics.average_hashtags_per_post,"HASHTAGS / POST"],[`${metrics.question_ratio_percent}%`,"POSTS WITH A QUESTION"]].map(([x,l])=>`<div class="metric"><strong>${escapeHtml(x)}</strong><span>${l}</span></div>`).join("");$("#voice-analysis-status").textContent=d.mode==="ai"?"AI-assisted profile ready. Review and edit its traits.":"Profile ready. Save it to reuse this voice.";$("#api-status-label").textContent=d.mode==="ai"?"AI CONNECTED":"LOCAL MODE";renderProfile(v.brand_id);generateLocal();}catch(e){$("#voice-analysis-status").textContent=e.message||"Could not build the profile. Your inputs are still available.";}}
async function discoverPublicPosts(){
  const urls=$("#profile-url").value.split(/\n|,/).map(x=>x.trim()).filter(Boolean);
  $("#discover-status").textContent="Fetching profile posts from the selected platform API…";
  $("#discover-results").innerHTML="";
  if(!urls.length){$("#discover-status").textContent="Paste a public profile URL first.";return;}
  try{
    const r=await fetch("/api/discover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile_urls:urls})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||"Search unavailable");
    const results=d.results||[];window.discoveredPosts=results;
    const failures=(d.failures||[]).map(x=>`${platformName(x.platform)}: ${x.error}`).join(" · ");
    if(!results.length){$("#discover-status").textContent=`No posts returned by the profile API.${failures?` ${failures}`:""} Continue with a recording or voice description.`;return;}
    $("#discover-status").textContent=`${results.length} posts from the selected profile API. Select only posts you wrote.${failures?` ${failures}`:""}`;
    $("#discover-results").innerHTML=results.map((x,i)=>`<label class="discover-item"><input type="checkbox" data-result-index="${i}"><span><strong>${escapeHtml(x.platform||"").toUpperCase()} · ${escapeHtml(x.title||"Public post excerpt")}</strong><span>${escapeHtml(x.snippet||"")}</span><a href="${escapeHtml(x.link||"#")}" target="_blank" rel="noopener">Open source ↗</a></span></label>`).join("");
  }catch(e){$("#discover-status").textContent=e.message||"Search unavailable. Continue without search.";}
}
function useSelectedProfilePosts(){
  const selected=[...document.querySelectorAll("[data-result-index]:checked")].map(x=>window.discoveredPosts?.[+x.dataset.resultIndex]).filter(x=>x?.snippet?.trim());
  if(!selected.length){$("#discover-status").textContent="Select at least one post first.";return;}
  importedSamplePosts=selected.map(x=>x.snippet.trim()).slice(0,10);$("#sample-posts-input").value=importedSamplePosts.join("\n\n");
  voiceMode="posts";$("#voice-source-badge").textContent="YOUR POSTS";$("#discover-status").textContent=`${importedSamplePosts.length} selected posts are ready as separate examples.`;
  renderProfile($("#scenario").value);generateLocal();
}
async function startIdeaRecording(){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){$("#speech-status").textContent="Live recording is unavailable in this browser. Type the brief instead.";return;}
  try{
    ideaRecorderStream=await navigator.mediaDevices.getUserMedia({audio:true});ideaRecorderChunks=[];
    const mimeType=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(type=>MediaRecorder.isTypeSupported?.(type));
    ideaRecorder=new MediaRecorder(ideaRecorderStream,mimeType?{mimeType}:undefined);
    ideaRecorder.ondataavailable=event=>{if(event.data?.size)ideaRecorderChunks.push(event.data);};
    ideaRecorder.onstop=()=>{ideaRecorderStream?.getTracks().forEach(track=>track.stop());ideaRecorderStream=null;const blob=new Blob(ideaRecorderChunks,{type:ideaRecorder?.mimeType||"audio/webm"});ideaRecorder=null;transcribeIdeaAudio(blob);};
    ideaRecorder.start();$("#start-recording").hidden=true;$("#stop-recording").hidden=false;$("#speech-status").textContent="Listening… Speak naturally in English, Hindi, or Kannada. Stop when you’re done.";
  }catch(error){ideaRecorderStream?.getTracks().forEach(track=>track.stop());ideaRecorderStream=null;$("#speech-status").textContent=error.name==="NotAllowedError"?"Microphone access was blocked. Allow it in the browser address bar, then try again.":"Could not start the microphone. You can type the brief instead.";}
}
function stopIdeaRecording(){if(ideaRecorder?.state==="recording"){ideaRecorder.stop();$("#stop-recording").disabled=true;$("#speech-status").textContent="Transcribing with local Whisper…";}}
async function transcribeIdeaAudio(blob){
  try{
    const ext=blob.type.includes("mp4")?"m4a":"webm",form=new FormData();form.append("file",blob,`voice-brief.${ext}`);
    const response=await fetch("/api/transcribe",{method:"POST",body:form}),data=await response.json();if(!response.ok)throw new Error(data.error||"Transcription failed.");
    const prior=$("#topic").value.trim();$("#topic").value=[prior,data.text].filter(Boolean).join(prior?"\n":"");
    const detected=detectWritingLanguage(data.language,data.text);outputLanguage=detected;$("#campaign-language").value=detected;if(setupStep>=3)setupAnswers.language=detected;if($("#output-language"))$("#output-language").value=detected;
    voiceMode="fresh";renderBriefChecklist();generateLocal();$("#speech-status").textContent=`${detected} detected · transcript added. Mapping audience, purpose, facts, and keywords…`;
    await mapBriefToFields($("#topic").value,detected);
  }catch(error){$("#speech-status").textContent=error.message||"Could not transcribe the recording.";}
  finally{$("#start-recording").hidden=false;$("#stop-recording").hidden=true;$("#stop-recording").disabled=false;}
}
async function mapBriefToFields(source,language=outputLanguage){
  const text=String(source||"").trim();if(text.length<8){renderBriefChecklist();return;}
  try{
    const response=await fetch("/api/brief-map",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,language})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Brief mapping unavailable.");
    const fields=[["audience","#audience"],["campaign_goal","#campaign-goal"],["approved_facts","#brand-knowledge"],["keyword_context","#keyword-context"],["voice_style","#voice-description"]];
    for(const [key,selector] of fields)if(data[key]&&!$(selector).value.trim())$(selector).value=data[key];
    if(Array.isArray(data.keywords)&&data.keywords.length&&!$("#campaign-keywords").value.trim())$("#campaign-keywords").value=data.keywords.join(", ");
    if(data.campaign_intent&&[...$("#campaign-intent").options].some(option=>option.value===data.campaign_intent))$("#campaign-intent").value=data.campaign_intent;
    renderBriefChecklist();generateLocal();
    $("#speech-status").textContent=data.mapped?`${language} transcript mapped. Review the captured details below; you can edit every field.`:"Transcript added. The writing model is unavailable for automatic field mapping, so your words remain in the brief.";
  }catch(error){renderBriefChecklist();$("#speech-status").textContent=`Transcript added; automatic mapping failed: ${error.message||"service unavailable"}`;}
}
function renderBriefChecklist(){
  const entries=[
    ["Post idea",$("#topic").value.trim(),true],
    ["Audience",$("#audience").value.trim(),false],
    ["Purpose / next step",$("#campaign-goal").value.trim(),false],
    ["Names, dates, facts, keywords",[$("#brand-knowledge").value,$("#campaign-keywords").value].filter(Boolean).join(" · ").trim(),false],
  ];
  $("#brief-checklist-items").innerHTML=entries.map(([label,value,required])=>`<li class="${value?"is-captured":"is-missing"}"><span class="brief-check-icon" aria-hidden="true">${value?"✓":"·"}</span><span><strong>${label}</strong><small>${value?escapeHtml(value.length>100?value.slice(0,97)+"…":value):required?"Add one idea to generate a post":"Not mentioned · optional"}</small></span><em>${value?"Captured":required?"Needed":"Optional"}</em></li>`).join("");
}
async function loadScenarios(category, selected=""){
  try{if(!Object.keys(scenarioCatalog).length){const r=await fetch("/api/scenarios");scenarioCatalog=await r.json();}}
  catch{scenarioCatalog={};}
  const list=scenarioCatalog[category]||[];$("#scenario-id").innerHTML=list.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)} · ${escapeHtml(x.description)}</option>`).join("");
  if(selected&&list.some(x=>x.id===selected))$("#scenario-id").value=selected;
}
async function loadVoiceProfiles(){
  try{const r=await fetch("/api/voice-profiles");const d=await r.json();voiceProfiles=d.profiles||[];
    const select=$("#saved-voice-select");select.innerHTML='<option value="">Choose a saved voice</option>'+voiceProfiles.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} · ${escapeHtml(p.language||"English")}</option>`).join("");
    $("#delete-voice-profile").disabled=!selectedVoiceProfileId;
  }catch{}
}
function detectWritingLanguage(whisperLanguage,text){
  if(/[\u0C80-\u0CFF]/u.test(text))return "Kannada";
  if(/[\u0900-\u097F]/u.test(text))return "Hindi";
  const tokens=new Set((text.toLowerCase().match(/[\p{L}\p{M}]+/gu)||[]));
  const kannadaCues=["ide","idu","inda","nanna","nimma","beku","alla","agide","maadi","ivattu","yenu","namma","swalpa"];
  const hindiCues=["hai","hain","hoon","aap","mera","meri","kaise","kya","nahi","mein","hum","aur","ko"];
  if(kannadaCues.filter(x=>tokens.has(x)).length>=2)return "Kanglish";
  if(hindiCues.filter(x=>tokens.has(x)).length>=2)return "Hinglish";
  return ({kn:"Kannada",hi:"Hindi",en:"English"})[String(whisperLanguage||"").toLowerCase()]||"English";
}
async function loadPlatformConnections(){
  try{
    const r=await fetch("/api/platforms"),d=await r.json();platformAccounts=Object.fromEntries((d.platforms||[]).map(p=>[p.platform,p]));
    $("#platform-connection-list").innerHTML=d.platforms.map(p=>`<div class="platform-connection"><div><strong>${escapeHtml(platformName(p.platform))}</strong><span>${escapeHtml(p.connected?p.account_label||"Connected":p.configured?"Ready to connect":p.platform==="instagram"?"SerpAPI profile import available":"Connect account to import posts")}</span></div><div class="connection-actions">${p.connected&&p.capabilities?.can_read_posts?`<button type="button" data-import-platform="${escapeHtml(p.platform)}">Import posts</button>`:""}${p.connected||p.configured?`<button type="button" data-connect-platform="${escapeHtml(p.platform)}" data-connect-url="${escapeHtml(p.connect_url||"")}" data-connected="${p.connected}">${p.connected?"Disconnect":"Connect account"}</button>`:""}</div></div>`).join("");
    syncPublishFields();
    document.querySelectorAll("[data-connect-platform]").forEach(b=>b.onclick=async()=>{const platform=b.dataset.connectPlatform;if(b.dataset.connected==="false"){if(b.dataset.connectUrl){window.location.href=b.dataset.connectUrl;return;}$("#publish-status").textContent="Add the platform developer app credentials and approved OAuth scopes to the server environment first.";return;}try{const res=await fetch(`/api/platforms/${platform}/connect`,{method:"DELETE"}),result=await res.json();$("#publish-status").textContent=result.error||result.status||"Connection state updated.";await loadPlatformConnections();}catch{$("#publish-status").textContent="Could not reach the local connection service.";}});
    document.querySelectorAll("[data-import-platform]").forEach(b=>b.onclick=()=>importConnectedPosts(b.dataset.importPlatform));
  }catch{$("#platform-connection-list").textContent="Platform connection status is unavailable.";}
}
async function importConnectedPosts(platform){try{$("#publish-status").textContent=`Importing authorized ${platformName(platform)} posts…`;const r=await fetch(`/api/platforms/${platform}/posts`);const d=await r.json();if(!r.ok)throw new Error(d.error||"Provider post history unavailable");if(!d.posts?.length)throw new Error("No authored post text was returned. You can paste examples manually.");importedSamplePosts=d.posts.map(x=>x.text).filter(Boolean).slice(0,10);$("#sample-posts-input").value=importedSamplePosts.join("\n\n");setVoiceMode("posts");renderProfile($("#scenario").value);await buildVoiceProfile();$("#publish-status").textContent=`Imported ${d.posts.length} authored posts from ${platformName(platform)}. Original text is preserved in the sample field.`;}catch(e){$("#publish-status").textContent=e.message||"Could not import posts.";}}
async function loadPerformanceSummary(){
  try{const r=await fetch("/api/performance");const d=await r.json();const target=$("#performance-summary");
    if(!d.observations){target.textContent="No provider-reported observations yet. Connect a supported account and sync metrics when the official API is configured.";return;}
    target.innerHTML=Object.entries(d.by_platform).map(([platform,data])=>`<div class="performance-platform"><strong>${escapeHtml(platformName(platform))}</strong><span>${data.posts} observed posts</span><span>${Object.entries(data.average||{}).map(([k,v])=>`${escapeHtml(k)} ${escapeHtml(v)}`).join(" · ")}</span></div>`).join("")+`<p>${escapeHtml(d.message||"")}</p>`;
  }catch{$("#performance-summary").textContent="Performance data is unavailable.";}
}
async function syncPerformance(){const target=$("#performance-summary");target.textContent="Requesting provider-reported metrics for published drafts…";try{const r=await fetch("/api/performance/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Metric sync failed");await loadPerformanceSummary();if(d.unavailable_platforms?.length)target.insertAdjacentHTML("beforeend",`<p>${d.synced_posts} posts synced. Some providers returned no metrics or require additional API access: ${escapeHtml(d.unavailable_platforms.join(", "))}.</p>`);}catch(e){target.textContent=e.message||"Provider metric sync failed.";}}
async function saveVoiceProfile(){
  const name=$("#voice-profile-name").value.trim(),v=values();if(!name){$("#voice-analysis-status").textContent="Add a name to save this voice.";$("#voice-profile-name").focus();return;}
  const payload={name,category:v.category,summary:customVoiceProfile?.summary||v.voice_description,tone:customVoiceProfile?.tone||v.voice_tone,favorite_words:"",avoid_words:v.avoid_words,sample_posts:samplePostInput(),language:v.language};
  try{const endpoint=selectedVoiceProfileId?`/api/voice-profiles/${selectedVoiceProfileId}`:"/api/voice-profiles";const r=await fetch(endpoint,{method:selectedVoiceProfileId?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error);selectedVoiceProfileId=d.id||selectedVoiceProfileId;$("#voice-analysis-status").textContent="Voice profile saved locally.";await loadVoiceProfiles();$("#saved-voice-select").value=selectedVoiceProfileId;$("#delete-voice-profile").disabled=false;}
  catch(e){$("#voice-analysis-status").textContent=e.message||"Could not save this profile.";}
}
async function deleteVoiceProfile(){if(!selectedVoiceProfileId)return;const p=voiceProfiles.find(x=>x.id===selectedVoiceProfileId);if(!p||!window.confirm(`Delete the saved voice “${p.name}”?`))return;try{const r=await fetch(`/api/voice-profiles/${selectedVoiceProfileId}`,{method:"DELETE"}),d=await r.json();if(!r.ok)throw new Error(d.error);selectedVoiceProfileId=null;customVoiceProfile=null;$("#voice-profile-name").value="";$("#saved-voice-select").value="";$("#delete-voice-profile").disabled=true;$("#voice-analysis-status").textContent="Saved voice deleted.";await loadVoiceProfiles();renderProfile($("#scenario").value);generateLocal();}catch(e){$("#voice-analysis-status").textContent=e.message||"Could not delete this profile.";}}
function applyVoiceProfile(id){const p=voiceProfiles.find(x=>x.id===id);if(!p)return;selectedVoiceProfileId=p.id;creatorCategory=p.category;$("#campaign-category").value=p.category;$("#voice-profile-name").value=p.name;$("#voice-description").value=p.summary||"";$("#voice-tone").value=p.tone||"warm and approachable";$("#avoid-words").value=p.avoid_words||"";if(p.language&&supportedLanguages.includes(p.language))$("#campaign-language").value=p.language;outputLanguage=$("#campaign-language").value;if(p.sample_posts?.length){voiceMode="posts";importedSamplePosts=p.sample_posts;$("#sample-posts-input").value=p.sample_posts.join("\n\n");}else{voiceMode="fresh";importedSamplePosts=null;$("#sample-posts-input").value="";}$("#voice-source-badge").textContent=voiceMode==="posts"?"YOUR POSTS":"YOUR VOICE";customVoiceProfile={summary:p.summary,tone:p.tone,dos:"Follow the saved voice profile.",donts:p.avoid_words?`Avoid: ${p.avoid_words}`:""};$("#delete-voice-profile").disabled=false;loadScenarios(creatorCategory);renderProfile($("#scenario").value);generateLocal();}
function setScenario() {
  const key=$("#scenario").value; if(!brands[key])return;
  const saas=key==="saas";$("#platform").value=brands[key].platform;$("#formality").value=saas?68:24;$("#energy").value=saas?38:65;
  $("#formality-label").textContent=saas?"Polished":"Casual";$("#energy-label").textContent=saas?"Steady":"Energetic";
  customVoiceProfile=null;renderProfile(key);generateLocal();if(voiceMode==="demo")analyzeProfile(key);
}
async function editDraft(action) {
  const text=$("#adapted-output").value.trim();if(!text)return;
  const labels={rewrite:"Rewrite",clarify:"Improve clarity",expand:"Expand",shorten:"Shorten",cta:"Add CTA"};
  const instructions={
    rewrite:"Rewrite the supplied draft with a fresh, stronger structure and opening. Preserve the user's intent, language, voice, verified facts, platform format, and requested word target. Do not copy the draft sentence by sentence.",
    clarify:"Improve clarity and natural flow. Prefer concrete, short sentences, remove ambiguity and repetition, and preserve all supplied facts, language, voice, platform format, and requested word target.",
    expand:"Expand the draft with useful detail grounded in the spoken brief, audience, and approved facts. Do not invent information or repeat points. Reach the selected word target within the platform character limit.",
    shorten:"Make the draft substantially shorter while preserving its main message, voice, and all essential verified facts. Aim for the adjusted word target.",
    cta:"Add one natural, specific call to action that fits the post and audience. Do not add a link, offer, or promise that the user did not provide. Preserve language, voice, facts, and target length."
  };
  if(!instructions[action])return;
  const button=document.querySelector(`[data-edit="${action}"]`),actual=words(text).length,max=+$("#target-words").max;
  let targetWords=+$("#target-words").value;
  if(action==="shorten")targetWords=Math.max(20,Math.min(targetWords,Math.round(actual*.7)));
  if(action==="expand")targetWords=Math.min(max,Math.max(targetWords,Math.min(max,actual+Math.max(30,Math.round(actual*.5)))));
  if(button)button.disabled=true;$("#draft-status-text").textContent=`Applying ${labels[action].toLowerCase()} with your brief…`;
  try{await generateFromApi({editSeed:text,instruction:instructions[action],targetWords});}
  finally{if(button)button.disabled=false;}
}
function captureSetupStep(){
  if(setupStep===1){
    setupAnswers.profileUrl=$("#profile-url")?.value||setupAnswers.profileUrl||"";
    setupAnswers.discoverStatus=$("#discover-status")?.textContent||"";
    setupAnswers.discoverHtml=$("#discover-results")?.innerHTML||setupAnswers.discoverHtml||"";
    const selected=[...document.querySelectorAll("[data-result-index]:checked")].map(x=>window.discoveredPosts?.[+x.dataset.resultIndex]).filter(x=>x?.snippet?.trim());
    setupAnswers.selectedIndexes=[...document.querySelectorAll("[data-result-index]:checked")].map(x=>+x.dataset.resultIndex);
    setupAnswers.posts=selected.map(x=>x.snippet.trim()).slice(0,10);
    if(setupAnswers.posts.length){importedSamplePosts=setupAnswers.posts;voiceMode="posts";}else{importedSamplePosts=null;voiceMode="fresh";}
  }else if(setupStep===2){
    setupAnswers.category=$("#setup-category")?.value||creatorCategory;
    setupAnswers.audience=$("#setup-audience")?.value||"";
    setupAnswers.brandInfo="";
  }else if(setupStep===3){
    setupAnswers.platform=$("#setup-platform")?.value||"instagram";
    setupAnswers.language=$("#output-language")?.value||"English";
  }
}
function finishSetup(){
  captureSetupStep();const panel=$("#brief-voice-panel"),slot=$("#brief-voice-slot");
  if(panel&&slot&&!slot.contains(panel))slot.append(panel);
  if(setupAnswers.category){creatorCategory=setupAnswers.category;$("#campaign-category").value=creatorCategory;}
  if(setupAnswers.audience!==undefined)$("#audience").value=setupAnswers.audience;
  if(setupAnswers.brandInfo!==undefined)$("#brand-knowledge").value=setupAnswers.brandInfo;
  if(setupAnswers.platform)$("#platform").value=setupAnswers.platform;
  if(setupAnswers.language){outputLanguage=setupAnswers.language;$("#campaign-language").value=outputLanguage;}
  if(setupAnswers.posts?.length){importedSamplePosts=setupAnswers.posts;$("#sample-posts-input").value=setupAnswers.posts.join("\n\n");voiceMode="posts";}
  else{importedSamplePosts=null;$("#sample-posts-input").value="";voiceMode="fresh";}
  $("#creator-setup").hidden=true;document.body.classList.remove("is-setup");syncWordLimit();
  loadScenarios(creatorCategory);renderProfile($("#scenario").value);generateLocal();
  if(setupAnswers.posts?.length)buildVoiceProfile();
}
function showSetupStep(step){
  captureSetupStep();
  if(setupStep===4&&step!==4){const panel=$("#brief-voice-panel"),slot=$("#brief-voice-slot");if(panel&&slot&&!slot.contains(panel))slot.append(panel);}
  setupStep=step;const labels=["FIND YOUR POSTS","YOUR WORK","CHANNEL + LANGUAGE","VOICE MESSAGE"];
  $("#setup-step-label").textContent=`0${step} / 04 · ${labels[step-1]}`;
  document.querySelectorAll(".setup-step-bars i").forEach((bar,index)=>bar.classList.toggle("is-active",index<step));
  const shell=$("#setup-question");shell.classList.remove("question-reenter");void shell.offsetWidth;shell.classList.add("question-reenter");
  const back=step>1?'<button id="setup-back" class="setup-back" type="button">← Back</button>':'';
  const actions=(hint,label="Continue →")=>`<div class="setup-actions"><span>${hint}</span><div class="setup-action-buttons">${back}<button id="setup-next" type="button">${label}</button></div></div>`;
  if(step===1){
    shell.innerHTML=`<h2 id="setup-title">Start with your public profile.</h2><p class="setup-subtitle">Instagram posts use SerpAPI’s Instagram Profile API. X and LinkedIn use the connected account’s official API. Choose only posts you wrote; you can skip this.</p><label class="field-label" for="profile-url">Public profile URL</label><input id="profile-url" class="text-input" type="url" placeholder="https://www.instagram.com/yourbrand/" value="${escapeHtml(setupAnswers.profileUrl||"")}"><button id="discover-posts" class="secondary-action" type="button">Import posts</button><p id="discover-status" class="input-hint" aria-live="polite">${escapeHtml(setupAnswers.discoverStatus||"")}</p><div id="discover-results" class="discover-results">${setupAnswers.discoverHtml||""}</div>${actions("No profile link? Continue and start fresh.")}`;
    $("#discover-posts").onclick=discoverPublicPosts;
    setupAnswers.selectedIndexes?.forEach(i=>{const box=shell.querySelector(`[data-result-index="${i}"]`);if(box)box.checked=true;});
  }else if(step===2){
    const categories=[["ngo","NGO","Cause, community, action"],["business","Business","Services, expertise, trust"],["creator","Creator","Personality, stories, community"],["product","Product / brand","Benefits, proof, discovery"]];
    shell.innerHTML=`<h2 id="setup-title">Who are you creating for?</h2><p class="setup-subtitle">Pick the closest fit. You can refine the audience in your draft.</p><div class="creator-types" role="group" aria-label="Creator type">${categories.map(([id,name,desc],i)=>`<button type="button" data-category="${id}" aria-pressed="${(setupAnswers.category||creatorCategory)===id}"><span>${i+1}</span><strong>${name}</strong><small>${desc}</small></button>`).join("")}</div><label class="field-label" for="setup-audience">Who is this for? <span class="optional-note">Optional</span></label><input id="setup-audience" class="text-input" placeholder="e.g. local families, college students" value="${escapeHtml(setupAnswers.audience||"")}">${actions("You can change this for any draft.")}`;
    shell.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{creatorCategory=b.dataset.category;setupAnswers.category=creatorCategory;shell.querySelectorAll("[data-category]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));});
  }else if(step===3){
    shell.innerHTML=`<h2 id="setup-title">Where and how should it sound?</h2><p class="setup-subtitle">Choose the first platform and writing style. A voice recording can detect English, Hindi, or Kannada and update this automatically.</p><div class="setup-controls"><label>First platform<select id="setup-platform"><option value="instagram">Instagram</option><option value="linkedin">LinkedIn</option><option value="x">X</option></select></label><label>Draft language<select id="output-language"><option>English</option><option>Hindi</option><option>Kannada</option><option>Hinglish</option><option>Kanglish</option></select></label></div>${actions("You can change these later.")}`;
    $("#setup-platform").value=setupAnswers.platform||$("#platform").value;$("#output-language").value=setupAnswers.language||outputLanguage;
  }else{
    const panel=$("#brief-voice-panel");
    shell.innerHTML=`<h2 id="setup-title">Say it once. We’ll map the details.</h2><p class="setup-subtitle">Speak your idea naturally in English, Hindi, or Kannada. Local Whisper transcribes it; the brief mapper fills matching details and marks what is still missing.</p><div id="setup-voice-slot"></div>${actions("Voice is optional. You can also type after setup.","Open my studio →")}`;
    $("#setup-voice-slot").append(panel);
  }
  if(step>1)$("#setup-back").onclick=()=>showSetupStep(step-1);
  $("#setup-next").onclick=()=>{captureSetupStep();if(step<4)showSetupStep(step+1);else finishSetup();};
}
async function buildCampaignPack(){
  const v=values();if(!v.topic){$("#draft-status-text").textContent="ADD YOUR IDEA FIRST";$("#topic").focus();return;}campaignAssets={};for(const p of ["instagram","linkedin","x"]){try{const r=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...v,platform:p,target_words:p==="x"?Math.min(35,v.target_words):v.target_words})});const d=await r.json();if(!r.ok)throw new Error(d.error);campaignAssets[p]=d.adapted;}catch(e){campaignAssets[p]=`Could not generate this version: ${e.message||"generation service unavailable"}`;}}
  $("#campaign-pack-results").hidden=false;showAsset("instagram");$("#campaign-pack-results").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function showAsset(platform){campaignAssets[platform]??=buildDraft({...values(),platform},true);$("#asset-output").value=campaignAssets[platform];const name=platformName(platform);$("#asset-title").textContent=`${name} ${platform==="instagram"?"caption":platform==="pinterest"?"pin description":platform==="youtube_shorts"?"description":"post"}`;document.querySelectorAll("[data-platform]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.platform===platform)));}

$("#scenario").addEventListener("change",setScenario);
$("#analyze-voice").addEventListener("click",buildVoiceProfile);
$("#start-recording").addEventListener("click",startIdeaRecording);
$("#stop-recording").addEventListener("click",stopIdeaRecording);

$("#generate-button").addEventListener("click",()=>generateFromApi());
$("#regenerate-edits").addEventListener("click",()=>{const editSeed=$("#adapted-output").value.trim();if(!editSeed){$("#draft-status-text").textContent="ADD AN EDIT FIRST";return;}generateFromApi({editSeed});});
for(const selector of ["#topic","#audience","#campaign-goal","#brand-knowledge","#style-guide","#avoid-words","#voice-description","#campaign-keywords","#keyword-context"]) $(selector).addEventListener("input",()=>{generateLocal();renderBriefChecklist();});
$("#topic").addEventListener("change",()=>mapBriefToFields($("#topic").value,outputLanguage));
$("#voice-tone").addEventListener("change",generateLocal);
$("#sample-posts-input").addEventListener("input",()=>{importedSamplePosts=null;if($("#sample-posts-input").value.trim())voiceMode="posts";renderProfile($("#scenario").value);generateLocal();});
for(const selector of ["#platform","#audience","#campaign-category","#campaign-language","#optimization","#scenario-id","#campaign-intent"]) $(selector).addEventListener("change",()=>{if(selector==="#campaign-category"){creatorCategory=$(selector).value;loadScenarios(creatorCategory);}if(selector==="#campaign-language")outputLanguage=$(selector).value;if(selector==="#platform"){syncWordLimit();syncPublishFields();resetPublishApproval();}generateLocal();});
$("#formality").addEventListener("input",e=>{$("#formality-label").textContent=e.target.value<30?"Conversational":e.target.value<68?"Balanced":"Polished";generateLocal();});
$("#energy").addEventListener("input",e=>{$("#energy-label").textContent=e.target.value<30?"Calm":e.target.value<70?"Steady":"Energetic";generateLocal();});
$("#target-words").addEventListener("input",e=>{$("#target-words-label").textContent=`${e.target.value} words`;if(hasApiDraft&&values().topic){clearTimeout(wordTargetTimer);$("#draft-status-text").textContent="WORD TARGET CHANGED · UPDATING";wordTargetTimer=setTimeout(()=>generateFromApi(),850);}else generateLocal();});
$("#adapted-output").addEventListener("input",()=>{updateCounts();resetPublishApproval();});
$("#adapted-output").addEventListener("change",persistEditedDraft);
$("#save-draft").addEventListener("click",persistEditedDraft);
$("#save-voice-profile").addEventListener("click",saveVoiceProfile);
$("#delete-voice-profile").addEventListener("click",deleteVoiceProfile);
$("#saved-voice-select").addEventListener("change",e=>applyVoiceProfile(e.target.value));
$("#refresh-performance").addEventListener("click",syncPerformance);
for(const selector of ["#publish-media-url"]) $(selector).addEventListener("input",resetPublishApproval),$(selector).addEventListener("change",resetPublishApproval);
document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editDraft(b.dataset.edit)));
$("#campaign-pack-generate").addEventListener("click",buildCampaignPack);
document.querySelectorAll("[data-platform]").forEach(b=>b.addEventListener("click",()=>showAsset(b.dataset.platform)));
$("#asset-output").addEventListener("input",e=>{const active=document.querySelector('[data-platform][aria-selected="true"]')?.dataset.platform;if(active)campaignAssets[active]=e.target.value;});
$("#copy-asset").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("#asset-output").value);$("#copy-asset").textContent="Copied ";setTimeout(()=>$("#copy-asset").textContent="Copy version ↗",1500);}catch{$("#asset-output").select();document.execCommand("copy");}});
$("#approve-publish").addEventListener("click",async()=>{if(!currentDraftId||currentDraftPlatform!==values().platform){$("#publish-status").textContent="Save a draft for the selected destination before publishing.";return;}if(!await persistEditedDraft())return;const account=platformAccounts[currentDraftPlatform];if(!account?.connected||!account.capabilities?.can_publish){$("#publish-status").textContent="The selected publishing account is not connected or does not have publishing access.";syncPublishAvailability();return;}$("#approve-publish").disabled=true;$("#publish-status").textContent=`Publishing to ${account.account_label||platformName(currentDraftPlatform)}…`;try{const r=await fetch(`/api/drafts/${currentDraftId}/publish`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({approved:true,approved_content:$("#adapted-output").value.trim(),asset_url:$("#publish-media-url").value.trim()})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Publishing failed.");$("#publish-status").textContent=`Published to ${account.account_label||platformName(currentDraftPlatform)}${d.post_id?` · ${d.post_id}`:""}.`;currentDraftId=null;currentDraftPlatform=null;syncPublishAvailability();}catch(e){$("#publish-status").textContent=e.message||"Could not reach the publishing service.";syncPublishAvailability();}});
$("#setup-dismiss").addEventListener("click",finishSetup);
document.body.classList.add("is-setup");showSetupStep(1);
renderProfile("streetwear");renderBriefChecklist();generateLocal();loadScenarios("product");loadVoiceProfiles();loadPlatformConnections();loadPerformanceSummary();
fetch("/api/health").then(r=>r.ok?r.json():null).then(s=>{if(s)$("#api-status-label").textContent=s.mode==="sarvam"?"SARVAM CONNECTED":s.mode==="openai-compatible"?"AI CONNECTED":"LOCAL MODE";}).catch(()=>{});
const oauthParams=new URLSearchParams(location.search);if(oauthParams.get("connected")){$("#publish-status").textContent=`${platformName(oauthParams.get("connected"))} account connected through OAuth.`;history.replaceState(null,"",location.pathname);}else if(oauthParams.get("oauth_error")){$("#publish-status").textContent=`${platformName(oauthParams.get("oauth_error"))} connection did not complete. Check provider credentials, redirect URI, scopes, and review status.`;history.replaceState(null,"",location.pathname);}
