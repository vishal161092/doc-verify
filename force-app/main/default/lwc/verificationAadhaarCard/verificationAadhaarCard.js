import { LightningElement, api, track } from 'lwc';

export default class VerificationAadharCard extends LightningElement {
    @api verificationData; // Parent passes aadhar_card_comparison array

    @track comparisonRecords = [];
    matchedFields = 0;
    partialMatches = 0;
    overallStatus = 'Mismatch';

    connectedCallback() {
        this.processVerificationData();
    }

    processVerificationData() {
        console.log('inside this.verificationData');

        if (!this.verificationData || this.verificationData.length === 0) {
            this.comparisonRecords = [];
            this.matchedFields = 0;
            this.partialMatches = 0;
            this.overallStatus = 'Mismatch';
            return;
        }

        this.matchedFields = 0;
        this.partialMatches = 0;

        this.comparisonRecords = this.verificationData.map((rec, idx) => {
            const matchPercentage = parseFloat(rec.match_percentage || 0);
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
            console.log('inside this.verificationData rec.field'+rec.field);
            
            return {
                id: idx,
                fieldName: rec.field,
                aadhaarValue: rec.aadhar_card_value || 'Not Provided',
                applicationValue: rec.application_record_value || 'Not Provided',
                matchPercentage: matchPercentage.toFixed(2) + '%',
                statusVariant: statusVariant,
                statusIcon: statusIcon,
            };
        });

        // Overall status
        if (this.matchedFields === this.comparisonRecords.length) {
            this.overallStatus = 'Match';
        } else if (this.partialMatches > 0) {
            this.overallStatus = 'Partial';
        } else {
            this.overallStatus = 'Mismatch';
        }
    }

    get headerText() {
        return `${this.matchedFields}/${this.comparisonRecords.length} Fields Matched${
            this.partialMatches > 0 ? ' (' + this.partialMatches + ' Partial)' : ''
        }`;
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