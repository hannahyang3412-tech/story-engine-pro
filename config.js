// 全局 Worker 代理地址
const WORKER_PROXY = 'https://moxinglaqu.lucyabbyhannah.workers.dev/?url=';

// 默认预设剧本
const PRESET_SCRIPTS = [
  {
    id: "script_haunted_mansion",
    title: "雾隐古宅的第十三阶",
    tag: "悬疑解密",
    description: "荒废百年的尖顶古宅深立于浓雾之中。每一步都踩在亡者的琴弦上……",
    nodes: [
      {
        choices: [
          "握住铁门链条，用力将其拉开",
          "询问同伴是否听到异响",
          "勘查泥地里残留的拖拽痕迹"
        ]
      }
    ]
  }
];

// 默认同伴人设库 (含初始 Seed 与垫图字段)
const DEFAULT_PERSONAS = [
  {
    id: "p_shen",
    name: "沈知韫",
    userNickname: "小朋友",
    appearance: "清冷出尘，黑色微卷长发，深色风衣，冰蓝色眼眸。",
    traits: "从容敏锐、克制护短",
    personaPrompt: "性格清冷自持但极度护短，习惯检查细节。在危险时刻绝不退让，对玩家怀有隐忍而深沉的温和。",
    defaultSeed: 12345,
    refImage: ""
  },
  {
    id: "p_li",
    name: "黎深",
    userNickname: "乖宝",
    appearance: "清冷矜贵，金丝眼镜，笔挺深色大衣与衬衫。",
    traits: "表面严谨克制，情绪内敛",
    personaPrompt: "作为心脏外科医师，冷静客观，但唯独对玩家常流露出少见的无可奈何的纵容与细致关照。",
    defaultSeed: 67890,
    refImage: ""
  }
];

// 默认玩家面具身份库
const DEFAULT_USER_PERSONAS = [
  {
    id: "up_default",
    name: "林言",
    appearance: "身手敏捷、眼神清澈，常着深色风衣。"
  }
];

// 默认文风库
const DEFAULT_WRITING_STYLES = [
  {
    id: 'st_1',
    name: '克苏鲁悬疑冷峻',
    prompt: '冷峻克制，多用短句，注重心理博弈与暗黑未知感。'
  },
  {
    id: 'st_2',
    name: '细腻温情修罗场',
    prompt: '细腻入微，多视角刻画同伴间眼神较劲、隐秘吃醋与克制的心跳。'
  }
];
