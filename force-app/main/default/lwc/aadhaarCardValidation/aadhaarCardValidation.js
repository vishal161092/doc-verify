import { LightningElement, api } from 'lwc';

export default class AadhaarCardValidation extends LightningElement {
    @api data;

    get statusClass() {
        return this.data?.status === 'APPROVED' ? 'status-banner success' : 'status-banner error';
    }

    get statusMessage() {
        return this.data?.status === 'APPROVED' ? 'VALIDATION PASSED' : 'VALIDATION FAILED';
    }

    get statusDetail() {
        return this.data?.status === 'APPROVED' 
            ? 'All validations passed successfully' 
            : this.data?.issues?.join(', ') || 'Document validation failed';
    }

    get expiredFlag() {
        return this.data?.flags?.isExpired ? 'Yes' : 'No';
    }

    get expiredClass() {
        return this.data?.flags?.isExpired ? 'flag-box error' : 'flag-box success';
    }

    get completePercentage() {
        return this.data?.completeness?.percentage || 0;
    }

    get qualityPercentage() {
        return this.data?.quality?.isReadable ? 100 : 0;
    }

    get confidenceScore() {
        return this.data?.confidence || 0;
    }

    get progressBarStyle() {
        return `width: ${this.completePercentage}%`;
    }

    get expiryStatus() {
        return this.data?.expiry?.isValid 
            ? 'Aadhaar cards do not expire' 
            : 'Document expired';
    }

    get hasMissingFields() {
        return this.data?.completeness?.missingFields?.length > 0;
    }

    get hasIssues() {
        return this.data?.issues?.length > 0;
    }

    get issueItems() {
        return this.data?.issues || [];
    }

    get missingFieldItems() {
        return this.data?.completeness?.missingFields || [];
    }
}