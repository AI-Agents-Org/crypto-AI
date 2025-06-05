import { Injectable } from '@angular/core';
import { initToolbar } from '@stagewise/toolbar';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class StagewiseService {
    private config = {
        plugins: [],
        debug: true // Enable debug mode
    };

    constructor() {
        console.log('StagewiseService initialized');
        console.log('Environment production:', environment.production);

        if (!environment.production) {
            try {
                console.log('Initializing Stagewise toolbar...');
                initToolbar(this.config);
                console.log('Stagewise toolbar initialized successfully');
            } catch (error) {
                console.error('Error initializing Stagewise toolbar:', error);
            }
        }
    }
} 