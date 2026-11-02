import { LightningElement, api } from 'lwc';

export default class AadharCardVerification extends LightningElement {
    @api verificationData; // Already the aadhar_card_comparison array
    
    comparisonRecords = [];
    matchedFields = 0;
    totalFields = 0;
    partialMatches = 0;
    overallStatus = 'Mismatch';

    connectedCallback() {
        this.processVerificationData();
    }

    processVerificationData() {
        if (!this.verificationData || this.verificationData.length === 0) {
            this.comparisonRecords = [];
            this.totalFields = 0;
            return; 
        }

        this.totalFields = this.verificationData.length;
        this.matchedFields = 0;
        this.partialMatches = 0;

        // Process each comparison record
        this.comparisonRecords = this.verificationData.map(record => {
            const matchPercentage = parseFloat(record.match_percentage || 0);
            let statusVariant = 'error';
            let statusIcon = 'utility:close';
            
            if (matchPercentage === 100) {
                statusVariant = 'success';
                statusIcon = 'utility:check';
                this.matchedFields++;
            } else if (matchPercentage >= 70) {
                statusVariant = 'warning';
                statusIcon = 'utility:warning';
                this.partialMatches++;
            }

            return {
                id: record.field,
                fieldName: record.field,
                aadharCardValue: record.aadhar_card_value || 'Not Provided',
                applicationValue: record.application_record_value || 'Not Provided',
                matchPercentage: matchPercentage.toFixed(2) + '%',
                matchPercentageValue: matchPercentage,
                statusVariant: statusVariant,
                statusIcon: statusIcon,
                isNotProvided: record.application_record_value === 'Not Provided'
            };
        });

        if (this.matchedFields === this.totalFields) {
            this.overallStatus = 'Match';
        } else if (this.partialMatches > 0) {
            this.overallStatus = 'Partial';
        } else {
            this.overallStatus = 'Mismatch';
        }
    }

    get headerText() {
        return `${this.matchedFields}/${this.totalFields} Fields Matched`;
    }

    get statusClass() {
        return this.overallStatus === 'Match' ? 'status-badge match' : 
               this.overallStatus === 'Partial' ? 'status-badge partial' : 
               'status-badge mismatch';
    }

    get containerClass() {
        return this.overallStatus === 'Match' ? 'verification-container success-border' : 
               this.overallStatus === 'Partial' ? 'verification-container warning-border' : 
               'verification-container error-border';
    }
}