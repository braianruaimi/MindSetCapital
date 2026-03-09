// ============================================
// CLOUD-SYNC.JS - Sincronizacion con Supabase
// ============================================

const CloudSync = {
    CONFIG_KEY: 'mindset_supabase_config',
    LAST_SYNC_KEY: 'mindset_last_cloud_sync',
    DEBOUNCE_MS: 4000,
    client: null,
    syncTimer: null,

    getConfig() {
        try {
            return JSON.parse(localStorage.getItem(this.CONFIG_KEY) || '{}');
        } catch {
            return {};
        }
    },

    saveConfig(url, anonKey) {
        const config = {
            url: (url || '').trim(),
            anonKey: (anonKey || '').trim()
        };
        localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
        return config;
    },

    isConfigured() {
        const cfg = this.getConfig();
        return Boolean(cfg.url && cfg.anonKey);
    },

    init() {
        if (!window.supabase || !window.supabase.createClient) {
            console.warn('Supabase SDK no cargado.');
            return false;
        }

        const cfg = this.getConfig();
        if (!cfg.url || !cfg.anonKey) {
            return false;
        }

        this.client = window.supabase.createClient(cfg.url, cfg.anonKey);
        window.addEventListener('online', () => {
            this.scheduleSync('online');
        });
        return true;
    },

    ensureClient() {
        if (!this.client) {
            return this.init();
        }
        return true;
    },

    async signUp(email, password) {
        if (!this.ensureClient()) {
            throw new Error('Configura Supabase URL y Anon Key primero');
        }
        const { error } = await this.client.auth.signUp({ email, password });
        if (error) throw error;
        return true;
    },

    async signIn(email, password) {
        if (!this.ensureClient()) {
            throw new Error('Configura Supabase URL y Anon Key primero');
        }
        const { error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return true;
    },

    async signOut() {
        if (!this.client) return true;
        const { error } = await this.client.auth.signOut();
        if (error) throw error;
        return true;
    },

    async getCurrentUser() {
        if (!this.ensureClient()) return null;
        const { data, error } = await this.client.auth.getUser();
        if (error) return null;
        return data.user || null;
    },

    async getStatus() {
        const configured = this.isConfigured();
        let authenticated = false;
        let email = '';

        if (configured) {
            const user = await this.getCurrentUser();
            authenticated = Boolean(user);
            email = user?.email || '';
        }

        return {
            configured,
            authenticated,
            email,
            lastSync: localStorage.getItem(this.LAST_SYNC_KEY)
        };
    },

    normalizeForCloud(items) {
        return (items || []).map(item => ({
            ...item,
            updatedAt: item.updatedAt || new Date().toISOString()
        }));
    },

    getTimestamp(value) {
        const time = new Date(value || 0).getTime();
        return Number.isFinite(time) ? time : 0;
    },

    chooseNewest(localItem, cloudItem) {
        const localTs = this.getTimestamp(localItem?.updatedAt);
        const cloudTs = this.getTimestamp(cloudItem?.updatedAt);
        return localTs >= cloudTs ? localItem : cloudItem;
    },

    mergeByNewest(localItems, cloudItems) {
        const mergedMap = new Map();

        for (const item of this.normalizeForCloud(localItems)) {
            if (!item?.id) continue;
            mergedMap.set(item.id, item);
        }

        for (const item of this.normalizeForCloud(cloudItems)) {
            if (!item?.id) continue;
            const existing = mergedMap.get(item.id);
            if (!existing) {
                mergedMap.set(item.id, item);
            } else {
                mergedMap.set(item.id, this.chooseNewest(existing, item));
            }
        }

        return Array.from(mergedMap.values());
    },

    async upsertCollection(table, userId, items) {
        const rows = this.normalizeForCloud(items).map(item => ({
            user_id: userId,
            id: item.id,
            payload: item,
            updated_at: item.updatedAt
        }));

        if (rows.length === 0) return;

        const { error } = await this.client
            .from(table)
            .upsert(rows, { onConflict: 'user_id,id' });

        if (error) throw error;
    },

    async pushAll() {
        if (!this.ensureClient()) throw new Error('Supabase no inicializado');
        const user = await this.getCurrentUser();
        if (!user) throw new Error('Inicia sesión en la nube primero');

        const [clientes, prestamos, pagos, config] = await Promise.all([
            Storage.getClientes(),
            Storage.getPrestamos(),
            Storage.getPagos(),
            Storage.getConfig()
        ]);

        await this.upsertCollection('clientes', user.id, clientes);
        await this.upsertCollection('prestamos', user.id, prestamos);
        await this.upsertCollection('pagos', user.id, pagos);

        const { error: configError } = await this.client
            .from('config')
            .upsert({
                user_id: user.id,
                payload: { ...config, updatedAt: new Date().toISOString() },
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (configError) throw configError;

        localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
        return true;
    },

    async pullAll() {
        if (!this.ensureClient()) throw new Error('Supabase no inicializado');
        const user = await this.getCurrentUser();
        if (!user) throw new Error('Inicia sesión en la nube primero');

        const [clientesRes, prestamosRes, pagosRes, configRes] = await Promise.all([
            this.client.from('clientes').select('id,payload').eq('user_id', user.id),
            this.client.from('prestamos').select('id,payload').eq('user_id', user.id),
            this.client.from('pagos').select('id,payload').eq('user_id', user.id),
            this.client.from('config').select('payload').eq('user_id', user.id).maybeSingle()
        ]);

        if (clientesRes.error) throw clientesRes.error;
        if (prestamosRes.error) throw prestamosRes.error;
        if (pagosRes.error) throw pagosRes.error;
        if (configRes.error) throw configRes.error;

        const cloudClientes = (clientesRes.data || []).map(row => ({ ...row.payload, id: row.id }));
        const cloudPrestamos = (prestamosRes.data || []).map(row => ({ ...row.payload, id: row.id }));
        const cloudPagos = (pagosRes.data || []).map(row => ({ ...row.payload, id: row.id }));

        const [localClientes, localPrestamos, localPagos, localConfig] = await Promise.all([
            Storage.getClientes(),
            Storage.getPrestamos(),
            Storage.getPagos(),
            Storage.getConfig()
        ]);

        const mergedClientes = this.mergeByNewest(localClientes, cloudClientes);
        const mergedPrestamos = this.mergeByNewest(localPrestamos, cloudPrestamos);
        const mergedPagos = this.mergeByNewest(localPagos, cloudPagos);

        await Storage.set(Storage.KEYS.CLIENTES, mergedClientes);
        await Storage.set(Storage.KEYS.PRESTAMOS, mergedPrestamos);
        await Storage.set(Storage.KEYS.PAGOS, mergedPagos);

        const cloudConfig = configRes.data?.payload || null;
        if (cloudConfig) {
            const mergedConfig = this.chooseNewest(
                { ...localConfig, updatedAt: localConfig?.updatedAt || null },
                { ...cloudConfig, updatedAt: cloudConfig?.updatedAt || null }
            );
            await Storage.set(Storage.KEYS.CONFIG, mergedConfig);
        }

        // Reconciliación final: escribir merge de nuevo a la nube para converger ambos lados.
        await this.upsertCollection('clientes', user.id, mergedClientes);
        await this.upsertCollection('prestamos', user.id, mergedPrestamos);
        await this.upsertCollection('pagos', user.id, mergedPagos);

        const finalConfig = await Storage.getConfig();
        const { error: configError } = await this.client
            .from('config')
            .upsert({
                user_id: user.id,
                payload: { ...finalConfig, updatedAt: finalConfig?.updatedAt || new Date().toISOString() },
                updated_at: finalConfig?.updatedAt || new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (configError) throw configError;

        localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
        return true;
    },

    async syncNow() {
        // Primero sube locales y luego hace merge bidireccional contra nube.
        await this.pushAll();
        await this.pullAll();
        return true;
    },

    scheduleSync(reason = 'change') {
        if (!navigator.onLine) return;
        if (!this.isConfigured()) return;

        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
        }

        this.syncTimer = setTimeout(async () => {
            try {
                const status = await this.getStatus();
                if (status.authenticated) {
                    await this.syncNow();
                    console.log(`☁️ Sync OK (${reason})`);
                }
            } catch (error) {
                console.warn('☁️ Sync falló:', error.message);
            }
        }, this.DEBOUNCE_MS);
    }
};
