// ═══ 数据 ═══
const data = {
  A股: {
    fields: [['市值','大于','50'],['PE（TTM）','小于','30'],['ROE','大于','10'],['20日均线','高于','60日均线']],
    h: ['代码','名称','最新价','涨跌幅','市值','ROE'],
    r: [['600519','贵州茅台','1,482.00','+1.52%','18,624 亿','23.4%'],['300750','宁德时代','221.80','+2.18%','9,741 亿','18.2%'],['601318','中国平安','51.66','+0.67%','9,412 亿','11.8%']]
  },
  期货: {
    fields: [['成交量排名','前','20'],['持仓量变化','大于','5'],['20日波动率','大于','15'],['合约状态','等于','主力合约']],
    h: ['合约','品种','最新价','涨跌幅','成交量','持仓量'],
    r: [['IF2610','沪深300','4,126.0','+0.84%','126,420','218,540'],['TA610','PTA','5,214','-1.16%','98,125','342,810'],['RB2610','螺纹钢','3,286','+0.43%','87,410','1,124,620']]
  },
  期权: {
    fields: [['期权类型','等于','认购'],['剩余到期日','大于','15'],['隐含波动率','小于','30'],['买卖价差率','小于','2']],
    h: ['合约','类型','最新价','涨跌幅','隐含波动率','持仓量'],
    r: [['510050C2609M03000','认购','0.1824','+8.62%','22.4%','126,420'],['510300P2609M04400','认沽','0.0988','-3.18%','24.1%','98,125'],['IO2610-C-4200','认购','112.6','+2.11%','21.7%','65,802']]
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
        rows = payload.items.map(x => [x.code, x.name, Number(x.price).toLocaleString(), (x.change >= 0 ? '+' : '') + x.change + '%', x.market_cap ? x.market_cap + ' 亿' : (x.volume || ''), x.roe ? x.roe + '%' : (x.open_interest || '')]);
      }
    }
  } catch (e) { }
  document.querySelector('#count').textContent = rows.length + ' 个标的';
  document.querySelector('#output').innerHTML = `<table class="result-table"><thead><tr>${d.h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((x, i) => `<td class="${i === 3 ? (String(x)[0] == '+' ? 'pos' : 'neg') : ''}">${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  toast('筛选完成，找到 ' + rows.length + ' 个符合条件的标的');
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
  if (e.target.id === 'modal-close-btn' || e.target.classList.contains('modal-overlay')) closeModal();
  if (e.target.id === 'modal-done-btn') closeModal();
  if (e.target.closest('.modal-tab')) switchTab(e.target.closest('.modal-tab').dataset.tab);
  if (e.target.id === 'profile-logout') doLogout();
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
