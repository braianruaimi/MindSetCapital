// ============================================
// SECURITY.JS - Sistema de Seguridad y Encriptación
// Protección de datos sensibles con Web Crypto API
// ============================================

const SecurityModule = {
    
    // Configuración de seguridad
    config: {
        algorithm: 'AES-GCM',
        keyLength: 256,
        ivLength: 12,
        saltLength: 16,
        iterations: 100000
    },

    // Clave maestra derivada de la sesión
    masterKey: null,
    
    // Inicializar sistema de seguridad
    async init(password = null) {
        try {
            // Generar o recuperar clave de sesión
            const sessionPassword = password || this.getSessionKey();
            await this.deriveMasterKey(sessionPassword);
            
            // Configurar protecciones
            this.setupProtections();
            
            console.log('🔒 Sistema de seguridad inicializado');
            return true;
        } catch (error) {
            console.error('Error al inicializar seguridad:', error);
            return false;
        }
    },

    // Obtener o generar clave de sesión única
    getSessionKey() {
        let sessionKey = sessionStorage.getItem('_sk');
        if (!sessionKey) {
            // Generar clave única basada en timestamp + random
            sessionKey = this.generateSessionKey();
            sessionStorage.setItem('_sk', sessionKey);
        }
        return sessionKey;
    },

    // Generar clave de sesión
    generateSessionKey() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2);
        const userAgent = navigator.userAgent.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return `${timestamp}${random}${userAgent.toString(36)}`;
    },

    // Derivar clave maestra desde contraseña
    async deriveMasterKey(password) {
        try {
            const encoder = new TextEncoder();
            const passwordData = encoder.encode(password);
            
            // Importar contraseña como clave
            const baseKey = await crypto.subtle.importKey(
                'raw',
                passwordData,
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            // Obtener o generar salt
            const salt = await this.getSalt();

            // Derivar clave con PBKDF2
            this.masterKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: this.config.iterations,
                    hash: 'SHA-256'
                },
                baseKey,
                {
                    name: this.config.algorithm,
                    length: this.config.keyLength
                },
                false,
                ['encrypt', 'decrypt']
            );

            return true;
        } catch (error) {
            console.error('Error al derivar clave:', error);
            return false;
        }
    },

    // Obtener o generar salt
    async getSalt() {
        let saltHex = localStorage.getItem('_s');
        
        if (!saltHex) {
            // Generar nuevo salt
            const salt = crypto.getRandomValues(new Uint8Array(this.config.saltLength));
            saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
            localStorage.setItem('_s', saltHex);
            return salt;
        }

        // Convertir hex a Uint8Array
        const salt = new Uint8Array(saltHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
        return salt;
    },

    // ============================================
    // ENCRIPTACIÓN Y DESENCRIPTACIÓN
    // ============================================

    // Encriptar datos
    async encrypt(data) {
        try {
            if (!this.masterKey) {
                await this.init();
            }

            // Convertir datos a string JSON
            const jsonString = JSON.stringify(data);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(jsonString);

            // Generar IV aleatorio
            const iv = crypto.getRandomValues(new Uint8Array(this.config.ivLength));

            // Encriptar
            const encryptedBuffer = await crypto.subtle.encrypt(
                {
                    name: this.config.algorithm,
                    iv: iv
                },
                this.masterKey,
                dataBuffer
            );

            // Combinar IV + datos encriptados
            const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encryptedBuffer), iv.length);

            // Convertir a Base64
            return this.arrayBufferToBase64(combined);
        } catch (error) {
            console.error('Error al encriptar:', error);
            return null;
        }
    },

    // Desencriptar datos
    async decrypt(encryptedData) {
        try {
            if (!this.masterKey) {
                await this.init();
            }

            if (!encryptedData) return null;

            // Convertir Base64 a ArrayBuffer
            const combined = this.base64ToArrayBuffer(encryptedData);

            // Separar IV y datos encriptados
            const iv = combined.slice(0, this.config.ivLength);
            const encryptedBuffer = combined.slice(this.config.ivLength);

            // Desencriptar
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: this.config.algorithm,
                    iv: iv
                },
                this.masterKey,
                encryptedBuffer
            );

            // Convertir a string y parsear JSON
            const decoder = new TextDecoder();
            const jsonString = decoder.decode(decryptedBuffer);
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Error al desencriptar:', error);
            return null;
        }
    },

    // ============================================
    // UTILIDADES
    // ============================================

    // Convertir ArrayBuffer a Base64
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    // Convertir Base64 a ArrayBuffer
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    },

    // Hash de contraseña (para autenticación)
    async hashPassword(password) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Error al hashear contraseña:', error);
            return null;
        }
    },

    // ============================================
    // PROTECCIONES ADICIONALES
    // ============================================

    setupProtections() {
        // Protección contra apertura de DevTools en producción
        this.setupDevToolsProtection();
        
        // Protección contra copia de código
        this.setupCopyProtection();
        
        // Limpiar consola
        this.clearConsole();
        
        // Deshabilitar click derecho en producción
        this.setupContextMenuProtection();
    },

    // Protección de DevTools
    setupDevToolsProtection() {
        // Detectar apertura de DevTools
        const devtools = { open: false };
        const element = new Image();
        
        Object.defineProperty(element, 'id', {
            get: function() {
                devtools.open = true;
            }
        });

        // Advertencia si se detectan DevTools en producción
        if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            setInterval(() => {
                devtools.open = false;
                console.log(element);
                console.clear();
                
                if (devtools.open) {
                    console.warn('⚠️ Sistema de seguridad activo');
                }
            }, 1000);
        }
    },

    // Protección contra copia
    setupCopyProtection() {
        if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            // Deshabilitar selección de texto en elementos sensibles
            document.addEventListener('selectstart', function(e) {
                if (e.target.classList.contains('no-select')) {
                    e.preventDefault();
                }
            });

            // Deshabilitar copiar en campos sensibles
            document.addEventListener('copy', function(e) {
                if (e.target.classList.contains('no-copy')) {
                    e.preventDefault();
                    console.warn('⚠️ Acción no permitida');
                }
            });
        }
    },

    // Limpiar consola
    clearConsole() {
        if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            console.clear();
            console.log('%c🔒 MindSet Capital', 'color: #00ffff; font-size: 24px; font-weight: bold;');
            console.log('%c⚠️ ADVERTENCIA DE SEGURIDAD', 'color: #ff0055; font-size: 16px; font-weight: bold;');
            console.log('%cEsta es una aplicación privada. El acceso no autorizado está prohibido.', 'color: #ffffff; font-size: 12px;');
            console.log('%cSi no eres el propietario, cierra esta ventana inmediatamente.', 'color: #ffaa00; font-size: 12px;');
        }
    },

    // Protección de menú contextual
    setupContextMenuProtection() {
        if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            document.addEventListener('contextmenu', function(e) {
                // Permitir solo en modo desarrollo
                if (!e.target.closest('.dev-allow')) {
                    e.preventDefault();
                    return false;
                }
            });

            // Deshabilitar atajos de teclado peligrosos
            document.addEventListener('keydown', function(e) {
                // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
                if (
                    e.keyCode === 123 || // F12
                    (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || // Ctrl+Shift+I/J
                    (e.ctrlKey && e.keyCode === 85) // Ctrl+U
                ) {
                    e.preventDefault();
                    console.warn('⚠️ Acción bloqueada por seguridad');
                    return false;
                }
            });
        }
    },

    // ============================================
    // VALIDACIÓN Y SANITIZACIÓN
    // ============================================

    // Sanitizar entrada de usuario
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Eliminar caracteres peligrosos
        return input
            .replace(/[<>]/g, '') // Eliminar < y >
            .replace(/javascript:/gi, '') // Eliminar javascript:
            .replace(/on\w+=/gi, '') // Eliminar event handlers
            .trim();
    },

    // Validar datos antes de guardar
    validateData(data) {
        try {
            // Verificar que sea un objeto válido
            if (typeof data !== 'object') return false;
            
            // Verificar que no contenga funciones
            const jsonString = JSON.stringify(data);
            if (jsonString.includes('function') || jsonString.includes('=>')) {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    },

    // ============================================
    // GESTIÓN DE SESIÓN SEGURA
    // ============================================

    // Verificar integridad de sesión
    verifySession() {
        const authenticated = localStorage.getItem('mindset_authenticated');
        const sessionKey = sessionStorage.getItem('_sk');
        
        if (authenticated !== 'true' || !sessionKey) {
            this.clearSession();
            return false;
        }
        
        return true;
    },

    // Limpiar sesión completamente
    clearSession() {
        sessionStorage.clear();
        localStorage.removeItem('mindset_authenticated');
        this.masterKey = null;
    },

    // Cerrar sesión segura
    logout() {
        this.clearSession();
        location.reload();
    }
};

// Inicializar protecciones básicas inmediatamente
if (typeof window !== 'undefined') {
    // Prevenir que alguien sobrescriba el módulo
    Object.freeze(SecurityModule);
}
