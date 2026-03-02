import { IdentityService } from '../src/services/identity.service';
import { ContactRepository } from '../src/repositories/contact.repository';
import { Contact } from '@prisma/client';

jest.mock('../src/repositories/contact.repository');

describe('IdentityService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockDate1 = new Date('2023-01-01T00:00:00Z');
    const mockDate2 = new Date('2023-02-01T00:00:00Z');

    const createContact = (id: number, email: string | null, phone: string | null, linkPrecedence: 'primary' | 'secondary', linkedId: number | null, createdAt: Date): Contact => ({
        id, email, phoneNumber: phone, linkPrecedence, linkedId, createdAt, updatedAt: createdAt, deletedAt: null
    });

    it('Case 1: No Existing Contact', async () => {
        (ContactRepository.findByEmailOrPhone as jest.Mock).mockResolvedValue([]);
        (ContactRepository.createContact as jest.Mock).mockResolvedValue(
            createContact(1, 'test@example.com', '123', 'primary', null, mockDate1)
        );

        const result = await IdentityService.reconcile('test@example.com', '123');

        expect(ContactRepository.createContact).toHaveBeenCalledWith({
            email: 'test@example.com',
            phoneNumber: '123',
            linkPrecedence: 'primary'
        });

        expect(result.contact).toEqual({
            primaryContactId: 1,
            emails: ['test@example.com'],
            phoneNumbers: ['123'],
            secondaryContactIds: []
        });
    });

    it('Case 2: Matching Contact Exists (New Info -> New Secondary)', async () => {
        const existingPrimary = createContact(1, 'lorraine@hillvalley.edu', '123456', 'primary', null, mockDate1);

        (ContactRepository.findByEmailOrPhone as jest.Mock).mockResolvedValue([existingPrimary]);
        (ContactRepository.findCluster as jest.Mock).mockResolvedValue([existingPrimary]);

        const newSecondary = createContact(23, 'mcfly@hillvalley.edu', '123456', 'secondary', 1, mockDate2);
        (ContactRepository.createContact as jest.Mock).mockResolvedValue(newSecondary);

        const result = await IdentityService.reconcile('mcfly@hillvalley.edu', '123456');

        expect(ContactRepository.createContact).toHaveBeenCalledWith({
            email: 'mcfly@hillvalley.edu',
            phoneNumber: '123456',
            linkPrecedence: 'secondary',
            linkedId: 1,
        });

        expect(result.contact).toEqual({
            primaryContactId: 1,
            emails: ['lorraine@hillvalley.edu', 'mcfly@hillvalley.edu'],
            phoneNumbers: ['123456'],
            secondaryContactIds: [23]
        });
    });

    it('Case 3: Two Primaries Need Merging', async () => {
        const primary1 = createContact(11, 'doc@brown.com', '999', 'primary', null, mockDate1);
        const primary2 = createContact(22, 'marty@mcfly.com', '888', 'primary', null, mockDate2);

        (ContactRepository.findByEmailOrPhone as jest.Mock).mockResolvedValue([primary1, primary2]);
        (ContactRepository.findCluster as jest.Mock).mockResolvedValue([primary1, primary2]);
        (ContactRepository.updateToSecondary as jest.Mock).mockResolvedValue(undefined);

        const result = await IdentityService.reconcile('doc@brown.com', '888');

        // Should merge 22 into 11
        expect(ContactRepository.updateToSecondary).toHaveBeenCalledWith([22], 11);

        expect(result.contact).toEqual({
            primaryContactId: 11,
            emails: ['doc@brown.com', 'marty@mcfly.com'],
            phoneNumbers: ['999', '888'],
            secondaryContactIds: [22]
        });
    });

    it('Case 4: Exact Duplicate Request', async () => {
        const existingPrimary = createContact(1, 'lorraine@hillvalley.edu', '123456', 'primary', null, mockDate1);
        const existingSecondary = createContact(23, 'mcfly@hillvalley.edu', '123456', 'secondary', 1, mockDate2);

        (ContactRepository.findByEmailOrPhone as jest.Mock).mockResolvedValue([existingPrimary, existingSecondary]);
        (ContactRepository.findCluster as jest.Mock).mockResolvedValue([existingPrimary, existingSecondary]);

        const result = await IdentityService.reconcile('mcfly@hillvalley.edu', '123456');

        // Should NOT create or update
        expect(ContactRepository.createContact).not.toHaveBeenCalled();
        expect(ContactRepository.updateToSecondary).not.toHaveBeenCalled();

        expect(result.contact).toEqual({
            primaryContactId: 1,
            emails: ['lorraine@hillvalley.edu', 'mcfly@hillvalley.edu'],
            phoneNumbers: ['123456'],
            secondaryContactIds: [23]
        });
    });
});
