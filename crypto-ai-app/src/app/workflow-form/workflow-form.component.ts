import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms'; // For reactive forms
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-workflow-form',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule
    ],
    templateUrl: './workflow-form.component.html',
    styleUrl: './workflow-form.component.scss'
})
export class WorkflowFormComponent {
    workflowForm = new FormGroup({
        // Define your form controls here
        // Example:
        // field1: new FormControl(''),
        // field2: new FormControl(''),
    });

    onSubmit() {
        // Handle form submission
        console.log(this.workflowForm.value);
    }
} 