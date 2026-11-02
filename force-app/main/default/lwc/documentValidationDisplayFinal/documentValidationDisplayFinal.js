import { LightningElement, api } from 'lwc';

export default class DocumentValidationDisplayFinal extends LightningElement {
    @api documentResponse;
    @api height = '800';
    
    documentData = null;
    documentKey = '';
    documentTitle = '';
    hasError = false;
    errorMessage = '';
    documentId = '';

    connectedCallback() {
        this.parseDocumentResponse();
    }

    @api
    get responseData() {
        return this.documentResponse;
    }

    set responseData(value) {
        this.documentResponse = value;
        this.parseDocumentResponse();
    }

    parseDocumentResponse() {
        try {
            if (!this.documentResponse) {
                this.hasError = true;
                this.errorMessage = 'No document data provided';
                return;
            }

            const parsed = typeof this.documentResponse === 'string' 
                ? JSON.parse(this.documentResponse) 
                : this.documentResponse;

            this.documentKey = Object.keys(parsed)[0];
            this.documentData = parsed[this.documentKey];
            this.documentTitle = this.documentData.title || 'Document Validation';
            this.documentId = `DOC_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            
            this.hasError = false;
        } catch (error) {
            this.hasError = true;
            this.errorMessage = 'Error parsing document data: ' + error.message;
            console.error('Parse error:', error);
        }
    }

    get isApproved() {
        return this.documentData?.status === 'APPROVED';
    }

    get isRejected() {
        return this.documentData?.status === 'REJECTED';
    }

    get isMissing() {
        return this.documentData?.status === 'MISSING';
    }

    get statusClass() {
        if (this.isApproved) return 'status-approved';
        if (this.isRejected) return 'status-rejected';
        if (this.isMissing) return 'status-missing';
        return '';
    }

    get headerMessage() {
        if (this.isApproved) return 'VALIDATION PASSED';
        if (this.isRejected) return 'VALIDATION FAILED';
        if (this.isMissing) return 'DOCUMENT MISSING';
        return 'VALIDATION STATUS';
    }

    get headerSubMessage() {
        const flags = [];
        if (this.documentData?.flags?.isExpired) flags.push('expired');
        if (this.documentData?.flags?.isIncomplete) flags.push('incomplete');
        if (this.documentData?.flags?.isBlurred) flags.push('blurred');
        
        if (flags.length > 0) {
            return `Document ${flags.join(' and ')}`;
        }
        return this.isApproved ? 'All validations passed successfully' : 'Review issues below';
    }

    get statusBadges() {
        const badges = [];
        if (this.documentData?.flags?.isExpired) badges.push({ label: 'EXPIRED', variant: 'error' });
        if (this.documentData?.flags?.isIncomplete) badges.push({ label: 'INCOMPLETE', variant: 'error' });
        if (this.documentData?.flags?.isBlurred) badges.push({ label: 'BLURRED', variant: 'warning' });
        if (this.documentData?.flags?.isBlank) badges.push({ label: 'BLANK', variant: 'error' });
        return badges;
    }

    get qualityScore() {
        return this.documentData?.quality?.isReadable ? 
            `${100 - (this.documentData.quality.blurScore * 100)}%` : '0%';
    }

    get confidenceScore() {
        return `${this.documentData?.confidence || 0}%`;
    }

    get completenessScore() {
        return `${this.documentData?.completeness?.percentage || 0}%`;
    }

    get issues() {
        const allIssues = [];
        
        // Add validation issues
        if (this.documentData?.flags?.isExpired) {
            allIssues.push({
                key: 'validity',
                title: 'VALIDITY',
                message: `Document expired on ${this.documentData?.expiry?.expiryDate || 'N/A'}`,
                severity: 'CRITICAL'
            });
        }

        // Add completeness issues
        if (this.documentData?.flags?.isIncomplete) {
            const missingFields = this.documentData?.completeness?.missingFields || [];
            if (missingFields.length > 0) {
                allIssues.push({
                    key: 'completeness',
                    title: 'COMPLETENESS',
                    message: `${missingFields.join(', ')} ${missingFields.length > 1 ? 'are' : 'is'} missing or unclear`,
                    severity: 'CRITICAL'
                });
            }
        }

        // Add quality issues
        if (this.documentData?.flags?.isBlurred || !this.documentData?.quality?.isReadable) {
            allIssues.push({
                key: 'quality',
                title: 'QUALITY',
                message: 'Address partially unreadable',
                severity: 'MEDIUM'
            });
        }

        // Add custom issues from response
        if (this.documentData?.issues && this.documentData.issues.length > 0) {
            this.documentData.issues.forEach((issue, idx) => {
                if (!allIssues.some(i => i.message === issue)) {
                    allIssues.push({
                        key: `issue_${idx}`,
                        title: 'ISSUE',
                        message: issue,
                        severity: 'CRITICAL'
                    });
                }
            });
        }

        return allIssues;
    }

    get hasIssues() {
        return this.issues.length > 0;
    }

    get issuesCount() {
        return this.issues.length;
    }

    get expiryDetails() {
        if (!this.documentData?.expiry) return null;
        
        return {
            issueDate: this.documentData.expiry.issueDate || 'N/A',
            expiryDate: this.documentData.expiry.expiryDate || 'N/A',
            daysExpired: this.documentData.expiry.daysRemaining < 0 ? 
                Math.abs(this.documentData.expiry.daysRemaining) : null,
            isExpired: !this.documentData.expiry.isValid,
            warningMessage: !this.documentData.expiry.isValid ? 
                'Expired document cannot be verified' : null
        };
    }

    get completenessDetails() {
        return {
            percentage: this.documentData?.completeness?.percentage || 0,
            progressClass: this.getProgressClass(this.documentData?.completeness?.percentage || 0),
            missingFields: this.documentData?.completeness?.missingFields || [],
            unreadableFields: ['Address Line 2'] // Can be dynamic based on quality flags
        };
    }

    get hasMissingFields() {
        return this.completenessDetails.missingFields.length > 0;
    }

    get hasUnreadableFields() {
        return this.completenessDetails.unreadableFields.length > 0;
    }

    get extractedFields() {
        if (!this.documentData?.extractedData) return [];
        
        return Object.entries(this.documentData.extractedData).map(([key, value]) => ({
            key: key,
            label: this.formatFieldLabel(key),
            value: value || 'N/A',
            cssClass: 'field-box'
        }));
    }

    get gridFields() {
        const fields = this.extractedFields;
        const rows = [];
        for (let i = 0; i < fields.length; i += 2) {
            rows.push({
                key: `row_${i}`,
                left: fields[i],
                right: fields[i + 1] || null
            });
        }
        return rows;
    }

    getProgressClass(percentage) {
        if (percentage >= 80) return 'progress-success';
        if (percentage >= 50) return 'progress-warning';
        return 'progress-error';
    }

    formatFieldLabel(key) {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    get containerHeight() {
        return `max-height: ${this.height}px;`;
    }

    handleUploadAnother() {
        // Dispatch event to parent component/flow
        this.dispatchEvent(new CustomEvent('uploadanother', {
            detail: { documentKey: this.documentKey }
        }));
    }
}