const { createApp, ref, reactive, computed, nextTick, watch } = Vue;

createApp({
  setup() {
    // 全局视觉风格主题：'dark'(沉浸暗夜冷灰) 或 'warm'(暖柔治愈暖杏)
    const currentTheme = ref(localStorage.getItem('se_theme_style') || 'warm');
    const toggleTheme = () => {
      currentTheme.value = currentTheme.value === 'warm' ? 'dark' : 'warm';
      localStorage.setItem('se_theme_style', currentTheme.value);
    };

    // 路由状态机
    const currentStep = ref('boot');
    const previousStep = ref('mode_hub');
    const customInput = ref('');
    const isStreaming = ref(false);
    const isActionLocked = ref(false);
    const streamElapsed = ref(0);
    let streamInterval = null;
    const streamingRawText = ref('');
    const chatBoxRef = ref(null);

    // 弹窗状态
    const showAffectionModal = ref(false);
    const showLetterModal = ref(false);
    const showInventoryModal = ref(false);
    const showSummaryModal = ref(false);
    const showStyleModal = ref(false);
    const showImageModal = ref(false);
    const showCharAuthoredModal = ref(false);
    const isGeneratingCharScript = ref(false);
    const authorCharId = ref('p_shen');
    const authorUserPersonaId = ref('up_default');

    const previewImgUrl = ref('');
    const isSummarizing = ref(false);
    const isGeneratingImageNow = ref(false);
    let targetImageItem = null;

    const imageGenOptions = reactive({ type: 'combo' });
    const letterAuthorId = ref('p_shen');
    const currentMidnightLetter = ref('');
    const isGeneratingLetter = ref(false);

    // 文风与剧本
    const customWritingStyles = ref(DEFAULT_WRITING_STYLES);
    const scripts = ref(PRESET_SCRIPTS);
    const selectedScript = ref(scripts.value[0]);
    const isFreeModeSelection = ref(false);
    const freeModeCustomOpening = ref('');

    // 本地存档存储
    const activeSessions = ref(JSON.parse(localStorage.getItem('se_sessions')) || []);
    const currentSessionId = ref(localStorage.getItem('se_curr_sess_id') || null);

    // 文本模型与预设管理
    let savedUrl = localStorage.getItem('se_s_url') || 'https://api.uu6.top/';
    const settings = reactive({
      baseUrl: savedUrl,
      apiKey: localStorage.getItem('se_s_key') || 'sk-V1aSdbOaufjLVik6AM2GmzBrbVEo4V8INHhW4DUAE0ubCvmM',
      model: localStorage.getItem('se_s_model') || 'gemini-2.5-flash'
    });

    const apiPresets = ref(JSON.parse(localStorage.getItem('se_api_presets')) || [
      { id: 'pre_default', name: '默认中转站', baseUrl: settings.baseUrl, apiKey: settings.apiKey, model: settings.model }
    ]);
    const selectedPresetId = ref(localStorage.getItem('se_selected_preset_id') || 'pre_default');
    const newPresetName = ref('');

    // 生图配置与预设管理
    const savedImgConfig = JSON.parse(localStorage.getItem('se_img_config') || '{}');
    const imageConfig = reactive({
      provider: savedImgConfig.provider || 'public',
      baseUrl: savedImgConfig.baseUrl || '',
      apiKey: savedImgConfig.apiKey || '',
      model: savedImgConfig.model || 'dall-e-3'
    });

    const imgPresets = ref(JSON.parse(localStorage.getItem('se_img_presets')) || [
      { id: 'img_default', name: '公共免费 (Flux)', provider: 'public', baseUrl: '', apiKey: '', model: 'dall-e-3' }
    ]);
    const selectedImgPresetId = ref(localStorage.getItem('se_selected_img_preset_id') || 'img_default');
    const newImgPresetName = ref('');

    const isFetchingModels = ref(false);
    const modelList = ref(JSON.parse(localStorage.getItem('se_model_list') || '[]'));

    // 日常随聊
    const activeDailySessions = ref(JSON.parse(localStorage.getItem('se_daily_sessions')) || []);
    const currentDailySessionId = ref(localStorage.getItem('se_curr_daily_id') || null);
    const dailyInput = ref('');
    const isDailyStreaming = ref(false);
    const dailyChatBoxRef = ref(null);

    // 人设中心
    const personaList = ref(JSON.parse(localStorage.getItem('se_persona_list')) || DEFAULT_PERSONAS);
    const userPersonaList = ref(JSON.parse(localStorage.getItem('se_user_persona_list')) || DEFAULT_USER_PERSONAS);

    const chosenPersonaId = ref('p_shen');
    const chosenPersonaIds = ref(['p_shen']);
    const chosenUserPersonaId = ref('up_default');
    const personaTab = ref('companion');

    const editingPersonaId = ref(null);
    const personaForm = reactive({ name: '', userNickname: '', appearance: '', traits: '', personaPrompt: '', defaultSeed: '', refImage: '' });
    const editingUserPersonaId = ref(null);
    const userPersonaForm = reactive({ name: '', appearance: '' });

    // 计算属性
    const currentSession = computed(() => activeSessions.value.find(s => s.id === currentSessionId.value) || null);
    const currentDailySession = computed(() => activeDailySessions.value.find(d => d.id === currentDailySessionId.value) || null);

    const currentTitle = computed(() => {
      switch (currentStep.value) {
        case 'mode_hub': return '时空枢纽';
        case 'scripts': return '剧本大厅';
        case 'ongoing': return '剧情存档';
        case 'select_persona': return '配置入局';
        case 'game': return currentSession.value?.title || '探险中';
        case 'daily_setup': return '随聊配置';
        case 'daily_chat': return '日常聊天';
        case 'persona_mgr': return '人设中心';
        case 'settings': return '接口配置';
        default: return '';
      }
    });

    const backButtonText = computed(() => {
      if (currentStep.value === 'mode_hub') return '封面';
      if (['scripts', 'daily_setup'].includes(currentStep.value)) return '枢纽';
      if (['ongoing', 'select_persona'].includes(currentStep.value)) return '大厅';
      if (currentStep.value === 'game') return '大厅';
      if (currentStep.value === 'daily_chat') return '列表';
      return '返回';
    });

    const activeChoices = computed(() => {
      if (!currentSession.value?.gameLogs) return [];
      const logs = currentSession.value.gameLogs;
      for (let i = logs.length - 1; i >= 0; i--) {
        if (logs[i].type === 'engine' && Array.isArray(logs[i].choices) && logs[i].choices.length > 0) {
          return logs[i].choices;
        }
      }
      return ["向前深入探查", "环顾周遭细微动静", "与身旁同伴交换对策"];
    });

    const streamingCleanText = computed(() => {
      let t = streamingRawText.value;
      if (t.includes('<<<CHOICES>>>')) t = t.split('<<<CHOICES>>>')[0];
      return t.replace('<<<STORY>>>', '').trim();
    });

    const canRewind = computed(() => (currentSession.value?.gameLogs?.length || 0) > 1);

    // 持久化监听
    watch(activeSessions, newVal => localStorage.setItem('se_sessions', JSON.stringify(newVal)), { deep: true });
    watch(activeDailySessions, newVal => localStorage.setItem('se_daily_sessions', JSON.stringify(newVal)), { deep: true });

    const scrollToBottom = async () => {
      await nextTick();
      if (chatBoxRef.value) chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight;
    };

    // 返回逻辑
    const handleStepBack = () => {
      if (currentStep.value === 'persona_mgr' || currentStep.value === 'settings') {
        currentStep.value = (previousStep.value && previousStep.value !== currentStep.value) ? previousStep.value : 'mode_hub';
        return;
      }
      if (currentStep.value === 'mode_hub') currentStep.value = 'boot';
      else if (['scripts', 'daily_setup', 'daily_chat'].includes(currentStep.value)) currentStep.value = 'mode_hub';
      else if (['ongoing', 'select_persona'].includes(currentStep.value)) currentStep.value = 'scripts';
      else if (currentStep.value === 'game') currentStep.value = 'scripts';
      else currentStep.value = 'mode_hub';
    };

    const openPersonaManager = () => {
      if (currentStep.value === 'persona_mgr') { handleStepBack(); return; }
      if (currentStep.value !== 'settings') previousStep.value = currentStep.value;
      currentStep.value = 'persona_mgr';
    };

    const openSettings = () => {
      if (currentStep.value === 'settings') { handleStepBack(); return; }
      if (currentStep.value !== 'persona_mgr') previousStep.value = currentStep.value;
      currentStep.value = 'settings';
    };

    // 预设管理与模型拉取
    const applyPreset = pId => {
      const found = apiPresets.value.find(p => p.id === pId);
      if (found) {
        settings.baseUrl = found.baseUrl;
        settings.apiKey = found.apiKey;
        settings.model = found.model;
        selectedPresetId.value = pId;
      }
    };
    const saveAsNewPreset = () => {
      if (!newPresetName.value.trim()) return;
      apiPresets.value.push({ id: 'pre_' + Date.now(), name: newPresetName.value.trim(), baseUrl: settings.baseUrl, apiKey: settings.apiKey, model: settings.model });
      newPresetName.value = '';
      localStorage.setItem('se_api_presets', JSON.stringify(apiPresets.value));
      alert('预设保存成功！');
    };
    const deleteCurrentPreset = () => {
      if (apiPresets.value.length > 1) {
        apiPresets.value = apiPresets.value.filter(p => p.id !== selectedPresetId.value);
        applyPreset(apiPresets.value[0].id);
        localStorage.setItem('se_api_presets', JSON.stringify(apiPresets.value));
      }
    };

    const applyImgPreset = pId => {
      const found = imgPresets.value.find(p => p.id === pId);
      if (found) {
        Object.assign(imageConfig, found);
        selectedImgPresetId.value = pId;
      }
    };
    const saveAsNewImgPreset = () => {
      if (!newImgPresetName.value.trim()) return;
      imgPresets.value.push({ id: 'img_' + Date.now(), name: newImgPresetName.value.trim(), ...imageConfig });
      newImgPresetName.value = '';
      localStorage.setItem('se_img_presets', JSON.stringify(imgPresets.value));
      alert('生图预设保存成功！');
    };
    const deleteCurrentImgPreset = () => {
      if (imgPresets.value.length > 1) {
        imgPresets.value = imgPresets.value.filter(p => p.id !== selectedImgPresetId.value);
        applyImgPreset(imgPresets.value[0].id);
        localStorage.setItem('se_img_presets', JSON.stringify(imgPresets.value));
      }
    };

    const fetchModelList = async () => {
      const key = cleanApiKey(settings.apiKey);
      if (!key) { alert('请先填入有效的 API Key！'); return; }
      isFetchingModels.value = true;
      try {
        const list = await fetchRemoteModels(settings.baseUrl, key);
        if (list.length > 0) {
          modelList.value = list;
          localStorage.setItem('se_model_list', JSON.stringify(list));
          alert(`成功拉取到 ${list.length} 个可用模型！`);
        } else {
          alert('未能获取到模型列表，请确认该中转地址是否支持 /v1/models。');
        }
      } catch(e) {
        alert(`拉取失败：${e.message}`);
      } finally {
        isFetchingModels.value = false;
      }
    };

    const saveSettings = () => {
      settings.baseUrl = normalizeBaseUrl(settings.baseUrl);
      settings.apiKey = cleanApiKey(settings.apiKey);
      localStorage.setItem('se_s_url', settings.baseUrl);
      localStorage.setItem('se_s_key', settings.apiKey);
      localStorage.setItem('se_s_model', settings.model);
      localStorage.setItem('se_img_config', JSON.stringify(imageConfig));
      localStorage.setItem('se_api_presets', JSON.stringify(apiPresets.value));
      localStorage.setItem('se_img_presets', JSON.stringify(imgPresets.value));
      alert('全部配置已成功保存！');
      handleStepBack();
    };

    // 好感看板与深夜来信
    const openAffectionBoard = () => { showAffectionModal.value = true; };
    const getAffectionScore = pId => {
      let score = 50;
      activeSessions.value.forEach(s => { if ((s.companionIds || []).includes(pId)) score += (s.gameLogs?.length || 0) * 4; });
      activeDailySessions.value.forEach(d => { if (d.personaId === pId) score += (d.messages?.length || 0) * 3; });
      return Math.min(score, 100);
    };
    const getAffectionStage = pId => {
      const sc = getAffectionScore(pId);
      if (sc < 60) return '初识浅遇';
      if (sc < 85) return '心照不宣';
      return '相濡以沫';
    };
    const getAffectionDesc = pId => {
      const sc = getAffectionScore(pId);
      if (sc < 60) return '“相遇如初春积雪初融，TA的视线总不自觉为你多停留片刻。”';
      if (sc < 85) return '“指尖若有似无的触碰，藏在微垂眼睫下的在意已清晰可辨。”';
      return '“无论是深渊还是人间，只要你唤TA的名字，TA便跨越所有险阻奔赴你。”';
    };

    const openMidnightLetterModal = () => {
      showLetterModal.value = true;
      if (!currentMidnightLetter.value) {
        currentMidnightLetter.value = '（点击下方按钮，由 TA 在月色下为你亲笔落下一封信……）';
      }
    };

    const fetchMidnightLetter = async () => {
      const key = cleanApiKey(settings.apiKey);
      if (!key) { openSettings(); return; }
      isGeneratingLetter.value = true;
      const author = personaList.value.find(p => p.id === letterAuthorId.value) || personaList.value[0];
      try {
        const base = normalizeBaseUrl(settings.baseUrl);
        const resp = await workerFetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: settings.model,
            messages: [{ role: 'user', content: `你扮演同伴【${author.name}】（设定：${author.personaPrompt || author.traits}）。在深夜万籁俱寂时，给玩家写下一封克制深情的亲笔信，字数150-200字左右。` }],
            temperature: 0.85
          })
        });
        const data = await resp.json();
        currentMidnightLetter.value = data.choices?.[0]?.message?.content?.trim() || '（信纸上带着淡淡的香气与墨迹）';
      } catch(e) {
        currentMidnightLetter.value = '生成失败，请检查网络与API配置。';
      } finally {
        isGeneratingLetter.value = false;
      }
    };

    // 人设图片上传
    const handlePersonaImageUpload = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 480;
          canvas.height = 480 * (img.height / img.width);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          personaForm.refImage = canvas.toDataURL('image/jpeg', 0.8);
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    };

    const loadPersonaToEdit = p => {
      editingPersonaId.value = p.id;
      Object.assign(personaForm, p);
      nextTick(() => document.getElementById('persona-edit-form')?.scrollIntoView({ behavior: 'smooth' }));
    };

    const resetEditingPersona = () => {
      editingPersonaId.value = null;
      Object.assign(personaForm, { name: '', userNickname: '', appearance: '', traits: '', personaPrompt: '', defaultSeed: '', refImage: '' });
    };

    const savePersonaCard = () => {
      if (!personaForm.name.trim()) return;
      if (editingPersonaId.value) {
        const idx = personaList.value.findIndex(p => p.id === editingPersonaId.value);
        if (idx !== -1) personaList.value[idx] = { id: editingPersonaId.value, ...personaForm };
      } else {
        personaList.value.push({ id: 'p_' + Date.now(), ...personaForm });
      }
      localStorage.setItem('se_persona_list', JSON.stringify(personaList.value));
      alert('同伴人设保存成功！');
      resetEditingPersona();
    };

    const deletePersona = pId => {
      if (confirm('确定删除此同伴？')) {
        personaList.value = personaList.value.filter(p => p.id !== pId);
        localStorage.setItem('se_persona_list', JSON.stringify(personaList.value));
      }
    };

    const loadUserPersonaToEdit = up => {
      editingUserPersonaId.value = up.id;
      Object.assign(userPersonaForm, up);
      nextTick(() => document.getElementById('user-persona-edit-form')?.scrollIntoView({ behavior: 'smooth' }));
    };

    const resetEditingUserPersona = () => {
      editingUserPersonaId.value = null;
      Object.assign(userPersonaForm, { name: '', appearance: '' });
    };

    const saveUserPersonaCard = () => {
      if (!userPersonaForm.name.trim()) return;
      if (editingUserPersonaId.value) {
        const idx = userPersonaList.value.findIndex(up => up.id === editingUserPersonaId.value);
        if (idx !== -1) userPersonaList.value[idx] = { id: editingUserPersonaId.value, ...userPersonaForm };
      } else {
        userPersonaList.value.push({ id: 'up_' + Date.now(), ...userPersonaForm });
      }
      localStorage.setItem('se_user_persona_list', JSON.stringify(userPersonaList.value));
      alert('身份面具保存成功！');
      resetEditingUserPersona();
    };

    const setDefaultUserPersona = upId => {
      chosenUserPersonaId.value = upId;
      alert('已设为默认面具！');
    };

    const quickStartDailyChatFromPersona = pId => {
      chosenPersonaId.value = pId;
      startNewDailyChat();
    };

    // 剧本推演逻辑
    const selectScript = script => { isFreeModeSelection.value = false; selectedScript.value = script; currentStep.value = 'select_persona'; };
    const openFreeModeDetail = () => { isFreeModeSelection.value = true; freeModeCustomOpening.value = ''; currentStep.value = 'select_persona'; };
    const openCharAuthoredModal = () => {
      showCharAuthoredModal.value = true;
      if (personaList.value.length > 0) authorCharId.value = personaList.value[0].id;
    };

    const generateAndLaunchCharAuthoredGame = async () => {
      const key = cleanApiKey(settings.apiKey);
      if (!key) { openSettings(); return; }
      isGeneratingCharScript.value = true;
      const author = personaList.value.find(p => p.id === authorCharId.value);
      const userP = userPersonaList.value.find(u => u.id === authorUserPersonaId.value);

      let dailyMemorySnippet = '彼此拥有深刻默契。';
      const dailyChat = activeDailySessions.value.find(d => d.personaId === author.id);
      if (dailyChat?.messages?.length > 0) {
        dailyMemorySnippet = dailyChat.messages.slice(-6).map(m => `${m.role === 'user' ? userP.name : author.name}: ${m.text}`).join('\n');
      }

      const prompt = `你现在是同伴【${author.name}】（核心人设：${author.personaPrompt || author.traits}）。
你依据自己的执念背景，为玩家【${userP.name}】筹备并设计一场专属的剧本探险。
你们的近期记忆片段：${dailyMemorySnippet}。
请输出且仅输出严格的 JSON 字符串，格式如下：
{
  "title": "剧本名称",
  "description": "剧本简短故事背景",
  "openingNarrative": "详细的开篇情境描写（约300字，第一视角引导玩家）",
  "firstChoices": ["行动选项一", "行动选项二", "行动选项三"]
}`;

      try {
        const base = normalizeBaseUrl(settings.baseUrl);
        const resp = await workerFetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({ model: settings.model, messages: [{ role: 'user', content: prompt }], temperature: 0.8 })
        });
        const data = await resp.json();
        const res = JSON.parse(data.choices?.[0]?.message?.content?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}');

        const newSessId = 'sess_' + Date.now();
        const newSession = {
          id: newSessId,
          isFreeMode: false,
          isCharAuthored: true,
          authorCharId: author.id,
          companionIds: [author.id],
          userPersonaId: userP.id,
          title: `💌 ${res.title || '专属心愿'} · ${author.name}`,
          currentNodeIndex: 0,
          storySummary: `由【${author.name}】执笔：${res.description || ''}`,
          selectedStyleId: customWritingStyles.value[0]?.id || 'st_1',
          targetWordCount: 1500,
          contextRounds: 5,
          inventory: [],
          gameLogs: [{
            type: 'engine',
            storyText: res.openingNarrative || '【序幕】：微光轻颤，你们的专属冒险拉开帷幕。',
            choices: (res.firstChoices && res.firstChoices.length) ? res.firstChoices : ["握住同伴的手向前探查", "观察四周异动", "轻声询问对方的企图"],
            images: [],
            discoveredClues: [],
            companionPOV: ''
          }]
        };
        activeSessions.value.unshift(newSession);
        currentSessionId.value = newSessId;
        showCharAuthoredModal.value = false;
        currentStep.value = 'game';
        scrollToBottom();
      } catch(e) {
        alert(`反向执笔失败：${e.message}`);
      } finally {
        isGeneratingCharScript.value = false;
      }
    };

    const togglePersonaSelection = pId => {
      if (chosenPersonaIds.value.includes(pId)) {
        if (chosenPersonaIds.value.length > 1) chosenPersonaIds.value = chosenPersonaIds.value.filter(id => id !== pId);
      } else { chosenPersonaIds.value.push(pId); }
    };

    const confirmPersonaAndEnterGame = () => {
      const newSessId = 'sess_' + Date.now();
      const isFree = isFreeModeSelection.value;
      const userPersona = userPersonaList.value.find(u => u.id === chosenUserPersonaId.value) || userPersonaList.value[0];
      const companions = personaList.value.filter(p => chosenPersonaIds.value.includes(p.id));
      const companionNames = companions.map(c => c.name).join(' & ');

      const opening = isFree
        ? (freeModeCustomOpening.value.trim() || '【自由沙盒】：夜色深沉，前方的道路交织着不可预知的变数。')
        : '【序幕】：荒废百年的尖顶古宅深立于浓雾之中。生锈铁门虚掩，红眼渡鸦正注视着你们二人。';

      const initialChoices = isFree
        ? ["环顾四周并勘查现场", "向同行同伴确认方位", "迈步向前探寻未知路径"]
        : [...(selectedScript.value?.nodes[0]?.choices || ["握住铁门链条拉开", "勘查泥地拖拽痕迹"])];

      const newSession = {
        id: newSessId,
        isFreeMode: isFree,
        companionIds: [...chosenPersonaIds.value],
        userPersonaId: userPersona.id,
        title: isFree ? `自由沙盒 · ${companionNames}` : selectedScript.value.title,
        currentNodeIndex: 0,
        storySummary: '',
        targetWordCount: 1500,
        contextRounds: 5,
        inventory: [],
        selectedStyleId: 'st_1',
        gameLogs: [{
          type: 'engine',
          storyText: opening,
          choices: initialChoices,
          images: [],
          discoveredClues: [],
          companionPOV: ''
        }]
      };
      activeSessions.value.unshift(newSession);
      currentSessionId.value = newSessId;
      currentStep.value = 'game';
      scrollToBottom();
    };

    const resumeSession = sess => { currentSessionId.value = sess.id; currentStep.value = 'game'; scrollToBottom(); };
    const deleteSession = sessId => { activeSessions.value = activeSessions.value.filter(s => s.id !== sessId); };

    const executeAction = actionText => {
      if (!currentSession.value || isStreaming.value) return;
      currentSession.value.gameLogs.push({ type: 'player', text: actionText, isEditing: false });
      currentSession.value.pendingAction = true;
      scrollToBottom();
    };

    const triggerPendingAction = async () => {
      if (!currentSession.value || isStreaming.value) return;
      const key = cleanApiKey(settings.apiKey);
      if (!key) { openSettings(); return; }

      currentSession.value.pendingAction = false;
      isStreaming.value = true;
      streamingRawText.value = '';
      streamElapsed.value = 0;
      streamInterval = setInterval(() => streamElapsed.value += 0.1, 100);

      const companions = personaList.value.filter(p => (currentSession.value.companionIds || []).includes(p.id));
      const compPrompts = companions.map(c => `【同伴·${c.name}】（称呼玩家：【${c.userNickname || '你'}】，核心人设准则：${c.personaPrompt || c.traits}）`).join('\n');
      const targetWords = currentSession.value.targetWordCount || 1500;
      const rounds = currentSession.value.contextRounds || 5;

      const history = [];
      currentSession.value.gameLogs.forEach(l => {
        if (l.type === 'player') history.push({ role: 'user', content: l.text });
        else if (l.type === 'engine') history.push({ role: 'assistant', content: l.storyText });
      });

      const systemPrompt = `你是一个顶级互动小说兼跑团推演引擎。
【同伴核心人设准则（绝对不OOC）】：\n${compPrompts}
${currentSession.value.storySummary ? `【此前剧情关键线索备忘】：\n${currentSession.value.storySummary}\n` : ''}
【格式要求】：
1. 深入刻画同伴与玩家的动作细节、隐秘眼神交锋与微表情。
2. 篇幅约 ${targetWords} 字。
3. 文末必须强制另起一行输出 <<<CHOICES>>>，紧接着输出 3 个后续行动选项（格式为：1. 选项一 2. 选项二 3. 选项三）。`;

      try {
        const base = normalizeBaseUrl(settings.baseUrl);
        const resp = await workerFetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: settings.model,
            messages: [{ role: 'system', content: systemPrompt }, ...history.slice(-rounds * 2)],
            stream: true,
            temperature: 0.8
          })
        });

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (line.trim().startsWith('data: ') && line.trim() !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.trim().replace('data: ', ''));
                streamingRawText.value += parsed.choices?.[0]?.delta?.content || '';
                scrollToBottom();
              } catch(e) {}
            }
          }
        }

        const fullText = streamingRawText.value;
        let storyPart = fullText, choicesList = [];
        if (fullText.includes('<<<CHOICES>>>')) {
          const parts = fullText.split('<<<CHOICES>>>');
          storyPart = parts[0].trim();
          choicesList = parts[1].trim().split('\n')
            .map(l => l.replace(/^[\d\.\-\*、\s]+/, '').trim())
            .filter(Boolean).slice(0, 3);
        }

        if (choicesList.length === 0) {
          choicesList = ["向前探查深入情况", "与身旁的同伴轻声对策", "警惕地环顾四周异变"];
        }

        currentSession.value.gameLogs.push({
          type: 'engine',
          storyText: storyPart || '（推演推进中...）',
          choices: choicesList,
          images: [],
          discoveredClues: [],
          companionPOV: ''
        });
      } catch(e) {
        alert(`推演请求失败：${e.message}`);
      } finally {
        clearInterval(streamInterval);
        isStreaming.value = false;
        streamingRawText.value = '';
        scrollToBottom();
      }
    };

    const chooseOption = txt => executeAction(txt);
    const submitCustomAction = () => {
      if (!customInput.value.trim()) return;
      const t = customInput.value.trim();
      customInput.value = '';
      executeAction(t);
    };

    // 编辑与回溯
    const startEdit = item => { item.isEditing = true; item.editText = item.text; item.editStory = item.storyText; };
    const cancelEdit = item => { item.isEditing = false; };
    const saveAndRegeneratePlayer = (item, idx) => {
      item.text = item.editText;
      item.isEditing = false;
      regenerateFromPlayer(idx);
    };
    const saveEditStory = item => { item.storyText = item.editStory; item.isEditing = false; };
    const deleteLog = idx => currentSession.value.gameLogs.splice(idx, 1);
    const regenerateFromPlayer = idx => {
      const act = currentSession.value.gameLogs[idx].text;
      currentSession.value.gameLogs = currentSession.value.gameLogs.slice(0, idx);
      executeAction(act);
    };
    const rollbackToLog = idx => { currentSession.value.gameLogs = currentSession.value.gameLogs.slice(0, idx + 1); };
    const rewindLastRound = () => {
      if (currentSession.value?.gameLogs?.length <= 1) return;
      if (currentSession.value.gameLogs.pop()?.type === 'player') currentSession.value.gameLogs.pop();
    };
    const resetCurrentGame = () => { if (confirm('确定重开？')) currentSession.value.gameLogs = currentSession.value.gameLogs.slice(0, 1); };
    const regenerateLastResponse = () => {
      currentSession.value.gameLogs.pop();
      const lastPlayer = currentSession.value.gameLogs.pop();
      if (lastPlayer) executeAction(lastPlayer.text);
    };

    // 微光线索、心声、插图
    const searchMicroCues = async item => {
      const key = cleanApiKey(settings.apiKey);
      if (!key) return;
      item.isSearchingClues = true;
      try {
        const base = normalizeBaseUrl(settings.baseUrl);
        const resp = await workerFetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: settings.model,
            messages: [{ role: 'user', content: `从以下文本中提取1-2个物品线索，格式必须严格为JSON数组：[{"name":"线索名","desc":"简述"}]\n${item.storyText}` }]
          })
        });
        const data = await resp.json();
        item.discoveredClues = JSON.parse(data.choices?.[0]?.message?.content?.replace(/```json/g, '').replace(/```/g, '').trim() || '[]');
      } catch(e) {} finally { item.isSearchingClues = false; }
    };

    const toggleCompanionPOV = async item => {
      if (item.companionPOV) { item.companionPOV = ''; return; }
      const key = cleanApiKey(settings.apiKey);
      if (!key) return;
      item.isLoadingPOV = true;
      try {
        const base = normalizeBaseUrl(settings.baseUrl);
        const resp = await workerFetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: settings.model,
            messages: [{ role: 'user', content: `用第一人称简短写出同伴在这一刻的内心所想与克制的心绪：\n${item.storyText}` }]
          })
        });
        const data = await resp.json();
        item.companionPOV = data.choices?.[0]?.message?.content?.trim() || '';
      } catch(e) {} finally { item.isLoadingPOV = false; }
    };

    const addToInventory = clue => {
      if (!currentSession.value.inventory.some(i => i.name === clue.name)) {
        currentSession.value.inventory.push({ ...clue });
      }
    };

    const openImageModal = item => { targetImageItem = item; showImageModal.value = true; };
    const confirmAndGenerateImage = async () => {
      if (!targetImageItem) return;
      isGeneratingImageNow.value = true;
      try {
        const firstChar = personaList.value.find(p => (currentSession.value?.companionIds || []).includes(p.id)) || personaList.value[0];
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(`masterpiece, 8k, ${imageGenOptions.type}, ${firstChar?.appearance || ''}`)}?width=768&height=1024&nologo=true`;
        targetImageItem.images.push({ url, title: '剧情插画' });
        showImageModal.value = false;
      } catch(e) { alert('生图渲染失败'); } finally { isGeneratingImageNow.value = false; }
    };
    const removeImage = (item, idx) => item.images.splice(idx, 1);
    const previewImage = url => previewImgUrl.value = url;

    // 备忘录提取
    const generateAiSummary = async () => {
      const key = cleanApiKey(settings.apiKey);
      if (!key) { openSettings(); return; }
      isSummarizing.value = true;
      try {
        const base = normalizeBaseUrl(settings.baseUrl);
        const resp = await workerFetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: settings.model,
            messages: [{ role: 'user', content: `请对以下历次跑团与剧情推演内容进行线索提炼，列出关键发现与同伴关系进展，字数控制在150字左右：\n${currentSession.value.gameLogs.map(l => l.storyText || l.text).join('\n')}` }]
          })
        });
        const data = await resp.json();
        currentSession.value.storySummary = data.choices?.[0]?.message?.content?.trim() || '';
      } catch(e) { alert('生成总结失败'); } finally { isSummarizing.value = false; }
    };

    // 日常随聊
    const openDailyChatSetup = () => { currentStep.value = 'daily_setup'; };
    const startNewDailyChat = () => {
      const newId = 'daily_' + Date.now();
      const p = personaList.value.find(item => item.id === chosenPersonaId.value) || personaList.value[0];
      activeDailySessions.value.unshift({
        id: newId,
        personaId: p.id,
        userPersonaId: chosenUserPersonaId.value,
        title: `${p.name} 的日常漫谈`,
        messages: [{ role: 'assistant', text: `（${p.name}在你身侧坐下，抬眸凝视着你）\n“今天怎么有空找我聊天？”` }]
      });
      currentDailySessionId.value = newId;
      currentStep.value = 'daily_chat';
    };

    const resumeDailySession = d => { currentDailySessionId.value = d.id; currentStep.value = 'daily_chat'; };
    const deleteDailySession = dId => { activeDailySessions.value = activeDailySessions.value.filter(d => d.id !== dId); };

    const submitDailyInput = () => {
      if (!dailyInput.value.trim() || !currentDailySession.value) return;
      const text = dailyInput.value.trim();
      dailyInput.value = '';
      currentDailySession.value.messages.push({ role: 'user', text });
      currentDailySession.value.pendingMessage = true;
    };

    const triggerDailyPendingMessage = async () => {
      if (!currentDailySession.value || isDailyStreaming.value) return;
      const key = cleanApiKey(settings.apiKey);
      if (!key) { openSettings(); return; }

      currentDailySession.value.pendingMessage = false;
      isDailyStreaming.value = true;
      const p = personaList.value.find(item => item.id === currentDailySession.value.personaId) || personaList.value[0];
      try {
        const base = normalizeBaseUrl(settings.baseUrl);
        const resp = await workerFetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: settings.model,
            messages: [
              { role: 'system', content: `你扮演【${p.name}】（人设：${p.personaPrompt || p.traits}）。称呼玩家【${p.userNickname || '你'}】，口吻自然温和。` },
              ...currentDailySession.value.messages.slice(-6).map(m => ({ role: m.role, content: m.text }))
            ],
            stream: false
          })
        });
        const data = await resp.json();
        const reply = data.choices?.[0]?.message?.content || '（若有所思地看着你）';
        currentDailySession.value.messages.push({ role: 'assistant', text: reply });
      } catch(e) { alert('回复失败'); } finally { isDailyStreaming.value = false; }
    };

    const rewindDailyRound = () => { if (currentDailySession.value?.messages.length > 1) currentDailySession.value.messages.pop(); };

    const getCurrentStyleName = () => customWritingStyles.value.find(s => s.id === currentSession.value?.selectedStyleId)?.name || '默认文风';
    const getPersonaName = pId => personaList.value.find(p => p.id === pId)?.name || '同伴';
    const getUserPersonaName = upId => userPersonaList.value.find(u => u.id === upId)?.name || '你';

    return {
      currentTheme, toggleTheme,
      currentStep, previousStep, customInput, isStreaming, isActionLocked, streamElapsed, streamingCleanText,
      chatBoxRef, showAffectionModal, showLetterModal, showInventoryModal, showSummaryModal, showStyleModal,
      showImageModal, showCharAuthoredModal, isGeneratingCharScript, authorCharId, authorUserPersonaId,
      previewImgUrl, isSummarizing, isGeneratingImageNow, imageGenOptions,
      letterAuthorId, currentMidnightLetter, isGeneratingLetter, customWritingStyles, scripts, selectedScript,
      isFreeModeSelection, freeModeCustomOpening, activeSessions, currentSessionId, currentSession,
      settings, imageConfig, activeDailySessions, currentDailySessionId, currentDailySession, dailyInput, isDailyStreaming,
      dailyChatBoxRef, personaList, userPersonaList, chosenPersonaId, chosenPersonaIds, chosenUserPersonaId,
      personaTab, editingPersonaId, personaForm, editingUserPersonaId, userPersonaForm,
      apiPresets, selectedPresetId, newPresetName, imgPresets, selectedImgPresetId, newImgPresetName,
      isFetchingModels, modelList, currentTitle, backButtonText, activeChoices, canRewind,
      handleStepBack, openPersonaManager, openSettings, saveSettings, openAffectionBoard, openMidnightLetterModal,
      fetchMidnightLetter, getAffectionScore, getAffectionStage, getAffectionDesc, handlePersonaImageUpload,
      loadPersonaToEdit, resetEditingPersona, savePersonaCard, deletePersona, loadUserPersonaToEdit,
      resetEditingUserPersona, saveUserPersonaCard, setDefaultUserPersona, quickStartDailyChatFromPersona,
      selectScript, openFreeModeDetail, openCharAuthoredModal, generateAndLaunchCharAuthoredGame,
      togglePersonaSelection, confirmPersonaAndEnterGame, resumeSession, deleteSession,
      chooseOption, submitCustomAction, triggerPendingAction, startEdit, cancelEdit, saveAndRegeneratePlayer,
      saveEditStory, deleteLog, regenerateFromPlayer, rollbackToLog, rewindLastRound, resetCurrentGame,
      regenerateLastResponse, searchMicroCues, toggleCompanionPOV, addToInventory, openImageModal,
      confirmAndGenerateImage, removeImage, previewImage, generateAiSummary, openDailyChatSetup,
      startNewDailyChat, resumeDailySession, deleteDailySession, submitDailyInput, triggerDailyPendingMessage,
      rewindDailyRound, getCurrentStyleName, getPersonaName, getUserPersonaName,
      applyPreset, saveAsNewPreset, deleteCurrentPreset, applyImgPreset, saveAsNewImgPreset, deleteCurrentImgPreset, fetchModelList
    };
  }
}).mount('#app');
