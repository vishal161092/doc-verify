import { LightningElement, api, track } from 'lwc';
import getValidationJSON from '@salesforce/apex/VerificationController.getValidationJSON';

export default class DocumentValidationDashboard extends LightningElement {
    @api recordId;

    @track documents = [];
    @track currentDoc = null;

    hasData = false;
    isLoading = false;
    hasError = false;
    noData = false;
    errorMessage = '';

    connectedCallback() {
        this.loadDocuments();
    }

    async loadDocuments() {
        this.isLoading = true;
        this.hasError = false;

        try {
            const result = await getValidationJSON({ oppId: this.recordId });

            if (!result) {
                this.noData = true;
                this.hasData = false;
                return;
            }

            const parsed = JSON.parse(result);
            const docs = parsed?.documents || {};

            if (Object.keys(docs).length === 0) {
                this.noData = true;
                this.hasData = false;
                return;
            }

            // Build internal list
            this.prepareDocuments(docs);

            // SET FIRST DOCUMENT INTO currentDoc → REQUIRED BY YOUR HTML
            this.currentDoc = this.buildViewModel(this.documents[0]);

            this.hasData = true;

        } catch (err) {
            this.hasError = true;
            this.errorMessage = err?.message || 'Error loading validation details';
            this.hasData = false;

        } finally {
            this.isLoading = false;
        }
    }

    prepareDocuments(docMap) {
        this.documents = Object.keys(docMap).map(key => {
            const d = docMap[key];

            return {
                key,
                title: d.title || key,
                status: d.status,
                flags: d.flags || {},
                completeness: d.completeness || {},
                expiry: d.expiry || {},
                extractedData: d.extractedData || {}
            };
        });
    }

    // 🔥 Convert your raw document → UI model expected by HTML
    buildViewModel(doc) {
        return {
            label: doc.title,
            documentType: doc.title,
            icon: "utility:description",

            timestamp: "Just now",

            statusLabel: doc.status,
            statusIcon:
                doc.status === "APPROVED" ? "utility:success" :
                doc.status === "REJECTED" ? "utility:error" : "utility:warning",

            statusClass:
                doc.status === "APPROVED" ? "status-approved" :
                doc.status === "REJECTED" ? "status-rejected" : "status-pending",

            metrics: [
                { label: "Completeness", value: doc.completeness?.percentage + "%" },
                { label: "Flags", value: Object.keys(doc.flags).length }
            ],

            flags: Object.keys(doc.flags).map(f => ({
                label: f,
                value: doc.flags[f] ? "Yes" : "No",
                icon: doc.flags[f] ? "utility:error" : "utility:success",
                css: doc.flags[f] ? "pill-warning" : "pill-safe"
            })),

            expiry: {
                issueDate: doc.expiry?.issueDate,
                expiryDate: doc.expiry?.expiryDate,
                daysExpired: doc.expiry?.daysRemaining
            },

            completeness: {
                percentage: doc.completeness?.percentage || 0,
                missingFields: doc.completeness?.missingFields || []
            },

            extracted: Object.keys(doc.extractedData).map(k => ({
                label: k,
                value: doc.extractedData[k]
            }))
        };
    }
}