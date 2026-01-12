export interface GoogleSheetRow {
    values: string[];
}

export const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
export const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export async function loadGoogleScripts() {
    return new Promise<void>((resolve, reject) => {
        if (typeof window === 'undefined') return resolve();
        if ((window as any).gapi) return resolve();

        const script1 = document.createElement('script');
        script1.src = 'https://apis.google.com/js/api.js';
        script1.async = true;
        script1.defer = true;
        script1.onload = () => {
            (window as any).gapi.load('client', async () => {
                await (window as any).gapi.client.init({
                    discoveryDocs: [DISCOVERY_DOC],
                });
                gapiInited = true;
                if (gisInited) resolve();
            });
        };
        script1.onerror = reject;
        document.body.appendChild(script1);

        const script2 = document.createElement('script');
        script2.src = 'https://accounts.google.com/gsi/client';
        script2.async = true;
        script2.defer = true;
        script2.onload = () => {
            gisInited = true;
            if (gapiInited) resolve();
        };
        script2.onerror = reject;
        document.body.appendChild(script2);
    });
}

export async function initializeGoogleAuth(clientId: string) {
    if (!clientId) throw new Error('Google Client ID is missing. Please add it in Settings > Integrations.');

    await loadGoogleScripts();

    return new Promise((resolve) => {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: GOOGLE_SHEETS_SCOPE,
            callback: async (resp: any) => {
                if (resp.error) {
                    throw resp;
                }
                resolve(resp.access_token);
            },
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
}

export async function appendToSheet(spreadsheetId: string, range: string, values: string[][]) {
    if (!gapiInited) throw new Error('Google API not initialized');

    try {
        const response = await (window as any).gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: values,
            },
        });
        return response;
    } catch (err) {
        console.error('Error appending to sheet:', err);
        throw err;
    }
}
