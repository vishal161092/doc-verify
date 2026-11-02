import { LightningElement, api } from 'lwc';

export default class VerificationPanCard extends LightningElement {
    @api verificationData; // THIS IS ALREADY pan_card_comparison array

    comparisonRecords = [];
    matchedFields = 0;
    totalFields = 0;
    partialMatches = 0;
    overallStatus = 'Mismatch';

    connectedCallback() {
        this.processVerificationData();
    }

    processVerificationData() {
        console.log('inside processVerificationData--1 ');

        if (!this.verificationData || this.verificationData.length === 0) return;

        this.totalFields = this.verificationData.length;
        this.matchedFields = 0;
        this.partialMatches = 0;
        console.log('inside processVerificationData--totalFields '+this.totalFields);

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
           
            console.log('inside processVerificationData--last '+record.field);

            return {
                id: record.field,
                fieldName: record.field,
                panCardValue: record.pan_card_value || 'Not Provided',
                applicationValue: record.application_record_value || 'Not Provided',
                matchPercentage: matchPercentage.toFixed(2) + '%',
                statusVariant,
                statusIcon
            };
        });

        // Update overall status
        if (this.matchedFields === this.totalFields) this.overallStatus = 'Match';
        else if (this.partialMatches > 0) this.overallStatus = 'Partial';
        else this.overallStatus = 'Mismatch';
    }

    get headerText() {
        return `${this.matchedFields}/${this.totalFields} Fields Matched${this.partialMatches > 0 ? ' (' + this.partialMatches + ' Partial)' : ''}`;
    }

    get statusClass() {
        return this.overallStatus === 'Match' ? 'status-badge match' :
               this.overallStatus === 'Partial' ? 'status-badge partial' :
               'status-badge mismatch';
    }

    get containerClass() {
        return 'verification-container';
    }
}