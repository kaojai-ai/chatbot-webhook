import { clampText, formatDateForAction, formatDateTitle } from "../../../shared/lib/dateHelper";

describe('dateHelper', () => {
    it('should clamp text', () => {
        const text = 'Hello, world!';
        const maxLength = 5;
        const result = clampText(text, maxLength);
        expect(result).toBe('Hell…');
    });

    it('should format date title', () => {
        const dateStr = '2025-09-17';
        const result = formatDateTitle(dateStr);
        expect(result).toBe('วันพุธที่ 17 ก.ย.');
    });

    it('should format date for action', () => {
        const dateStr = '2025-09-17';
        const result = formatDateForAction(dateStr);
        expect(result).toBe('17 กันยายน 2568');
    });
})
