/* ==========================================================================
   JS PRINCIPAL: LOGICA E INTERACTIVIDAD DEL KIOSKO PC PUMA
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // CONFIGURACIÓN Y ESTADO DE LA APLICACIÓN
  // ==========================================
  const state = {
    currentScreen: 'screen-idle',
    user: {
      isLoggedIn: false,
      name: '',
      id: '',
      phone: '',
      type: '' // 'alumno' o 'trabajador'
    },
    loan: {
      institution: '',
      module: '',
      deviceType: '',
      connectorType: '',
      cartId: 'C06',
      deviceId: 'L43',
      inventoryNumber: '2620015',
      loanId: ''
    },
    accessibility: {
      audioGuide: false,
      highContrast: false,
      colorblind: false,
      fontScale: 1.0
    },
    countdownInterval: null,
    activeInput: null,
    keyboardShift: false
  };

  // Datos de prueba para simular selectores
  const dataOptions = {
    institutions: [
      'Centro de Investigaciones en Geografía Ambiental (CIGA)',
      'Facultad de Estudios Superiores Aragón',
      'Facultad de Ingeniería',
      'Facultad de Ciencias',
      'Escuela Nacional de Estudios Superiores',
      'Instituto de Geografía'
    ],
    carreras: [
      'Lic. en Geografía Ambiental',
      'Ing. en Computación',
      'Ing. Civil',
      'Lic. en Ciencias de la Computación',
      'Lic. en Tecnología',
      'Lic. en Ciencias Ambientales'
    ],
    modules: [
      'Docencia (Edificio A)',
      'Centro de Desarrollo (CD)',
      'Biblioteca Central',
      'Laboratorio de Cómputo 1',
      'Módulo de Conectividad Norte'
    ]
  };

  // Audio Context para efectos de sonido sintéticos (WOW factor)
  let audioCtx = null;
  function playSound(type) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'tap') {
        // Sonido de clic táctil
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'success') {
        // Campana de éxito
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === 'printer') {
        // Simulación de zumbido de impresora de tickets
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, audioCtx.currentTime);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(150, audioCtx.currentTime);
        
        // Zumbido modulado
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.02, audioCtx.currentTime);
        
        osc.start();
        osc2.start();
        
        // Paradas aleatorias para simular líneas impresas
        setTimeout(() => { osc.stop(); osc2.stop(); }, 1500);
      } else if (type === 'alert') {
        // Alerta
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.setValueAtTime(180, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch(e) {
      console.warn("Audio Context no soportado o bloqueado por el navegador:", e);
    }
  }

  // ==========================================
  // ANIMACIÓN DE NODOS (FONDO INTERACTIVO CON PARALLAX 3D)
  // ==========================================
  const canvas = document.getElementById('nodes-canvas');
  const ctx = canvas.getContext('2d');
  
  let width = 0;
  let height = 0;
  let particles = [];
  let animationFrameId;
  let isVisible = true;

  // Configuración de la red (Idéntica a prueba PPC MODERNIZACION)
  const config = {
    particleCount: 28, // Adaptado responsivamente para el ancho del kiosko (menor a 768px)
    maxDistance: 150,
    speed: 0.35,
    particleColor: 'rgba(0, 210, 255, 0.7)',
    lineColorPrefix: 'rgba(0, 200, 255, ',
    accentColor: 'rgba(255, 215, 0, 0.8)'
  };

  const maxDistanceSq = config.maxDistance * config.maxDistance;

  // Crear partículas
  function createParticles() {
    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
      const z = Math.random() * 2.0 + 0.5; // Profundidad virtual (efecto 3D Parallax)
      const isAccent = Math.random() > 0.85; // 15% de partículas doradas

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * config.speed,
        vy: (Math.random() - 0.5) * config.speed,
        z,
        color: isAccent ? config.accentColor : config.particleColor,
        radius: (isAccent ? 1.8 : 1.2) + Math.random() * 1.2
      });
    }
  }

  // Ajustar tamaño del Canvas y DPR
  function updateSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement.getBoundingClientRect();
    width = rect.width;
    height = rect.height;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Adaptar número de partículas según ancho
    if (width < 768) {
      config.particleCount = 28;
    } else if (width < 1200) {
      config.particleCount = 50;
    } else {
      config.particleCount = 80;
    }

    createParticles();
  }

  // Animación principal
  function animateNodes() {
    if (!isVisible) return;
    animationFrameId = requestAnimationFrame(animateNodes);

    ctx.clearRect(0, 0, width, height);

    // Movimiento
    for (let p of particles) {
      p.x += p.vx * p.z;
      p.y += p.vy * p.z;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
    }

    // Conexiones lineales
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxDistanceSq) {
          const avgZ = (p1.z + p2.z) / 2;
          const alpha = (1 - distSq / maxDistanceSq) * (avgZ / 2.5) * 0.45;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          
          // Si una es dorada, la línea tiene un toque dorado
          if (p1.color === config.accentColor || p2.color === config.accentColor) {
            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 1.2})`;
          } else {
            ctx.strokeStyle = `${config.lineColorPrefix}${alpha})`;
          }
          
          ctx.lineWidth = 0.5 * avgZ;
          ctx.stroke();
        }
      }
    }

    // Dibujar partículas (nodos)
    for (let p of particles) {
      const size = p.radius * p.z;

      // Nodo base
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      // Brillo concéntrico (efecto glow Apple)
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * (p.color === config.accentColor ? 2.5 : 1.8), 0, Math.PI * 2);
      const glowColor = p.color.replace(/[\d.]+\)$/, '0.12)');
      ctx.fillStyle = glowColor;
      ctx.fill();
    }
  }

  // Pausar si no es visible
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      isVisible = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    } else {
      isVisible = true;
      animateNodes();
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isVisible = entry.isIntersecting;
      if (isVisible) {
        animateNodes();
      } else {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      }
    });
  }, { threshold: 0.05 });

  if (canvas.parentElement) {
    observer.observe(canvas.parentElement);
  }

  // Reaccionar al tacto impulsando nodos
  canvas.parentElement.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      
      particles.forEach(p => {
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          p.vx += (dx / dist) * 0.4 * p.z;
          p.vy += (dy / dist) * 0.4 * p.z;
        }
      });
    }
  }, { passive: true });

  updateSize();
  window.addEventListener('resize', updateSize);

  // ==========================================
  // VITRINA DE DISPOSITIVOS (ROTACIÓN AUTOMÁTICA)
  // ==========================================
  let showcaseIndex = 0;
  let showcaseInterval = null;
  
  function getShowcaseElements() {
    return {
      cards: document.querySelectorAll('.showcase-card'),
      dots: document.querySelectorAll('.showcase-dot')
    };
  }

  function showShowcaseCard(index) {
    const { cards, dots } = getShowcaseElements();
    if (cards.length === 0) return;
    
    cards.forEach((card, idx) => {
      card.classList.toggle('active', idx === index);
    });
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === index);
    });
    showcaseIndex = index;
    
    // Si la audio guía está activa y estamos en la pantalla de bienvenida, anunciar el dispositivo seleccionado
    if (state.accessibility.audioGuide && state.currentScreen === 'screen-welcome') {
      const activeCard = cards[index];
      if (activeCard) {
        const name = activeCard.querySelector('.showcase-name').innerText;
        speak(`Vitrina de equipos. Mostrando: ${name}.`);
      }
    }
  }

  function startShowcaseRotation() {
    stopShowcaseRotation();
    const { cards } = getShowcaseElements();
    if (cards.length === 0) return;
    
    showcaseInterval = setInterval(() => {
      let nextIndex = (showcaseIndex + 1) % cards.length;
      showShowcaseCard(nextIndex);
    }, 4500); // Rotar cada 4.5 segundos
  }

  function stopShowcaseRotation() {
    if (showcaseInterval) clearInterval(showcaseInterval);
  }

  // Vincular clics a los dots
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('showcase-dot')) {
      playSound('tap');
      const idx = parseInt(e.target.dataset.index);
      showShowcaseCard(idx);
      startShowcaseRotation(); // Reiniciar contador
    }
  });

  // ==========================================
  // NAVEGACIÓN Y MAQUINA DE ESTADOS
  // ==========================================
  function showScreen(screenId) {
    playSound('tap');
    
    // Ocultar todas las pantallas
    document.querySelectorAll('.kiosk-screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Cerrar teclado virtual
    closeKeyboard();

    // Mostrar pantalla indicada
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      state.currentScreen = screenId;
    }

    // Adaptar fondo según pantalla
    if (screenId === 'screen-idle') {
      canvas.style.display = 'block';
    } else if (screenId === 'screen-device-select' || screenId === 'screen-success-final') {
      // Menos distracciones visuales
      canvas.style.opacity = '0.3';
    } else {
      canvas.style.opacity = '1';
    }

    // Controlar rotación de vitrina de equipos
    if (screenId === 'screen-welcome') {
      startShowcaseRotation();
      // Pequeño retardo para anunciar la primera tarjeta si la audio guía está activa
      setTimeout(() => {
        if (state.accessibility.audioGuide && state.currentScreen === 'screen-welcome') {
          showShowcaseCard(showcaseIndex);
        }
      }, 1000);
    } else {
      stopShowcaseRotation();
    }

    // Activar audio lectura del título de la pantalla si está habilitado
    if (state.accessibility.audioGuide) {
      announceScreen(screenId);
    }
  }

  // ==========================================
  // MOTOR DE ACCESIBILIDAD POR VOZ (TEXT-TO-SPEECH)
  // ==========================================
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel(); // Detener lectura previa inmediatamente
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX';
    
    // Intentar buscar una voz en español mexicana
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.includes('MX') || v.lang.includes('ES'));
    if (esVoice) utterance.voice = esVoice;

    utterance.pitch = 1.0;
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  }

  function announceScreen(screenId) {
    setTimeout(() => {
      const screen = document.getElementById(screenId);
      if (!screen) return;

      let msg = "";
      if (screenId === 'screen-idle') {
        msg = "Bienvenido a PC PUMA. Kiosko de Autoservicio. Toca la pantalla para comenzar.";
      } else {
        const title = screen.querySelector('.form-title, .prompt-title, .success-title');
        const subtitle = screen.querySelector('.form-subtitle, .success-subtitle');
        if (title) msg += title.innerText + ". ";
        if (subtitle) msg += subtitle.innerText + ". ";
      }
      speak(msg);
    }, 100);
  }

  // Escuchar eventos táctiles/cernidos en toda la UI para retroalimentación por voz
  document.addEventListener('touchstart', (e) => {
    if (!state.accessibility.audioGuide) return;
    
    // Encontrar el botón o elemento interactivo más cercano
    const interactive = e.target.closest('button, .select-touch-trigger, .visual-card, [role="checkbox"], .captcha-checkbox, input');
    if (interactive) {
      let speechText = "";
      
      // Leer etiquetas de accesibilidad prioritariamente
      if (interactive.getAttribute('aria-label')) {
        speechText = interactive.getAttribute('aria-label');
      } else if (interactive.tagName === 'INPUT') {
        const label = document.querySelector(`label[for="${interactive.id}"]`);
        speechText = (label ? label.innerText : "") + (interactive.value ? ". Valor actual: " + interactive.value : ". Vacío. Toca para editar.");
      } else if (interactive.classList.contains('select-touch-trigger')) {
        const label = interactive.previousElementSibling;
        speechText = (label ? label.innerText : "Selección") + ". " + interactive.innerText + ". Toca para desplegar opciones.";
      } else if (interactive.classList.contains('modal-option-btn')) {
        const isSelected = interactive.classList.contains('selected');
        speechText = (isSelected ? "Seleccionado: " : "Opción: ") + interactive.innerText.replace('✓', '');
      } else if (interactive.classList.contains('visual-card')) {
        const isSelected = interactive.classList.contains('selected');
        const cardTitle = interactive.querySelector('.card-title') ? interactive.querySelector('.card-title').innerText : "";
        const cardDesc = interactive.querySelector('.card-desc') ? interactive.querySelector('.card-desc').innerText : "";
        speechText = (isSelected ? "Seleccionado: " : "Opción: ") + cardTitle + ". " + cardDesc;
      } else if (interactive.classList.contains('captcha-checkbox')) {
        const isChecked = interactive.classList.contains('checked');
        speechText = "Casilla de verificación de seguridad: Soy humano. " + (isChecked ? "Marcada" : "Desmarcada");
      } else {
        speechText = interactive.innerText;
      }
      
      speak(speechText);
    }
  }, { passive: true });

  // Controladores de los botones de accesibilidad
  const accPanel = document.getElementById('accessibility-panel');
  const btnToggleAcc = document.getElementById('btn-toggle-accessibility');
  const btnAudioGuide = document.getElementById('btn-audio-guide');
  const btnHighContrast = document.getElementById('btn-high-contrast');
  const btnColorblind = document.getElementById('btn-colorblind');
  const btnFontDec = document.getElementById('btn-font-dec');
  const btnFontInc = document.getElementById('btn-font-inc');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');

  btnToggleAcc.addEventListener('click', () => {
    playSound('tap');
    const isCollapsed = accPanel.classList.toggle('collapsed');
    btnToggleAcc.setAttribute('aria-expanded', !isCollapsed);
    btnToggleAcc.setAttribute('aria-label', isCollapsed ? 'Abrir panel de accesibilidad' : 'Cerrar panel de accesibilidad');
    btnToggleAcc.querySelector('.trigger-arrow').innerText = isCollapsed ? '◀' : '▶';

    if (state.accessibility.audioGuide) {
      speak(isCollapsed ? "Panel de accesibilidad ocultado" : "Panel de accesibilidad abierto");
    }
  });

  btnAudioGuide.addEventListener('click', () => {
    state.accessibility.audioGuide = !state.accessibility.audioGuide;
    btnAudioGuide.classList.toggle('active', state.accessibility.audioGuide);
    btnAudioGuide.setAttribute('aria-pressed', state.accessibility.audioGuide);
    
    if (state.accessibility.audioGuide) {
      speak("Audio guía activada. El sistema leerá los botones y campos que presione.");
    } else {
      window.speechSynthesis.cancel();
    }
  });

  btnHighContrast.addEventListener('click', () => {
    state.accessibility.highContrast = !state.accessibility.highContrast;
    document.body.classList.toggle('high-contrast', state.accessibility.highContrast);
    btnHighContrast.classList.toggle('active', state.accessibility.highContrast);
    btnHighContrast.setAttribute('aria-pressed', state.accessibility.highContrast);
    
    if (state.accessibility.audioGuide) {
      speak(state.accessibility.highContrast ? "Modo de alto contraste activado." : "Modo de alto contraste desactivado.");
    }
  });

  btnColorblind.addEventListener('click', () => {
    state.accessibility.colorblind = !state.accessibility.colorblind;
    document.body.classList.toggle('colorblind-mode', state.accessibility.colorblind);
    btnColorblind.classList.toggle('active', state.accessibility.colorblind);
    btnColorblind.setAttribute('aria-pressed', state.accessibility.colorblind);

    if (state.accessibility.audioGuide) {
      speak(state.accessibility.colorblind ? "Modo inclusivo de daltonismo activado." : "Modo inclusivo de daltonismo desactivado.");
    }
  });

  btnFontInc.addEventListener('click', () => {
    if (state.accessibility.fontScale < 1.3) {
      state.accessibility.fontScale += 0.1;
      document.documentElement.style.setProperty('--font-scale', state.accessibility.fontScale);
      if (state.accessibility.audioGuide) speak("Tamaño de letra aumentado");
    }
  });

  btnFontDec.addEventListener('click', () => {
    if (state.accessibility.fontScale > 0.85) {
      state.accessibility.fontScale -= 0.1;
      document.documentElement.style.setProperty('--font-scale', state.accessibility.fontScale);
      if (state.accessibility.audioGuide) speak("Tamaño de letra disminuido");
    }
  });

  btnThemeToggle.addEventListener('click', () => {
    playSound('tap');
    const isLight = document.body.classList.toggle('light-theme');
    btnThemeToggle.setAttribute('aria-pressed', isLight);
    
    // Cambiar icono según tema
    const iconSpan = btnThemeToggle.querySelector('.icon');
    if (iconSpan) {
      iconSpan.innerText = isLight ? '☀️' : '🌙';
    }
    
    // Cambiar logo según tema
    const logoImg = document.getElementById('pc-puma-logo-img');
    if (logoImg) {
      logoImg.src = isLight ? 'img/logo/logo_dark_blue.png' : 'img/logo/logo_white.png';
    }
    
    if (state.accessibility.audioGuide) {
      speak(isLight ? "Tema claro activado." : "Tema oscuro activado.");
    }
  });


  // ==========================================
  // TECLADO VIRTUAL EN PANTALLA
  // ==========================================
  const keyboardContainer = document.getElementById('virtual-keyboard');
  const kbKeysContainer = document.getElementById('kb-keys-container');
  const btnCloseKb = document.getElementById('btn-close-kb');

  // Diseños de teclado adaptables
  const kbLayouts = {
    numeric: [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['Borrar', '0', '✓']
    ],
    alphanumeric: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
      ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'Borrar'],
      ['Espacio', 'Aceptar']
    ]
  };

  function openKeyboard(inputElement) {
    state.activeInput = inputElement;
    
    // Agregar clase de foco táctil al input
    document.querySelectorAll('.kiosk-input').forEach(inp => inp.classList.remove('kb-active'));
    inputElement.classList.add('kb-active');

    // Determinar qué distribución usar
    const isNum = inputElement.id.includes('cuenta') || 
                  inputElement.id.includes('tel') || 
                  inputElement.id.includes('num') || 
                  inputElement.id === 'login-user';
                  
    const layoutType = isNum ? 'numeric' : 'alphanumeric';
    renderKeyboard(layoutType);
    keyboardContainer.classList.add('active');
    
    // Hacer scroll para asegurar que el input sea visible con el teclado desplegado
    setTimeout(() => {
      inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }

  function closeKeyboard() {
    keyboardContainer.classList.remove('active');
    if (state.activeInput) {
      state.activeInput.classList.remove('kb-active');
      // Forzar validación al cerrar
      validateActiveForm();
    }
    state.activeInput = null;
  }

  function renderKeyboard(type) {
    kbKeysContainer.innerHTML = '';
    const layout = kbLayouts[type];

    layout.forEach(row => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'kb-row';

      row.forEach(key => {
        const keyBtn = document.createElement('button');
        keyBtn.type = 'button';
        keyBtn.className = 'kb-key';
        
        // Estilos específicos para teclas especiales
        if (key === 'Borrar' || key === 'Backspace') {
          keyBtn.classList.add('kb-key-backspace', 'kb-key-wide');
          keyBtn.innerHTML = '⌫';
          keyBtn.setAttribute('aria-label', 'Borrar letra anterior');
        } else if (key === 'Shift') {
          keyBtn.classList.add('kb-key-shift', 'kb-key-wide');
          if (state.keyboardShift) keyBtn.classList.add('shift-active');
          keyBtn.innerHTML = '⇧';
          keyBtn.setAttribute('aria-label', 'Mayúsculas');
        } else if (key === 'Espacio') {
          keyBtn.classList.add('kb-key-space');
          keyBtn.innerHTML = 'Espacio';
        } else if (key === 'Aceptar' || key === '✓') {
          keyBtn.classList.add('kb-key-wide', 'btn-action-success');
          keyBtn.innerHTML = 'Aceptar ✓';
        } else {
          // Tecla regular (respetar mayúsculas)
          const char = state.keyboardShift ? key.toUpperCase() : key.toLowerCase();
          keyBtn.innerHTML = char;
        }

        keyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          handleKeyPress(key);
        });

        rowDiv.appendChild(keyBtn);
      });

      kbKeysContainer.appendChild(rowDiv);
    });
  }

  function handleKeyPress(key) {
    if (!state.activeInput) return;
    
    playSound('tap');
    let currentVal = state.activeInput.value;

    if (key === 'Borrar' || key === 'Backspace') {
      state.activeInput.value = currentVal.substring(0, currentVal.length - 1);
    } else if (key === 'Shift') {
      state.keyboardShift = !state.keyboardShift;
      // Re-renderizar teclado alfabético
      renderKeyboard('alphanumeric');
    } else if (key === 'Espacio') {
      state.activeInput.value = currentVal + ' ';
    } else if (key === 'Aceptar' || key === '✓') {
      closeKeyboard();
    } else {
      const char = state.keyboardShift ? key.toUpperCase() : key.toLowerCase();
      state.activeInput.value = currentVal + char;
    }

    // Lanzar evento input para validaciones en tiempo real
    state.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    if (state.accessibility.audioGuide) {
      const spokeChar = key === 'Borrar' ? 'Borrado' : key === 'Espacio' ? 'Espacio' : key;
      speak(spokeChar);
    }
  }

  // Escuchar focos en inputs de kiosko
  document.querySelectorAll('.virtual-kb-input').forEach(input => {
    input.addEventListener('click', (e) => {
      openKeyboard(e.target);
    });
  });

  btnCloseKb.addEventListener('click', closeKeyboard);

  // ==========================================
  // CONTROLADORES DE MODALES TÁCTILES (DROPDOWNS)
  // ==========================================
  const touchDropdownModal = document.getElementById('touch-dropdown-modal');
  const dropdownModalTitle = document.getElementById('dropdown-modal-title');
  const dropdownOptionsList = document.getElementById('dropdown-options-list');
  const btnCloseDropdownModal = document.getElementById('btn-close-dropdown-modal');

  let activeDropdownTrigger = null;

  function openTouchDropdown(triggerElement, title, options, selectedValue) {
    activeDropdownTrigger = triggerElement;
    dropdownModalTitle.innerText = title;
    dropdownOptionsList.innerHTML = '';

    options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'modal-option-btn';
      if (option === selectedValue) {
        btn.classList.add('selected');
      }

      btn.innerHTML = `<span>${option}</span>`;
      if (option === selectedValue) {
        btn.innerHTML += `<span class="option-tick">✓</span>`;
      }

      btn.addEventListener('click', () => {
        playSound('tap');
        triggerElement.querySelector('.select-val').innerText = option;
        triggerElement.querySelector('.select-val').classList.add('has-val');
        
        // Disparar evento change simulado para validaciones
        triggerElement.dispatchEvent(new CustomEvent('change', { detail: { value: option } }));
        
        closeTouchDropdown();
        validateActiveForm();
      });

      dropdownOptionsList.appendChild(btn);
    });

    touchDropdownModal.classList.add('active');
    
    if (state.accessibility.audioGuide) {
      speak("Abierto selector para " + title + ". Opciones disponibles: " + options.join(". ") + ".");
    }
  }

  function closeTouchDropdown() {
    touchDropdownModal.classList.remove('active');
    activeDropdownTrigger = null;
  }

  btnCloseDropdownModal.addEventListener('click', closeTouchDropdown);

  // Vincular los triggers del selector
  // 1. Registro Alumno - Institución
  const regAlInstTrigger = document.getElementById('reg-al-inst-trigger');
  regAlInstTrigger.addEventListener('click', () => {
    const currentVal = regAlInstTrigger.querySelector('.select-val').innerText;
    openTouchDropdown(regAlInstTrigger, 'Selecciona tu Institución', dataOptions.institutions, currentVal);
  });

  // 2. Registro Alumno - Carrera
  const regAlCarrTrigger = document.getElementById('reg-al-carr-trigger');
  regAlCarrTrigger.addEventListener('click', () => {
    const currentVal = regAlCarrTrigger.querySelector('.select-val').innerText;
    openTouchDropdown(regAlCarrTrigger, 'Selecciona tu Carrera', dataOptions.carreras, currentVal);
  });

  // 3. Registro Trabajador - Institución
  const regTrInstTrigger = document.getElementById('reg-tr-inst-trigger');
  regTrInstTrigger.addEventListener('click', () => {
    const currentVal = regTrInstTrigger.querySelector('.select-val').innerText;
    openTouchDropdown(regTrInstTrigger, 'Selecciona tu Institución', dataOptions.institutions, currentVal);
  });

  // 4. Formulario de Préstamo - Institución
  const loanInstTrigger = document.getElementById('loan-inst-trigger');
  loanInstTrigger.addEventListener('click', () => {
    const currentVal = loanInstTrigger.querySelector('.select-val').innerText;
    openTouchDropdown(loanInstTrigger, 'Selecciona la Institución del Préstamo', dataOptions.institutions, currentVal);
  });

  // 5. Formulario de Préstamo - Módulo
  const loanModuleTrigger = document.getElementById('loan-module-trigger');
  loanModuleTrigger.addEventListener('click', () => {
    const currentVal = loanModuleTrigger.querySelector('.select-val').innerText;
    openTouchDropdown(loanModuleTrigger, 'Selecciona el Módulo de Atención', dataOptions.modules, currentVal);
  });


  // ==========================================
  // VALIDACIONES DE FORMULARIO E INICIO DE SESIÓN
  // ==========================================
  
  // hCaptcha Checkbox Mock
  const captchaWrapper = document.getElementById('captcha-checkbox-wrapper');
  const captchaCheckbox = document.getElementById('login-captcha');
  
  captchaWrapper.addEventListener('click', () => {
    playSound('tap');
    const checked = captchaCheckbox.classList.toggle('checked');
    captchaCheckbox.setAttribute('aria-checked', checked);
    if (state.accessibility.audioGuide) {
      speak(checked ? "Casilla verificado: Soy humano, seleccionada." : "Casilla deseleccionada.");
    }
    validateActiveForm();
  });

  // Toggle visibilidad contraseña
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const input = btn.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerText = '🔒';
      } else {
        input.type = 'password';
        btn.innerText = '👁️';
      }
      playSound('tap');
    });
  });

  function validateActiveForm() {
    if (state.currentScreen === 'screen-login') {
      const user = document.getElementById('login-user').value.trim();
      const pass = document.getElementById('login-pass').value.trim();
      const captcha = captchaCheckbox.classList.contains('checked');
      const submitBtn = document.getElementById('btn-submit-login');
      
      // Habilitar si tiene usuario, contraseña >= 4 e hCaptcha
      submitBtn.disabled = !(user.length >= 5 && pass.length >= 4 && captcha);
    } 
    else if (state.currentScreen === 'screen-register') {
      // Validar pestaña activa de registro
      const isAlumno = document.getElementById('tab-alumno').classList.contains('active');
      if (isAlumno) {
        const cuenta = document.getElementById('reg-al-cuenta').value.trim();
        const inst = regAlInstTrigger.querySelector('.select-val').classList.contains('has-val');
        const carr = regAlCarrTrigger.querySelector('.select-val').classList.contains('has-val');
        const tel = document.getElementById('reg-al-tel').value.trim();
        const pass = document.getElementById('reg-al-pass').value.trim();
        const submitBtn = document.getElementById('btn-submit-reg-alumno');
        
        submitBtn.disabled = !(cuenta.length >= 8 && inst && carr && tel.length === 10 && pass.length >= 6);
      } else {
        const num = document.getElementById('reg-tr-num').value.trim();
        const rfc = document.getElementById('reg-tr-rfc').value.trim();
        const inst = regTrInstTrigger.querySelector('.select-val').classList.contains('has-val');
        const tel = document.getElementById('reg-tr-tel').value.trim();
        const pass = document.getElementById('reg-tr-pass').value.trim();
        const submitBtn = document.getElementById('btn-submit-reg-trabajador');
        
        submitBtn.disabled = !(num.length >= 4 && rfc.length >= 10 && inst && tel.length === 10 && pass.length >= 6);
      }
    }
    else if (state.currentScreen === 'screen-device-select') {
      const inst = loanInstTrigger.querySelector('.select-val').classList.contains('has-val');
      const mod = loanModuleTrigger.querySelector('.select-val').classList.contains('has-val');
      const submitBtn = document.getElementById('btn-submit-loan');
      
      submitBtn.disabled = !(inst && mod && state.loan.deviceType && state.loan.connectorType);
    }
  }

  // Registrar inputs para validación al escribir
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', validateActiveForm);
  });

  // ==========================================
  // FLUJO DE NEGOCIO: REGISTRO E INICIO DE SESIÓN
  // ==========================================
  
  // Alternar pestañas en el registro
  const tabAlumno = document.getElementById('tab-alumno');
  const tabTrabajador = document.getElementById('tab-trabajador');
  const panelAlumno = document.getElementById('panel-alumno');
  const panelTrabajador = document.getElementById('panel-trabajador');

  tabAlumno.addEventListener('click', () => {
    playSound('tap');
    tabAlumno.classList.add('active');
    tabAlumno.setAttribute('aria-selected', 'true');
    tabTrabajador.classList.remove('active');
    tabTrabajador.setAttribute('aria-selected', 'false');
    panelAlumno.classList.add('active');
    panelTrabajador.classList.remove('active');
    closeKeyboard();
    validateActiveForm();
    if (state.accessibility.audioGuide) speak("Pestaña de registro de alumno activa");
  });

  tabTrabajador.addEventListener('click', () => {
    playSound('tap');
    tabTrabajador.classList.add('active');
    tabTrabajador.setAttribute('aria-selected', 'true');
    tabAlumno.classList.remove('active');
    tabAlumno.setAttribute('aria-selected', 'false');
    panelTrabajador.classList.add('active');
    panelAlumno.classList.remove('active');
    closeKeyboard();
    validateActiveForm();
    if (state.accessibility.audioGuide) speak("Pestaña de registro de trabajador activa");
  });

  // Botón iniciar sesión submit
  document.getElementById('form-login').addEventListener('submit', () => {
    const userVal = document.getElementById('login-user').value;
    
    // Simular login exitoso
    state.user.isLoggedIn = true;
    state.user.id = userVal;
    
    // Determinar si es alumno o trabajador por el tamaño del número
    if (userVal.length >= 8) {
      state.user.name = "Carreño Garavito Victor";
      state.user.type = "alumno";
      state.user.phone = "5544339876"; // Teléfono simulado existente
    } else {
      state.user.name = "Dr. Martínez Vega Alejandro";
      state.user.type = "trabajador";
      state.user.phone = "5599887766";
    }

    // Configurar greeting
    document.getElementById('user-display-name').innerText = state.user.name;
    document.getElementById('user-display-name-active').innerText = state.user.name;
    
    playSound('success');
    showScreen('screen-device-select');
  });

  // Submit registro Alumno
  document.getElementById('form-register-alumno').addEventListener('submit', () => {
    state.user.isLoggedIn = true;
    state.user.name = "Alumno Nuevo Registrado";
    state.user.id = document.getElementById('reg-al-cuenta').value;
    state.user.phone = document.getElementById('reg-al-tel').value;
    state.user.type = "alumno";

    document.getElementById('user-display-name').innerText = state.user.name;
    document.getElementById('user-display-name-active').innerText = state.user.name;
    
    playSound('success');
    showScreen('screen-device-select');
  });

  // Submit registro Trabajador
  document.getElementById('form-register-trabajador').addEventListener('submit', () => {
    state.user.isLoggedIn = true;
    state.user.name = "Profesor Nuevo Registrado";
    state.user.id = document.getElementById('reg-tr-num').value;
    state.user.phone = document.getElementById('reg-tr-tel').value;
    state.user.type = "trabajador";

    document.getElementById('user-display-name').innerText = state.user.name;
    document.getElementById('user-display-name-active').innerText = state.user.name;
    
    playSound('success');
    showScreen('screen-device-select');
  });

  // ==========================================
  // CARDS DE SELECCIÓN VISUAL (DISPOSITIVO / CONECTOR)
  // ==========================================
  document.querySelectorAll('.visual-selector-grid').forEach(grid => {
    const cards = grid.querySelectorAll('.visual-card');
    
    cards.forEach(card => {
      card.addEventListener('click', () => {
        playSound('tap');
        
        // Quitar selección previa en esta grilla
        cards.forEach(c => {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        
        // Seleccionar esta
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');

        const value = card.dataset.value;
        const groupLabel = grid.getAttribute('aria-label');

        if (groupLabel === 'Tipo de Dispositivo') {
          state.loan.deviceType = value;
          if (state.accessibility.audioGuide) speak(`Dispositivo seleccionado: ${value}`);
        } else if (groupLabel === 'Tipo de Conector') {
          state.loan.connectorType = value;
          if (state.accessibility.audioGuide) speak(`Conector seleccionado: ${value}`);
        }

        validateActiveForm();
      });
    });
  });


  // ==========================================
  // FLUJO DE PRÉSTAMO Y CUENTA REGRESIVA
  // ==========================================
  
  // Submit préstamo
  document.getElementById('form-loan').addEventListener('submit', () => {
    // Tomar datos del formulario
    state.loan.institution = loanInstTrigger.querySelector('.select-val').innerText;
    state.loan.module = loanModuleTrigger.querySelector('.select-val').innerText;
    
    // Generar un ID de préstamo dinámico (ej. 447540)
    state.loan.loanId = Math.floor(100000 + Math.random() * 900000).toString();

    // Simular ID de equipo e inventario
    const isIpad = state.loan.deviceType === 'iPad';
    state.loan.cartId = isIpad ? 'C09' : 'C06';
    state.loan.deviceId = isIpad ? 'P21' : 'L43';
    state.loan.inventoryNumber = isIpad ? '1920054' : '2620015';

    // Rellenar pantalla de préstamo activo
    // Si el módulo seleccionado es largo, abreviar
    let moduleAbbr = state.loan.module;
    if (moduleAbbr.includes('(')) {
      moduleAbbr = moduleAbbr.split(' ')[0]; // E.g. "Docencia"
    } else if (moduleAbbr.includes('Centro')) {
      moduleAbbr = 'CD';
    }
    
    document.getElementById('active-loan-module').innerText = moduleAbbr;
    document.getElementById('active-loan-cart').innerText = state.loan.cartId;
    document.getElementById('active-loan-device').innerText = state.loan.deviceId;
    document.getElementById('active-loan-type').innerText = state.loan.deviceType;
    document.getElementById('active-loan-inv').innerText = state.loan.inventoryNumber;

    // Iniciar temporizador regresivo de 10 minutos (600 segundos)
    startCountdown(600);

    showScreen('screen-loan-active');
  });

  function startCountdown(seconds) {
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    
    const display = document.getElementById('countdown-timer');
    let timeLeft = seconds;

    function updateTimerDisplay() {
      const minutes = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      const secsStr = secs < 10 ? '0' + secs : secs;
      
      display.innerText = `${minutesStr}:${secsStr}`;

      // Alerta visual de peligro cuando queda menos de 2 minutos
      if (timeLeft <= 120) {
        display.classList.add('timer-danger');
      } else {
        display.classList.remove('timer-danger');
      }
    }

    updateTimerDisplay();

    state.countdownInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft < 0) {
        clearInterval(state.countdownInterval);
        playSound('alert');
        alert("El tiempo de recogida del préstamo ha expirado.");
        showScreen('screen-idle');
      } else {
        updateTimerDisplay();
      }
    }, 1000);
  }

  // Cancelar préstamo activo
  document.getElementById('btn-cancel-active-loan').addEventListener('click', () => {
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    playSound('alert');
    showScreen('screen-device-select');
  });

  // Cancelar formulario de préstamo
  document.getElementById('btn-cancel-loan-form').addEventListener('click', () => {
    showScreen('screen-welcome');
  });


  // ==========================================
  // SIMULACIÓN DE IMPRESIÓN Y QR GENERADO
  // ==========================================
  const btnTriggerTicket = document.getElementById('btn-trigger-ticket');
  const ticketQrModal = document.getElementById('ticket-qr-modal');
  const printedTicket = document.getElementById('printed-ticket');
  const modalButtons = ticketQrModal.querySelector('.ticket-modal-buttons');
  const btnCollectTicket = document.getElementById('btn-collect-ticket');

  btnTriggerTicket.addEventListener('click', () => {
    // 1. Mostrar Modal y ocultar botones/ticket
    ticketQrModal.classList.add('active');
    printedTicket.classList.remove('print-active');
    modalButtons.classList.remove('show');

    // Llenar ticket
    document.getElementById('ticket-username').innerText = state.user.name;
    document.getElementById('ticket-loan-id').innerText = state.loan.loanId;
    document.getElementById('ticket-device-inv').innerText = `${state.loan.deviceId} (${state.loan.deviceType})`;
    document.getElementById('ticket-module-name').innerText = state.loan.module;
    
    // Estampa de fecha y hora actual
    const now = new Date();
    const pad = (n) => n < 10 ? '0'+n : n;
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    document.getElementById('ticket-time-stamp').innerText = dateStr;

    // Generar código QR en Canvas
    generateMockQR(state.loan.loanId);

    // Configurar estado de WhatsApp en el modal usando el teléfono guardado
    const maskedPhone = state.user.phone.substring(0, 2) + '****' + state.user.phone.substring(6);
    document.getElementById('wa-phone-feedback').innerText = `Se envió el ID ${state.loan.loanId} al número celular registrado (${maskedPhone})`;

    // 2. Ejecutar sonido de impresora y deslizar papel (WOW effect)
    setTimeout(() => {
      playSound('printer');
      printedTicket.classList.add('print-active');
    }, 400);

    // 3. Mostrar alertas e instrucciones después de que termine la impresión
    setTimeout(() => {
      playSound('success');
      modalButtons.classList.add('show');
      
      if (state.accessibility.audioGuide) {
        speak("Ticket físico impreso correctamente. Además, hemos enviado tu clave de préstamo y el código QR de forma segura a tu WhatsApp.");
      }
    }, 1800);
  });

  // Generador de QR Mock en Canvas (Píxeles aleatorios coherentes basados en ID)
  function generateMockQR(seedText) {
    const canvasQR = document.getElementById('qr-code-canvas');
    const qctx = canvasQR.getContext('2d');
    const width = canvasQR.width;
    const height = canvasQR.height;
    
    qctx.fillStyle = '#ffffff';
    qctx.fillRect(0, 0, width, height);

    // Dibujar los 3 marcadores cuadrados característicos de las esquinas (Position Markers)
    drawQRMarker(qctx, 10, 10, 35);
    drawQRMarker(qctx, width - 45, 10, 35);
    drawQRMarker(qctx, 10, height - 45, 35);

    // Dibujar patrón de datos semi-aleatorios coherentes
    qctx.fillStyle = '#000000';
    const cellSize = 5;
    const cols = width / cellSize;
    const rows = height / cellSize;

    // Semilla hash simple a partir del ID de préstamo
    let seed = 0;
    for (let i = 0; i < seedText.length; i++) {
      seed += seedText.charCodeAt(i) * (i + 1);
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Ignorar las esquinas de los marcadores de posición
        if (
          (r < 10 && c < 10) || 
          (r < 10 && c > cols - 10) || 
          (r > rows - 10 && c < 10)
        ) {
          continue;
        }

        // Generar un patrón determinista basado en la semilla
        const val = Math.sin(seed + (r * 13) + (c * 37)) * 10000;
        const drawPixel = (val - Math.floor(val)) > 0.46; // Umbral de pixelación
        
        if (drawPixel) {
          qctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  function drawQRMarker(qctx, x, y, size) {
    qctx.fillStyle = '#000000';
    qctx.fillRect(x, y, size, size);
    qctx.fillStyle = '#ffffff';
    qctx.fillRect(x + 5, y + 5, size - 10, size - 10);
    qctx.fillStyle = '#000000';
    qctx.fillRect(x + 10, y + 10, size - 20, size - 20);
  }

  // Recoger ticket e ir al paso final
  btnCollectTicket.addEventListener('click', () => {
    ticketQrModal.classList.remove('active');
    
    // Rellenar datos en la pantalla de éxito
    document.getElementById('success-loan-id').innerText = state.loan.loanId;
    document.getElementById('success-loan-module').innerText = state.loan.module;

    // Detener temporizador
    if (state.countdownInterval) clearInterval(state.countdownInterval);

    showScreen('screen-success-final');
  });

  // Botón Finalizar todo el flujo
  document.getElementById('btn-finish-flow').addEventListener('click', () => {
    // Resetear datos de usuario y préstamo
    state.user.isLoggedIn = false;
    state.user.name = '';
    state.user.id = '';
    state.user.phone = '';
    state.user.type = '';
    
    // Limpiar inputs
    document.querySelectorAll('input').forEach(inp => {
      inp.value = '';
    });
    
    // Reiniciar selectores de trigger
    document.querySelectorAll('.select-touch-trigger .select-val').forEach(val => {
      val.innerText = "Selecciona una opción";
      val.classList.remove('has-val');
    });

    document.getElementById('loan-inst-trigger').querySelector('.select-val').innerText = "Selecciona tu Institución";
    document.getElementById('loan-module-trigger').querySelector('.select-val').innerText = "Selecciona un Módulo";
    document.getElementById('loan-inst-trigger').querySelector('.select-val').classList.remove('has-val');
    document.getElementById('loan-module-trigger').querySelector('.select-val').classList.remove('has-val');

    // Deseleccionar tarjetas visuales
    document.querySelectorAll('.visual-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-checked', 'false');
    });

    state.loan.deviceType = '';
    state.loan.connectorType = '';

    // Desmarcar hCaptcha
    captchaCheckbox.classList.remove('checked');
    captchaCheckbox.setAttribute('aria-checked', 'false');

    showScreen('screen-idle');
  });

  // ==========================================
  // CONEXIONES DE NAVEGACIÓN Y CLICS SIMPLES
  // ==========================================
  
  // Botones de pantalla de saver a bienvenida
  document.getElementById('btn-start-kiosk').addEventListener('click', () => {
    showScreen('screen-welcome');
  });

  // Volver a inicio desde bienvenida
  document.querySelectorAll('.btn-back-idle').forEach(btn => {
    btn.addEventListener('click', () => {
      showScreen('screen-idle');
    });
  });

  // Botones de pantalla de bienvenida
  document.getElementById('btn-goto-login').addEventListener('click', () => {
    showScreen('screen-login');
  });

  document.getElementById('btn-goto-register').addEventListener('click', () => {
    showScreen('screen-register');
  });

  // Volver a bienvenida
  document.querySelectorAll('.btn-back-welcome').forEach(btn => {
    btn.addEventListener('click', () => {
      showScreen('screen-welcome');
    });
  });

  // Enlaces alternativos entre login y register
  document.querySelectorAll('.btn-goto-register-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showScreen('screen-register');
    });
  });

  document.querySelectorAll('.btn-goto-login-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showScreen('screen-login');
    });
  });

  // Cerrar sesión
  document.getElementById('btn-logout').addEventListener('click', () => {
    state.user.isLoggedIn = false;
    showScreen('screen-welcome');
  });

  // ==========================================
  // REINICIO DE INACTIVIDAD (TIMER SAVER)
  // ==========================================
  let idleTimer;
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    // Si el usuario está inactivo por 90 segundos, vuelve a la pantalla inicial por seguridad
    if (state.currentScreen !== 'screen-idle') {
      idleTimer = setTimeout(() => {
        playSound('alert');
        state.user.isLoggedIn = false;
        showScreen('screen-idle');
      }, 90000); 
    }
  }

  // Escuchar toques para resetear temporizador de inactividad
  const touchEvents = ['touchstart', 'click', 'scroll'];
  touchEvents.forEach(evt => {
    document.addEventListener(evt, resetIdleTimer, { passive: true });
  });

  // Actualizar hora de la barra de estado superior
  function updateKioskTime() {
    const timeSpan = document.getElementById('kiosk-time');
    const now = new Date();
    const mins = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
    timeSpan.innerText = `${now.getHours()}:${mins}`;
  }
  setInterval(updateKioskTime, 1000);
  updateKioskTime();

  // Inicializar hCaptcha botón de estado inicial deshabilitado
  validateActiveForm();
});
