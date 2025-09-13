import banksData from './banks.json'

export type BankMetaData = {
    bankId: string;
    code: string;
    color?: string;
    official_name: string;
    display_name_th: string;
    display_name_en: string;
    swift_code?: string;
    showing: boolean;
};


export const BANK_CODE_TO_BAK_ID_MAP = Object.entries(banksData.th).reduce((acc, [key, value]) => {
    acc[value.code] = key;
    return acc;
}, {} as Record<string, string>);

export const getBankInfoByBankCode = (code: string): BankMetaData | undefined => {
    const entry = Object.entries(banksData.th).find(([key, value]) => (value as BankMetaData).code === code);
    return entry ? {
        ...entry[1] as BankMetaData,
        bankId: entry[0],
    } : undefined;
}

export const getBankIconFromBankCode = (bankCode: string) => {
    const bankId = BANK_CODE_TO_BAK_ID_MAP[bankCode];
    return bankId ? getBankIcon(bankId) : undefined;
}

export const getBankIcon = (bankId: string) => {
    return `https://kaojai.ai/banks/th/${bankId.toUpperCase()}.png`
}
