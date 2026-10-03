// src/services/appSettingsService.ts
import { supabase } from '../lib/supabase';

export interface AppSettings {
    app_name: string;
    app_version: string;
    maintenance_mode: boolean;
    allow_registrations: boolean;
    default_user_role: string;
    session_timeout: number;
    max_file_size_mb: number;
    allowed_file_types: string[];
}

class AppSettingsService {
    private cache: AppSettings | null = null;
    private cacheTimestamp: number = 0;
    private CACHE_DURATION = 60000; // 1 minute

    async getAppSettings(): Promise<AppSettings> {
        // Vérifier le cache
        if (this.cache && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION) {
            return this.cache;
        }

        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .limit(1)
                .single();

            if (error) throw error;

            const settings: AppSettings = {
                app_name: data.app_name || 'Afri SafeTrack',
                app_version: data.app_version || '1.0.0',
                maintenance_mode: data.maintenance_mode || false,
                allow_registrations: data.allow_registrations || true,
                default_user_role: data.default_user_role || 'user',
                session_timeout: data.session_timeout || 30,
                max_file_size_mb: data.max_file_size_mb || 50,
                allowed_file_types: data.allowed_file_types || ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png']
            };

            this.cache = settings;
            this.cacheTimestamp = Date.now();
            return settings;
        } catch (error) {
            console.error('Error loading app settings:', error);
            // Retourner les valeurs par défaut en cas d'erreur
            return {
                app_name: 'Afri SafeTrack',
                app_version: '1.0.0',
                maintenance_mode: false,
                allow_registrations: true,
                default_user_role: 'user',
                session_timeout: 30,
                max_file_size_mb: 50,
                allowed_file_types: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png']
            };
        }
    }

    async updateAppSettings(settings: Partial<AppSettings>): Promise<void> {
        try {
            const { error } = await supabase
                .from('app_settings')
                .update({
                    ...settings,
                    updated_at: new Date().toISOString()
                })
                .eq('id', (await this.getAppSettingsId()));

            if (error) throw error;

            // Invalider le cache
            this.cache = null;
            this.cacheTimestamp = 0;
        } catch (error) {
            console.error('Error updating app settings:', error);
            throw error;
        }
    }

    private async getAppSettingsId(): Promise<string> {
        const { data, error } = await supabase
            .from('app_settings')
            .select('id')
            .limit(1)
            .single();

        if (error) throw error;
        return data.id;
    }

    invalidateCache(): void {
        this.cache = null;
        this.cacheTimestamp = 0;
    }
}

export const appSettingsService = new AppSettingsService();
