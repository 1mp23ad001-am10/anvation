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
let currentVideoAssetId = null;

const sentencePattern = /[^.!?]+[.!?]+|[^.!?]+$/g;
const wordPattern = /[\p{L}\p{N}\p{M}]+(?:['’][\p{L}\p{N}\p{M}]+)*/gu;
const hashtagPattern = /#[\p{L}\p{N}_]+/gu;
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
function samplePostInput(){return importedSamplePosts || $("#sample-posts-input").value.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean).slice(0,10);}
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
function syncWordLimit(){const slider=$("#target-words");slider.max=$("#platform").value==="x"?35:300;if(+slider.value>+slider.max)slider.value=slider.max;$("#target-words-label").textContent=`${slider.value} words`;$("#target-words-max").textContent=`${slider.max} words`;}
function updateCounts() { const target=+$("#target-words").value;const count=words($("#adapted-output").value).length;$("#adapted-words").textContent=`${count} / ${target} WORDS`; }
function generateLocal(options={}) {
  const v=values(); $("#adapted-platform").textContent=platformName(v.platform).toUpperCase();
  if(hasApiDraft){updateCounts();$("#draft-status-text").textContent="SETTINGS CHANGED · REGENERATE TO APPLY";return;}
  if(!v.topic){$("#adapted-output").value="";updateCounts();$("#draft-status-text").textContent="ADD AN IDEA TO START";return;}
  $("#adapted-output").value=buildDraft(v,true,options.editSeed||""); updateCounts(); $("#draft-status-text").textContent=options.editSeed?"REWORKED FROM YOUR EDIT":"READY TO EDIT";
}
async function generateFromApi(options={}) {
  const input=values();
  if(!input.topic){$("#draft-status-text").textContent="ADD YOUR IDEA FIRST";$("#topic").focus();return;}
  generateLocal(options); $("#draft-status-text").textContent="WRITING…";
  try {
    const response=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...input,edit_seed:options.editSeed||""})});
    const result=await response.json();if(!response.ok) throw new Error(result.error||"Generation unavailable");
    if(typeof result.adapted!=="string") throw new Error("Invalid API result");
    if(result.target_words!==input.target_words){$("#target-words").value=result.target_words;$("#target-words-label").textContent=`${result.target_words} words`;}
    hasApiDraft=true; $("#adapted-output").value=result.adapted; updateCounts();
    input.target_words=result.target_words;const requestValues=input;resetPublishApproval();const modeLabel=result.mode==="sarvam"?"SARVAM GENERATED":result.mode==="openai-compatible"?"AI GENERATED":"LOCAL STARTER DRAFT";$("#draft-status-text").textContent=`${modeLabel} · ${result.word_count}/${result.target_words} WORDS${result.target_met?"":` · ${result.constraint_note||"Target not reached; review the actual count."}`}`;$("#api-status-label").textContent=result.mode==="sarvam"?"SARVAM CONNECTED":result.mode==="openai-compatible"?"AI CONNECTED":"LOCAL MODE";await scoreDraft(result.adapted,requestValues);await saveCampaignAndDraft(result.adapted,requestValues);
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
function syncPublishFields(){if($("#publish-media-wrap"))$("#publish-media-wrap").hidden=$("#platform").value!=="instagram";}
function resetPublishApproval(){const consent=$("#publish-consent"),button=$("#approve-publish");if(consent){consent.checked=false;button.disabled=true;}}
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
    $("#use-profile-posts").hidden=false;
  }catch(e){$("#discover-status").textContent=e.message||"Search unavailable. Continue without search.";}
}
function useSelectedProfilePosts(){
  const selected=[...document.querySelectorAll("[data-result-index]:checked")].map(x=>window.discoveredPosts?.[+x.dataset.resultIndex]).filter(x=>x?.snippet?.trim());
  if(!selected.length){$("#discover-status").textContent="Select at least one post first.";return;}
  importedSamplePosts=selected.map(x=>x.snippet.trim()).slice(0,10);$("#sample-posts-input").value=importedSamplePosts.join("\n\n");
  voiceMode="posts";$("#voice-source-badge").textContent="YOUR POSTS";$("#discover-status").textContent=`${importedSamplePosts.length} selected posts are ready as separate examples.`;
  renderProfile($("#scenario").value);generateLocal();
}
async function transcribeVoiceAudio(){
  const file=$("#voice-audio")?.files?.[0];
  if(!file){$("#voice-audio-status").textContent="Choose an audio recording first.";return;}
  if(document.querySelectorAll(".voice-check:checked").length!==4){$("#voice-audio-status").textContent="Check all four items so Whisper has the details your draft needs.";return;}
  $("#transcribe-voice").disabled=true;$("#voice-audio-status").textContent="Transcribing on this computer with Whisper…";
  try{
    const form=new FormData();form.append("file",file);
    const response=await fetch("/api/transcribe",{method:"POST",body:form});const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Transcription failed.");
    $("#voice-description").value=[$("#voice-description").value.trim(),data.text].filter(Boolean).join("\n\n");
    voiceMode="fresh";generateLocal();
    const labels={kn:"Kannada",hi:"Hindi",en:"English"};
    $("#voice-audio-status").textContent=`Transcribed in ${labels[data.language]||data.language}. Edit the transcript below if needed.`;
  }catch(error){$("#voice-audio-status").textContent=error.message||"Could not transcribe this recording.";}
  finally{$("#transcribe-voice").disabled=false;}
}
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
  try{
    const r=await fetch("/api/platforms"),d=await r.json();
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
  const name=$("#voice-profile-name").value.trim();if(!name){$("#voice-analysis-status").textContent="Name this voice profile before saving.";$("#voice-profile-name").focus();return;}
  const v=values();const payload={name,category:v.category,summary:customVoiceProfile?.summary||v.voice_description,tone:customVoiceProfile?.tone||v.voice_tone,favorite_words:v.favorite_words,avoid_words:v.avoid_words,sample_posts:v.sample_posts};
  try{const r=await fetch("/api/voice-profiles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error);selectedVoiceProfileId=d.id;$("#voice-analysis-status").textContent="Voice profile saved on this device.";await loadVoiceProfiles();$("#saved-voice-select").value=d.id;}
  catch(e){$("#voice-analysis-status").textContent=e.message||"Could not save this profile.";}
}
function applyVoiceProfile(id){const p=voiceProfiles.find(x=>x.id===id);if(!p)return;selectedVoiceProfileId=p.is_preset?null:p.id;creatorCategory=p.category;$("#campaign-category").value=p.category;$("#voice-description").value=p.summary||"";$("#voice-tone").value=p.tone||"warm and approachable";$("#favorite-words").value=p.favorite_words||"";$("#avoid-words").value=p.avoid_words||"";if(p.sample_posts?.length){voiceMode="posts";importedSamplePosts=p.sample_posts;$("#sample-posts-input").value=p.sample_posts.join("\n\n");}else voiceMode="fresh";$("#voice-source-badge").textContent=voiceMode==="posts"?"YOUR POSTS":"YOUR VOICE";customVoiceProfile={summary:p.summary,tone:p.tone,dos:p.favorite_words?`Use naturally: ${p.favorite_words}`:"Follow this saved voice.",donts:p.avoid_words?`Avoid: ${p.avoid_words}`:""};loadScenarios(creatorCategory);renderProfile($("#scenario").value);generateLocal();}
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
  if(action==="expand"){ next=`${text}\n\n${v.brand_id==="saas"?"That means teams can spend less time rebuilding context and more time responding to customers.":"Add one relevant detail, explain why it matters to your audience, and make the next step clear."}`; }
  if(action==="shorten"){ next=paragraphs.slice(0,2).join("\n\n").replace(/\s+/g," ").replace(/\n /g,"\n"); }
  if(action==="cta"){ if(!/\b(learn more|tell us|share|visit|try|join|reply|comment|sign up)\b/i.test(text))next+=`\n\n${v.brand_id==="saas"?"See what changed and share your questions.":"Share your thoughts or the next step you would take."}`; }
  box.value=next;updateCounts();$("#draft-status-text").textContent="EDIT APPLIED · READY TO REGENERATE";
}
async function buildCampaignPack(){
  const v=values();if(!v.topic){$("#draft-status-text").textContent="ADD YOUR IDEA FIRST";$("#topic").focus();return;}campaignAssets={};for(const p of ["instagram","linkedin","x"]){try{const r=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...v,platform:p,target_words:p==="x"?Math.min(35,v.target_words):v.target_words})});const d=await r.json();if(!r.ok)throw new Error(d.error);campaignAssets[p]=d.adapted;}catch(e){campaignAssets[p]=`Could not generate this version: ${e.message||"generation service unavailable"}`;}}
  $("#campaign-pack-results").hidden=false;showAsset("instagram");$("#campaign-pack-results").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function showAsset(platform){campaignAssets[platform]??=buildDraft({...values(),platform},true);$("#asset-output").value=campaignAssets[platform];const name=platformName(platform);$("#asset-title").textContent=`${name} ${platform==="instagram"?"caption":platform==="pinterest"?"pin description":platform==="youtube_shorts"?"description":"post"}`;document.querySelectorAll("[data-platform]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.platform===platform)));}

$("#scenario").addEventListener("change",setScenario);
$("#analyze-voice").addEventListener("click",buildVoiceProfile);
$("#discover-posts").addEventListener("click",discoverPublicPosts);
$("#use-profile-posts").addEventListener("click",useSelectedProfilePosts);
$("#transcribe-voice").addEventListener("click",transcribeVoiceAudio);

$("#generate-button").addEventListener("click",()=>generateFromApi());
$("#regenerate-edits").addEventListener("click",()=>{const editSeed=$("#adapted-output").value.trim();if(!editSeed){$("#draft-status-text").textContent="ADD AN EDIT FIRST";return;}generateFromApi({editSeed});});
for(const selector of ["#topic","#audience","#campaign-goal","#brand-knowledge","#style-guide","#favorite-words","#avoid-words","#voice-description","#campaign-keywords","#keyword-context"]) $(selector).addEventListener("input",()=>generateLocal());
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
$("#saved-voice-select").addEventListener("change",e=>applyVoiceProfile(e.target.value));
$("#refresh-performance").addEventListener("click",syncPerformance);
for(const selector of ["#publish-media-url"]) $(selector).addEventListener("input",resetPublishApproval),$(selector).addEventListener("change",resetPublishApproval);
document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editDraft(b.dataset.edit)));
$("#campaign-pack-generate").addEventListener("click",buildCampaignPack);
document.querySelectorAll("[data-platform]").forEach(b=>b.addEventListener("click",()=>showAsset(b.dataset.platform)));
$("#asset-output").addEventListener("input",e=>{const active=document.querySelector('[data-platform][aria-selected="true"]')?.dataset.platform;if(active)campaignAssets[active]=e.target.value;});
$("#copy-asset").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("#asset-output").value);$("#copy-asset").textContent="Copied ";setTimeout(()=>$("#copy-asset").textContent="Copy version ↗",1500);}catch{$("#asset-output").select();document.execCommand("copy");}});
$("#publish-consent").addEventListener("change",e=>$("#approve-publish").disabled=!e.target.checked);
$("#approve-publish").addEventListener("click",async()=>{if(!currentDraftId||!$("#publish-consent").checked){$("#publish-status").textContent="Select the approval box for this exact draft before continuing.";return;}if(currentDraftPlatform!==values().platform){$("#publish-status").textContent="Generate or save a draft for the selected destination, then approve it.";return;}await persistEditedDraft();try{const r=await fetch(`/api/drafts/${currentDraftId}/publish`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({approved:true,approved_content:$("#adapted-output").value.trim(),asset_url:$("#publish-media-url").value.trim()})});const d=await r.json();$("#publish-status").textContent=d.error||`Published successfully${d.post_id?` · ${d.post_id}`:""}.`;if(d.status==="published")resetPublishApproval();}catch{$("#publish-status").textContent="Could not reach the publishing service.";}});
renderProfile("streetwear");generateLocal();loadScenarios("product");loadVoiceProfiles();loadPlatformConnections();loadPerformanceSummary();
fetch("/api/health").then(r=>r.ok?r.json():null).then(s=>{if(s)$("#api-status-label").textContent=s.mode==="sarvam"?"SARVAM CONNECTED":s.mode==="openai-compatible"?"AI CONNECTED":"LOCAL MODE";}).catch(()=>{});
const oauthParams=new URLSearchParams(location.search);if(oauthParams.get("connected")){$("#publish-status").textContent=`${platformName(oauthParams.get("connected"))} account connected through OAuth.`;history.replaceState(null,"",location.pathname);}else if(oauthParams.get("oauth_error")){$("#publish-status").textContent=`${platformName(oauthParams.get("oauth_error"))} connection did not complete. Check provider credentials, redirect URI, scopes, and review status.`;history.replaceState(null,"",location.pathname);}
