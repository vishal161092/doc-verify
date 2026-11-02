import { LightningElement, api } from 'lwc';

export default class DrivingLicenseValidation2 extends LightningElement {
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

    get daysRemainingText() {
        const days = this.data?.expiry?.daysRemaining;
        if (days === null || days === undefined) return 'N/A';
        if (days < 0) return `Expired ${Math.abs(days)} days ago`;
        return `${days} days`;
    }

    get expiryStatusClass() {
        return this.data?.expiry?.isValid ? 'success-text' : 'error-text';
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