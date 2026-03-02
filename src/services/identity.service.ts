import { Contact } from '@prisma/client';
import { ContactRepository } from '../repositories/contact.repository';
import { IdentifyResponse } from '../types';

export class IdentityService {
    static async reconcile(email?: string, phoneNumber?: string): Promise<IdentifyResponse> {
        const contacts = await ContactRepository.findByEmailOrPhone(email, phoneNumber);

        // Case 1: No Existing Contact
        if (contacts.length === 0) {
            const newContact = await ContactRepository.createContact({
                email,
                phoneNumber,
                linkPrecedence: 'primary',
            });

            return {
                contact: {
                    primaryContactId: newContact.id,
                    emails: newContact.email ? [newContact.email] : [],
                    phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
                    secondaryContactIds: [],
                },
            };
        }

        // Existing contacts found, find the full cluster
        const ids = contacts.map(c => c.id);
        const linkedIds = contacts.map(c => c.linkedId).filter((id): id is number => id !== null);

        // Fetch the full cluster of related contacts
        const cluster = await ContactRepository.findCluster(ids, linkedIds);

        // Identify all primaries in the cluster
        const primaries = cluster.filter(c => c.linkPrecedence === 'primary');

        // Sort primaries to find the oldest
        primaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        // If no primary exists in cluster (shouldn't happen with correct data, but fallback)
        const truePrimary = primaries.length > 0 ? primaries[0] : cluster.reduce((oldest, current) =>
            current.createdAt < oldest.createdAt ? current : oldest
        );

        // Handle merge: Two Primaries Need Merging
        const newerPrimaries = primaries.slice(1);
        const contactsToUpdate: number[] = [];

        if (newerPrimaries.length > 0) {
            for (const p of newerPrimaries) {
                contactsToUpdate.push(p.id);
                // Also update any secondary that was pointing to this newer primary
                const attachedSecondaries = cluster.filter(c => c.linkedId === p.id);
                contactsToUpdate.push(...attachedSecondaries.map(s => s.id));
            }
        }

        if (contactsToUpdate.length > 0) {
            await ContactRepository.updateToSecondary(contactsToUpdate, truePrimary.id);

            // Update our local cluster objects so we construct the correct response
            for (const c of cluster) {
                if (contactsToUpdate.includes(c.id)) {
                    c.linkPrecedence = 'secondary';
                    c.linkedId = truePrimary.id;
                }
            }
        }

        // Check if new info is provided (Matching Contact Exists)
        const clusterEmails = new Set(cluster.map(c => c.email).filter(Boolean));
        const clusterPhones = new Set(cluster.map(c => c.phoneNumber).filter(Boolean));

        let createdSecondary: Contact | null = null;
        const hasNewEmail = email && !clusterEmails.has(email);
        const hasNewPhone = phoneNumber && !clusterPhones.has(phoneNumber);

        // Only create a new secondary if there is actually new information that doesn't exist in the cluster
        // and we aren't just sending existing pairs. Wait, if both email AND phone are missing from cluster?
        // The requirement says: "If an incoming request has either of phoneNumber or email common to an existing contact but contains new information, the service will create a secondary"
        // So if email or phone is completely novel, we add it.

        if (hasNewEmail || hasNewPhone) {
            // Don't create if both match something across the cluster but from different rows? 
            // i.e., exact duplicate request. If email is in cluster AND phone is in cluster, it's not new info.
            createdSecondary = await ContactRepository.createContact({
                email,
                phoneNumber,
                linkPrecedence: 'secondary',
                linkedId: truePrimary.id,
            });
            cluster.push(createdSecondary);
        }

        // Prepare response
        const finalEmails = new Set<string>();
        const finalPhones = new Set<string>();
        const secondaryContactIds: number[] = [];

        // Primary first
        if (truePrimary.email) finalEmails.add(truePrimary.email);
        if (truePrimary.phoneNumber) finalPhones.add(truePrimary.phoneNumber);

        // Then secondaries ordered by createdAt
        const secondaries = cluster.filter(c => c.id !== truePrimary.id);
        secondaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        for (const sec of secondaries) {
            if (sec.email) finalEmails.add(sec.email);
            if (sec.phoneNumber) finalPhones.add(sec.phoneNumber);
            secondaryContactIds.push(sec.id);
        }

        return {
            contact: {
                primaryContactId: truePrimary.id,
                emails: Array.from(finalEmails),
                phoneNumbers: Array.from(finalPhones),
                secondaryContactIds,
            }
        };
    }
}
