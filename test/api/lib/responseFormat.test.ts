import { formatAvailabilityDetails } from "../../../api/lib/responseFormat";

describe('responseFormat', () => {
    it('should format availability details', () => {
        const input = [
            {
                courtName: 'Court 1',
                availableSlots: [
                    { start: '08:00', end: '09:00' },
                    { start: '09:00', end: '10:00' },
                ],
            },
            {
                courtName: 'Court 2',
                availableSlots: [
                    { start: '08:00', end: '09:00' },
                    { start: '11:00', end: '12:00' },
                ],
            },
        ]
        const result = formatAvailabilityDetails(input)
        expect(result).toBe('เวลาว่าง:08:00-09:00, 09:00-10:00, 11:00-12:00')
    })
})
