import { Component, ViewChild, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'; // Import router directives
import { MatToolbarModule } from '@angular/material/toolbar'; // Import MatToolbarModule
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav'; // Import MatSidenavModule and MatSidenav
import { MatListModule } from '@angular/material/list'; // Import MatListModule
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'; // Import BreakpointObserver
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AsyncPipe, CommonModule } from '@angular/common'; // Import CommonModule
import { ThemeService } from '../core/services/theme.service';
// ChatComponent and WorkflowFormComponent are no longer directly used in the template
// MatCardModule is no longer used here

@Component({
    selector: 'app-main-view',
    standalone: true,
    imports: [
        CommonModule,       // Add CommonModule for *ngIf, *ngFor, etc.
        RouterOutlet,         // Add RouterOutlet for child routes
        RouterLink,           // Add RouterLink for navigation
        RouterLinkActive,     // Add RouterLinkActive for active link styling
        MatToolbarModule,     // Add MatToolbarModule
        MatButtonModule,
        MatIconModule,
        MatSidenavModule,   // Add MatSidenavModule
        MatListModule,      // Add MatListModule
        AsyncPipe           // Add AsyncPipe for isHandset$ observable
    ],
    templateUrl: './main-view.component.html',
    styleUrl: './main-view.component.scss'
})
export class MainViewComponent implements OnInit {
    @ViewChild('sidenav') sidenav!: MatSidenav;

    isHandset$!: Observable<boolean>;

    constructor(
        private breakpointObserver: BreakpointObserver,
        public themeService: ThemeService // Made public to be accessible in template for isDarkMode()
    ) { }

    ngOnInit(): void {
        this.isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
            .pipe(
                map(result => result.matches),
                shareReplay()
            );
    }

    toggleTheme() {
        console.log('MainViewComponent: toggleTheme() called');
        this.themeService.toggleTheme();
    }

    isDarkMode(): boolean {
        return this.themeService.getCurrentTheme() === 'dark';
    }

    closeSidenavIfHandset() {
        if (this.breakpointObserver.isMatched(Breakpoints.Handset)) {
            this.sidenav.close();
        }
    }
} 