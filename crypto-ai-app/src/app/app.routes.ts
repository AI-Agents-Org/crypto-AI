import { Routes } from '@angular/router';
import { ChatComponent } from './chat/chat.component';
import { WorkflowFormComponent } from './workflow-form/workflow-form.component';
import { MainViewComponent } from './main-view/main-view.component'; // Assuming MainView will hold the router-outlet and nav

export const routes: Routes = [
    {
        path: '',
        component: MainViewComponent, // MainViewComponent will contain the toolbar and router-outlet
        children: [
            { path: '', redirectTo: 'chat', pathMatch: 'full' }, // Default to chat view
            { path: 'chat', component: ChatComponent },
            { path: 'workflow', component: WorkflowFormComponent }
        ]
    },
    // Fallback route - optional
    // { path: '**', redirectTo: 'chat' }
];
