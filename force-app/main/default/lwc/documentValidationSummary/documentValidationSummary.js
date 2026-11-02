import { LightningElement, api, wire } from 'lwc';
import getValidationJSON from '@salesforce/apex/VerificationController.getValidationJSON';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class DocumentValidationSummary extends LightningElement {
    @api recordId;

    verificationData = null;
    isLoading = true;
    hasError = false;
    errorMessage = '';

    @wire(getValidationJSON, { oppId: '$recordId' })
    wiredVerification({ error, data }) {
        this.isLoading = false;

        if (data) {
            try {
                this.verificationData = JSON.parse(data);
                this.hasError = false;
            } catch (e) {
                this.hasError = true;
                this.errorMessage = 'Failed to parse JSON: ' + e.message;
            }
        } else if (error) {
            this.hasError = true;
            this.errorMessage = error.body?.message || error.message;
        }
    }

    get hasData() {
        return !!this.verificationData && !this.hasError;
    }

    // ---------------- STATUS ----------------
    get verificationStatus() {
        return this.verificationData?.status || 'UNKNOWN';
    }

    get statusIcon() {
        const s = this.verificationData?.status;
        if (s === 'APPROVED') return 'utility:success';
        if (s === 'REJECTED') return 'utility:error';
        return 'utility:warning';
    }

    get statusClass() {
        const s = this.verificationData?.status;
        if (s === 'APPROVED') return 'status-approved';
        if (s === 'REJECTED') return 'status-rejected';
        return 'status-review';
    }

    // ---------------- CONFIDENCE ----------------
    get verificationConfidence() {
        return this.verificationData?.confidence || 0;
    }

    get confidenceClass() {
        const c = this.verificationData?.confidence || 0;
        if (c >= 90) return 'confidence-high';
        if (c >= 70) return 'confidence-medium';
        return 'confidence-low';
    }

    // ---------------- FLAGS ----------------
    get blankFlagLabel() {
        return this.verificationData?.flags?.isBlank ? 'Detected' : 'Clear';
    }

    get blurFlagLabel() {
        return this.verificationData?.flags?.isBlurred ? 'Blurred' : 'Sharp';
    }

    get expiryFlagLabel() {
        return this.verificationData?.flags?.isExpired ? 'Expired' : 'Valid';
    }

    get completenessPercentage() {
        return this.verificationData?.completeness?.percentage || 0;
    }

    get hasMissingFields() {
        return (this.verificationData?.completeness?.missingFields || []).length > 0;
    }

    get missingFieldsArray() {
        return this.verificationData?.completeness?.missingFields || [];
    }

    // ---------------- ISSUE LIST ----------------
    get hasIssues() {
        return (this.verificationData?.issues || []).length > 0;
    }

    get issuesArray() {
        return this.verificationData?.issues || [];
    }

    get issuesLength() {
        return this.issuesArray.length;
    }

    // ---------------- EXPIRY ----------------
    get expiryIssueDate() {
        return this.verificationData?.expiry?.issueDate || 'N/A';
    }

    get expiryDate() {
        return this.verificationData?.expiry?.expiryDate || 'N/A';
    }

    get daysExpired() {
        return this.verificationData?.expiry?.daysExpired ?? 'N/A';
    }

    get expiryBadgeLabel() {
        return this.verificationData?.expiry?.isValid ? 'Valid' : 'Expired';
    }

    get expiryBadgeClass() {
        return this.verificationData?.expiry?.isValid ? 'badge-success' : 'badge-error';
    }

    // ---------------- QUALITY ----------------
    get qualityReadableLabel() {
        return this.verificationData?.quality?.isReadable ? 'Readable' : 'Unreadable';
    }

    get qualityBlurScore() {
        return this.verificationData?.quality?.blurScore;
    }

    // ---------------- EXTRACTED DATA ----------------
    get extractedDataArray() {
        const data = this.verificationData?.extractedData || {};
        return Object.keys(data).map(key => ({
            key,
            label: this.formatLabel(key),
            value: data[key]
        }));
    }

    formatLabel(key) {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    }

    get documentTypeLabel() {
        return this.verificationData?.documentType?.replace('_', ' ') || '';
    }

    get formattedTimestamp() {
        if (!this.verificationData?.timestamp) return '';
        return new Date(this.verificationData.timestamp).toLocaleString();
    }

    // Refresh Logic
    handleRefresh() {
        eval("$A.get('e.force:refreshView').fire();");
    }
}