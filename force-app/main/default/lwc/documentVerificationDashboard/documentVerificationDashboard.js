import { LightningElement, api, wire } from 'lwc';
import getValidationJSON from '@salesforce/apex/VerificationController.getValidationJSON';

export default class DocumentVerificationDashboard extends LightningElement {
    @api recordId;

    dashboardData;
    errorMessage;

    @wire(getValidationJSON, { oppId: '$recordId' })
    wiredValidation({ data, error }) {
        if (data) {
            this.buildDashboard(data);
        } else if (error) {
            this.dashboardData = null;
            this.errorMessage = 'Unable to load document validation data.';
            // eslint-disable-next-line no-console
            console.error(error);
        }
    }

    get hasData() {
        return !!this.dashboardData;
    }

    get summaryCounts() {
        return this.dashboardData?.counts || {};
    }

    get documentList() {
        return this.dashboardData?.documents || [];
    }

    buildDashboard(rawSummary) {
        if (!rawSummary) {
            this.dashboardData = null;
            this.errorMessage = 'Document validation summary not found on this record.';
            return;
        }

        try {
            const jsonData = typeof rawSummary === 'string' ? JSON.parse(rawSummary) : rawSummary;
            
            if (!jsonData.documents || !jsonData.counts) {
                throw new Error('Invalid JSON structure');
            }

            const documents = [];
            const docKeys = ['drivingLicense', 'passport', 'aadhaar'];

            docKeys.forEach((key) => {
                const doc = jsonData.documents[key];
                if (doc) {
                    documents.push(this.buildDocumentViewModel(key, doc));
                }
            });

            this.dashboardData = {
                counts: jsonData.counts,
                documents: documents
            };
            this.errorMessage = null;
        } catch (error) {
            this.dashboardData = null;
            this.errorMessage = 'Document validation summary contains invalid JSON.';
            // eslint-disable-next-line no-console
            console.error(error);
        }
    }

    buildDocumentViewModel(key, doc) {
        const status = doc.status || 'UNKNOWN';
        const statusConfig = this.getStatusConfig(status);

        return {
            key: key,
            title: doc.title || this.toTitleCase(key),
            status: status,
            statusClass: statusConfig.class,
            statusIcon: statusConfig.icon,
            confidence: doc.confidence,
            flags: this.buildFlags(doc.flags),
            expiry: this.buildExpiry(doc.expiry),
            completeness: this.buildCompleteness(doc.completeness),
            quality: this.buildQuality(doc.quality),
            issues: doc.issues || [],
            extracted: this.buildExtracted(doc.extractedData || {}),
            message: doc.message,
            severity: doc.severity
        };
    }

    getStatusConfig(status) {
        const configs = {
            APPROVED: { class: 'status-approved', icon: 'utility:success' },
            MISSING: { class: 'status-missing', icon: 'utility:warning' },
            REJECTED: { class: 'status-rejected', icon: 'utility:error' },
            PENDING: { class: 'status-pending', icon: 'utility:clock' }
        };
        return configs[status] || { class: 'status-default', icon: 'utility:info' };
    }

    buildFlags(flags = {}) {
        if (!flags || Object.keys(flags).length === 0) {
            return [];
        }

        return [
            { 
                label: 'IsBlank', 
                value: flags.isBlank, 
                key: 'isBlank',
                iconName: flags.isBlank ? 'utility:error' : 'utility:success',
                iconClass: flags.isBlank ? 'flag-icon-error' : 'flag-icon-success'
            },
            { 
                label: 'IsBlurred', 
                value: flags.isBlurred, 
                key: 'isBlurred',
                iconName: flags.isBlurred ? 'utility:error' : 'utility:success',
                iconClass: flags.isBlurred ? 'flag-icon-error' : 'flag-icon-success'
            },
            { 
                label: 'IsExpired', 
                value: flags.isExpired, 
                key: 'isExpired',
                iconName: flags.isExpired ? 'utility:error' : 'utility:success',
                iconClass: flags.isExpired ? 'flag-icon-error' : 'flag-icon-success'
            },
            { 
                label: 'IsIncomplete', 
                value: flags.isIncomplete, 
                key: 'isIncomplete',
                iconName: flags.isIncomplete ? 'utility:error' : 'utility:success',
                iconClass: flags.isIncomplete ? 'flag-icon-error' : 'flag-icon-success'
            }
        ];
    }

    buildExpiry(expiry = {}) {
        const isValid = expiry.isValid !== false;
        return {
            issueDate: expiry.issueDate || '--',
            expiryDate: expiry.expiryDate || '--',
            daysRemaining: expiry.daysRemaining ?? expiry.daysExpired ?? 0,
            isValid: isValid,
            statusIcon: isValid ? 'utility:success' : 'utility:error',
            statusIconClass: isValid ? 'status-icon-valid' : 'status-icon-invalid',
            statusText: isValid ? 'Valid' : 'Invalid'
        };
    }

    buildCompleteness(completeness = {}) {
        return {
            percentage: completeness.percentage ?? 0,
            missingFields: completeness.missingFields || []
        };
    }

    buildQuality(quality = {}) {
        const isReadable = quality.isReadable !== false;
        return {
            isReadable: isReadable,
            blurScore: quality.blurScore ?? '--',
            readableIcon: isReadable ? 'utility:success' : 'utility:error',
            readableIconClass: isReadable ? 'status-icon-valid' : 'status-icon-invalid'
        };
    }

    buildExtracted(extracted = {}) {
        if (!extracted || Object.keys(extracted).length === 0) {
            return [];
        }

        const fieldLabels = {
            name: 'NAME',
            id: 'ID',
            date_of_birth: 'DATE OF BIRTH',
            address: 'ADDRESS',
            city_zip: 'CITY ZIP',
            issue_date: 'ISSUE DATE',
            sex: 'SEX',
            expiration_date: 'EXPIRATION DATE',
            card_type: 'CARD TYPE',
            country: 'COUNTRY',
            name_in_regional_language: 'NAME IN REGIONAL LANGUAGE',
            aadhaar_number: 'AADHAAR NUMBER',
            gender: 'GENDER'
        };

        return Object.keys(extracted)
            .map((key) => ({
                label: fieldLabels[key] || this.toTitleCase(key),
                value: extracted[key]
            }))
            .filter((item) => item.value && item.value !== '--');
    }

    toTitleCase(str) {
        return str
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (char) => char.toUpperCase())
            .trim();
    }
}