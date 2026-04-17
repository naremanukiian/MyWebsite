/* ================================================================
   main.js — Nare Manukyan Portfolio
   Interactions + Smart Live Chat (name → topic → sub-questions)
   Telegram reply → live in browser + unread badge + notification
================================================================ */

// ── Year ──────────────────────────────────────────────────────────
const yr = document.getElementById('yr');
if (yr) yr.textContent = new Date().getFullYear();

// ── Custom cursor ─────────────────────────────────────────────────
const cursor   = document.getElementById('cursor');
const follower = document.getElementById('cursorFollower');
if (cursor && follower) {
  let mx=0,my=0,fx=0,fy=0;
  document.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    cursor.style.transform='translate('+mx+'px,'+my+'px)';
  });
  (function loop(){
    fx+=(mx-fx)*.12; fy+=(my-fy)*.12;
    follower.style.transform='translate('+fx+'px,'+fy+'px)';
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a,button').forEach(el=>{
    el.addEventListener('mouseenter',()=>{ cursor.classList.add('hovered'); follower.classList.add('hovered'); });
    el.addEventListener('mouseleave',()=>{ cursor.classList.remove('hovered'); follower.classList.remove('hovered'); });
  });
}

// ── Mobile nav ────────────────────────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navEl     = document.getElementById('mainNav');
if (navToggle && navEl) {
  navToggle.addEventListener('click', () => {
    const open = navEl.classList.toggle('open');
    navToggle.classList.toggle('open', open);
  });
}

// ── Sticky header ─────────────────────────────────────────────────
const headerEl = document.getElementById('siteHeader');
if (headerEl) {
  window.addEventListener('scroll', () => {
    headerEl.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

// ── Reveal on scroll ──────────────────────────────────────────────
const revealEls = document.querySelectorAll('[data-section]');
if (revealEls.length) {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  revealEls.forEach(el => obs.observe(el));
}

// ── Animated skill bars ───────────────────────────────────────────
const skillsEls = document.querySelectorAll('.skills-grid');
if (skillsEls.length) {
  const skillObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.skill-fill').forEach(f => {
          f.style.width = f.style.getPropertyValue('--w') || getComputedStyle(f).getPropertyValue('--w');
        });
        skillObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  skillsEls.forEach(el => skillObs.observe(el));
}

// ================================================================
//  SMART LIVE CHAT
// ================================================================
(function () {
  'use strict';

  const socket  = io({ transports: ['websocket', 'polling'] });

  const bubble  = document.getElementById('chat-bubble');
  const panel   = document.getElementById('chat-panel');
  const closeBtn= document.getElementById('chat-close');
  const backBtn = document.getElementById('chat-back');
  const step1   = document.getElementById('chat-step-1');
  const step2   = document.getElementById('chat-step-2');
  const step3   = document.getElementById('chat-step-3');
  const nameInp = document.getElementById('name-input');
  const nameSub = document.getElementById('name-submit');
  const greetEl = document.getElementById('chat-greet');
  const msgs    = document.getElementById('chat-messages');
  const chatInp = document.getElementById('chat-input');
  const chatSnd = document.getElementById('chat-send');

  if (!bubble || !panel) return;

  let isOpen   = false;
  let userName = '';
  let userTopic= '';

  // ── Knowledge Base ────────────────────────────────────────────
  const KB = {
    about: {
      intro: "Here's what people usually ask about me:",
      qs: [
        { q: "Who is Nare Manukyan?",         a: "I'm a third-year Computer Science and Applied Mathematics student with a deep interest in AI, data science, and actuarial analysis. I work as a Junior Actuarial Analyst at Liga Insurance." },
        { q: "What are your main interests?",  a: "Predictive modeling, risk analysis, machine learning, and actuarial science. I love exploring complex datasets and applying mathematical concepts to solve real-world problems." },
        { q: "What languages do you speak?",   a: "I speak four languages: Armenian (native), Russian (fluent), English (upper intermediate), and French (intermediate)." },
        { q: "Are you available for projects?",a: "Yes! I'm open to collaborations, internships, and interesting projects — especially in AI, data science, or actuarial analytics." }
      ]
    },
    education: {
      intro: "Here's what people ask about my education:",
      qs: [
        { q: "Where are you currently studying?",      a: "I'm enrolled in two programs: Computer Science & Applied Mathematics at the French University in Armenia (2023–2027), and the Faculty of Science & Engineering at University of Toulouse III (2024–2027)." },
        { q: "What is your previous education?",       a: "I completed a Diploma in Insurance Studies at Yerevan State Humanitarian College (2020–2023), which gave me a strong foundation in insurance operations and actuarial concepts." },
        { q: "Why two degrees at the same time?",      a: "The combination of Computer Science and Mathematics creates the perfect profile for actuarial data science — I can apply both technical and analytical skills to real-world problems." }
      ]
    },
    experience: {
      intro: "Here's what people ask about my work experience:",
      qs: [
        { q: "What is your current job?",          a: "I'm a Junior Actuarial Analyst at Liga Insurance (September 2025 – present). I perform actuarial data analysis, build and validate risk models, and develop predictive analytics." },
        { q: "Have you worked in QA?",             a: "Yes! In July 2025 I worked as a QA Engineer Intern at Liga Insurance, conducting API testing, functional validation, and defect reporting." },
        { q: "What other experience do you have?", a: "In 2023 I worked at Ingo as an Accounts Receivable Representative. In 2022 I was an Educational Intern at Liga Insurance, contributing to data collection and reporting." },
        { q: "What awards have you received?",     a: "I was awarded the LIGA Scholarship (2024–2025) for academic excellence and outstanding performance in insurance and IT-related fields." }
      ]
    },
    projects: {
      intro: "Here's what people ask about my projects:",
      qs: [
        { q: "Tell me about the IoT Air Monitoring project", a: "A hardware + software project at Tumo Labs (ClimateNet). I design sensor-integrated systems that monitor environmental air quality in real time and visualize pollution data." },
        { q: "What is the RideSharingDB System?",            a: "A complete SQL Server database (1,279 lines) for a ride-sharing platform — 8 tables, 7 triggers, 8 stored procedures, 15 indexes, 30 relational algebra queries, and role-based access control with 4 dashboard views." },
        { q: "Tell me about the Smart Traffic AI project",   a: "I built predictive algorithms and simulations that optimize traffic signal timing using AI, with full data visualizations and analysis report." },
        { q: "What is the Menu Analysis ML project?",        a: "A complete ML pipeline on restaurant data from Degusto and ArtLunch — TF-IDF feature engineering, clustering, classification, and regression evaluated with accuracy, F1-score, and MSE." }
      ]
    },
    skills: {
      intro: "Here's what people ask about my technical skills:",
      qs: [
        { q: "What programming languages do you know?", a: "Python (75%), C# (65%), C (65%), Shell & CLI (65%), Git & GitHub (70%), and C++ (45%). Python is my primary language for data science and ML work." },
        { q: "What are your analytics and AI skills?",  a: "Linear Algebra & Math (85%), Statistical Analysis (78%), Predictive Analytics (75%), Data Analysis (75%), Data Visualization (75%), and Machine Learning (65%)." },
        { q: "What tools and frameworks do you use?",   a: "Python (pandas, scikit-learn, NumPy, matplotlib), SQL Server, Excel, Git, and Shell/CLI. For ML I use scikit-learn and have experience with OpenAI APIs and TF-IDF pipelines." },
        { q: "What is your strongest skill?",           a: "Linear Algebra & Mathematics at 85%, followed by Statistical Analysis at 78%. These form the foundation of all my actuarial and data science work." }
      ]
    },
    other: { intro: null, qs: [] }
  };

  const FREE_REPLIES = {
    other: "Of course! Type your message below and I'll receive it directly and reply here personally.",
    default: "Thanks for reaching out! Type your message below and I'll get back to you personally."
  };

  // ── Unread badge (fixed position, won't affect bubble) ────────
  let unreadCount = 0;
  const badge = document.createElement('div');
  badge.id = 'chat-badge';
  badge.style.cssText = [
    'position:fixed','bottom:4.6rem','right:1.5rem',
    'width:20px','height:20px','border-radius:50%',
    'background:#b83050','color:#fff','font-size:.68rem','font-weight:700',
    'display:none','align-items:center','justify-content:center',
    'pointer-events:none','z-index:300',
    'border:2px solid #0f0e0d','font-family:sans-serif'
  ].join(';');
  document.body.appendChild(badge);

  function showBadge(n) { badge.textContent = n > 9 ? '9+' : n; badge.style.display = 'flex'; }
  function clearBadge() { unreadCount = 0; badge.style.display = 'none'; }

  // ── Browser notifications ─────────────────────────────────────
  function askNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
  function sendNotif(text) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification('Nare replied 💬', {
      body: text.length > 80 ? text.slice(0, 80) + '…' : text,
      icon: 'https://i.imgur.com/pXMb56j.jpeg',
      tag: 'nare-chat'
    });
    n.onclick = () => { window.focus(); openPanel(); n.close(); };
  }

  // ── Panel open / close ────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    bubble.classList.remove('has-reply');
    clearBadge();
    askNotifPermission();
    if (!userName)      setTimeout(() => nameInp.focus(), 300);
    else if (userTopic) setTimeout(() => chatInp.focus(), 300);
  }
  function closePanel() {
    isOpen = false;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  bubble.addEventListener('click', () => isOpen ? closePanel() : openPanel());
  closeBtn.addEventListener('click', closePanel);

  // ── Step switch ───────────────────────────────────────────────
  function goTo(from, to) {
    from.classList.remove('active');
    to.classList.add('active');
  }

  // Back button — return to topic selection, clear messages
  backBtn.addEventListener('click', () => {
    msgs.innerHTML = '';
    userTopic = '';
    goTo(step3, step2);
  });

  // ── DOM helpers ───────────────────────────────────────────────
  function mkMsg(text, type, time) {
    const w = document.createElement('div');
    w.className = 'msg msg--' + type;
    const p = document.createElement('p');
    p.textContent = text;
    w.appendChild(p);
    if (time) {
      const t = document.createElement('div');
      t.className = 'msg__time';
      t.textContent = time;
      w.appendChild(t);
    }
    return w;
  }
  function appendMsg(node) {
    msgs.appendChild(node);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function addOwner(text) { appendMsg(mkMsg(text, 'owner')); }
  function addVisitor(text) {
    appendMsg(mkMsg(text, 'visitor', new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })));
  }
  function addStatus(text) {
    const w = document.createElement('div');
    w.className = 'msg msg--status';
    const p = document.createElement('p'); p.textContent = text; w.appendChild(p);
    appendMsg(w); return w;
  }
  function mkTyping() {
    const d = document.createElement('div');
    d.className = 'chat-typing';
    d.innerHTML = '<span></span><span></span><span></span>';
    return d;
  }
  function ownerAfterTyping(text, delay) {
    const t = mkTyping(); appendMsg(t);
    setTimeout(() => { t.remove(); addOwner(text); }, delay);
  }

  // ── STEP 1: Name ──────────────────────────────────────────────
  function submitName() {
    const v = nameInp.value.trim();
    if (!v) return;
    userName = v;
    greetEl.innerHTML = '<p>Nice to meet you, <strong>' + userName + '</strong>! 😊</p>';
    goTo(step1, step2);
  }
  nameSub.addEventListener('click', submitName);
  nameInp.addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });

  // ── STEP 2: Topic → STEP 3 ────────────────────────────────────
  document.querySelectorAll('.chat-topic').forEach(btn => {
    btn.addEventListener('click', () => {
      userTopic = btn.dataset.topic;
      msgs.innerHTML = '';
      goTo(step2, step3);

      const data = KB[userTopic] || KB.other;

      if (!data.qs.length) {
        // Free message flow
        const reply = FREE_REPLIES[userTopic] || FREE_REPLIES.default;
        ownerAfterTyping(reply, 600);
        setTimeout(() => chatInp.focus(), 800);
        return;
      }

      // Sub-questions flow
      ownerAfterTyping(data.intro, 500);

      setTimeout(() => {
        const subqs = document.createElement('div');
        subqs.className = 'chat-subqs';
        data.qs.forEach(item => {
          const b = document.createElement('button');
          b.className = 'chat-subq';
          b.textContent = item.q;
          b.addEventListener('click', () => {
            addVisitor(item.q);
            b.disabled = true;
            b.style.opacity = '0.4';
            ownerAfterTyping(item.a, 900);
          });
          subqs.appendChild(b);
        });
        appendMsg(subqs);

        setTimeout(() => {
          const div = document.createElement('div');
          div.className = 'chat-divider';
          div.textContent = "Or send me a message directly — I'll reply via Telegram:";
          appendMsg(div);
          chatInp.focus();
        }, 200);
      }, 1100);
    });
  });

  // ── STEP 3: Send message → Telegram ──────────────────────────
  function sendMessage() {
    const text = chatInp.value.trim();
    if (!text) return;
    addVisitor(text);
    chatInp.value = '';
    chatSnd.disabled = true;
    const st = addStatus('Sending…');
    socket.emit('visitor_message', { text, name: userName, topic: userTopic });
    socket.once('message_sent', d => {
      chatSnd.disabled = false;
      st.querySelector('p').textContent = d.status === 'delivered'
        ? '✓ Nare has been notified — reply coming here'
        : '⚠ Could not send — please try again';
    });
  }
  chatSnd.addEventListener('click', sendMessage);
  chatInp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // ── Receive Nare's reply ──────────────────────────────────────
  socket.on('owner_reply', d => {
    // Make sure step3 is visible
    if (!step3.classList.contains('active')) {
      if      (step1.classList.contains('active')) goTo(step1, step3);
      else if (step2.classList.contains('active')) goTo(step2, step3);
    }
    appendMsg(mkMsg(d.text, 'owner', d.timestamp));
    if (!isOpen) {
      bubble.classList.add('has-reply');
      unreadCount++;
      showBadge(unreadCount);
      sendNotif(d.text);
    }
  });

  socket.on('disconnect', () => { chatSnd.disabled = true; });
  socket.on('connect',    () => { chatSnd.disabled = false; });

})();
