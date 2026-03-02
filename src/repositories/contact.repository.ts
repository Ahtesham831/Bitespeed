import { Prisma, Contact } from '@prisma/client';
import prisma from '../utils/db';

export class ContactRepository {
    /**
     * Find contacts matching the given email or phone number.
     */
    static async findByEmailOrPhone(email?: string, phoneNumber?: string): Promise<Contact[]> {
        if (!email && !phoneNumber) return [];

        const OR: Prisma.ContactWhereInput[] = [];
        if (email) OR.push({ email });
        if (phoneNumber) OR.push({ phoneNumber });

        return prisma.contact.findMany({
            where: { OR },
        });
    }

    /**
     * Given an array of contact IDs, find the full cluster of related contacts.
     * This includes all primaries and all secondaries linked to those primaries.
     */
    static async findCluster(contactIds: number[], linkedIds: number[]): Promise<Contact[]> {
        // Get all unique root IDs (either id of a primary, or linkedId of a secondary)
        const allIds = new Set([...contactIds, ...linkedIds.filter(id => id !== null)]);
        const idsArray = Array.from(allIds);

        if (idsArray.length === 0) return [];

        // Find all contacts where their ID is in the set OR their linkedId is in the set.
        // This fetches the entire "family" of related contacts.
        return prisma.contact.findMany({
            where: {
                OR: [
                    { id: { in: idsArray } },
                    { linkedId: { in: idsArray } },
                ]
            },
            orderBy: { createdAt: 'asc' }, // Ensure oldest is first
        });
    }

    /**
     * Create a new contact.
     */
    static async createContact(data: Prisma.ContactUncheckedCreateInput): Promise<Contact> {
        return prisma.contact.create({
            data,
        });
    }

    /**
     * Update a list of contacts to be secondary and point to a new primary ID.
     */
    static async updateToSecondary(contactIds: number[], primaryId: number): Promise<void> {
        if (contactIds.length === 0) return;

        await prisma.contact.updateMany({
            where: {
                id: { in: contactIds },
            },
            data: {
                linkedId: primaryId,
                linkPrecedence: 'secondary',
                updatedAt: new Date(),
            },
        });
    }
}
