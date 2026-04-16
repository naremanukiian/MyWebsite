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

// ── Language Switcher ─────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    nav_about: 'About', nav_education: 'Education', nav_experience: 'Experience',
    nav_projects: 'Projects', nav_skills: 'Skills', nav_achievements: 'Achievements',
    hero_eyebrow: 'Junior Actuarial Analyst & AI Enthusiast',
    hero_desc: 'Turning data into actionable insights. Passionate about AI, predictive modeling, and actuarial analytics. I solve complex problems with clean code and creative thinking.',
    hero_btn_projects: 'View Projects', hero_btn_contact: 'Contact Me',
    hero_scroll: 'Scroll', hero_badge: 'Available for Projects',
    stat_insurance: 'Years in Insurance', stat_languages: 'Languages Spoken',
    stat_projects: 'AI/Data Projects', stat_degrees: 'Degree Programs',
    about_title: 'Who Am I',
    about_p1: "I'm a third-year Computer Science and Applied Mathematics student with a deep interest in artificial intelligence, data science, and actuarial analysis. I enjoy exploring complex datasets, statistical modeling, and predictive analytics to uncover insights, understand risks, and support smarter, evidence-based decision-making.",
    about_p2: 'Curious and analytical by nature, I am passionate about applying advanced mathematical concepts and cutting-edge technology to solve real-world problems, optimize processes, and create meaningful impact in both the tech and insurance industries.',
    tag_pm: 'Predictive Modeling', tag_ra: 'Risk Analysis', tag_ml: 'Machine Learning', tag_as: 'Actuarial Science',
    edu_title: 'Academic Background', edu_bachelor: "Bachelor's", edu_diploma: 'Diploma',
    edu_toulouse_sub: 'Faculty of Science & Engineering',
    edu_fua_sub: 'Computer Science & Applied Mathematics',
    edu_yshc_sub: 'Insurance Studies',
    exp_title: 'Professional Journey',
    exp_role1: 'Junior Actuarial Analyst', exp_role2: 'QA Engineer Intern',
    exp_role3: 'Accounts Receivable Representative', exp_role4: 'Educational Intern',
    exp_desc1: 'Performing comprehensive actuarial data analysis, building and validating risk models, and developing predictive analytics to support strategic business decisions.',
    exp_desc2: 'Conducted thorough quality assurance testing of insurance systems, including API testing, functional validation, and defect reporting.',
    exp_desc3: 'Managed invoicing processes, reconciled accounts, and ensured timely payment collection. Developed a strong understanding of general insurance operations.',
    exp_desc4: 'Assisted in multiple company projects, contributing to data collection, analysis, and reporting tasks.',
    proj_title: 'Selected Work',
    proj1_desc: 'Collaborating on an IoT-based hardware initiative (Tumo Labs – ClimateNet Project), designing and developing sensor-integrated systems to monitor environmental air quality in real time.',
    proj2_desc: 'A single, self-contained SQL Server script (1,279 lines) that builds a complete ride-sharing database — 8 tables, 15 indexes, 8 views, 7 triggers, 8 stored procedures, 30 relational algebra queries, and role-based access control.',
    proj3_desc: 'Studied AI applications in urban traffic prediction and signal optimization. Developed predictive algorithms and simulations, producing visualizations for in-depth analysis.',
    proj4_desc: 'Built a complete machine learning pipeline on real-world data from Degusto and ArtLunch. Performed preprocessing, TF-IDF & feature engineering, clustering, classification, and regression.',
    skills_title: 'Technical Expertise', skills_prog: 'Programming', skills_ai: 'Analytics & AI',
    lang_label: 'Languages', lang_title: 'I Speak Four',
    lang_hy: 'Armenian', lang_ru: 'Russian', lang_en: 'English', lang_fr: 'French',
    level_native: 'Native', level_fluent: 'Fluent', level_upper: 'Upper Intermediate', level_inter: 'Intermediate',
    ach_title: 'Recognition & Awards',
    ach_desc: 'Awarded by LIGA Insurance for academic excellence, strong professional potential, and outstanding performance in insurance and IT-related fields.',
    footer_sub: 'Actuarial Data Analyst & AI Enthusiast', footer_cta: "Let's connect", footer_dev: 'Designed & Developed with ♥',
    chat_greeting: "Hi there 👋 I'm Nare. What's your name?",
    chat_reply_time: 'Usually replies within a few hours',
    chat_topic_q: 'What would you like to talk about?',
    topic_collab: 'Collaboration', topic_projects: 'My Projects', topic_hiring: 'Hiring / Internship',
    topic_actuarial: 'Actuarial Work', topic_ai: 'AI & Data Science', topic_other: 'Something Else',
  },
  ru: {
    nav_about: 'Обо мне', nav_education: 'Образование', nav_experience: 'Опыт',
    nav_projects: 'Проекты', nav_skills: 'Навыки', nav_achievements: 'Достижения',
    hero_eyebrow: 'Младший актуарный аналитик и энтузиаст ИИ',
    hero_desc: 'Превращаю данные в полезные инсайты. Увлечена ИИ, предиктивным моделированием и актуарной аналитикой. Решаю сложные задачи с помощью чистого кода и творческого мышления.',
    hero_btn_projects: 'Смотреть проекты', hero_btn_contact: 'Связаться',
    hero_scroll: 'Прокрутить', hero_badge: 'Открыта для проектов',
    stat_insurance: 'Лет в страховании', stat_languages: 'Языков',
    stat_projects: 'ИИ/Дата проекты', stat_degrees: 'Программы обучения',
    about_title: 'Кто я',
    about_p1: 'Я студентка третьего курса по специальности «Компьютерные науки и прикладная математика» с глубоким интересом к искусственному интеллекту, науке о данных и актуарному анализу. Мне нравится исследовать сложные датасеты, статистическое моделирование и предиктивную аналитику.',
    about_p2: 'По природе любопытная и аналитическая, я увлечена применением передовых математических концепций и технологий для решения реальных задач и создания значимого влияния в сферах технологий и страхования.',
    tag_pm: 'Предиктивное моделирование', tag_ra: 'Анализ рисков', tag_ml: 'Машинное обучение', tag_as: 'Актуарная наука',
    edu_title: 'Академическое образование', edu_bachelor: 'Бакалавриат', edu_diploma: 'Диплом',
    edu_toulouse_sub: 'Факультет науки и инженерии',
    edu_fua_sub: 'Компьютерные науки и прикладная математика',
    edu_yshc_sub: 'Страховое дело',
    exp_title: 'Профессиональный путь',
    exp_role1: 'Младший актуарный аналитик', exp_role2: 'Стажёр QA-инженер',
    exp_role3: 'Специалист по дебиторской задолженности', exp_role4: 'Учебный стажёр',
    exp_desc1: 'Проведение актуарного анализа данных, построение и валидация риск-моделей, разработка предиктивной аналитики для поддержки стратегических бизнес-решений.',
    exp_desc2: 'Тестирование страховых систем: API-тестирование, функциональная валидация, отчётность о дефектах.',
    exp_desc3: 'Управление процессами выставления счетов, сверка счетов и своевременный сбор платежей.',
    exp_desc4: 'Участие в проектах компании, сбор и анализ данных, составление отчётов.',
    proj_title: 'Избранные работы',
    proj1_desc: 'Участие в IoT-проекте на базе оборудования (Tumo Labs – ClimateNet): проектирование и разработка систем с датчиками для мониторинга качества воздуха в реальном времени.',
    proj2_desc: 'Единый самодостаточный скрипт SQL Server (1279 строк), создающий полную базу данных для сервиса совместных поездок — 8 таблиц, 15 индексов, 8 представлений, 7 триггеров, 8 хранимых процедур.',
    proj3_desc: 'Изучение применения ИИ в предсказании городского трафика и оптимизации сигналов. Разработка предиктивных алгоритмов и симуляций.',
    proj4_desc: 'Построение полного пайплайна машинного обучения на реальных данных ресторанов. TF-IDF, кластеризация, классификация и регрессия.',
    skills_title: 'Технические компетенции', skills_prog: 'Программирование', skills_ai: 'Аналитика и ИИ',
    lang_label: 'Языки', lang_title: 'Я говорю на четырёх',
    lang_hy: 'Армянский', lang_ru: 'Русский', lang_en: 'Английский', lang_fr: 'Французский',
    level_native: 'Родной', level_fluent: 'Свободно', level_upper: 'Выше среднего', level_inter: 'Средний',
    ach_title: 'Признание и награды',
    ach_desc: 'Стипендия LIGA Insurance за академическое превосходство, высокий профессиональный потенциал и выдающиеся результаты в страховании и ИТ.',
    footer_sub: 'Актуарный аналитик данных и энтузиаст ИИ', footer_cta: 'Давайте познакомимся', footer_dev: 'Разработано с ♥',
    chat_greeting: 'Привет 👋 Я Наре. Как вас зовут?',
    chat_reply_time: 'Обычно отвечает в течение нескольких часов',
    chat_topic_q: 'О чём вы хотите поговорить?',
    topic_collab: 'Сотрудничество', topic_projects: 'Мои проекты', topic_hiring: 'Работа / Стажировка',
    topic_actuarial: 'Актуарная работа', topic_ai: 'ИИ и наука о данных', topic_other: 'Другое',
  },
  fr: {
    nav_about: 'À propos', nav_education: 'Formation', nav_experience: 'Expérience',
    nav_projects: 'Projets', nav_skills: 'Compétences', nav_achievements: 'Réalisations',
    hero_eyebrow: 'Analyste Actuarielle Junior & Passionnée d\'IA',
    hero_desc: 'Transformer les données en insights concrets. Passionnée par l\'IA, la modélisation prédictive et l\'analyse actuarielle. Je résous des problèmes complexes avec du code propre et de la créativité.',
    hero_btn_projects: 'Voir les projets', hero_btn_contact: 'Me contacter',
    hero_scroll: 'Défiler', hero_badge: 'Disponible pour des projets',
    stat_insurance: 'Ans en assurance', stat_languages: 'Langues parlées',
    stat_projects: 'Projets IA/Data', stat_degrees: 'Programmes de formation',
    about_title: 'Qui suis-je',
    about_p1: 'Je suis étudiante en troisième année d\'Informatique et Mathématiques Appliquées, avec un profond intérêt pour l\'intelligence artificielle, la science des données et l\'analyse actuarielle.',
    about_p2: 'Curieuse et analytique par nature, je suis passionnée par l\'application de concepts mathématiques avancés et de technologies de pointe pour résoudre des problèmes réels.',
    tag_pm: 'Modélisation prédictive', tag_ra: 'Analyse des risques', tag_ml: 'Machine Learning', tag_as: 'Science actuarielle',
    edu_title: 'Parcours académique', edu_bachelor: 'Licence', edu_diploma: 'Diplôme',
    edu_toulouse_sub: 'Faculté des Sciences et de l\'Ingénierie',
    edu_fua_sub: 'Informatique et Mathématiques Appliquées',
    edu_yshc_sub: 'Études en assurance',
    exp_title: 'Parcours professionnel',
    exp_role1: 'Analyste Actuarielle Junior', exp_role2: 'Stagiaire Ingénieur QA',
    exp_role3: 'Représentante Comptes Clients', exp_role4: 'Stagiaire Éducatif',
    exp_desc1: 'Analyse actuarielle complète des données, construction et validation de modèles de risque, développement d\'analyses prédictives.',
    exp_desc2: 'Tests d\'assurance qualité des systèmes d\'assurance, tests API, validation fonctionnelle et rapport de défauts.',
    exp_desc3: 'Gestion des processus de facturation, rapprochement des comptes et recouvrement des paiements.',
    exp_desc4: 'Participation à plusieurs projets d\'entreprise, collecte et analyse de données, rédaction de rapports.',
    proj_title: 'Travaux sélectionnés',
    proj1_desc: 'Collaboration sur une initiative matérielle IoT (Tumo Labs – ClimateNet) pour surveiller la qualité de l\'air en temps réel.',
    proj2_desc: 'Script SQL Server autonome (1 279 lignes) construisant une base de données complète pour un service de covoiturage — 8 tables, 15 index, 8 vues, 7 déclencheurs, 8 procédures stockées.',
    proj3_desc: 'Étude des applications de l\'IA dans la prédiction du trafic urbain. Développement d\'algorithmes prédictifs et de simulations.',
    proj4_desc: 'Pipeline complet de machine learning sur des données réelles de restaurants. TF-IDF, clustering, classification et régression.',
    skills_title: 'Expertise technique', skills_prog: 'Programmation', skills_ai: 'Analytique & IA',
    lang_label: 'Langues', lang_title: 'Je parle quatre langues',
    lang_hy: 'Arménien', lang_ru: 'Russe', lang_en: 'Anglais', lang_fr: 'Français',
    level_native: 'Langue maternelle', level_fluent: 'Courant', level_upper: 'Intermédiaire supérieur', level_inter: 'Intermédiaire',
    ach_title: 'Reconnaissances & Prix',
    ach_desc: 'Bourse LIGA Insurance pour l\'excellence académique, le fort potentiel professionnel et les performances remarquables dans les domaines de l\'assurance et de l\'informatique.',
    footer_sub: 'Analyste de données actuarielle & Passionnée d\'IA', footer_cta: 'Connectons-nous', footer_dev: 'Conçu & Développé avec ♥',
    chat_greeting: 'Bonjour 👋 Je suis Nare. Quel est votre prénom?',
    chat_reply_time: 'Répond généralement en quelques heures',
    chat_topic_q: 'De quoi souhaitez-vous parler?',
    topic_collab: 'Collaboration', topic_projects: 'Mes projets', topic_hiring: 'Emploi / Stage',
    topic_actuarial: 'Travail actuariel', topic_ai: 'IA & Science des données', topic_other: 'Autre chose',
  }
};

function applyLanguage(lang) {
  const t = TRANSLATIONS[lang];
  if (!t) return;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
});

applyLanguage(localStorage.getItem('lang') || 'en');
