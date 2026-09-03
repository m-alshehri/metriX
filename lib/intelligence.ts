export type IntelMention = {
  keyword_id: string | null;
  author_username: string | null;
  author_name: string | null;
  content: string | null;
  sentiment: string | null;
  likes: number;
  shares: number;
  replies: number;
  views: number | string;
};

export function engagement(m: IntelMention) {
  return (m.likes || 0) + (m.shares || 0) + (m.replies || 0);
}

export function buildIntelligence(mentions: IntelMention[], keywords: {id:string;keyword:string}[]) {
  const total = mentions.length || 1;
  const shareOfVoice = keywords.map(k => {
    const count = mentions.filter(m => m.keyword_id === k.id).length;
    return { keyword: k.keyword, count, percent: Math.round(count / total * 100) };
  }).sort((a,b)=>b.count-a.count);

  const authors = new Map<string,{name:string;mentions:number;engagement:number;reach:number;negative:number}>();
  for (const m of mentions) {
    const key = m.author_username || m.author_name || "Unknown";
    const a = authors.get(key) || {name:key,mentions:0,engagement:0,reach:0,negative:0};
    a.mentions++; a.engagement += engagement(m); a.reach += Number(m.views)||0;
    if (m.sentiment === "negative") a.negative++;
    authors.set(key,a);
  }
  const topAuthors = Array.from(authors.values()).sort((a,b)=>b.engagement-a.engagement).slice(0,10);

  const stop = new Set(["the","and","for","this","that","with","from","في","من","على","الى","إلى","عن","هذا","هذه","التي","الذي","كان","كانت","و","او","أو"]);
  const terms = new Map<string,number>();
  for (const m of mentions) {
    const words = (m.content || "").toLowerCase()
      .replace(/https?:\/\/\S+/g," ")
      .replace(/[^A-Za-z0-9\u0600-\u06FF\s]/g," ")
      .split(/\s+/).filter(w=>w.length>=3 && !stop.has(w));
    for (const w of new Set(words)) terms.set(w,(terms.get(w)||0)+1);
  }
  const topics = Array.from(terms.entries()).map(([topic,count])=>({topic,count}))
    .sort((a,b)=>b.count-a.count).slice(0,12);

  return { shareOfVoice, topAuthors, topics };
}
