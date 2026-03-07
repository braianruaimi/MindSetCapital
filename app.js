// ============================================
// APP.JS - Aplicación Principal
// MindSet Capital - Sistema de Gestión de Préstamos
// ============================================

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando MindSet Capital...');
    
    // Verificar autenticación
    checkAuth();
    
    // Setup login
    setupLogin();
});

// ============================================
// SISTEMA DE AUTENTICACIÓN
// ============================================

function checkAuth() {
    const isAuthenticated = localStorage.getItem('mindset_authenticated');
    
    if (isAuthenticated === 'true') {
        showMainApp();
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    // Inicializar módulos
    initializeApp();
    setupNavigation();
    setupMobileMenu();
    checkFirstRun();
}

function setupLogin() {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('loginPassword');
    
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const password = passwordInput.value;
        
        if (password === '2026') {
            localStorage.setItem('mindset_authenticated', 'true');
            showMainApp();
            passwordInput.value = '';
        } else {
            alert('❌ Contraseña incorrecta. Intenta de nuevo.');
            passwordInput.value = '';
            passwordInput.focus();
        }
    });
}

// ============================================
// INICIALIZACIÓN DE MÓDULOS
// ============================================

// Inicializar todos los módulos
function initializeApp() {
    try {
        // Inicializar storage
        Storage.init();
        
        // Inicializar módulos
        ClientesModule.init();
        PrestamosModule.init();
        PagosModule.init();
        DashboardModule.init();
        AnalyticsModule.init();
        SimuladorModule.init();
        ChatbotModule.init();
        PerfilModule.init();
        
        console.log('✅ Aplicación iniciada correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar:', error);
    }
}

// Configurar navegación entre secciones
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;
            
            // Actualizar botones activos
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Actualizar secciones visibles
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId)?.classList.add('active');
            
            // Actualizar módulos según la sección
            updateSection(sectionId);
            
            // Cerrar menú móvil
            closeMobileMenu();
        });
    });
}

// Actualizar contenido de secciones
function updateSection(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            DashboardModule.init();
            break;
        case 'clientes':
            ClientesModule.renderClientes();
            break;
        case 'prestamos':
            PrestamosModule.renderPrestamos();
            break;
        case 'pagos':
            PagosModule.renderPagos();
            break;
        case 'analytics':
            AnalyticsModule.init();
            break;
        case 'simulador':
            SimuladorModule.init();
            break;
        case 'chatbot':
            // Chatbot ya está inicializado
            break;
    }
}

// Configurar menú móvil
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.querySelector('.nav-menu');
    
    menuToggle?.addEventListener('click', () => {
        navMenu?.classList.toggle('active');
    });
}

function closeMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu?.classList.remove('active');
}

// Verificar si es la primera ejecución
function checkFirstRun() {
    const config = Storage.getConfig();
    
    if (!config.capitalInicial || config.capitalInicial === 0) {
        showWelcomeModal();
    }
}

// Mostrar modal de bienvenida
function showWelcomeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>👋 ¡Bienvenido a MindSet Capital!</h3>
            </div>
            <div class="modal-body">
                <p>Para comenzar, necesitamos configurar tu capital inicial.</p>
                <div class="form-group">
                    <label>Capital Inicial ($)</label>
                    <input type="number" id="capitalInicialInput" placeholder="10000" min="0" step="100">
                </div>
                <p class="text-muted" style="font-size: 0.9rem; margin-top: 1rem;">
                    Este es el dinero con el que comenzarás a hacer préstamos. 
                    Puedes modificarlo después en la configuración.
                </p>
            </div>
            <div class="modal-footer">
                <button class="btn-primary" onclick="saveInitialCapital()">Comenzar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Guardar capital inicial
function saveInitialCapital() {
    const input = document.getElementById('capitalInicialInput');
    const capital = parseFloat(input?.value) || 0;
    
    if (capital <= 0) {
        alert('Por favor ingresa un capital válido mayor a 0');
        return;
    }
    
    Storage.updateConfig({ capitalInicial: capital });
    
    // Cerrar modal
    document.querySelector('.modal.active')?.remove();
    
    // Actualizar dashboard
    DashboardModule.init();
    
    // Mostrar notificación
    ClientesModule.showNotification('¡Configuración completada! Ya puedes comenzar a usar MindSet Capital.', 'success');
}

// Atajos de teclado
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K para buscar
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchCliente')?.focus();
    }
    
    // Ctrl/Cmd + N para nuevo cliente
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const currentSection = document.querySelector('.section.active');
        if (currentSection?.id === 'clientes') {
            ClientesModule.openModal();
        }
    }
});

// Detectar cuando la app se vuelve visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Actualizar dashboard cuando vuelve a estar visible
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection?.classList.contains('active')) {
            DashboardModule.init();
        }
    }
});

// Manejo de errores globales
window.addEventListener('error', (e) => {
    console.error('Error global:', e.error);
});

// Prevenir cierre accidental
window.addEventListener('beforeunload', (e) => {
    // Si hay datos sin guardar, preguntar antes de cerrar
    // Por ahora solo en producción
    if (window.location.protocol !== 'file:') {
        // e.preventDefault();
        // e.returnValue = '';
    }
});

// Actualización del Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Nueva versión disponible
        if (confirm('Hay una nueva versión disponible. ¿Deseas actualizar?')) {
            window.location.reload();
        }
    });
}

// Debug mode en desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.MindSetDebug = {
        storage: Storage,
        clientes: ClientesModule,
        prestamos: PrestamosModule,
        pagos: PagosModule,
        dashboard: DashboardModule,
        analytics: AnalyticsModule,
        simulador: SimuladorModule,
        chatbot: ChatbotModule
    };
    console.log('🔧 Debug mode activado. Usa window.MindSetDebug para acceder a los módulos.');
}

console.log('💰 MindSet Capital cargado correctamente');
