/**
 * Módulo: Gestión de Perfil de Usuario
 * Maneja datos personales, capital, metas y frases motivacionales
 */

const PerfilModule = (() => {
    let profileData = null;

    /**
     * Inicializa el módulo de perfil
     */
    async function init() {
        await loadProfile();
        setupEventListeners();
        await displayProfile();
        await updateCloudStatus();
    }

    /**
     * Carga el perfil desde localStorage
     */
    async function loadProfile() {
        const stored = localStorage.getItem('mindset_profile');
        if (stored) {
            profileData = JSON.parse(stored);
        } else {
            // Perfil por defecto
            profileData = {
                nombre: '',
                apellido: '',
                photo: null,
                capital: 0,
                goals: [],
                quote: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.'
            };
            await saveProfile();
        }
    }

    /**
     * Guarda el perfil en localStorage
     */
    function saveProfile() {
        localStorage.setItem('mindset_profile', JSON.stringify(profileData));
    }

    /**
     * Configura los event listeners
     */
    function setupEventListeners() {
        // Cambiar foto
        document.getElementById('btnChangePhoto').addEventListener('click', () => {
            document.getElementById('photoUpload').click();
        });

        document.getElementById('photoUpload').addEventListener('change', handlePhotoUpload);

        // Guardar datos personales
        document.getElementById('btnSavePersonal').addEventListener('click', savePersonalData);

        // Guardar capital
        document.getElementById('btnSaveCapital').addEventListener('click', async () => {
            await saveCapital();
        });

        // Agregar meta
        document.getElementById('btnAddGoal').addEventListener('click', addGoal);

        // Guardar frase
        document.getElementById('btnSaveQuote').addEventListener('click', saveQuote);

        // Enter en input de meta
        document.getElementById('newGoalInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addGoal();
            }
        });

        // Respaldos
        document.getElementById('btnExportBackup').addEventListener('click', exportBackup);
        document.getElementById('btnImportBackup').addEventListener('click', () => {
            document.getElementById('fileImportBackup').click();
        });
        document.getElementById('fileImportBackup').addEventListener('change', importBackup);
        
        // Limpiar duplicados
        const btnCleanDuplicates = document.getElementById('btnCleanDuplicates');
        if (btnCleanDuplicates) {
            btnCleanDuplicates.addEventListener('click', cleanDuplicates);
        }

        const btnSystemDiagnostic = document.getElementById('btnSystemDiagnostic');
        if (btnSystemDiagnostic) {
            btnSystemDiagnostic.addEventListener('click', runSystemDiagnostic);
        }

        const btnSaveCloudConfig = document.getElementById('btnSaveCloudConfig');
        if (btnSaveCloudConfig) {
            btnSaveCloudConfig.addEventListener('click', saveCloudConfig);
        }

        const btnCloudSignUp = document.getElementById('btnCloudSignUp');
        if (btnCloudSignUp) {
            btnCloudSignUp.addEventListener('click', cloudSignUp);
        }

        const btnCloudSignIn = document.getElementById('btnCloudSignIn');
        if (btnCloudSignIn) {
            btnCloudSignIn.addEventListener('click', cloudSignIn);
        }

        const btnCloudSyncNow = document.getElementById('btnCloudSyncNow');
        if (btnCloudSyncNow) {
            btnCloudSyncNow.addEventListener('click', cloudSyncNow);
        }

        const btnCloudPull = document.getElementById('btnCloudPull');
        if (btnCloudPull) {
            btnCloudPull.addEventListener('click', cloudPull);
        }

        const btnCloudSignOut = document.getElementById('btnCloudSignOut');
        if (btnCloudSignOut) {
            btnCloudSignOut.addEventListener('click', cloudSignOut);
        }

        preloadCloudConfigInputs();
    }

    function preloadCloudConfigInputs() {
        if (typeof CloudSync === 'undefined') return;
        const cfg = CloudSync.getConfig ? CloudSync.getConfig() : {};
        const urlInput = document.getElementById('supabaseUrl');
        const keyInput = document.getElementById('supabaseAnonKey');
        if (urlInput) urlInput.value = cfg.url || '';
        if (keyInput) keyInput.value = cfg.anonKey || '';
    }

    async function updateCloudStatus() {
        const statusElement = document.getElementById('cloudStatus');
        if (!statusElement) return;

        if (typeof CloudSync === 'undefined') {
            statusElement.textContent = 'CloudSync no disponible';
            return;
        }

        try {
            const status = await CloudSync.getStatus();
            if (!status.configured) {
                statusElement.textContent = 'No configurado';
                return;
            }

            if (!status.authenticated) {
                statusElement.textContent = 'Configurado / sin sesión';
                return;
            }

            const lastSyncText = status.lastSync
                ? ` | Último sync: ${new Date(status.lastSync).toLocaleString()}`
                : '';
            statusElement.textContent = `Conectado: ${status.email}${lastSyncText}`;
        } catch (error) {
            statusElement.textContent = `Error: ${error.message}`;
        }
    }

    function getCloudCredentials() {
        const email = (document.getElementById('cloudEmail')?.value || '').trim();
        const password = (document.getElementById('cloudPassword')?.value || '').trim();
        return { email, password };
    }

    async function saveCloudConfig() {
        try {
            if (typeof CloudSync === 'undefined') {
                showNotification('CloudSync no está disponible', 'error');
                return;
            }

            const url = (document.getElementById('supabaseUrl')?.value || '').trim();
            const anonKey = (document.getElementById('supabaseAnonKey')?.value || '').trim();

            if (!url || !anonKey) {
                showNotification('Completa URL y Anon Key', 'error');
                return;
            }

            CloudSync.saveConfig(url, anonKey);
            CloudSync.init();
            await updateCloudStatus();
            showNotification('Configuración de nube guardada', 'success');
        } catch (error) {
            console.error(error);
            showNotification('Error al guardar configuración de nube', 'error');
        }
    }

    async function cloudSignUp() {
        try {
            const { email, password } = getCloudCredentials();
            if (!email || !password) {
                showNotification('Completa email y contraseña', 'error');
                return;
            }
            await CloudSync.signUp(email, password);
            showNotification('Cuenta creada. Revisa tu email para confirmar.', 'success');
            await updateCloudStatus();
        } catch (error) {
            showNotification(`Error al crear cuenta: ${error.message}`, 'error');
        }
    }

    async function cloudSignIn() {
        try {
            const { email, password } = getCloudCredentials();
            if (!email || !password) {
                showNotification('Completa email y contraseña', 'error');
                return;
            }
            await CloudSync.signIn(email, password);
            await updateCloudStatus();
            showNotification('Sesión en nube iniciada', 'success');
        } catch (error) {
            showNotification(`Error al iniciar sesión: ${error.message}`, 'error');
        }
    }

    async function cloudSyncNow() {
        try {
            showNotification('Sincronizando con nube...', 'info');
            await CloudSync.syncNow();
            await updateCloudStatus();
            showNotification('Sincronización completa', 'success');
        } catch (error) {
            showNotification(`Error de sincronización: ${error.message}`, 'error');
        }
    }

    async function cloudPull() {
        try {
            if (!confirm('Esto reemplazará los datos locales con los de la nube. ¿Continuar?')) return;
            await CloudSync.pullAll();
            await updateBackupStatus();
            await updateCloudStatus();
            if (typeof ClientesModule !== 'undefined') await ClientesModule.renderClientes();
            if (typeof PrestamosModule !== 'undefined') await PrestamosModule.renderPrestamos();
            if (typeof PagosModule !== 'undefined') await PagosModule.renderPagos();
            if (typeof DashboardModule !== 'undefined') await DashboardModule.init();
            showNotification('Datos traídos desde nube', 'success');
        } catch (error) {
            showNotification(`Error al traer datos: ${error.message}`, 'error');
        }
    }

    async function cloudSignOut() {
        try {
            await CloudSync.signOut();
            await updateCloudStatus();
            showNotification('Sesión en nube cerrada', 'success');
        } catch (error) {
            showNotification(`Error al cerrar sesión: ${error.message}`, 'error');
        }
    }

    /**
     * Maneja la carga de foto de perfil
     */
    function handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validar que sea imagen
        if (!file.type.startsWith('image/')) {
            showNotification('Por favor selecciona una imagen válida', 'error');
            return;
        }

        // Validar tamaño (máximo 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showNotification('La imagen debe pesar menos de 2MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            profileData.photo = event.target.result;
            saveProfile();
            displayPhoto();
            showNotification('Foto actualizada correctamente', 'success');
        };
        reader.readAsDataURL(file);
    }

    /**
     * Guarda los datos personales
     */
    function savePersonalData() {
        const nombre = document.getElementById('profileNombre').value.trim();
        const apellido = document.getElementById('profileApellido').value.trim();

        if (!nombre || !apellido) {
            showNotification('Por favor completa nombre y apellido', 'error');
            return;
        }

        profileData.nombre = nombre;
        profileData.apellido = apellido;
        saveProfile();
        showNotification('Datos personales guardados', 'success');
    }

    /**
     * Guarda el capital actualizado
     */
    async function saveCapital() {
        const capitalInput = document.getElementById('editCapital');
        const newCapital = parseFloat(capitalInput.value);

        if (isNaN(newCapital) || newCapital < 0) {
            showNotification('Ingresa un capital válido', 'error');
            return;
        }

        profileData.capital = newCapital;
        saveProfile();

        // Actualizar en config global
        const config = await Storage.getConfig();
        config.capitalInicial = newCapital;
        await Storage.updateConfig(config);

        displayCapital();
        capitalInput.value = '';
        showNotification('Capital actualizado correctamente', 'success');

        // Actualizar dashboard si está visible
        if (typeof DashboardModule !== 'undefined') {
            await DashboardModule.init();
        }
    }

    /**
     * Agrega una nueva meta
     */
    function addGoal() {
        const input = document.getElementById('newGoalInput');
        const goalText = input.value.trim();

        if (!goalText) {
            showNotification('Escribe una meta para agregar', 'error');
            return;
        }

        const newGoal = {
            id: Date.now(),
            text: goalText,
            completed: false,
            createdAt: new Date().toISOString()
        };

        profileData.goals.push(newGoal);
        saveProfile();
        displayGoals();
        input.value = '';
        showNotification('Meta agregada', 'success');
    }

    /**
     * Elimina una meta
     */
    function deleteGoal(goalId) {
        if (!confirm('¿Eliminar esta meta?')) return;

        profileData.goals = profileData.goals.filter(g => g.id !== goalId);
        saveProfile();
        displayGoals();
        showNotification('Meta eliminada', 'success');
    }

    /**
     * Marca/desmarca meta como completada
     */
    function toggleGoal(goalId) {
        const goal = profileData.goals.find(g => g.id === goalId);
        if (goal) {
            goal.completed = !goal.completed;
            saveProfile();
            displayGoals();
        }
    }

    /**
     * Guarda la frase motivacional
     */
    function saveQuote() {
        const quoteInput = document.getElementById('quoteInput');
        const quoteText = quoteInput.value.trim();

        if (!quoteText) {
            showNotification('Escribe una frase motivacional', 'error');
            return;
        }

        profileData.quote = quoteText;
        saveProfile();
        displayQuote();
        showNotification('Frase motivacional guardada', 'success');
    }

    /**
     * Muestra todos los datos del perfil
     */
    async function displayProfile() {
        displayPhoto();
        displayPersonalData();
        await displayCapital();
        displayGoals();
        displayQuote();
        await updateBackupStatus();
    }

    /**
     * Muestra la foto de perfil
     */
    function displayPhoto() {
        const photoContainer = document.getElementById('profilePhoto');
        
        if (profileData.photo) {
            photoContainer.innerHTML = `<img src="${profileData.photo}" alt="Foto de perfil">`;
        } else {
            photoContainer.innerHTML = '<span class="photo-placeholder">📷</span>';
        }
    }

    /**
     * Muestra los datos personales
     */
    function displayPersonalData() {
        document.getElementById('profileNombre').value = profileData.nombre || '';
        document.getElementById('profileApellido').value = profileData.apellido || '';
    }

    /**
     * Muestra el capital
     */
    async function displayCapital() {
        const config = await Storage.getConfig();
        const capital = config.capitalInicial || profileData.capital;
        
        document.getElementById('capitalAmount').textContent = 
            new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(capital);
    }

    /**
     * Muestra la lista de metas
     */
    function displayGoals() {
        const container = document.getElementById('goalsContainer');
        
        if (profileData.goals.length === 0) {
            container.innerHTML = '<p class="no-data">No hay metas establecidas. ¡Agrega tu primera meta!</p>';
            return;
        }

        container.innerHTML = profileData.goals.map(goal => `
            <div class="goal-item ${goal.completed ? 'completed' : ''}">
                <div class="goal-content">
                    <input type="checkbox" 
                           ${goal.completed ? 'checked' : ''} 
                           onchange="PerfilModule.toggleGoal(${goal.id})">
                    <span class="goal-text">${goal.text}</span>
                </div>
                <button class="btn-delete-goal" onclick="PerfilModule.deleteGoal(${goal.id})">🗑️</button>
            </div>
        `).join('');
    }

    /**
     * Muestra la frase motivacional
     */
    function displayQuote() {
        const quoteContainer = document.getElementById('motivationalQuote');
        quoteContainer.innerHTML = `<p class="quote-text">"${profileData.quote}"</p>`;
        document.getElementById('quoteInput').value = profileData.quote;
    }

    /**
     * Muestra notificación al usuario
     */
    function showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">✕</button>
        `;

        // Agregar al body
        document.body.appendChild(notification);

        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto-eliminar después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Obtiene los datos del perfil
     */
    function getProfile() {
        return { ...profileData };
    }

    /**
     * Exporta un respaldo completo de todos los datos
     */
    async function exportBackup() {
        try {
            await Storage.exportData();
            
            // Guardar fecha del último backup
            localStorage.setItem('mindset_last_backup', new Date().toISOString());
            await updateBackupStatus();
            
            showNotification('✅ Respaldo descargado exitosamente', 'success');
        } catch (error) {
            console.error('Error al exportar:', error);
            showNotification('❌ Error al crear el respaldo', 'error');
        }
    }

    /**
     * Importa un respaldo desde archivo
     */
    async function importBackup(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Confirmar acción
        if (!confirm('⚠️ Esto reemplazará todos los datos actuales. ¿Continuar?')) {
            e.target.value = ''; // Limpiar input
            return;
        }

        try {
            const data = await Storage.importData(file);
            
            showNotification('✅ Respaldo restaurado correctamente', 'success');
            
            // Recargar después de 1.5 segundos para refrescar la UI
            setTimeout(() => {
                location.reload();
            }, 1500);
        } catch (error) {
            console.error('Error al importar:', error);
            showNotification('❌ Error al restaurar el respaldo. Verifica que el archivo sea válido.', 'error');
        }
        
        e.target.value = ''; // Limpiar input
    }

    /**
     * Limpia clientes duplicados del sistema
     */
    async function cleanDuplicates() {
        if (!confirm('🔍 ¿Deseas buscar y eliminar clientes duplicados?\n\nSe mantendrá el registro más reciente de cada cliente.')) {
            return;
        }

        try {
            showNotification('🔍 Buscando duplicados...', 'info');
            
            // Primera verificación: ver estado actual
            const integrityReport = await Storage.verifyDataIntegrity();
            console.log('Reporte de integridad:', integrityReport);
            
            // Limpiar duplicados
            const duplicadosEliminados = await Storage.removeDuplicateClientes();
            
            if (duplicadosEliminados > 0) {
                showNotification(`✅ Se eliminaron ${duplicadosEliminados} cliente(s) duplicado(s)`, 'success');
                
                // Actualizar todas las vistas
                await updateBackupStatus();
                
                // Recargar módulos si están disponibles
                if (typeof ClientesModule !== 'undefined') {
                    await ClientesModule.renderClientes();
                }
                if (typeof DashboardModule !== 'undefined') {
                    await DashboardModule.init();
                }
                
                // Mostrar reporte final
                const reporteFinal = await Storage.verifyDataIntegrity();
                console.log('Reporte final:', reporteFinal);
                
                setTimeout(() => {
                    alert(`✅ Limpieza completada\n\n` +
                          `Clientes: ${reporteFinal.clientes}\n` +
                          `Préstamos: ${reporteFinal.prestamos}\n` +
                          `Pagos: ${reporteFinal.pagos}\n` +
                          `Problemas restantes: ${reporteFinal.issues.length}`);
                }, 1000);
            } else {
                showNotification('✅ No se encontraron clientes duplicados', 'success');
            }
        } catch (error) {
            console.error('Error al limpiar duplicados:', error);
            showNotification('❌ Error al limpiar duplicados', 'error');
        }
    }

    async function runSystemDiagnostic() {
        try {
            showNotification('🩺 Ejecutando diagnóstico...', 'info');

            const [integrityReport, clientes, prestamos, pagos] = await Promise.all([
                Storage.verifyDataIntegrity(),
                Storage.getClientes(),
                Storage.getPrestamos(),
                Storage.getPagos()
            ]);

            const changeCount = Storage.getChangeCount ? Storage.getChangeCount() : 0;
            const swSupported = 'serviceWorker' in navigator;
            let swStatus = 'No soportado';
            let cacheStatus = 'No disponible';
            if (swSupported) {
                const registration = await navigator.serviceWorker.getRegistration();
                swStatus = registration ? 'Activo' : 'No registrado';

                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    let entryCount = 0;
                    for (const cacheName of cacheNames) {
                        const cache = await caches.open(cacheName);
                        const keys = await cache.keys();
                        entryCount += keys.length;
                    }
                    cacheStatus = `${cacheNames.length} cache(s), ${entryCount} recurso(s)`;
                }
            }

            let localStorageBytes = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key) || '';
                localStorageBytes += key.length + value.length;
            }

            let quotaText = 'No disponible';
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                if (estimate && estimate.quota) {
                    const usedMb = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
                    const quotaMb = (estimate.quota / (1024 * 1024)).toFixed(2);
                    quotaText = `${usedMb} MB / ${quotaMb} MB`;
                }
            }

            const issuesText = integrityReport.issues.length > 0
                ? integrityReport.issues.join('\n- ')
                : 'Sin problemas detectados';

            alert(
                `🩺 DIAGNÓSTICO DEL SISTEMA\n\n` +
                `Estado SW: ${swStatus}\n` +
                `Clientes: ${clientes.length}\n` +
                `Préstamos: ${prestamos.length}\n` +
                `Pagos: ${pagos.length}\n` +
                `Cambios registrados: ${changeCount}\n` +
                `Uso localStorage: ${(localStorageBytes / 1024).toFixed(2)} KB\n` +
                `Uso de almacenamiento: ${quotaText}\n\n` +
                `Cache Storage: ${cacheStatus}\n\n` +
                `Integridad:\n- ${issuesText}`
            );

            showNotification('✅ Diagnóstico completado', 'success');
        } catch (error) {
            console.error('Error en diagnóstico:', error);
            showNotification('❌ Error al ejecutar diagnóstico', 'error');
        }
    }

    /**
     * Actualiza el estado del respaldo en la UI
     */
    async function updateBackupStatus() {
        const clientes = await Storage.getClientes();
        const prestamos = await Storage.getPrestamos();
        const pagos = await Storage.getPagos();
        const lastBackup = localStorage.getItem('mindset_last_backup');
        const changeCount = Storage.getChangeCount ? Storage.getChangeCount() : 0;

        document.getElementById('statusClientes').textContent = clientes.length;
        document.getElementById('statusPrestamos').textContent = prestamos.filter(p => p.estado === 'activo').length;
        document.getElementById('statusPagos').textContent = pagos.length;
        const statusCambios = document.getElementById('statusCambios');
        if (statusCambios) {
            statusCambios.textContent = changeCount;
        }

        if (lastBackup) {
            const fecha = new Date(lastBackup);
            const ahora = new Date();
            const diffDias = Math.floor((ahora - fecha) / (1000 * 60 * 60 * 24));
            
            if (diffDias === 0) {
                document.getElementById('statusUltimoBackup').textContent = 'Hoy';
            } else if (diffDias === 1) {
                document.getElementById('statusUltimoBackup').textContent = 'Hace 1 día';
            } else {
                document.getElementById('statusUltimoBackup').textContent = `Hace ${diffDias} días`;
            }
        } else {
            document.getElementById('statusUltimoBackup').textContent = 'Nunca';
        }
    }

    // API Pública
    return {
        init,
        getProfile,
        deleteGoal,
        toggleGoal
    };
})();
