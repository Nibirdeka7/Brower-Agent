export type GoogleUserType = {
    id: string;
    displayName: string;
    name: {
        familyName: string;
        givenName: string;
    };
    emails: Array<{value: string; verified: boolean;}>;
    photos: Array<{value: string}>;
    provider: string;
    _json: {
        sub: string;
        name: string;
        given_name: string;
        family_name: string;
        email: string;
        email_verified: boolean;
        picture: string;
    };
};