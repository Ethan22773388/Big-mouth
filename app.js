// ═══ 数据 ═══
const data = {
  A股: {
    fields: [
      {label:'市值(亿)',key:'market_cap',op:'大于',value:'50'},
      {label:'PE(TTM)',key:'pe',op:'小于',value:'30'},
      {label:'ROE(%)',key:'roe',op:'大于',value:'10'},
      {label:'涨跌幅(%)',key:'change',op:'大于',value:'0'},
      {label:'换手率(%)',key:'turnover',op:'大于',value:'1'},
      {label:'PB',key:'pb',op:'小于',value:'5'}
    ],
    h: ['代码','名称','最新价','涨跌幅','市值(亿)','PE','ROE(%)'],
    sortOptions: ['涨跌幅','市值','PE','ROE','换手率']
  },
  期货: {
    fields: [
      {label:'成交量',key:'volume',op:'大于',value:'50000'},
      {label:'持仓量',key:'open_interest',op:'大于',value:'100000'},
      {label:'涨跌幅(%)',key:'change',op:'大于',value:'0'}
    ],
    h: ['合约','品种','最新价','涨跌幅','成交量','持仓量'],
    sortOptions: ['成交量','持仓量','涨跌幅']
  },
  期权: {
    fields: [
      {label:'期权类型',key:'type',op:'等于',value:'认购'},
      {label:'隐含波动率(%)',key:'iv',op:'小于',value:'30'},
      {label:'涨跌幅(%)',key:'change',op:'大于',value:'0'}
    ],
    h: ['合约','类型','最新价','涨跌幅','隐含波动率','持仓量'],
    sortOptions: ['涨跌幅','隐含波动率','持仓量']
  }
};

let market = 'A股';
let currentUser = null;

const API = 'http://127.0.0.1:8787';
const toast = m => { const t = document.querySelector('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); };

// ═══ 登录状态管理 ═══
function checkAuth() {
  const token = localStorage.getItem('quant_token');
  if (!token) { updateProfile(null); return; }
  fetch(API + '/api/me', { headers: { 'Authorization': 'Bearer ' + token } })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(d => { currentUser = d.user; updateProfile(d.user); loadWatchlist(); loadTemplates(); })
    .catch(() => { localStorage.removeItem('quant_token'); updateProfile(null); });
}

function updateProfile(user) {
  const el = document.querySelector('#profile-info');
  const logoutBtn = document.querySelector('#profile-logout');
  const loginBtn = document.querySelector('#header-login-btn');
  if (user) {
    el.textContent = user.phone;
    logoutBtn.classList.remove('hidden');
    loginBtn.textContent = user.phone;
  } else {
    el.textContent = '未登录';
    logoutBtn.classList.add('hidden');
    loginBtn.textContent = '登录 / 注册';
  }
}

function doLogout() {
  localStorage.removeItem('quant_token');
  currentUser = null;
  updateProfile(null);
  document.querySelector('#watchlist-items').innerHTML = '登录后查看';
  document.querySelector('#template-items').innerHTML = '登录后查看';
  toast('已退出登录');
}

// ═══ 加载自选列表 ═══
async function loadWatchlist() {
  const token = localStorage.getItem('quant_token');
  if (!token) return;
  try {
    const res = await fetch(API + '/api/watchlist', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) return;
    const data = await res.json();
    const el = document.querySelector('#watchlist-items');
    if (!data.items?.length) { el.innerHTML = '<div style="font-size:11px;color:#a0a8b7;padding:4px 0">暂无自选</div>'; return; }
    el.innerHTML = data.items.map(w =>
      `<div class="watchlist-item" data-code="${w.code}"><div><span class="wl-code">${w.code}</span><br><span class="wl-name">${w.name}</span></div><button class="wl-remove" data-code="${w.code}">✕</button></div>`
    ).join('');
    el.querySelectorAll('.watchlist-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.classList.contains('wl-remove')) return;
        toast('查看 ' + item.dataset.code);
      });
    });
    el.querySelectorAll('.wl-remove').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        await fetch(API + '/api/watchlist/remove', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ code: btn.dataset.code })
        });
        toast('已移除');
        loadWatchlist();
      });
    });
  } catch (e) { }
}

// ═══ 加载模板列表 ═══
async function loadTemplates() {
  const token = localStorage.getItem('quant_token');
  if (!token) return;
  try {
    const res = await fetch(API + '/api/filters', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) return;
    const data = await res.json();
    const el = document.querySelector('#template-items');
    if (!data.items?.length) { el.innerHTML = '<div style="font-size:11px;color:#a0a8b7;padding:4px 0">暂无模板</div>'; return; }
    el.innerHTML = data.items.map(t => {
      const def = typeof t.definition === 'string' ? JSON.parse(t.definition) : t.definition;
      return `<div class="template-item" data-id="${t.id}"><div><span class="tpl-name">${t.name}</span></div><span class="tpl-market">${t.market}</span><button class="tpl-delete" data-id="${t.id}">✕</button></div>`;
    }).join('');
    el.querySelectorAll('.template-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.classList.contains('tpl-delete')) return;
        const t = data.items.find(x => x.id == item.dataset.id);
        if (t) {
          const def = typeof t.definition === 'string' ? JSON.parse(t.definition) : t.definition;
          toast('已加载模板：' + t.name);
        }
      });
    });
    el.querySelectorAll('.tpl-delete').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        await fetch(API + '/api/filters/delete', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ id: parseInt(btn.dataset.id) })
        });
        toast('已删除');
        loadTemplates();
      });
    });
  } catch (e) { }
}

// ══ 弹窗控制 ═══
function openModal(tab) {
  const modal = document.querySelector('#auth-modal');
  modal.classList.remove('hidden');
  switchTab(tab || 'login');
  // 清除之前的错误和表单
  document.querySelectorAll('.form-error').forEach(e => e.textContent = '');
  document.querySelectorAll('.auth-form input').forEach(e => e.value = '');
  document.querySelector('#logged-in-view').classList.add('hidden');
  document.querySelector('#login-form').classList.remove('hidden');
  document.querySelector('#register-form').classList.add('hidden');
}

function closeModal() {
  document.querySelector('#auth-modal').classList.add('hidden');
}

function switchTab(tab) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  if (tab === 'login') {
    document.querySelector('#login-form').classList.remove('hidden');
    document.querySelector('#register-form').classList.add('hidden');
  } else {
    document.querySelector('#login-form').classList.add('hidden');
    document.querySelector('#register-form').classList.remove('hidden');
  }
  document.querySelectorAll('.form-error').forEach(e => e.textContent = '');
}

function showLoggedIn(user) {
  document.querySelector('#login-form').classList.add('hidden');
  document.querySelector('#register-form').classList.add('hidden');
  document.querySelector('#logged-in-view').classList.remove('hidden');
  document.querySelector('#logged-user').textContent = user.phone + ' · 免费版';
}

// ═══ 登录 ═══
async function doLogin(phone, password) {
  const errEl = document.querySelector('#login-error');
  errEl.textContent = '';
  const btn = document.querySelector('#login-submit');
  btn.textContent = '登录中…'; btn.disabled = true;
  try {
    const r = await fetch(API + '/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const x = await r.json();
    if (x.token) {
      localStorage.setItem('quant_token', x.token);
      currentUser = x.user;
      updateProfile(x.user);
      showLoggedIn(x.user);
      loadWatchlist();
      loadTemplates();
    } else {
      errEl.textContent = x.message || '账号或密码错误';
    }
  } catch (e) {
    errEl.textContent = '无法连接后端，请先启动服务';
  }
  btn.textContent = '登录'; btn.disabled = false;
}

// ═══ 注册 ═══
async function doRegister(phone, password) {
  const errEl = document.querySelector('#register-error');
  errEl.textContent = '';
  const btn = document.querySelector('#register-submit');
  btn.textContent = '注册中…'; btn.disabled = true;
  try {
    const r = await fetch(API + '/api/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const x = await r.json();
    if (r.status === 201) {
      errEl.textContent = '';
      // 注册成功，自动登录
      await doLogin(phone, password);
    } else {
      errEl.textContent = x.message || '注册失败，该账号可能已存在';
    }
  } catch (e) {
    errEl.textContent = '无法连接后端，请先启动服务';
  }
  btn.textContent = '注册'; btn.disabled = false;
}

// ═══ 筛选 ═══
function screen(m) {
  market = m;
  document.querySelector('#home').classList.add('hidden');
  document.querySelector('#screen').classList.remove('hidden');
  document.querySelector('#screen-title').textContent = m + '筛选';
  document.querySelector('#crumb').textContent = m + '筛选';
  const d = data[m];
  // 筛选条件
  document.querySelector('#fields').innerHTML = d.fields.map((f, i) =>
    `<div class="field"><label>${f.label}</label><div class="field-row"><select data-idx="${i}" class="op-select"><option${f.op==='大于'?' selected':''}>大于</option><option${f.op==='小于'?' selected':''}>小于</option><option${f.op==='等于'?' selected':''}>等于</option><option${f.op==='大于等于'?' selected':''}>大于等于</option><option${f.op==='小于等于'?' selected':''}>小于等于</option></select><input type="number" step="any" data-idx="${i}" class="field-input" value="${f.value}"></div></div>`
  ).join('');
  // 排序选项
  const sortHtml = d.sortOptions ? `<div class="sort-bar"><span style="font-size:11px;color:#8792a5;margin-right:8px">排序</span>${d.sortOptions.map((s, i) => `<button class="sort-btn${i===0?' active':''}" data-sort="${s}">${s}</button>`).join('')}</div>` : '';
  document.querySelector('#output').innerHTML = sortHtml + '<div class="placeholder">⌕<h3>准备好开始了吗？</h3><p>在左侧设置条件，然后点击"运行筛选"。</p></div>';
  document.querySelector('#count').textContent = '等待运行';
}

async function run() {
  let d = data[market]; let rows = [];
  // 收集筛选条件
  const filters = [];
  document.querySelectorAll('#fields .field').forEach((fieldEl, i) => {
    const f = d.fields[i];
    if (!f) return;
    const op = fieldEl.querySelector('.op-select')?.value || f.op;
    const val = fieldEl.querySelector('.field-input')?.value;
    if (val !== '' && val !== undefined) {
      filters.push({ field: f.label, key: f.key, op, value: val });
    }
  });
  // 收集排序
  const activeSort = document.querySelector('.sort-btn.active');
  const sort_by = activeSort ? activeSort.dataset.sort : null;
  // 调用后端筛选 API
  try {
    const res = await fetch(API + '/api/screen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market, filters, sort_by, sort_order: 'desc', limit: 100 })
    });
    if (res.ok) {
      const payload = await res.json();
      rows = payload.items || [];
      document.querySelector('#count').textContent = `${payload.matched} / ${payload.total} 个标的`;
    }
  } catch (e) { }
  // 后端失败时使用前端过滤
  if (!rows.length) {
    rows = d.r || [];
    const d2 = {
      A股: {
        r: [
          {code:'600519',name:'贵州茅台',price:1482,change:1.52,market_cap:18624,pe:25.6,pb:8.2,roe:23.4,volume:1264000,turnover:0.42},
          {code:'300750',name:'宁德时代',price:221.8,change:2.18,market_cap:9741,pe:32.1,pb:4.8,roe:18.2,volume:2185000,turnover:1.23},
          {code:'601318',name:'中国平安',price:51.66,change:0.67,market_cap:9412,pe:6.8,pb:0.9,roe:11.8,volume:981000,turnover:0.53},
          {code:'000858',name:'五粮液',price:138.5,change:-0.36,market_cap:5374,pe:22.3,pb:5.1,roe:21.6,volume:542000,turnover:0.38},
          {code:'002594',name:'比亚迪',price:268.9,change:3.25,market_cap:7821,pe:28.7,pb:6.3,roe:19.5,volume:1856000,turnover:1.05},
          {code:'600036',name:'招商银行',price:35.82,change:0.28,market_cap:9032,pe:5.2,pb:0.8,roe:15.4,volume:723000,turnover:0.29},
          {code:'601012',name:'隆基绿能',price:22.15,change:-1.82,market_cap:1678,pe:18.9,pb:2.1,roe:12.3,volume:1245000,turnover:1.65},
          {code:'300059',name:'东方财富',price:18.62,change:4.15,market_cap:2935,pe:35.2,pb:3.8,roe:9.7,volume:3214000,turnover:2.18},
          {code:'600900',name:'长江电力',price:28.35,change:0.18,market_cap:6912,pe:21.4,pb:3.5,roe:16.8,volume:456000,turnover:0.19},
          {code:'000333',name:'美的集团',price:62.4,change:1.05,market_cap:4372,pe:12.8,pb:3.2,roe:24.1,volume:892000,turnover:0.62}
        ]
      },
      期货: {
        r: [
          {code:'IF2610',name:'沪深300',price:4126,change:0.84,volume:126420,open_interest:218540},
          {code:'IC2610',name:'中证500',price:6285,change:-0.52,volume:98200,open_interest:156320},
          {code:'TA610',name:'PTA',price:5214,change:-1.16,volume:98125,open_interest:342810}
        ]
      },
      期权: {
        r: [
          {code:'510050C2609M03000',name:'50ETF购9月3000',price:0.1824,change:8.62,iv:22.4,oi:126420},
          {code:'510300P2609M04400',name:'300ETF沽9月4400',price:0.0988,change:-3.18,iv:24.1,oi:98125},
          {code:'IO2610-C-4200',name:'沪深300购4200',price:112.6,change:2.11,iv:21.7,oi:65802}
        ]
      }
    };
    rows = d2[market]?.r || [];
    document.querySelector('#count').textContent = rows.length + ' 个标的（演示数据）';
  }
  // 渲染表格
  const headerMap = {
    'A股': ['代码','名称','最新价','涨跌幅','市值(亿)','PE','ROE(%)'],
    '期货': ['合约','品种','最新价','涨跌幅','成交量','持仓量'],
    '期权': ['合约','类型','最新价','涨跌幅','隐含波动率','持仓量']
  };
  const h = headerMap[market] || d.h;
  document.querySelector('#output').innerHTML = (d.sortOptions ? `<div class="sort-bar"><span style="font-size:11px;color:#8792a5;margin-right:8px">排序</span>${d.sortOptions.map((s, i) => `<button class="sort-btn${activeSort?.dataset.sort===s?' active':''}" data-sort="${s}">${s}</button>`).join('')}</div>` : '') +
    `<table class="result-table"><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map((r, idx) => {
      const cells = market === 'A股'
        ? [r.code, r.name, r.price?.toLocaleString(), (r.change>=0?'+':'')+r.change+'%', r.market_cap, r.pe, r.roe]
        : market === '期货'
        ? [r.code, r.name, r.price?.toLocaleString(), (r.change>=0?'+':'')+r.change+'%', r.volume, r.open_interest]
        : [r.code, r.type||'--', r.price, (r.change>=0?'+':'')+r.change+'%', r.iv, r.oi];
      return `<tr data-idx="${idx}" class="stock-row"><td>${cells[0]||''}</td><td>${cells[1]||''}</td><td>${cells[2]||''}</td><td class="${r.change>=0?'pos':'neg'}">${cells[3]||''}</td><td>${cells[4]||''}</td><td>${cells[5]||''}</td><td>${cells[6]||''}</td></tr>`;
    }).join('')}</tbody></table>`;
  // 绑定行点击 + 排序按钮
  document.querySelectorAll('.stock-row').forEach(tr => {
    tr.addEventListener('click', () => openDetail(rows[parseInt(tr.dataset.idx)]));
  });
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      run();
    });
  });
  toast('筛选完成');
}

// ═══ 详情页 ═══
let detailData = null;

function openDetail(item) {
  detailData = item;
  const modal = document.querySelector('#detail-modal');
  modal.classList.remove('hidden');
  // 填充数据
  document.querySelector('#detail-name').textContent = item.name;
  document.querySelector('#detail-code').textContent = item.code + (market === 'A股' ? ' · 沪' : market === '期货' ? ' · 期货' : ' · 期权');
  const priceEl = document.querySelector('#detail-price');
  priceEl.textContent = typeof item.price === 'number' ? item.price.toLocaleString() : item.price;
  const changeEl = document.querySelector('#detail-change');
  const sign = item.change >= 0 ? '+' : '';
  changeEl.textContent = sign + item.change + '%';
  changeEl.style.color = item.change >= 0 ? '#d0302d' : '#2e9e5a';
  priceEl.style.color = item.change >= 0 ? '#d0302d' : '#2e9e5a';
  // 指标卡片
  const metricsEl = document.querySelector('#detail-metrics');
  if (market === 'A股') {
    metricsEl.innerHTML = [
      {label:'市值',value:item.cap||'--'},
      {label:'PE(TTM)',value:item.pe||(25+Math.random()*10).toFixed(1)},
      {label:'PB',value:item.pb||(0.8+Math.random()*5).toFixed(1)},
      {label:'ROE',value:item.roe||'--'},
      {label:'成交量',value:item.vol||'--'},
      {label:'换手率',(1.2+Math.random()*3).toFixed(1)+'%'},
      {label:'52周高',(item.price*(1+Math.random()*0.3)).toFixed(1)},
      {label:'52周低',(item.price*(1-Math.random()*0.3)).toFixed(1)}
    ].map(m => `<div class="metric-card"><div class="label">${m.label}</div><div class="value">${m.value}</div></div>`).join('');
  } else {
    metricsEl.innerHTML = [
      {label:'成交量',value:item.vol||'--'},
      {label:'持仓量',value:item.oi||'--'},
      {label:'隐含波动率',value:item.iv||'--'},
      {label:'保证金',(item.price*0.1).toFixed(1)},
      {label:'昨收',(item.price*(1-Math.random()*0.02)).toFixed(2)},
      {label:'今开',(item.price*(1+(Math.random()-0.5)*0.02)).toFixed(2)},
      {label:'最高',(item.price*(1+Math.random()*0.02)).toFixed(2)},
      {label:'最低',(item.price*(1-Math.random()*0.02)).toFixed(2)}
    ].map(m => `<div class="metric-card"><div class="label">${m.label}</div><div class="value">${m.value}</div></div>`).join('');
  }
  // 绘制K线图
  drawKLine(item);
}

function closeDetail() {
  document.querySelector('#detail-modal').classList.add('hidden');
  detailData = null;
}

// ═══ 模拟 K 线图绘制 ═══
function drawKLine(item) {
  const canvas = document.querySelector('#kline-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth * 2;
  const H = canvas.height = 440;
  ctx.clearRect(0, 0, W, H);
  // 背景网格
  ctx.strokeStyle = '#eef1f6';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const y = 20 + i * (H - 40) / 5;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 10, y); ctx.stroke();
  }
  // 生成模拟数据
  const days = 30;
  const prices = [];
  let p = item.price * 0.92;
  for (let i = 0; i < days; i++) {
    const open = p;
    const close = open + (Math.random() - 0.48) * item.price * 0.03;
    const high = Math.max(open, close) + Math.random() * item.price * 0.02;
    const low = Math.min(open, close) - Math.random() * item.price * 0.02;
    prices.push({ open, close, high, low });
    p = close;
  }
  // 确保最后一个价格接近当前价格
  const last = prices[prices.length - 1];
  const scale = item.price / last.close;
  prices.forEach(d => { d.open *= scale; d.close *= scale; d.high *= scale; d.low *= scale; });
  // 找范围
  let minP = Infinity, maxP = -Infinity;
  prices.forEach(d => { if (d.low < minP) minP = d.low; if (d.high > maxP) maxP = d.high; });
  const pad = (maxP - minP) * 0.1;
  minP -= pad; maxP += pad;
  const chartLeft = 50, chartRight = W - 10, chartTop = 20, chartBottom = H - 40;
  const candleW = (chartRight - chartLeft) / days * 0.7;
  const gap = (chartRight - chartLeft) / days;
  const yOf = p => chartBottom - (p - minP) / (maxP - minP) * (chartBottom - chartTop);
  // 画K线
  prices.forEach((d, i) => {
    const x = chartLeft + i * gap + gap / 2;
    const isUp = d.close >= d.open;
    const color = isUp ? '#d0302d' : '#2e9e5a';
    // 影线
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, yOf(d.high)); ctx.lineTo(x, yOf(d.low)); ctx.stroke();
    // 实体
    const bodyTop = yOf(Math.max(d.open, d.close));
    const bodyBot = yOf(Math.min(d.open, d.close));
    const bodyH = Math.max(bodyBot - bodyTop, 1);
    ctx.fillStyle = color;
    if (isUp) {
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    } else {
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    }
  });
  // 当前价格线
  const lastPrice = item.price;
  const yPrice = yOf(lastPrice);
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = '#3164e8'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(chartLeft, yPrice); ctx.lineTo(chartRight, yPrice); ctx.stroke();
  ctx.setLineDash([]);
  // 价格标签
  ctx.fillStyle = '#3164e8';
  ctx.font = 'bold 18px -apple-system, sans-serif';
  ctx.fillText(lastPrice.toLocaleString(), chartRight - 100, yPrice - 6);
  // Y轴标签
  ctx.fillStyle = '#8792a5'; ctx.font = '16px -apple-system, sans-serif'; ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const val = minP + (maxP - minP) * i / 5;
    const y = chartBottom - i * (chartBottom - chartTop) / 5;
    ctx.fillText(val.toFixed(val > 100 ? 0 : 2), 44, y + 4);
  }
  // X轴标签
  ctx.textAlign = 'center'; ctx.fillStyle = '#8792a5';
  const labels = ['30日前','','','','25日前','','','','20日前','','','','15日前','','','','10日前','','','','5日前','','','','今日'];
  for (let i = 0; i < days; i += 5) {
    const x = chartLeft + i * gap + gap / 2;
    ctx.fillText(labels[i] || '', x, H - 8);
  }
}

// ═══ 事件绑定 ═══
document.addEventListener('click', e => {
  const v = e.target.closest('[data-view]')?.dataset.view;
  if (v === 'home') { document.querySelector('#screen').classList.add('hidden'); document.querySelector('#home').classList.remove('hidden'); document.querySelector('#crumb').textContent = '市场概览'; }
  if (v === 'stock') screen('A股');
  if (v === 'future') screen('期货');
  if (v === 'option') screen('期权');
  if (e.target.closest('[data-action="run"]')) run();
  if (e.target.closest('[data-action="reset"]')) screen(market);
  if (e.target.closest('[data-action="add"]')) toast('更多筛选条件将在下一步开放');
  if (e.target.closest('[data-action="login"]')) openModal('login');
  if (e.target.closest('[data-action="upgrade"]')) toast('会员方案将在下一步接入');
  // 弹窗事件
  if (e.target.id === 'modal-close-btn') closeModal();
  if (e.target.id === 'auth-modal') closeModal();
  if (e.target.id === 'modal-done-btn') closeModal();
  if (e.target.closest('.modal-tab')) switchTab(e.target.closest('.modal-tab').dataset.tab);
  if (e.target.id === 'profile-logout') doLogout();
  // 详情页事件
  if (e.target.id === 'detail-close-btn') closeDetail();
  if (e.target.id === 'detail-modal') closeDetail();
  if (e.target.id === 'detail-watch-btn') {
    if (!currentUser) { toast('请先登录'); return; }
    const token = localStorage.getItem('quant_token');
    fetch(API + '/api/watchlist', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ code: detailData.code, name: detailData.name, market })
    }).then(r => r.json()).then(d => {
      if (d.id) { toast('⭐ 已加入自选'); loadWatchlist(); }
      else toast(d.error || '加入失败');
    }).catch(() => toast('加入失败'));
    closeDetail();
  }
  if (e.target.id === 'detail-export-btn') toast(' 数据导出功能即将开放');
  if (e.target.id === 'detail-screen-btn') { closeDetail(); screen(market); }
  // 保存模板
  if (e.target.dataset.action === 'save-template') {
    if (!currentUser) { openModal('login'); toast('请先登录'); return; }
    document.querySelector('#save-template-modal').classList.remove('hidden');
    document.querySelector('#template-name').value = '';
    document.querySelector('#template-error').textContent = '';
  }
  if (e.target.id === 'save-template-close-btn') document.querySelector('#save-template-modal').classList.add('hidden');
  if (e.target.id === 'save-template-modal' && e.target === e.currentTarget) document.querySelector('#save-template-modal').classList.add('hidden');
  // 面板刷新
  if (e.target.id === 'refresh-watchlist') loadWatchlist();
  if (e.target.id === 'refresh-templates') loadTemplates();
});

// 表单提交
document.querySelector('#login-form').addEventListener('submit', e => {
  e.preventDefault();
  const phone = document.querySelector('#login-phone').value.trim();
  const password = document.querySelector('#login-password').value;
  if (!phone) { document.querySelector('#login-error').textContent = '请输入手机号'; return; }
  if (password.length < 6) { document.querySelector('#login-error').textContent = '密码至少 6 位'; return; }
  doLogin(phone, password);
});

document.querySelector('#register-form').addEventListener('submit', e => {
  e.preventDefault();
  const phone = document.querySelector('#register-phone').value.trim();
  const password = document.querySelector('#register-password').value;
  const confirm = document.querySelector('#register-confirm').value;
  if (!phone) { document.querySelector('#register-error').textContent = '请输入手机号'; return; }
  if (password.length < 6) { document.querySelector('#register-error').textContent = '密码至少 6 位'; return; }
  if (password !== confirm) { document.querySelector('#register-error').textContent = '两次密码不一致'; return; }
  doRegister(phone, password);
});

// 初始化：检查登录状态
checkAuth();

// 保存模板表单
document.querySelector('#save-template-form').addEventListener('submit', e => {
  e.preventDefault();
  const token = localStorage.getItem('quant_token');
  if (!token) return;
  const name = document.querySelector('#template-name').value.trim();
  if (!name) { document.querySelector('#template-error').textContent = '请输入模板名称'; return; }
  // 收集当前筛选条件
  const d = data[market];
  const filters = [];
  document.querySelectorAll('#fields .field').forEach((fieldEl, i) => {
    const f = d.fields[i];
    if (!f) return;
    const op = fieldEl.querySelector('.op-select')?.value || f.op;
    const val = fieldEl.querySelector('.field-input')?.value;
    if (val !== '' && val !== undefined) filters.push({ field: f.label, key: f.key, op, value: val });
  });
  const activeSort = document.querySelector('.sort-btn.active');
  fetch(API + '/api/filters', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ name, market, definition: { filters, sort_by: activeSort?.dataset.sort } })
  }).then(r => r.json()).then(d => {
    if (d.id) { toast('💾 模板已保存'); loadTemplates(); document.querySelector('#save-template-modal').classList.add('hidden'); }
    else toast('保存失败');
  }).catch(() => toast('保存失败'));
});
