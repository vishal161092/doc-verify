import { api, LightningElement } from 'lwc';
import getFilesFromRecId from '@salesforce/apex/DE_AdvancedFileUploaderCtrl.getFilesFromRecId';
import getFilesFromDocIds from '@salesforce/apex/DE_AdvancedFileUploaderCtrl.getFilesFromDocIds';
import { deleteRecord } from 'lightning/uiRecordApi';
import { updateRecord } from 'lightning/uiRecordApi';
import CONTENT_OBJECT from '@salesforce/schema/ContentDocument';
import NAME_FIELD from '@salesforce/schema/ContentDocument.Title';
import ID_FIELD from '@salesforce/schema/ContentDocument.Id';
import { NavigationMixin } from 'lightning/navigation';


const PDF_ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="8" fill="#c23934"/><text x="32" y="40" font-size="20" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">PDF</text></svg>');

export default class DE_AdvancedFlieUploader extends NavigationMixin(LightningElement) {

    @api recordId;
    filesReturned;
    showSpinner = true;
    showTable = false;
    isReadOnly = true;
    @api uploadMultiple;
    showAllFiles = true;
    checkedStatus = false;
    uploadedDocIds;

    connectedCallback() {
        
        this.checkedStatus = true;
        this.showResultsTable();

    }

    handleUploadFinished(event) {
        console.log('----->');
        var data = event.detail.files;
        var docIdsFromJS = [];
        data.forEach(item => docIdsFromJS.push(item.documentId));
        this.uploadedDocIds = docIdsFromJS;
        this.showResultsTable();

    }

    editInput(event) {
        var recIdToEdit = '';
        if (event.target.dataset.recordid.split('-')[0])
            recIdToEdit = event.target.dataset.recordid.split('-')[0];
        else
            recIdToEdit = event.target.dataset.recordid;
        console.log(`record id ----> ${recIdToEdit}`);
        this.template.querySelector(`[data-recordid="${recIdToEdit}"]`).readOnly = false;
    }


    saveRename(event) {
        var recIdToEdit = '';
        if (event.target.dataset.recordid.split('-')[0])
            recIdToEdit = event.target.dataset.recordid.split('-')[0];
        else
            recIdToEdit = event.target.dataset.recordid;
        console.log(`record id ----> ${recIdToEdit}`);

        this.template.querySelector(`[data-recordid="${recIdToEdit}"]`).readOnly = true;
        const fields = {};
        fields[ID_FIELD.fieldApiName] = recIdToEdit;
        fields[NAME_FIELD.fieldApiName] = this.template.querySelector(`[data-recordid="${recIdToEdit}"]`).value;

        console.log(JSON.stringify(fields));
        //fields[LASTNAME_FIELD.fieldApiName] = this.template.querySelector("[data-field='LastName']").value;

        const recordInput = { fields };

        updateRecord(recordInput)
            .then(() => {
                console.log('Done--->');
                this.showResultsTable();
            })
            .catch(error => {
                console.log(error);

            });
    }




    deleteSelectedFile(event) {
        var recIdToDelete = '';
        if (event.target.dataset.recordid.split('-')[0])
            recIdToDelete = event.target.dataset.recordid.split('-')[0];
        else
            recIdToDelete = event.target.dataset.recordid;
        console.log(recIdToDelete);
        deleteRecord(recIdToDelete)
            .then(() => {
                console.log('deleted');
                this.showResultsTable();
            })
            .catch(error => {
                console.log(error);
            });
    }


    previewFile(event) {
        var recIdToView = '';
        if (event.target.dataset.recordid.split('-')[0])
            recIdToView = event.target.dataset.recordid.split('-')[0];
        else
            recIdToView = event.target.dataset.recordid;
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview'
            },
            state: {
                // assigning ContentDocumentId to show the preview of file
                selectedRecordId: recIdToView
            }
        })

    }

    showResultsTable() {
        if (this.checkedStatus) {
            getFilesFromRecId({ recordId: this.recordId })
                .then(res => {
                    console.log(JSON.stringify(res));
                    this.showTable = true;
                    this.filesReturned = res;
                    this.showSpinner = false;

                    this.filesReturned = res.map(file => {
                    let imageUrl;

                    // Check the file type and set the appropriate URL
                    if (file.FileType.toLowerCase().endsWith('pdf')) {
                        imageUrl = PDF_ICON; // PDFs show a generic icon instead of a preview
                    } else if (file.FileType.toLowerCase().endsWith('jpg') || file.FileType.toLowerCase().endsWith('png') || file.FileType.toLowerCase().endsWith('jpeg')) {
                        imageUrl = '/sfc/servlet.shepherd/document/download/' + file.Id + '?operationContext=S1';
                    }

                    return {
                        ...file,
                        imageUrl: imageUrl
                    };
        });

                    console.log('>>> '+JSON.stringify(this.filesReturned));

                }).catch(err => {
                    console.log(JSON.stringify(err));
                })
        } else {
            getFilesFromDocIds({ docIds: this.uploadedDocIds })
                .then(res => {
                    console.log(JSON.stringify(res));
                    this.showTable = true;
                    this.filesReturned = res;
                    this.showSpinner = false;
                }).catch(err => {
                    console.log(JSON.stringify(err));
                })
        }
    }

    handleChange(event) {
        this.checkedStatus = event.target.checked;
        console.log(this.checkedStatus);
        this.showResultsTable();
    }

}