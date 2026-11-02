import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';

export default class Ps_agencyreportsummary extends LightningElement {
    @api recordId; // Loan Application Record ID
    @api reportField = 'Agentforce_UW_Summary__c'; // Design attribute for the field API name
    reportData;
    sectionEntries = []; // Array to hold data for all sections
    summary; // Holds Summary field
    eligibility;
    applicants;
    riskScore; // Holds Risk Score field
    riskScoreStyle; // Holds Risk Score dynamic styling
    passedChecks = []; // Sections with Result = true
    failedChecks = []; // Sections with Result = false

    // Reactive private properties to hold the formatted text
    formattedEligibility = [];
    formattedApplicants = [];
    formattedSummary = [];

    get computedFields() {
        return this.reportField ? [`Opportunity.${this.reportField}`] : [];
    }

    @wire(getRecord, { recordId: '$recordId', fields: '$computedFields' })
    wiredLoanApplication({ error, data }) {
        if (data) {
            console.log('Data from getRecord:', data);
            const agencyReportSummary = data.fields[this.reportField]?.value;
            console.log('Fetched agencyReportSummary:', agencyReportSummary);
            if (!agencyReportSummary) {
                console.warn(`${this.reportField} is blank or null.`);
                this.reportData = {};
                this.summary = '';
                this.riskScore = '';
                this.eligibility = '';
                this.applicants = '';
                this.sectionEntries = [];
                this.passedChecks = [];
                this.failedChecks = [];
                this.formattedEligibility = [];
                this.formattedApplicants = [];
                this.formattedSummary = [];
                return;
            }
            try {
                this.reportData = JSON.parse(agencyReportSummary); // Parse the JSON data
                console.log('Parsed reportData:', this.reportData);
                // Extract Summary and Risk Score separately
                this.summary = this.reportData.Summary || '';
                this.riskScore = this.reportData['Risk Score'] || '';
                // Determine Risk Score styling
                this.riskScoreStyle = this.getRiskScoreStyle(this.riskScore);

                // Extract Eligibility and Applicants separately and format them
                this.eligibility = this.reportData['Key Eligibility Criteria'] || '';
                this.formattedEligibility = this.eligibility.split('. ').filter(line => line).map(line => line + '.');

                this.applicants = this.reportData['Applicant Details'] || '';
                this.formattedApplicants = this.applicants.split('. ').filter(line => line).map(line => line + '.');

                // Format the summary as well
                this.formattedSummary = this.summary.split('. ').filter(line => line).map(line => line + '.');

                // Process other sections dynamically
                this.sectionEntries = Object.entries(this.reportData)
                    .filter(([key, value]) => typeof value === 'object' && value !== null)
                    .map(([key, value]) => {
                        return {
                            title: key,
                            entries: Object.entries(value)
                                .filter(([subKey]) => subKey !== 'Result')
                                .map(([subKey, subValue]) => ({
                                    key: subKey,
                                    value: subValue,
                                })),
                            result: value.Result,
                            icon: value.Result !== undefined ? this.getIcon(value.Result) : null,
                            style: value.Result !== undefined ? this.getDynamicStyle(value.Result) : null,
                        };
                    });

                this.passedChecks = this.sectionEntries.filter(section => section.result === true);
                this.failedChecks = this.sectionEntries.filter(section => section.result === false);

            } catch (error) {
                console.error('Error parsing JSON:', error);
                this.reportData = {};
                this.summary = '';
                this.riskScore = '';
                this.eligibility = '';
                this.applicants = '';
                this.sectionEntries = [];
                this.passedChecks = [];
                this.failedChecks = [];
                this.formattedEligibility = [];
                this.formattedApplicants = [];
                this.formattedSummary = [];
            }
        } else if (error) {
            console.error('Error fetching report:', error);
            this.sectionEntries = null;
            this.formattedEligibility = [];
            this.formattedApplicants = [];
            this.formattedSummary = [];
        }
    }

    getIcon(result) {
        let boolValue = result.toLowerCase() === "true";
        return boolValue == true
            ? '/resource/ps_tick_icon'
            : '';
    }

    getDynamicStyle(result) {
        let boolValue = result.toLowerCase() === "true";
        return `border: 2px solid ${boolValue == true ? 'green' : 'red'}; border-radius: 8px;`;
    }

    getRiskScoreStyle(riskScore) {
        switch (riskScore) {
            case 'Medium':
                return 'background-color:rgb(228, 128, 29); border: 2px solid rgb(228, 115, 29); color: white;';
            case 'Low':
                return 'background-color:rgb(255, 221, 0); border: 2px solid rgb(255, 238, 0); color: white;';
            case 'No Risk':
                return 'background-color: #32CD32; border: 2px solid #228B22; color: white;';
            case 'Critical':
                return 'background-color: #B22222; border: 2px solid #8B0000; color: white;';
            default:
                return 'background-color: #808080; border: 2px solid #696969; color: white;';
        }
    }

    get isSectionEntriesEmpty() {
        return !this.sectionEntries || this.sectionEntries.length === 0;
    }
}