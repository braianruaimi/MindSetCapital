/**
 * Módulo: Gestión de Perfil de Usuario
 * Maneja datos personales, capital, metas y frases motivacionales
 */

const PerfilModule = (() => {
    let profileData = null;

    /**
     * Inicializa el módulo de perfil
     */
    function init() {
        loadProfile();
        setupEventListeners();
        displayProfile();
    }

    /**
     * Carga el perfil desde localStorage
     */
    function loadProfile() {
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
            saveProfile();
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
        document.getElementById('btnSaveCapital').addEventListener('click', saveCapital);

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
    function saveCapital() {
        const capitalInput = document.getElementById('editCapital');
        const newCapital = parseFloat(capitalInput.value);

        if (isNaN(newCapital) || newCapital < 0) {
            showNotification('Ingresa un capital válido', 'error');
            return;
        }

        profileData.capital = newCapital;
        saveProfile();

        // Actualizar en config global
        const config = Storage.getConfig();
        config.capitalInicial = newCapital;
        Storage.updateConfig(config);

        displayCapital();
        capitalInput.value = '';
        showNotification('Capital actualizado correctamente', 'success');

        // Actualizar dashboard si está visible
        if (typeof DashboardModule !== 'undefined') {
            DashboardModule.init();
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
    function displayProfile() {
        displayPhoto();
        displayPersonalData();
        displayCapital();
        displayGoals();
        displayQuote();
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
    function displayCapital() {
        const config = Storage.getConfig();
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

    // API Pública
    return {
        init,
        getProfile,
        deleteGoal,
        toggleGoal
    };
})();
