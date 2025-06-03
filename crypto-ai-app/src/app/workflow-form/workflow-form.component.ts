import { Component, EventEmitter, Output } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms'; // For reactive forms
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';

interface WorkflowResult {
    status: 'success' | 'failed' | 'suspended' | 'running';
    result?: any;
    error?: any;
    steps?: any;
    suspended?: any;
}

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
    @Output() workflowComplete = new EventEmitter<any>();

    workflowForm = new FormGroup({
        symbol: new FormControl('BTCUSDT'),
        timeframe: new FormControl('1h')
    });

    constructor(private http: HttpClient) { }

    async onSubmit() {
        if (this.workflowForm.valid) {
            const formValue = this.workflowForm.value;
            try {
                const result = await this.http.post<WorkflowResult>('http://localhost:3000/api/market-analysis', {
                    symbol: formValue.symbol,
                    timeframe: formValue.timeframe,
                    limit: 100
                }).toPromise();

                if (result) {
                    switch (result.status) {
                        case 'success':
                            console.log('Workflow completed successfully:', result.result);
                            this.workflowComplete.emit(result.result);
                            break;
                        case 'failed':
                            console.error('Workflow failed:', result.error);
                            break;
                        case 'suspended':
                            console.log('Workflow suspended:', result.suspended);
                            break;
                        default:
                            console.log(`Workflow status: ${result.status}`);
                            console.log('Full result:', result);
                    }
                }
            } catch (error) {
                console.error('Workflow execution failed:', error);
            }
        }
    }
} 