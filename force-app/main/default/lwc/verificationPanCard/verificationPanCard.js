import { LightningElement, api, track } from 'lwc';

export default class VerificationPanCard extends LightningElement {
    @api verificationData; // array pan_card_comparison

    @track comparisonRecords = [];
    matchedFields = 0;
    partialMatches = 0;
    overallStatus = 'Mismatch';

    connectedCallback() {
        this.processVerificationData();
    }

    processVerificationData() {
        if (!this.verificationData || this.verificationData.length === 0) return;

        this.matchedFields = 0;
        this.partialMatches = 0;

        this.comparisonRecords = this.verificationData.map((rec, idx) => {
            let statusVariant = 'error';
            let statusIcon = 'utility:close';

            if (rec.match_percentage === 100) {
                statusVariant = 'success';
                statusIcon = 'utility:check';
                this.matchedFields++;
            } else if (rec.match_percentage >= 70) {
                statusVariant = 'warning';
                statusIcon = 'utility:warning';
                this.partialMatches++;
            }

            return {
                id: idx,
                fieldName: rec.field,
                panValue: rec.pan_card_value || 'Not Provided', // matches HTML
                appValue: rec.application_record_value || 'Not Provided',
                matchPercentage: rec.match_percentage.toFixed(2) + '%',
                statusVariant: statusVariant,
                statusIcon: statusIcon,
            };
        });

        if (this.matchedFields === this.comparisonRecords.length) {
            this.overallStatus = 'Match';
        } else if (this.partialMatches > 0) {
            this.overallStatus = 'Partial';
        } else {
            this.overallStatus = 'Mismatch';
        }
    }

    get headerText() {
        return `${this.matchedFields}/${this.comparisonRecords.length} Fields Matched${this.partialMatches > 0 ? ' (' + this.partialMatches + ' Partial)' : ''}`;
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