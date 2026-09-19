// ═══ 数据 ═══
const data = {
  A股: {
    fields: [['市值','大于','50'],['PE（TTM）','小于','30'],['ROE','大于','10'],['20日均线','高于','60日均线']],
    h: ['代码','名称','最新价','涨跌幅','市值','ROE'],
    r: [
      {code:'600519',name:'贵州茅台',price:1482,change:1.52,cap:'18,624 亿',roe:'23.4%',pe:25.6,pb:8.2,vol:'126.4万'},
      {code:'300750',name:'宁德时代',price:221.8,change:2.18,cap:'9,741 亿',roe:'18.2%',pe:32.1,pb:4.8,vol:'218.5万'},
      {code:'601318',name:'中国平安',price:51.66,change:0.67,cap:'9,412 亿',roe:'11.8%',pe:6.8,pb:0.9,vol:'98.1万'}
    ]
  },
  期货: {
    fields: [['成交量排名','前','20'],['持仓量变化','大于','5'],['20日波动率','大于','15'],['合约状态','等于','主力合约']],
    h: ['合约','品种','最新价','涨跌幅','成交量','持仓量'],
    r: [
      {code:'IF2610',name:'沪深300',price:4126,change:0.84,vol:'126,420',oi:'218,540'},
      {code:'TA610',name:'PTA',price:5214,change:-1.16,vol:'98,125',oi:'342,810'},
      {code:'RB2610',name:'螺纹钢',price:3286,change:0.43,vol:'87,410',oi:'1,124,620'}
    ]
  },
  期权: {
    fields: [['期权类型','等于','认购'],['剩余到期日','大于','15'],['隐含波动率','小于','30'],['买卖价差率','小于','2']],
    h: ['合约','类型','最新价','涨跌幅','隐含波动率','持仓量'],
    r: [
      {code:'510050C2609M03000',name:'50ETF认购',price:0.1824,change:8.62,iv:'22.4%',oi:'126,420'},
      {code:'510300P2609M04400',name:'300ETF认沽',price:0.0988,change:-3.18,iv:'24.1%',oi:'98,125'},
      {code:'IO2610-C-4200',name:'中证500认购',price:112.6,change:2.11,iv:'21.7%',oi:'65,802'}
    ]
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
    .then(d => { currentUser = d.user; updateProfile(d.user); })
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
  toast('已退出登录');
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
  document.querySelector('#fields').innerHTML = data[m].fields.map(f =>
    `<div class="field"><label>${f[0]}</label><select><option>${f[1]}</option><option>小于</option><option>等于</option></select><input value="${f[2]}"></div>`
  ).join('');
  document.querySelector('#output').innerHTML = '<div class="placeholder">⌕<h3>准备好开始了吗？</h3><p>在左侧设置条件，然后点击"运行筛选"。</p></div>';
  document.querySelector('#count').textContent = '等待运行';
}

async function run() {
  let d = data[market]; let rows = d.r;
  try {
    const res = await fetch(API + '/api/market?market=' + encodeURIComponent(market));
    if (res.ok) {
      const payload = await res.json();
      if (payload.items?.length) {
        rows = payload.items.map(x => ({code:x.code,name:x.name,price:Number(x.price),change:Number(x.change),cap:x.market_cap?x.market_cap+' 亿':'',roe:x.roe?x.roe+'%':'',pe:x.pe,pb:x.pb,vol:x.volume,oi:x.open_interest}));
      }
    }
  } catch (e) { }
  document.querySelector('#count').textContent = rows.length + ' 个标的';
  document.querySelector('#output').innerHTML = `<table class="result-table"><thead><tr>${d.h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map((r, idx) => `<tr data-idx="${idx}" class="stock-row"><td>${r.code}</td><td>${r.name}</td><td>${typeof r.price === 'number' ? r.price.toLocaleString() : r.price}</td><td class="${r.change >= 0 ? 'pos' : 'neg'}">${r.change >= 0 ? '+' : ''}${r.change}%</td><td>${r.cap || r.vol || ''}</td><td>${r.roe || r.oi || ''}</td></tr>`).join('')}</tbody></table>`;
  // 绑定行点击
  document.querySelectorAll('.stock-row').forEach(tr => {
    tr.addEventListener('click', () => openDetail(rows[parseInt(tr.dataset.idx)]));
  });
  toast('筛选完成，找到 ' + rows.length + ' 个符合条件的标的');
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
  if (e.target.id === 'detail-watch-btn') { toast('⭐ 已加入自选'); closeDetail(); }
  if (e.target.id === 'detail-export-btn') toast(' 数据导出功能即将开放');
  if (e.target.id === 'detail-screen-btn') { closeDetail(); screen(market); }
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
