import { Database } from "@kaojai-ai/db-schema";

export type ResourceStatus = Database['public']['Enums']['resource_status'];

export interface Tenant {
    id: string;
    name: string;
    type?: string | null;
    description?: string | null;
    created_at: string;
}

export interface TenantMemberInfo {
    id: string;
    email: string;
    name?: string;
    role: string;
    status?: string;
    joinedAt?: string;
    lastActive?: string;
}

export interface BasePluginConfig {
    pluginId: string;
}

export interface MatchdayPluginConfig extends BasePluginConfig {
    pluginId: 'matchday';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PluginConfig = any & MatchdayPluginConfig;

export interface BankAccount {
    bankId: string;
    bankCode: string;
    accountNameTH?: string;
    accountNameEN?: string;
    accountNumber: string;
    bankRef1?: string;
    bankRef2?: string;
    bankRef3?: string;
}

export type OutputChannelReplyEmail = {
    outputId: string;
    config: {
        targetEmail: string;
    };
}

export type OutputChannelGgSheet = {
    outputId: string;
    config: {
        googleSheetWebhookUrl: string;
    };
}

export type CheckSlipOutputChannel = OutputChannelReplyEmail | OutputChannelGgSheet;

export type GmailConfig = {
    email: string;
    refreshToken: string;
}

export interface CheckSlipTenantConfig {
    tenantId: string;
    status: ResourceStatus;
    checkDuplicate: boolean;
    integrations: PluginConfig[];
    enabledEntrypointChannels: string[];
    enabledIntegrations: string[];
    bankAccounts: BankAccount[];
    outputChannels: CheckSlipOutputChannel[];
    useAiSlipExtractor?: boolean;
    lineWebhook?: {
        userIds: string[];
    },
    email: {
        keywords?: string[];
        imap: {
            host: string;
            port: number;
            secure: boolean;
            auth: 'password' | 'oauth';
            user: string;
            password?: string;
            mailbox?: string;
        };
        gmail?: GmailConfig;
        smtp: {
            host: string;
            port: number;
            secure: boolean;
            auth: 'password' | 'oauth';
            user: string;
            password?: string;
            from: string;
        };
    };
}

export interface TenantConfig {
    tenantId: string;
    status: ResourceStatus;
    enabledModules: string[];
}

