import { LightningElement, track, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getDocumentsWithAnalysis from '@salesforce/apex/DocumentAnalysisController.getDocumentsWithAnalysis';
import getDocumentConfigurations from '@salesforce/apex/DocumentAnalysisController.getDocumentConfigurations';
import uploadFile from '@salesforce/apex/DocumentAnalysisController.uploadFile';
import getAISummaryData from '@salesforce/apex/DocumentAnalysisController.getAISummaryData';
import generateAISummary from '@salesforce/apex/DocumentAnalysisController.generateAISummary';

export default class DocumentAnalysis extends NavigationMixin(LightningElement) {
    @api recordId;
    @track showAIAnalysis = false;
    @track documents = [];
    @track filteredDocuments = [];
    @track isLoading = false;
    @track searchTerm = '';

    // AI Summary Modal properties
    @track showAISummaryModal = false;
    @track isAISummaryLoading = false;
    @track showSummaryDecision = false;
    @track showSummaryContent = false;
    @track aiSummaryText = '';
    @track existingSummaryData = null;

    wiredDocumentsResult;

    @wire(getDocumentsWithAnalysis, { recordId: '$recordId' })
    wiredDocuments(result) {
        this.wiredDocumentsResult = result;
        if (result.data) {
            this.documents = this.processDocuments(result.data);
            this.filteredDocuments = [...this.documents];
            this.isLoading = false;
        } else if (result.error) {
            this.showToast('Error', 'Failed to load documents', 'error');
            this.isLoading = false;
        }
    }

    processDocuments(documents) {
        return documents.map(doc => {
            const processedDoc = { ...doc };
            
            // Set file icon based on extension
            processedDoc.fileIcon = this.getFileIcon(doc.fileExtension);
            
            // Set status class for styling
            processedDoc.statusClass = doc.status === 'Completed' ? 'status-completed' : 'status-pending';
            
            // Set button states based on file availability
            if (doc.hasFile) {
                // File exists - enable preview and view buttons
                processedDoc.previewDisabled = false;
                processedDoc.viewDisabled = false;
                processedDoc.previewVariant = 'border-filled';
                processedDoc.viewVariant = 'border-filled';
            } else {
                // No file - disable preview and view buttons
                processedDoc.previewDisabled = true;
                processedDoc.viewDisabled = true;
                processedDoc.previewVariant = 'border';
                processedDoc.viewVariant = 'border';
            }
            
            // Format AI analysis for display
            if (doc.aiAnalysis) {
                processedDoc.aiAnalysisDisplay = this.formatAIAnalysisForDisplay(doc.aiAnalysis);
            } else {
                processedDoc.aiAnalysisDisplay = 'AI analysis not available';
            }
            
            return processedDoc;
        });
    }

    getFileIcon(fileExtension) {
        const iconMap = {
            'pdf': 'doctype:pdf',
            'doc': 'doctype:word',
            'docx': 'doctype:word',
            'xls': 'doctype:excel',
            'xlsx': 'doctype:excel',
            'jpg': 'doctype:image',
            'jpeg': 'doctype:image',
            'png': 'doctype:image',
            'txt': 'doctype:txt',
            'zip': 'doctype:zip'
        };
        return iconMap[fileExtension?.toLowerCase()] || 'doctype:unknown';
    }

    formatAIAnalysisForDisplay(aiAnalysis) {
        if (!aiAnalysis) return 'No analysis available';
        
        // Simply return the content as-is
        return aiAnalysis.content || 'No analysis available';
    }

    handleToggleChange(event) {
        this.showAIAnalysis = event.target.checked;
        // No need to change columns since we're using custom table
    }

    // Custom table event handlers
    handleUploadClick(event) {
        const documentId = event.target.dataset.documentId;
        const row = this.filteredDocuments.find(doc => doc.documentId === documentId);
        this.handleFileUpload(row);
    }

    handlePreviewClick(event) {
        const documentId = event.target.dataset.documentId;
        const row = this.filteredDocuments.find(doc => doc.documentId === documentId);
        if (!row.previewDisabled && row.hasFile) {
            this.previewDocument(row);
        } else {
            this.showToast('Info', 'No document to preview', 'info');
        }
    }

    handleViewClick(event) {
        const documentId = event.target.dataset.documentId;
        const row = this.filteredDocuments.find(doc => doc.documentId === documentId);
        if (!row.viewDisabled && row.hasFile) {
            this.viewDocument(row);
        } else {
            this.showToast('Info', 'No document to view', 'info');
        }
    }

    handleSearchChange(event) {
        this.searchTerm = event.target.value.toLowerCase();
        this.filterDocuments();
    }

    filterDocuments() {
        if (this.searchTerm) {
            this.filteredDocuments = this.documents.filter(doc => 
                doc.documentType.toLowerCase().includes(this.searchTerm) ||
                doc.status.toLowerCase().includes(this.searchTerm) ||
                (doc.remarks && doc.remarks.toLowerCase().includes(this.searchTerm)) ||
                (doc.name && doc.name.toLowerCase().includes(this.searchTerm))
            );
        } else {
            this.filteredDocuments = [...this.documents];
        }
    }

    handleRefresh() {
        this.isLoading = true;
        return refreshApex(this.wiredDocumentsResult)
            .then(() => {
                this.isLoading = false;
            })
            .catch(() => {
                this.isLoading = false;
            });
    }

    handleFileUpload(row) {
        // Create a file input element programmatically
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.txt';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.processFileUpload(file, row.documentType);
            }
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    processFileUpload(file, documentType) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showToast('Error', 'File too large (max 5MB)', 'error');
            return;
        }

        this.isLoading = true;
        
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            
            uploadFile({
                recordId: this.recordId,
                documentType: documentType,
                fileName: file.name,
                base64Data: base64,
                contentType: file.type
            })
            .then(result => {
                // Detailed toast message with AI analysis status
                if (result.success) {
                    let message = 'Document uploaded successfully.\n';
                    if (result.aiAnalysisGenerated) {
                        message += 'AI Analysis generated successfully.';
                        this.showToast('Success', message, 'success');
                    } else {
                        message += 'AI Analysis failed because prompt template is not mapped or does not exist.';
                        this.showToast('Warning', message, 'warning');
                    }
                } else {
                    this.showToast('Error', `Document upload failed.\n${result.message}`, 'error');
                }
                
                return this.handleRefresh();
            })
            .catch(error => {
                this.showToast('Error', 'Document upload failed.\n' + (error.body?.message || error.message), 'error');
                this.isLoading = false;
            });
        };
        
        reader.onerror = () => {
            this.showToast('Error', 'File read failed', 'error');
            this.isLoading = false;
        };
        
        reader.readAsDataURL(file);
    }

    previewDocument(row) {
        // Use Salesforce standard preview functionality
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview'
            },
            state: {
                selectedRecordId: row.documentId
            }
        });
    }

    viewDocument(row) {
        // Use Salesforce standard view functionality
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: row.documentId,
                objectApiName: 'ContentDocument',
                actionName: 'view'
            }
        });
    }



    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
            // Removed mode: 'sticky' to allow auto-close
        });
        this.dispatchEvent(evt);
    }

    get hasDocuments() {
        return this.filteredDocuments && this.filteredDocuments.length > 0;
    }

    get documentCount() {
        return this.filteredDocuments ? this.filteredDocuments.length : 0;
    }

    // AI Summary Modal Methods
    handleAISummaryClick() {
        this.showAISummaryModal = true;
        this.resetModalState();
        this.checkExistingSummary();
    }

    closeAISummaryModal() {
        this.showAISummaryModal = false;
        this.resetModalState();
    }

    resetModalState() {
        this.isAISummaryLoading = false;
        this.showSummaryDecision = false;
        this.showSummaryContent = false;
        this.aiSummaryText = '';
        this.existingSummaryData = null;
    }

    async checkExistingSummary() {
        this.isAISummaryLoading = true;
        
        try {
            const result = await getAISummaryData({ recordId: this.recordId });
            
            if (result.success) {
                this.existingSummaryData = result;
                
                if (result.hasExistingSummary) {
                    this.showSummaryDecision = true;
                } else {
                    await this.generateSummaryInternal(false);
                }
            } else {
                this.showToast('Error', result.message, 'error');
                this.closeAISummaryModal();
            }
        } catch (error) {
            this.showToast('Error', 'Failed to check existing AI Summary: ' + error.body?.message || error.message, 'error');
            this.closeAISummaryModal();
        }
        
        this.isAISummaryLoading = false;
    }

    viewExistingSummary() {
        this.showSummaryDecision = false;
        this.aiSummaryText = this.existingSummaryData.existingSummary;
        this.showSummaryContent = true;
    }

    async generateNewSummary() {
        this.showSummaryDecision = false;
        await this.generateSummaryInternal(true);
    }

    async regenerateSummary() {
        this.showSummaryContent = false;
        await this.generateSummaryInternal(true);
    }

    async generateSummaryInternal(forceRegenerate) {
        this.isAISummaryLoading = true;
        
        try {
            const result = await generateAISummary({ 
                recordId: this.recordId, 
                forceRegenerate: forceRegenerate 
            });
            
            if (result.success) {
                this.aiSummaryText = result.summary;
                this.showSummaryContent = true;
                this.showToast('Success', 'AI Summary generated successfully', 'success');
            } else {
                this.showToast('Error', result.message, 'error');
                this.closeAISummaryModal();
            }
        } catch (error) {
            this.showToast('Error', 'Failed to generate AI Summary: ' + error.body?.message || error.message, 'error');
            this.closeAISummaryModal();
        }
        
        this.isAISummaryLoading = false;
    }
}