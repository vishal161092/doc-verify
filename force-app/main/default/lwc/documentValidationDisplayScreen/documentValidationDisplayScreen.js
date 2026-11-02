import { LightningElement, api } from 'lwc';

export default class DocumentValidationDisplayScreen extends LightningElement {
    @api documentResponse; 
    
    documentType = '';
    documentData = null;
    hasData = false;
    parsedOnce = false; // prevent infinite loops

    @api
    get response() {
        return this.documentResponse;
    }

    set response(value) {
        this.documentResponse = value;
        this.parseDocumentResponse();
    }

    connectedCallback() {
        console.log('connectedCallback - documentResponse:', this.documentResponse);
        this.parseDocumentResponse();
    }

    renderedCallback() {
        if (this.documentResponse && !this.parsedOnce) {
            console.log('renderedCallback - documentResponse changed:', this.documentResponse);
            this.parseDocumentResponse();
        }
    }

    // ⭐ SAFE JSON PARSER (fixes "-b", BOM, stray chars)
    cleanAndParseJSON(input) {
        if (!input) return null;
    
        try {
            if (typeof input !== 'string') {
                return input; // already object
            }
    
            console.log('Raw input before cleaning:', input);
    
            let cleaned = input.trim();
    
            // 1. Remove junk before first {
            cleaned = cleaned.replace(/^[^\{]*/, '');
    
            // 2. Remove BOM
            cleaned = cleaned.replace(/^\uFEFF/, '');
    
            // ⭐ 3. Fix Flow's escaped JSON format
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                console.log('Flow escaped JSON detected — unescaping');
                cleaned = cleaned.slice(1, -1);  // remove outer quotes
                cleaned = cleaned.replace(/\\"/g, '"'); // unescape inner quotes
            }
    
            console.log('Cleaned JSON string:', cleaned);
    
            return JSON.parse(cleaned);
    
        } catch (error) {
            console.error('Failed to clean/parse JSON:', error);
            console.error('Input was:', input);
            return null;
        }
    }
    

    parseDocumentResponse() {
        console.log('parseDocumentResponse called');
        console.log('Raw documentResponse:', this.documentResponse);

        if (!this.documentResponse || this.parsedOnce) {
            return;
        }

        let data = this.cleanAndParseJSON(this.documentResponse);
        if (!data) {
            this.hasData = false;
            return;
        }

        console.log('Parsed data:', JSON.stringify(data));

        // Detect document type dynamically
        if (data.aadhaarCard) {
            this.documentType = 'aadhaarCard';
            this.documentData = data.aadhaarCard;
        } else if (data.drivingLicense) {
            this.documentType = 'drivingLicense';
            this.documentData = data.drivingLicense;
        } else if (data.passport) {
            this.documentType = 'passport';
            this.documentData = data.passport;
        } else if (data.panCard) {
            this.documentType = 'panCard';
            this.documentData = data.panCard;
        } else {
            console.error('Unknown document type. Keys:', Object.keys(data));
            this.hasData = false;
            return;
        }

        this.hasData = true;
        this.parsedOnce = true;

        console.log('Final documentType:', this.documentType);
        console.log('Final documentData:', this.documentData);
    }

    // Getters
    get isAadhaarCard() {
        return this.documentType === 'aadhaarCard' && this.hasData;
    }

    get isDrivingLicense() {
        return this.documentType === 'drivingLicense' && this.hasData;
    }

    get isPassport() {
        return this.documentType === 'passport' && this.hasData;
    }

    get isPanCard() {
        return this.documentType === 'panCard' && this.hasData;
    }

    get showNoData() {
        return !this.hasData;
    }
}