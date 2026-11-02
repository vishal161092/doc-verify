import { LightningElement, api } from 'lwc';

export default class DocumentSummaryDashboard extends LightningElement {
    @api cardTitle = 'Document Status Dashboard';
    @api showProgressBar = false;
    @api columnsPerRow = 2;
    
    _promptOutput;
    documentData = null;
    counts = null;
    error = null;

    connectedCallback() {
        if (this._promptOutput) {
            this.parsePromptOutput();
        }
    }

    @api
    get promptOutput() {
        return this._promptOutput;
    }

    set promptOutput(value) {
        console.log('=== SETTER CALLED ===');
        console.log('Setter received - Type:', typeof value);
        console.log('Setter received - Value:', value);
        console.log('Setter received - Is empty?', !value);
        
        this._promptOutput = value;
        
        // Only parse if we have a non-empty value
        if (value && value.trim && value.trim() !== '') {
            this.parsePromptOutput();
        } else if (value && typeof value === 'object') {
            // If it's already an object, try to parse it
            this.parsePromptOutput();
        } else {
            console.warn('Setter received empty or invalid value, skipping parse');
        }
    }

    parsePromptOutput() {
        try {
            this.error = null;
            
            // Handle null/undefined/empty
            if (!this._promptOutput || (typeof this._promptOutput === 'string' && this._promptOutput.trim() === '')) {
                throw new Error('No prompt output provided');
            }

            // DEBUG: Log the raw input
            console.log('=== RAW PROMPT OUTPUT ===');
            console.log('Type:', typeof this._promptOutput);
            console.log('Length:', this._promptOutput.length || 'N/A');
            console.log('First 100 chars:', typeof this._promptOutput === 'string' ? this._promptOutput.substring(0, 100) : this._promptOutput);
            console.log('========================');

            // Parse the input - handle single or double stringification
            let data = this._promptOutput;
            
            // Trim whitespace if it's a string (Flow Text variables often have extra whitespace)
            if (typeof data === 'string') {
                data = data.trim();
                console.log('After trim - Length:', data.length);
                
                // Remove markdown code fence syntax (```json ... ``` or ``` ... ```)
                // This is common with AI prompt outputs
                if (data.startsWith('```')) {
                    console.log('Detected markdown code fence, removing...');
                    
                    // Remove opening fence (```json or ```)
                    data = data.replace(/^```(?:json|JSON)?\s*\n?/, '');
                    
                    // Remove closing fence (```)
                    data = data.replace(/\n?```\s*$/, '');
                    
                    // Trim again after removing fences
                    data = data.trim();
                    
                    console.log('After removing code fence - Length:', data.length);
                    console.log('After removing code fence - First 100 chars:', data.substring(0, 100));
                }
                
                // Remove all non-standard whitespace and compact the JSON
                // This handles pretty-printed JSON with extra spaces and newlines
                console.log('Compacting JSON by removing extra whitespace...');
                
                // Replace multiple spaces/newlines with single spaces
                data = data.replace(/\s+/g, ' ');
                
                // Remove spaces around JSON structural characters
                data = data.replace(/\s*:\s*/g, ':');
                data = data.replace(/\s*,\s*/g, ',');
                data = data.replace(/\s*{\s*/g, '{');
                data = data.replace(/\s*}\s*/g, '}');
                data = data.replace(/\s*\[\s*/g, '[');
                data = data.replace(/\s*]\s*/g, ']');
                
                // Final trim
                data = data.trim();
                
                console.log('After compacting - Length:', data.length);
                console.log('After compacting - First 100 chars:', data.substring(0, 100));
            }
            
            // First parse if it's a string
            if (typeof data === 'string') {
                console.log('Parsing first time...');
                try {
                    data = JSON.parse(data);
                    console.log('After first parse - Type:', typeof data);
                } catch (parseError) {
                    console.error('First parse failed:', parseError.message);
                    console.error('Failed to parse string:', data.substring(0, 200));
                    throw parseError;
                }
            }
            
            // Second parse if it's still a string (double-stringified from Flow)
            if (typeof data === 'string') {
                console.log('Parsing second time...');
                data = JSON.parse(data);
                console.log('After second parse - Type:', typeof data);
            }
            
            // Log for debugging in Flow context
            console.log('Final parsed data:', data);
            console.log('Has documents property?', data && data.documents !== undefined);
            console.log('Data keys:', data ? Object.keys(data) : 'N/A');
            
            if (!data || typeof data !== 'object') {
                console.error('Data is not an object. Type:', typeof data);
                throw new Error('Invalid data structure: expected object, got ' + typeof data);
            }
            
            if (!data.documents) {
                console.error('Invalid data structure. Received:', data);
                throw new Error('Invalid data structure: documents property is missing');
            }

            this.documentData = Object.entries(data.documents).map(([key, doc], index) => ({
                id: key,
                title: doc.title || key,
                status: doc.status || 'UNKNOWN',
                severity: doc.severity || '',
                message: doc.message || '',
                isUploaded: doc.status === 'UPLOADED',
                isMissing: doc.status === 'MISSING',
                isPending: doc.status === 'PENDING',
                isRejected: doc.status === 'REJECTED',
                isHighSeverity: doc.severity === 'HIGH',
                isMediumSeverity: doc.severity === 'MEDIUM',
                animationDelay: `${(index + 1) * 0.1}s`
            }));
            
            this.counts = data.counts || this.calculateCounts(data.documents);
        } catch (error) {
            console.error('Error parsing prompt output:', error);
            this.error = 'Unable to parse document data: ' + error.message;
            this.documentData = null;
            this.counts = null;
        }
    }

    calculateCounts(documents) {
        const entries = Object.values(documents);
        return {
            totalDocuments: entries.length,
            uploadedDocuments: entries.filter(d => d.status === 'UPLOADED').length,
            missingDocuments: entries.filter(d => d.status === 'MISSING').length
        };
    }

    get progressPercentage() {
        if (!this.counts || this.counts.totalDocuments === 0) return 0;
        return Math.round((this.counts.uploadedDocuments / this.counts.totalDocuments) * 100);
    }

    get progressBarClass() {
        const percentage = this.progressPercentage;
        if (percentage >= 75) return 'progress-75-100';
        if (percentage >= 50) return 'progress-50-74';
        if (percentage >= 25) return 'progress-25-49';
        return 'progress-0-24';
    }

    get columnClass() {
        const columnMap = {
            1: 'doc-col-1',
            2: 'doc-col-2',
            3: 'doc-col-3',
            4: 'doc-col-4'
        };
        return columnMap[this.columnsPerRow] || 'doc-col-2';
    }

    get hasDocuments() {
        return this.documentData && this.documentData.length > 0;
    }

    get hasError() {
        return this.error !== null;
    }

    @api
    refresh() {
        if (this.promptOutput) {
            this.parsePromptOutput();
        }
    }

    @api
    getStatusSummary() {
        return {
            total: this.counts?.totalDocuments || 0,
            uploaded: this.counts?.uploadedDocuments || 0,
            missing: this.counts?.missingDocuments || 0,
            percentage: this.progressPercentage
        };
    }
}