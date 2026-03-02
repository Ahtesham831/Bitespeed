export interface IdentifyRequest {
    email?: string;
    phoneNumber?: string;
}

export interface ContactData {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
}

export interface IdentifyResponse {
    contact: ContactData;
}
