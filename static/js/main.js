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

  const AUTO_REPLIES = {
    collaboration: "Thanks for reaching out about collaboration! I'm always open to interesting projects in data science or actuarial analytics. Tell me more and I'll get back to you personally shortly.",
    projects:      "Glad you're interested in my work! I've built projects in IoT air monitoring, AI traffic management, ML pipelines, and database systems. Any specific one you'd like to know more about?",
    hiring:        "Thank you for considering me! I'm currently a Junior Actuarial Analyst at Liga Insurance while completing my double degree. Open to internships and roles in AI, data science, or actuarial analytics.",
    actuarial:     "Actuarial work is my passion! I work with risk modeling, predictive analytics, and statistical validation at Liga Insurance. What aspect are you curious about?",
    ai:            "AI and data science are at the core of everything I do! From ML pipelines to smart traffic systems, I love this space. What would you like to explore?",
  };

  function openPanel() {
    isOpen = true;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    bubble.classList.remove('has-reply');
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

  document.querySelectorAll('.chat-topic').forEach(btn => {
    btn.addEventListener('click', () => {
      userTopic = btn.dataset.topic;
      showStep(step2, step3);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addMsg(messages, btn.textContent, 'visitor', now);
      if (userTopic === 'other') {
        setTimeout(() => { addMsg(messages, "Of course! Type your message below and I'll reply personally.", 'owner'); chatInput.focus(); }, 400);
      } else {
        setTimeout(() => {
          addMsg(messages, AUTO_REPLIES[userTopic], 'owner');
          setTimeout(() => { addMsg(messages, "Feel free to send any follow-up message!", 'owner'); chatInput.focus(); }, 600);
        }, 500);
      }
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

  socket.on('owner_reply', data => {
    addMsg(messages, data.text, 'owner', data.timestamp);
    if (!isOpen) bubble.classList.add('has-reply');
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

// Text Scramble on Section Titles
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&';
function scramble(el) {
  const original = el.textContent;
  let iteration = 0;
  const interval = setInterval(() => {
    el.textContent = original.split('').map((char, i) => {
      if (char === ' ') return ' ';
      if (i < iteration) return original[i];
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    if (iteration >= original.length) clearInterval(interval);
    iteration += 0.5;
  }, 30);
}
const scrambleObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { scramble(e.target); scrambleObs.unobserve(e.target); }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.section-title').forEach(el => scrambleObs.observe(el));
