/* ================================================================
   main.js — Portfolio interactions + Smart Live Chat
   Step 1: name → Step 2: topic → Step 3: sub-questions + Telegram
================================================================ */

// ── Year ─────────────────────────────────────────────────────────
const yr = document.getElementById('yr');
if (yr) yr.textContent = new Date().getFullYear();

// ── Custom cursor ─────────────────────────────────────────────────
const cursor   = document.getElementById('cursor');
const follower = document.getElementById('cursorFollower');
if (cursor && follower) {
  let mx=0,my=0,fx=0,fy=0;
  document.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    cursor.style.transform=`translate(${mx}px,${my}px)`;
  });
  (function animFollower(){
    fx+=(mx-fx)*.12; fy+=(my-fy)*.12;
    follower.style.transform=`translate(${fx}px,${fy}px)`;
    requestAnimationFrame(animFollower);
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
const skillGrids = document.querySelectorAll('.skills-grid');
if (skillGrids.length) {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.skill-fill').forEach(f => {
          f.style.width = f.style.getPropertyValue('--w') || getComputedStyle(f).getPropertyValue('--w');
        });
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  skillGrids.forEach(el => obs.observe(el));
}

/* ================================================================
   SMART LIVE CHAT
================================================================ */
(function () {
  'use strict';

  const socket = io({ transports: ['websocket', 'polling'] });

  const fab      = document.getElementById('chat-bubble');
  const panel    = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('chat-close');
  const step1    = document.getElementById('chat-step-1');
  const step2    = document.getElementById('chat-step-2');
  const step3    = document.getElementById('chat-step-3');
  const greetEl  = document.getElementById('chat-greet');
  const nameInp  = document.getElementById('name-input');
  const nameSub  = document.getElementById('name-submit');
  const msgs     = document.getElementById('chat-messages');
  const chatInp  = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');

  if (!fab || !panel) return;

  let isOpen    = false;
  let userName  = '';
  let userTopic = '';

  // ── Knowledge base — built from portfolio content ────────────────
  const KB = {
    about: {
      intro: "Here's what people usually ask about me:",
      qs: [
        {
          q: "Who is Nare Manukyan?",
          a: "I'm a third-year Computer Science and Applied Mathematics student with a deep interest in AI, data science, and actuarial analysis. I work as a Junior Actuarial Analyst at Liga Insurance and I'm passionate about turning complex data into actionable insights."
        },
        {
          q: "What are your main interests?",
          a: "Predictive modeling, risk analysis, machine learning, and actuarial science. I love exploring complex datasets and applying mathematical concepts to solve real-world problems."
        },
        {
          q: "What languages do you speak?",
          a: "I speak four languages: Armenian (native), Russian (fluent), English (upper intermediate), and French (intermediate)."
        },
        {
          q: "Are you available for projects?",
          a: "Yes! I'm open to collaborations, internships, and interesting projects — especially in AI, data science, or actuarial analytics."
        }
      ]
    },
    education: {
      intro: "Here's what people ask about my education:",
      qs: [
        {
          q: "Where are you currently studying?",
          a: "I'm enrolled in two programs simultaneously: Computer Science & Applied Mathematics at the French University in Armenia (2023–2027), and the Faculty of Science & Engineering at University of Toulouse III – Paul Sabatier (2024–2027)."
        },
        {
          q: "What is your previous education?",
          a: "I completed a Diploma in Insurance Studies at Yerevan State Humanitarian College (2020–2023), which gave me a strong foundation in insurance operations and actuarial concepts."
        },
        {
          q: "Why two degrees at the same time?",
          a: "The combination of Computer Science and Insurance/Mathematics creates the perfect profile for actuarial data science — I can apply both technical and analytical skills to real-world problems."
        }
      ]
    },
    experience: {
      intro: "Here's what people ask about my work experience:",
      qs: [
        {
          q: "What is your current job?",
          a: "I'm a Junior Actuarial Analyst at Liga Insurance (September 2025 – present). I perform actuarial data analysis, build and validate risk models, and develop predictive analytics to support strategic business decisions."
        },
        {
          q: "Have you worked in QA?",
          a: "Yes! In July 2025 I worked as a QA Engineer Intern at Liga Insurance, conducting API testing, functional validation, and defect reporting to ensure software releases met high standards."
        },
        {
          q: "What other experience do you have?",
          a: "In 2023 I worked at Ingo as an Accounts Receivable Representative, managing invoicing and account reconciliation. In 2022 I was an Educational Intern at Liga Insurance, contributing to data collection and reporting."
        },
        {
          q: "What awards have you received?",
          a: "I was awarded the LIGA Scholarship (2024–2025) for academic excellence and outstanding performance in insurance and IT-related fields."
        }
      ]
    },
    projects: {
      intro: "Here's what people ask about my projects:",
      qs: [
        {
          q: "Tell me about the IoT Air Monitoring project",
          a: "This is a hardware + software project at Tumo Labs as part of the ClimateNet initiative. I design and build sensor-integrated systems that monitor environmental air quality in real time and visualize pollution data."
        },
        {
          q: "What is the RideSharingDB System?",
          a: "A complete SQL Server database (1,279 lines) for a ride-sharing platform — 8 tables, 7 triggers, 8 stored procedures, 15 indexes, 30 relational algebra queries, and role-based access control. It also includes a live interactive dashboard with 4 role-based views: Passenger, Driver, Analyst, and DBA."
        },
        {
          q: "Tell me about the Smart Traffic AI project",
          a: "I studied AI applications in urban traffic prediction and built predictive algorithms and simulations that optimize traffic signal timing. The project includes full data visualizations and a detailed analysis report."
        },
        {
          q: "What is the Menu Analysis ML project?",
          a: "A complete ML pipeline on real-world restaurant data from Degusto and ArtLunch. I performed TF-IDF feature engineering, clustering, classification, and regression — evaluated with accuracy, F1-score, and MSE metrics."
        }
      ]
    },
    skills: {
      intro: "Here's what people ask about my technical skills:",
      qs: [
        {
          q: "What programming languages do you know?",
          a: "Python (75%), C# (65%), C (65%), Shell & CLI (65%), Git & GitHub (70%), and C++ (45%). Python is my primary language for data science and ML work."
        },
        {
          q: "What are your analytics and AI skills?",
          a: "Linear Algebra & Math (85%), Statistical Analysis (78%), Predictive Analytics (75%), Data Analysis (75%), Data Visualization (75%), and Machine Learning (65%)."
        },
        {
          q: "What tools and frameworks do you use?",
          a: "Python (pandas, scikit-learn, NumPy, matplotlib), SQL Server, Excel, Git, and Shell/CLI. For ML I use scikit-learn and have experience with OpenAI APIs and TF-IDF pipelines."
        },
        {
          q: "What is your strongest skill?",
          a: "Linear Algebra & Mathematics at 85%, followed by Statistical Analysis at 78%. These form the foundation of all my actuarial and data science work."
        }
      ]
    },
    other: {
      intro: null,
      qs: []
    }
  };

  // ── Panel open / close ──────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    fab.classList.remove('has-reply');
    if (!userName) setTimeout(() => nameInp.focus(), 300);
    else setTimeout(() => chatInp.focus(), 300);
  }
  function closePanel() {
    isOpen = false;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }
  fab.addEventListener('click', () => isOpen ? closePanel() : openPanel());
  closeBtn.addEventListener('click', closePanel);

  // ── Step switch ─────────────────────────────────────────────────
  function goTo(from, to) {
    from.classList.remove('active');
    to.classList.add('active');
  }

  // ── DOM helpers ─────────────────────────────────────────────────
  function ownerMsg(text) {
    const w = document.createElement('div');
    w.className = 'msg msg--owner';
    const p = document.createElement('p');
    p.textContent = text;
    w.appendChild(p);
    return w;
  }
  function visitorMsg(text, time) {
    const w = document.createElement('div');
    w.className = 'msg msg--visitor';
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
  function typingDots() {
    const d = document.createElement('div');
    d.className = 'chat-typing';
    d.innerHTML = '<span></span><span></span><span></span>';
    return d;
  }
  function appendMsg(node) {
    msgs.appendChild(node);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function addStatus(text) {
    const d = document.createElement('div');
    d.className = 'msg msg--status';
    const p = document.createElement('p');
    p.textContent = text;
    d.appendChild(p);
    appendMsg(d);
    return d;
  }
  function showAfterTyping(node, delay) {
    const t = typingDots();
    appendMsg(t);
    msgs.scrollTop = msgs.scrollHeight;
    setTimeout(() => { t.remove(); appendMsg(node); }, delay);
  }

  // ── STEP 1: Name ────────────────────────────────────────────────
  function submitName() {
    const val = nameInp.value.trim();
    if (!val) return;
    userName = val;
    greetEl.innerHTML = '<p>Nice to meet you, <strong>' + userName + '</strong>! \uD83D\uDE0A</p>';
    goTo(step1, step2);
  }
  nameSub.addEventListener('click', submitName);
  nameInp.addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });

  // ── STEP 2: Topic ───────────────────────────────────────────────
  document.querySelectorAll('.chat-topic').forEach(btn => {
    btn.addEventListener('click', () => {
      userTopic = btn.dataset.topic;
      buildStep3(userTopic, btn.textContent.trim());
      goTo(step2, step3);
    });
  });

  // ── STEP 3: Sub-questions ───────────────────────────────────────
  function buildStep3(topic, label) {
    msgs.innerHTML = '';
    const data = KB[topic];

    // Back button
    const back = document.createElement('button');
    back.className = 'chat-back';
    back.textContent = '\u2190 Choose another topic';
    back.addEventListener('click', () => { msgs.innerHTML = ''; goTo(step3, step2); });
    msgs.appendChild(back);

    if (topic === 'other') {
      showAfterTyping(ownerMsg('Of course! Go ahead and type your message below — I\u2019ll receive it on Telegram and reply here personally. \uD83D\uDC47'), 600);
      return;
    }

    // Intro message
    showAfterTyping(ownerMsg(data.intro), 500);

    // Sub-question buttons
    setTimeout(() => {
      const subqs = document.createElement('div');
      subqs.className = 'chat-subqs';
      data.qs.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'chat-subq';
        btn.textContent = item.q;
        btn.addEventListener('click', () => {
          appendMsg(visitorMsg(item.q));
          btn.disabled = true;
          btn.style.opacity = '0.4';
          showAfterTyping(ownerMsg(item.a), 900);
        });
        subqs.appendChild(btn);
      });
      appendMsg(subqs);

      // Divider
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'chat-divider';
        div.textContent = 'Or send me a personal message \u2014 I\u2019ll reply via Telegram:';
        appendMsg(div);
      }, 200);
    }, 1100);
  }

  // ── Send free message ───────────────────────────────────────────
  function sendMessage() {
    const text = chatInp.value.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    appendMsg(visitorMsg(text, now));
    chatInp.value = '';
    chatSend.disabled = true;
    const statusEl = addStatus('Sending\u2026');
    socket.emit('visitor_message', { text, name: userName, topic: userTopic });
    socket.once('message_sent', data => {
      chatSend.disabled = false;
      const p = statusEl.querySelector('p');
      if (data.status === 'delivered')
        p.textContent = '\u2713 Nare has been notified \u2014 reply coming here soon';
      else if (data.status === 'rate_limited')
        p.textContent = '\u26A0 Too many messages \u2014 please slow down';
      else
        p.textContent = '\u26A0 Could not send \u2014 please try again';
    });
  }
  chatSend.addEventListener('click', sendMessage);
  chatInp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // ── Receive Nare's reply ────────────────────────────────────────
  socket.on('owner_reply', data => {
    if (step3.classList.contains('active')) {
      showAfterTyping(ownerMsg(data.text), 800);
    }
    if (!isOpen) fab.classList.add('has-reply');
  });

  socket.on('disconnect', () => { chatSend.disabled = true; });
  socket.on('connect',    () => { chatSend.disabled = false; });

})();
