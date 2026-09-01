(function(global){
  "use strict";
  const TYPES = [
  {
    "value": "Концерт",
    "label": "Концерт",
    "genres": [
      [
        "symphonic",
        "Симфонічна музика"
      ],
      [
        "chamber",
        "Камерна музика"
      ],
      [
        "jazz",
        "Джаз"
      ],
      [
        "pop_ua",
        "Естрада українська"
      ],
      [
        "pop_world",
        "Естрада зарубіжна"
      ],
      [
        "rock",
        "Рок"
      ],
      [
        "folk",
        "Фолк"
      ],
      [
        "choir",
        "Хорова музика"
      ],
      [
        "organ",
        "Органна музика"
      ],
      [
        "other",
        "Інше"
      ]
    ]
  },
  {
    "value": "Вистава",
    "label": "Вистава",
    "genres": [
      [
        "drama",
        "Драма"
      ],
      [
        "comedy",
        "Комедія"
      ],
      [
        "tragedy",
        "Трагедія"
      ],
      [
        "fairytale",
        "Казка"
      ],
      [
        "children",
        "Дитяча вистава"
      ],
      [
        "musical",
        "Мюзикл"
      ],
      [
        "opera",
        "Опера"
      ],
      [
        "ballet",
        "Балет"
      ],
      [
        "operetta",
        "Оперета"
      ],
      [
        "mono",
        "Моно вистава"
      ],
      [
        "other",
        "Інше"
      ]
    ]
  },
  {
    "value": "Кінопоказ",
    "label": "Кінопоказ",
    "genres": [
      [
        "fiction",
        "Художній фільм"
      ],
      [
        "documentary",
        "Документальний фільм"
      ],
      [
        "children",
        "Дитячий фільм"
      ],
      [
        "arthouse",
        "Артхаус"
      ],
      [
        "retro",
        "Ретроспектива"
      ],
      [
        "other",
        "Інше"
      ]
    ]
  },
  {
    "value": "Лекція",
    "label": "Лекція",
    "genres": [
      [
        "art",
        "Мистецтво"
      ],
      [
        "history",
        "Історія"
      ],
      [
        "music",
        "Музика"
      ],
      [
        "literature",
        "Література"
      ],
      [
        "education",
        "Освіта"
      ],
      [
        "meeting",
        "Зустріч"
      ],
      [
        "other",
        "Інше"
      ]
    ]
  },
  {
    "value": "Фестиваль",
    "label": "Фестиваль",
    "genres": [
      [
        "music",
        "Музичний"
      ],
      [
        "theatre",
        "Театральний"
      ],
      [
        "cinema",
        "Кіно"
      ],
      [
        "children",
        "Дитячий"
      ],
      [
        "city",
        "Міський"
      ],
      [
        "other",
        "Інше"
      ]
    ]
  },
  {
    "value": "Інше",
    "label": "Інше",
    "genres": [
      [
        "excursion",
        "Екскурсія"
      ],
      [
        "presentation",
        "Презентація"
      ],
      [
        "contest",
        "Конкурс"
      ],
      [
        "charity",
        "Благодійна подія"
      ],
      [
        "rental",
        "Орендна подія"
      ],
      [
        "other",
        "Інше"
      ]
    ]
  }
];
  const deepFreeze = value => {
    if(value && typeof value === "object" && !Object.isFrozen(value)){
      Object.freeze(value);
      Object.values(value).forEach(deepFreeze);
    }
    return value;
  };
  const byType = new Map(TYPES.map(t => [t.value, t]));
  function types(){ return TYPES.map(t => ({value:t.value,label:t.label})); }
  function genresFor(type){
    const row = byType.get(String(type||""));
    return row ? row.genres.map(([value,label]) => ({value,label})) : [];
  }
  function hasType(type){ return byType.has(String(type||"")); }
  function hasGenre(type, genre){ return genresFor(type).some(x => x.value === String(genre||"")); }
  function typeLabel(type){ return byType.get(String(type||""))?.label || String(type||""); }
  function genreLabel(type, genre){ return genresFor(type).find(x => x.value === String(genre||""))?.label || String(genre||""); }
  function fillTypeSelect(select, selected="", emptyLabel="Оберіть тип"){
    if(!select) return;
    select.innerHTML = `<option value="">${emptyLabel}</option>` + types().map(x => `<option value="${x.value}">${x.label}</option>`).join("");
    if(types().some(x => x.value === String(selected||""))) select.value = String(selected||"");
  }
  function fillGenreSelect(select, type, selected="", emptyLabel="Оберіть жанр"){
    if(!select) return;
    const rows = genresFor(type);
    select.innerHTML = `<option value="">${emptyLabel}</option>` + rows.map(x => `<option value="${x.value}">${x.label}</option>`).join("");
    if(rows.some(x => x.value === String(selected||""))) select.value = String(selected||"");
  }
  function audit(){
    const errors=[];
    const typeValues=new Set();
    for(const t of TYPES){
      if(typeValues.has(t.value)) errors.push(`duplicate type: ${t.value}`);
      typeValues.add(t.value);
      const genreValues=new Set();
      for(const [value] of t.genres){
        if(genreValues.has(value)) errors.push(`duplicate genre in ${t.value}: ${value}`);
        genreValues.add(value);
      }
    }
    return {ok:errors.length===0,errors,typeCount:TYPES.length,genreCount:TYPES.reduce((n,t)=>n+t.genres.length,0)};
  }
  global.VAEventTaxonomy = deepFreeze({version:"1.0.0",types,genresFor,hasType,hasGenre,typeLabel,genreLabel,fillTypeSelect,fillGenreSelect,audit,raw:TYPES});
})(window);
