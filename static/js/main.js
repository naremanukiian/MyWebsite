/* ================================================================
   main.js — Portfolio interactions + Smart Live Chat + Animations
   ================================================================ */

// Year
const yr = document.getElementById('yr');
if (yr) yr.textContent = new Date().getFullYear();

// Custom cursor
const cursor   = document.getElementById('cursor');
const follower = document.getElementById('cursorFollower');
if (cursor && follower) {
  let mx=0,my=0,fx=0,fy=0;
  document.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    cursor.style.transform='translate('+mx+'px,'+my+'px)';
  });
  (function animFollower(){
    fx+=(mx-fx)*.12; fy+=(my-fy)*.12;
    follower.style.transform='translate('+fx+'px,'+fy+'px)';
    requestAnimationFrame(animFollower);
  })();
  document.querySelectorAll('a,button').forEach(el=>{
    el.addEventListener('mouseenter',()=>{cursor.classList.add('hovered');follower.classList.add('hovered');});
    el.addEventListener('mouseleave',()=>{cursor.classList.remove('hovered');follower.classList.remove('hovered');});
  });
}

// Mobile nav
const navToggle = document.getElementById('navToggle');
const nav       = document.getElementById('mainNav');
if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.classList.toggle('open', open);
  });
}

// Sticky header
const headerEl = document.getElementById('siteHeader');
if (headerEl) {
  window.addEventListener('scroll', () => {
    headerEl.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

// Reveal on scroll
const revealEls = document.querySelectorAll('[data-section]');
if (revealEls.length) {
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  revealEls.forEach(el => revealObs.observe(el));
}

// Animated skill bars
const skillsEls = document.querySelectorAll('.skills-grid');
if (skillsEls.length) {
  const skillObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.skill-fill').forEach(fill => {
          fill.style.width = fill.style.getPropertyValue('--w') || getComputedStyle(fill).getPropertyValue('--w');
        });
        skillObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  skillsEls.forEach(el => skillObs.observe(el));
}

// Number Counter Animation
function animateCounter(el, target, duration) {
  let startTime = null;
  const suffix = el.dataset.suffix || '';
  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    el.textContent = Math.floor(progress * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target + suffix;
  };
  requestAnimationFrame(step);
}
const statsObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.stat-num').forEach(el => {
        const raw = el.textContent.trim();
        const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
        el.dataset.suffix = raw.replace(/[0-9.]/g, '');
        el.textContent = '0' + el.dataset.suffix;
        animateCounter(el, num, 1500);
      });
      statsObs.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.hero-stats').forEach(el => statsObs.observe(el));

// Typewriter Effect
const typeEl = document.querySelector('.hero-eyebrow');
if (typeEl) {
  const fullText = typeEl.textContent.trim();
  typeEl.textContent = '';
  typeEl.style.borderRight = '2px solid var(--gold)';
  typeEl.style.paddingRight = '4px';
  let i = 0;
  const type = () => {
    if (i < fullText.length) {
      typeEl.textContent += fullText[i]; i++;
      setTimeout(type, 45);
    } else {
      setTimeout(() => { typeEl.style.borderRight='none'; typeEl.style.paddingRight='0'; }, 800);
    }
  };
  setTimeout(type, 1800);
}

// Tilt Effect on Project Cards
document.querySelectorAll('.project-item').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = 'perspective(800px) rotateY('+(x*8)+'deg) rotateX('+(-y*8)+'deg) translateY(-4px)';
    card.style.transition = 'transform 0.1s ease';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.4s ease';
  });
});

// ================================================================
//  SMART LIVE CHAT
// ================================================================
(function () {
  'use strict';

  const socket = io({ transports: ['websocket', 'polling'] });

  const bubble    = document.getElementById('chat-bubble');
  const panel     = document.getElementById('chat-panel');
  const closeBtn  = document.getElementById('chat-close');
  const step1     = document.getElementById('chat-step-1');
  const step2     = document.getElementById('chat-step-2');
  const step3     = document.getElementById('chat-step-3');
  const nameInput = document.getElementById('name-input');
  const nameSub   = document.getElementById('name-submit');
  const greetEl   = document.getElementById('chat-greet');
  const messages  = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSend  = document.getElementById('chat-send');

  if (!bubble || !panel) return;

  let isOpen = false, userName = '', userTopic = '';

  const KB = {
    about: {
      intro: "Here's what people usually ask about me:",
      qs: [
        { q: "Who is Nare Manukyan?", a: "I'm a third-year Computer Science and Applied Mathematics student with a deep interest in AI, data science, and actuarial analysis. I work as a Junior Actuarial Analyst at Liga Insurance and I'm passionate about turning complex data into actionable insights." },
        { q: "What are your main interests?", a: "Predictive modeling, risk analysis, machine learning, and actuarial science. I love exploring complex datasets and applying mathematical concepts to solve real-world problems." },
        { q: "What languages do you speak?", a: "I speak four languages: Armenian (native), Russian (fluent), English (upper intermediate), and French (intermediate)." },
        { q: "Are you available for projects?", a: "Yes! I'm open to collaborations, internships, and interesting projects — especially in AI, data science, or actuarial analytics." }
      ]
    },
    education: {
      intro: "Here's what people ask about my education:",
      qs: [
        { q: "Where are you currently studying?", a: "I'm enrolled in two programs simultaneously: Computer Science & Applied Mathematics at the French University in Armenia (2023–2027), and the Faculty of Science & Engineering at University of Toulouse III – Paul Sabatier (2024–2027)." },
        { q: "What is your previous education?", a: "I completed a Diploma in Insurance Studies at Yerevan State Humanitarian College (2020–2023), which gave me a strong foundation in insurance operations and actuarial concepts." },
        { q: "Why two degrees at the same time?", a: "The combination of Computer Science and Insurance/Mathematics creates the perfect profile for actuarial data science — I can apply both technical and analytical skills to real-world problems." }
      ]
    },
    experience: {
      intro: "Here's what people ask about my work experience:",
      qs: [
        { q: "What is your current job?", a: "I'm a Junior Actuarial Analyst at Liga Insurance (September 2025 – present). I perform actuarial data analysis, build and validate risk models, and develop predictive analytics to support strategic business decisions." },
        { q: "Have you worked in QA?", a: "Yes! In July 2025 I worked as a QA Engineer Intern at Liga Insurance, conducting API testing, functional validation, and defect reporting." },
        { q: "What other experience do you have?", a: "In 2023 I worked at Ingo as an Accounts Receivable Representative. In 2022 I was an Educational Intern at Liga Insurance, contributing to data collection and reporting." },
        { q: "What awards have you received?", a: "I was awarded the LIGA Scholarship (2024–2025) for academic excellence and outstanding performance in insurance and IT-related fields." }
      ]
    },
    projects: {
      intro: "Here's what people ask about my projects:",
      qs: [
        { q: "Tell me about the IoT Air Monitoring project", a: "A hardware + software project at Tumo Labs (ClimateNet). I design sensor-integrated systems that monitor environmental air quality in real time and visualize pollution data." },
        { q: "What is the RideSharingDB System?", a: "A complete SQL Server database (1,279 lines) for a ride-sharing platform — 8 tables, 7 triggers, 8 stored procedures, 15 indexes, 30 relational algebra queries, and role-based access control. Includes a live interactive dashboard with 4 role-based views." },
        { q: "Tell me about the Smart Traffic AI project", a: "I built predictive algorithms and simulations that optimize traffic signal timing using AI. Includes full data visualizations and a detailed analysis report." },
        { q: "What is the Menu Analysis ML project?", a: "A complete ML pipeline on restaurant data from Degusto and ArtLunch — TF-IDF feature engineering, clustering, classification, and regression evaluated with accuracy, F1-score, and MSE." }
      ]
    },
    skills: {
      intro: "Here's what people ask about my technical skills:",
      qs: [
        { q: "What programming languages do you know?", a: "Python (75%), C# (65%), C (65%), Shell & CLI (65%), Git & GitHub (70%), and C++ (45%). Python is my primary language for data science and ML work." },
        { q: "What are your analytics and AI skills?", a: "Linear Algebra & Math (85%), Statistical Analysis (78%), Predictive Analytics (75%), Data Analysis (75%), Data Visualization (75%), and Machine Learning (65%)." },
        { q: "What tools and frameworks do you use?", a: "Python (pandas, scikit-learn, NumPy, matplotlib), SQL Server, Excel, Git, and Shell/CLI. For ML I use scikit-learn and have experience with OpenAI APIs and TF-IDF pipelines." },
        { q: "What is your strongest skill?", a: "Linear Algebra & Mathematics at 85%, followed by Statistical Analysis at 78%. These form the foundation of all my actuarial and data science work." }
      ]
    },
    other: { intro: null, qs: [] }
  };

  // Topic label map for KB lookup
  const TOPIC_KB_MAP = {
    collaboration: 'other', projects: 'projects', hiring: 'other',
    actuarial: 'other', ai: 'skills', other: 'other',
    about: 'about', education: 'education', experience: 'experience', skills: 'skills'
  };

  function openPanel() {
    isOpen = true;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    bubble.classList.remove('has-reply');
    clearBadge();
    if (!userName) setTimeout(() => nameInput.focus(), 300);
    else if (userTopic) setTimeout(() => chatInput.focus(), 300);
  }
  function closePanel() {
    isOpen = false;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }
  bubble.addEventListener('click', () => isOpen ? closePanel() : openPanel());
  closeBtn.addEventListener('click', closePanel);

  function showStep(from, to) { from.classList.remove('active'); to.classList.add('active'); }

  function addMsg(container, text, type, timestamp) {
    const wrap = document.createElement('div');
    wrap.className = 'msg msg--' + type;
    const p = document.createElement('p');
    p.textContent = text;
    wrap.appendChild(p);
    if (timestamp) {
      const t = document.createElement('div');
      t.className = 'msg__time';
      t.textContent = timestamp;
      wrap.appendChild(t);
    }
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
    return wrap;
  }

  function addStatus(text) {
    const wrap = document.createElement('div');
    wrap.className = 'msg msg--status';
    const p = document.createElement('p');
    p.textContent = text;
    wrap.appendChild(p);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    return wrap;
  }

  function submitName() {
    const val = nameInput.value.trim();
    if (!val) return;
    userName = val;
    greetEl.innerHTML = '<p>Nice to meet you, <strong>' + userName + '</strong>!</p>';
    showStep(step1, step2);
  }
  nameSub.addEventListener('click', submitName);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });

  // Helpers
  function typingDots() {
    const d = document.createElement('div');
    d.className = 'chat-typing';
    d.innerHTML = '<span></span><span></span><span></span>';
    return d;
  }
  function showAfterTyping(node, delay) {
    const t = typingDots();
    messages.appendChild(t);
    messages.scrollTop = messages.scrollHeight;
    setTimeout(() => { t.remove(); messages.appendChild(node); messages.scrollTop = messages.scrollHeight; }, delay);
  }

  document.querySelectorAll('.chat-topic').forEach(btn => {
    btn.addEventListener('click', () => {
      userTopic = btn.dataset.topic;
      showStep(step2, step3);
      messages.innerHTML = '';

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addMsg(messages, btn.textContent.trim(), 'visitor', now);

      // Map topic to KB key
      const kbMap = { projects: 'projects', skills: 'skills', about: 'about', education: 'education', experience: 'experience' };
      const kbKey = kbMap[userTopic] || null;
      const data = kbKey ? KB[kbKey] : null;

      if (!data || data.qs.length === 0) {
        // Free message flow (collaboration, hiring, actuarial, ai, other)
        const AUTO = {
          collaboration: "Thanks for reaching out! I'm always open to interesting projects in data science or actuarial analytics. Tell me more below and I'll get back to you personally.",
          hiring: "Thank you for considering me! I'm open to internships and roles in AI, data science, or actuarial analytics. Drop me a message below!",
          actuarial: "Actuarial work is my passion! I work with risk modeling, predictive analytics, and statistical validation at Liga Insurance. Ask me anything below.",
          ai: "AI and data science are at the core of everything I do! From ML pipelines to smart traffic systems — ask me anything below.",
          other: "Of course! Type your message below and I'll receive it directly and reply here personally."
        };
        const reply = AUTO[userTopic] || AUTO.other;
        setTimeout(() => {
          const b = document.createElement('div'); b.className = 'msg msg--owner';
          const p = document.createElement('p'); p.textContent = reply; b.appendChild(p);
          showAfterTyping(b, 600);
          setTimeout(() => chatInput.focus(), 800);
        }, 300);
        return;
      }

      // Sub-questions flow
      setTimeout(() => {
        const introB = document.createElement('div'); introB.className = 'msg msg--owner';
        const introP = document.createElement('p'); introP.textContent = data.intro; introB.appendChild(introP);
        showAfterTyping(introB, 500);

        setTimeout(() => {
          const subqs = document.createElement('div');
          subqs.className = 'chat-subqs';
          data.qs.forEach(item => {
            const b = document.createElement('button');
            b.className = 'chat-subq';
            b.textContent = item.q;
            b.addEventListener('click', () => {
              addMsg(messages, item.q, 'visitor');
              b.disabled = true; b.style.opacity = '0.4';
              const ans = document.createElement('div'); ans.className = 'msg msg--owner';
              const ap = document.createElement('p'); ap.textContent = item.a; ans.appendChild(ap);
              showAfterTyping(ans, 900);
            });
            subqs.appendChild(b);
          });
          messages.appendChild(subqs);
          messages.scrollTop = messages.scrollHeight;

          setTimeout(() => {
            const div = document.createElement('div');
            div.className = 'chat-divider';
            div.textContent = "Or send me a message directly — I'll reply via Telegram:";
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
            chatInput.focus();
          }, 200);
        }, 1100);
      }, 300);
    });
  });

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addMsg(messages, text, 'visitor', now);
    chatInput.value = '';
    chatSend.disabled = true;
    const statusEl = addStatus('Sending...');
    socket.emit('visitor_message', { text, name: userName, topic: userTopic });
    socket.once('message_sent', data => {
      chatSend.disabled = false;
      statusEl.querySelector('p').textContent = data.status === 'delivered'
        ? 'Delivered — Nare will reply here shortly'
        : 'Could not send — please try again';
    });
  }
  chatSend.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

  // Unread badge
  let unreadCount = 0;
  const badge = document.createElement('div');
  badge.id = 'chat-badge';
  badge.style.cssText = 'position:absolute;top:-6px;right:-6px;background:var(--accent2,#b83050);color:#fff;border-radius:50%;width:20px;height:20px;font-size:.7rem;font-weight:700;display:none;align-items:center;justify-content:center;font-family:var(--ff-body);pointer-events:none;border:2px solid var(--bg,#0f0e0d);';
  bubble.style.position = 'relative';
  bubble.appendChild(badge);

  function showBadge(count) {
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = 'flex';
  }
  function clearBadge() {
    unreadCount = 0;
    badge.style.display = 'none';
  }

  // Request browser notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  function sendBrowserNotification(text) {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      const n = new Notification('Nare replied 💬', {
        body: text.length > 80 ? text.slice(0, 80) + '...' : text,
        icon: 'https://i.imgur.com/pXMb56j.jpeg',
      });
      n.onclick = () => { window.focus(); openPanel(); n.close(); };
    }
  }

  socket.on('owner_reply', data => {
    if (step3.classList.contains('active')) {
      addMsg(messages, data.text, 'owner', data.timestamp);
    }
    if (!isOpen) {
      bubble.classList.add('has-reply');
      unreadCount++;
      showBadge(unreadCount);
      sendBrowserNotification(data.text);
    }
  });
  socket.on('disconnect', () => { chatSend.disabled = true; });
  socket.on('connect',    () => { chatSend.disabled = false; });

})();

// Particle Network
(function() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  let mouseX = -9999, mouseY = -9999;
  function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('mousemove', e => { const r = canvas.getBoundingClientRect(); mouseX = e.clientX - r.left; mouseY = e.clientY - r.top; });
  for (let i = 0; i < 80; i++) particles.push({ x: Math.random() * window.innerWidth, y: Math.random() * 600, vx: (Math.random()-.5)*.4, vy: (Math.random()-.5)*.4, r: Math.random()*2+1 });
  function draw() {
    ctx.clearRect(0,0,W,H); resize();
    particles.forEach(p => {
      const dx=p.x-mouseX, dy=p.y-mouseY, dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<120){p.vx+=(dx/dist)*.3;p.vy+=(dy/dist)*.3;}
      const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
      if(spd>2){p.vx=(p.vx/spd)*2;p.vy=(p.vy/spd)*2;}
      p.vx*=.99;p.vy*=.99;p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(201,169,110,0.7)';ctx.fill();
    });
    for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){
      const dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y,d=Math.sqrt(dx*dx+dy*dy);
      if(d<120){ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);ctx.strokeStyle='rgba(201,169,110,'+(1-d/120)*.3+')';ctx.lineWidth=.5;ctx.stroke();}
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

