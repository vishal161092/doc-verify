import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

export default class VerificationSummaryDisplay extends LightningElement {
    @api recordId;
    @api objectApiName;
    @api fieldApiName;
    @api cardTitle = 'Verification Summary';
    
    jsonData;
    isLoading = true;
    hasError = false;
    errorMessage;
    panVerificationData = [];
    aadharVerificationData = [];
    
    // Label mapping for comparison types
    labelMap = {
        'pan_number_comparison': 'PAN Number',
        'name_comparison': 'Name',
        'dob_comparison': 'Date of Birth',
        'aadhar_number_comparison': 'Aadhar Number'
    };
    
    @wire(getRecord, { recordId: '$recordId', fields: '$fieldsToQuery' })
    wiredRecord({ error, data }) {
        this.isLoading = false;
        
        if (data) {
            this.hasError = false;
            this.errorMessage = null;
            
            if (this.fieldApiName && this.objectApiName) {
                try {
                    const fieldPath = `${this.objectApiName}.${this.fieldApiName}`;
                    
                    // Debug: Log the entire data object structure
                    console.log('Full data object:', data);
                    console.log('Data fields:', data.fields);
                    console.log('Field Path:', fieldPath);
                    
                    // Try getFieldValue first
                    let fieldValue = getFieldValue(data, { fieldApiName: fieldPath });
                    
                    // If null, try accessing directly from data.fields
                    if (!fieldValue && data.fields) {
                        const fieldKey = Object.keys(data.fields).find(key => 
                            key.toLowerCase() === this.fieldApiName.toLowerCase() || 
                            key.endsWith('.' + this.fieldApiName)
                        );
                        if (fieldKey && data.fields[fieldKey]) {
                            fieldValue = data.fields[fieldKey].value;
                            console.log('Found field via direct access:', fieldKey, fieldValue);
                        }
                    }
                    
                    // Alternative: try accessing by the field API name directly
                    if (!fieldValue && data.fields && data.fields[this.fieldApiName]) {
                        fieldValue = data.fields[this.fieldApiName].value;
                        console.log('Found field by API name directly:', fieldValue);
                    }
                    
                    console.log('Final Field Value:', fieldValue);
                    console.log('Field Value Type:', typeof fieldValue);
                    
                    if (fieldValue) {
                        // Check if it's already an object or a string
                        if (typeof fieldValue === 'string') {
                            // Strip markdown code block markers if present
                            let cleanedValue = fieldValue.trim();
                            
                            // Remove ```json or ``` at the start
                            if (cleanedValue.startsWith('```')) {
                                // Remove opening markdown code block (```json or ```)
                                cleanedValue = cleanedValue.replace(/^```(?:json)?\s*/i, '');
                                // Remove closing markdown code block (```)
                                cleanedValue = cleanedValue.replace(/\s*```\s*$/, '');
                                cleanedValue = cleanedValue.trim();
                            }
                            
                            this.jsonData = JSON.parse(cleanedValue);
                        } else if (typeof fieldValue === 'object') {
                            this.jsonData = fieldValue;
                        } else {
                            throw new Error('Field value is not a valid JSON string or object');
                        }
                        
                        console.log('Parsed JSON Data:', this.jsonData);
                        this.processVerificationData();
                        console.log('PAN Data:', this.panVerificationData);
                        console.log('Aadhar Data:', this.aadharVerificationData);
                    } else {
                        this.jsonData = null;
                        this.panVerificationData = [];
                        this.aadharVerificationData = [];
                        console.warn('Field value is empty or null');
                        console.warn('Available fields in data:', Object.keys(data.fields || {}));
                    }
                } catch (err) {
                    this.hasError = true;
                    this.errorMessage = `Error parsing JSON: ${err.message}`;
                    console.error('Error parsing JSON:', err);
                    console.error('Full error:', err);
                }
            } else {
                this.hasError = true;
                this.errorMessage = 'Field API Name or Object API Name is not configured.';
                console.warn('Missing configuration:', { fieldApiName: this.fieldApiName, objectApiName: this.objectApiName });
            }
        } else if (error) {
            this.hasError = true;
            this.errorMessage = error.body ? error.body.message : 'An error occurred while loading the record.';
            console.error('Error loading record:', error);
            console.error('Full error details:', JSON.stringify(error, null, 2));
        }
    }
    
    get fieldsToQuery() {
        if (!this.fieldApiName || !this.objectApiName || !this.recordId) {
            return [];
        }
        return [`${this.objectApiName}.${this.fieldApiName}`];
    }
    
    processVerificationData() {
        this.panVerificationData = [];
        this.aadharVerificationData = [];
        
        if (!this.jsonData) {
            return;
        }
        
        // Process PAN Card Comparison (new format - array)
        if (this.jsonData.pan_card_comparison && Array.isArray(this.jsonData.pan_card_comparison)) {
            this.jsonData.pan_card_comparison.forEach((comparison, index) => {
                if (comparison && typeof comparison === 'object') {
                    const row = this.createComparisonRow(index, comparison, 'pan');
                    if (row) {
                        this.panVerificationData.push(row);
                    }
                }
            });
        }
        
        // Process Aadhar Card Comparison (new format - array)
        if (this.jsonData.aadhar_card_comparison && Array.isArray(this.jsonData.aadhar_card_comparison)) {
            this.jsonData.aadhar_card_comparison.forEach((comparison, index) => {
                if (comparison && typeof comparison === 'object') {
                    const row = this.createComparisonRow(index, comparison, 'aadhar');
                    if (row) {
                        this.aadharVerificationData.push(row);
                    }
                }
            });
        }
        
        // Support legacy format for backward compatibility
        if (this.jsonData.verification_summary) {
            const verificationSummary = this.jsonData.verification_summary;
            
            // Process PAN Verification (legacy format)
            if (verificationSummary.pan_verification) {
                const panVerification = verificationSummary.pan_verification;
                Object.keys(panVerification).forEach(key => {
                    const comparison = panVerification[key];
                    if (comparison && typeof comparison === 'object') {
                        const row = this.createComparisonRow(key, comparison, 'pan');
                        if (row) {
                            this.panVerificationData.push(row);
                        }
                    }
                });
            }
            
            // Process Aadhar Verification (legacy format)
            if (verificationSummary.aadhar_verification) {
                const aadharVerification = verificationSummary.aadhar_verification;
                Object.keys(aadharVerification).forEach(key => {
                    const comparison = aadharVerification[key];
                    if (comparison && typeof comparison === 'object') {
                        const row = this.createComparisonRow(key, comparison, 'aadhar');
                        if (row) {
                            this.aadharVerificationData.push(row);
                        }
                    }
                });
            }
        }
    }
    
    createComparisonRow(key, comparison, type) {
        let cardValue = '';
        let applicationValue = '';
        let status = '';
        let fieldLabel = '';
        let matchPercentage = null;
        
        // Extract field label - use 'field' property if available (new format), otherwise derive from key
        if (comparison.field) {
            fieldLabel = comparison.field;
        } else {
            fieldLabel = this.labelMap[key] || this.formatLabel(key);
        }
        
        // Extract values based on type
        if (type === 'pan') {
            cardValue = comparison.pan_card_value || '';
            applicationValue = comparison.application_record_value || '';
        } else if (type === 'aadhar') {
            cardValue = comparison.aadhar_card_value || '';
            applicationValue = comparison.application_record_value || '';
        }
        
        // Extract status and parse color
        status = comparison.status || '';
        const statusColor = this.parseStatusColor(status);
        
        // Extract match percentage (new format)
        if (comparison.match_percentage !== undefined && comparison.match_percentage !== null) {
            matchPercentage = parseFloat(comparison.match_percentage);
            // Format to 2 decimal places
            if (!isNaN(matchPercentage)) {
                matchPercentage = parseFloat(matchPercentage.toFixed(2));
            }
        }
        
        // Format match percentage for display
        let matchPercentageFormatted = '—';
        let hasMatchPercentage = false;
        if (matchPercentage !== null && matchPercentage !== undefined && !isNaN(matchPercentage)) {
            hasMatchPercentage = true;
            matchPercentageFormatted = `${matchPercentage.toFixed(2)}%`;
        }
        
        return {
            key: key,
            label: fieldLabel,
            cardValue: cardValue,
            applicationValue: applicationValue,
            status: status,
            statusColor: statusColor,
            statusLabel: statusColor === 'Red' ? 'Failed' : statusColor === 'Green' ? 'Passed' : 'Unknown',
            statusIcon: statusColor === 'Red' ? 'utility:error' : statusColor === 'Green' ? 'utility:check' : 'utility:warning',
            statusClass: statusColor === 'Red' ? 'status-red' : statusColor === 'Green' ? 'status-green' : 'status-unknown',
            matchPercentage: matchPercentage,
            matchPercentageFormatted: matchPercentageFormatted,
            hasMatchPercentage: hasMatchPercentage
        };
    }
    
    parseStatusColor(status) {
        if (!status) return '';
        // Extract color from format like <Red> or <Green>
        const match = status.match(/<(\w+)>/);
        return match ? match[1] : '';
    }
    
    formatLabel(key) {
        // Convert snake_case to Title Case
        return key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    get hasData() {
        const hasData = !this.isLoading && !this.hasError && this.jsonData && 
            (this.panVerificationData.length > 0 || this.aadharVerificationData.length > 0);
        console.log('hasData check:', { 
            isLoading: this.isLoading, 
            hasError: this.hasError, 
            jsonData: !!this.jsonData,
            panLength: this.panVerificationData.length,
            aadharLength: this.aadharVerificationData.length,
            result: hasData
        });
        return hasData;
    }
    
    get isEmpty() {
        const isEmpty = !this.isLoading && !this.hasError && 
            (!this.jsonData || (this.panVerificationData.length === 0 && this.aadharVerificationData.length === 0));
        return isEmpty;
    }
    
    get hasPanData() {
        return this.panVerificationData && this.panVerificationData.length > 0;
    }
    
    get hasAadharData() {
        return this.aadharVerificationData && this.aadharVerificationData.length > 0;
    }
}