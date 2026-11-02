import { LightningElement, api } from 'lwc';

export default class DocumentValidationDisplay extends LightningElement {
    _inputJson;

    @api
    set inputJson(value) {
        console.log("inputJson setter triggered. Received:", value);

        this._inputJson = value;
        this.parseInput();   // <-- Ensures JSON is parsed every time Flow updates it
    }

    get inputJson() {
        return this._inputJson;
    }

    documentType = null;
    docData = null;

    parseInput() {
        console.log("parseInput() called");

        try {
            if (!this._inputJson) {
                console.log("No JSON received");
                this.documentType = null;
                this.docData = null;
                return;
            }

            // Convert to JS object if needed
            const parsed = typeof this._inputJson === "string"
                ? JSON.parse(this._inputJson)
                : this._inputJson;

            console.log("Parsed JSON:", parsed);

            // Detect document type
            if (parsed.drivingLicense) {
                this.documentType = "DRIVING_LICENSE";
                this.docData = parsed.drivingLicense;
            }
            else if (parsed.aadhaarCard) {
                this.documentType = "AADHAAR";
                this.docData = parsed.aadhaarCard;
            }
            else if (parsed.passport) {
                this.documentType = "PASSPORT";
                this.docData = parsed.passport;
            }
            else if (parsed.panCard) {
                this.documentType = "PAN";
                this.docData = parsed.panCard;
            }
            else {
                this.documentType = null;
                this.docData = null;
            }

            console.log("Document Type Identified:", this.documentType);

        } catch (error) {
            console.error("JSON Parse Error:", error);
            this.documentType = null;
            this.docData = null;
        }
    }

    // UI getters
    get showNoData() {
        return !this.documentType;
    }

    get isDrivingLicense() {
        return this.documentType === "DRIVING_LICENSE";
    }

    get isAadhaar() {
        return this.documentType === "AADHAAR";
    }

    get isPassport() {
        return this.documentType === "PASSPORT";
    }

    get isPan() {
        return this.documentType === "PAN";
    }
}