import client from './client';

export interface BotConfig {
  enabled: boolean;
  config: Record<string, any>;
}

export type BotConfigs = Record<'welcome' | 'autorole' | 'automod', BotConfig>;

export const botsApi = {
  getConfigs: (serverId: string) =>
    client.get<BotConfigs>(`/servers/${serverId}/bots`).then(r => r.data),
  setConfig: (serverId: string, type: string, enabled: boolean, config: Record<string, any>) =>
    client.put<BotConfigs>(`/servers/${serverId}/bots/${type}`, { enabled, config }).then(r => r.data),
};
