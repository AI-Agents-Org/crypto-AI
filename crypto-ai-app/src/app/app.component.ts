import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'crypto-ai-app';

  constructor(private themeService: ThemeService) {
    // The ThemeService constructor already calls loadTheme(),
    // so just injecting it is enough to initialize the theme.
  }
}
